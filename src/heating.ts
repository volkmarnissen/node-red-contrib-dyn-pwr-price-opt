import {
  PriceData,
  TypeDescription,
} from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNode } from "./basenode";
import { EnergyConsumption ,EnergyConsumptionInput} from "./energyconsumption";
import {
  convertPrice,
  IpriceInfo,
  priceConverterFilterRegexs,
} from "./periodgenerator";

const tConfig: TypeDescription = {
  typeFields: [
    {name: "cheapestpriceoutput", required: false },
    {name: "outputValueSecond", required: false },
    {name: "outputValueThird", required: false },
    {name: "highestpriceoutput", required: false },
  ],
  numberFields: [
    {name: "periodlength", required: false },
    {name: "nightstarthour", required: false },
    {name: "nightendhour", required: false },
    {name: "nighttargettemperature", required: false },
    {name: "minimaltemperature", required: true },
    {name: "maximaltemperature", required: true },
    {name: "increasetemperatureperhour", required: true },
    {name: "decreasetemperatureperhour", required: true },
  
  ],
  booleanFields: []
};
const noheattemperature  = 21;

export interface ScheduleEntry extends PriceData {
  returnValue?: any;
}
const toleranceInMillis = 100;
export default function register(RED: any): any {
  class HeatingNode extends BaseNode<HeatingConfig> {
    priceInfo: IpriceInfo | undefined = undefined;
    outertemperature: number|undefined = undefined;
    roomtemperature: number|undefined = undefined;
    lastSetPoint: number|undefined = undefined;
   constructor(config: any) {
      super(config, tConfig, RED);
      priceConverterFilterRegexs.forEach((regex) => {
        this.registerInputListener(regex, this.readPricePayload.bind(this));
      });
      this.registerInputListener(/^payload$/g, this.readHeatpumpPayload.bind(this))
    }
    readPricePayload(payload: any):boolean {
      if( !this.config )
        throw new Error("config is not available.");
      let periodlength = 1;
      if( this.config.periodlength != undefined && this.config.periodlength !=0)
        periodlength = this.config.periodlength 
      let rc = convertPrice(periodlength,payload);
      if (undefined != rc) 
        this.priceInfo = rc;
      return rc != undefined
    }
    private readHeatpumpPayload(payload:any){
      let rc = false;
      if(payload.hasOwnProperty("outertemperature")){
        this.outertemperature = payload.outertemperature
        rc = true
      }
        
      if(payload.hasOwnProperty("roomtemperature")){
        this.roomtemperature = payload.roomtemperature
        return true
      }
      return rc;
    }
    private getEstimconsumptionperiods():number{
      let decreasetemperatureperhour = this.config.decreasetemperatureperhour
      if( this.outertemperature != undefined && this.config.designtemperature){
        if( this.outertemperature > noheattemperature)
          return this.priceInfo.priceDatas.length // no heating required
        decreasetemperatureperhour *= (noheattemperature - this.outertemperature) / 
          (noheattemperature  - this.config.designtemperature) 
      }
      let roomtemperature = this.roomtemperature
      if( this.roomtemperature == undefined )
        roomtemperature = this.config.maximaltemperature 

      return Math.floor((roomtemperature - this.config.minimaltemperature) / decreasetemperatureperhour * this.getPeriodLength()  ) 
    }
    private getPeriodLength(){
      let periodlength = 1
      if(this.priceInfo && this.priceInfo.prices && this.priceInfo.prices.periodlength)
        periodlength = this.priceInfo.prices.periodlength
      return periodlength
    }
    private getEstimstoreperiods():number{
      let increasetemperatureperhour = this.config.increasetemperatureperhour
      let roomtemperature = this.roomtemperature
      if( this.roomtemperature == undefined )
        roomtemperature = this.config.minimaltemperature 
      if( roomtemperature != undefined && this.config.maximaltemperature){
        if( roomtemperature > this.config.maximaltemperature)
          return 0// no heating required
        increasetemperatureperhour *= (this.config.maximaltemperature - roomtemperature) / 
          (this.config.maximaltemperature  - this.config.minimaltemperature) 
      }

      return Math.floor((this.config.maximaltemperature - roomtemperature) / this.config.increasetemperatureperhour * this.getPeriodLength())    
      ;

    }
    waitUntilNextHourTimer: any = undefined;
    private buildEnergyConsumptionInput(): EnergyConsumptionInput {
      if(!this.priceInfo || !this.priceInfo.priceDatas || !this.priceInfo.prices )
          throw new Error("No Price Data available")
      let eci:EnergyConsumptionInput ={
        priceInfo: this.priceInfo,
        estimconsumptionperiods: this.getEstimconsumptionperiods(),
        estimstoreperiods:this.getEstimstoreperiods(),
        cheapestpriceoutput: this.config.maximaltemperature,
        highestpriceoutput: this.config.minimaltemperature
      }
      return eci;
    }
    
    onTime(time: number): void {
      if( this.configInvalid )
        throw new Error(this.configInvalid)
      let currentHour = new Date(time).getHours()
      let value = 0
      if( this.config.nightstarthour != undefined && 
        this.config.nightendhour != undefined && this.config.nighttargettemperature != undefined
        && (currentHour < this.config.nightendhour || currentHour > this.config.nightstarthour))
        value = this.config.nighttargettemperature
      else{
        let ec = new EnergyConsumption(this.buildEnergyConsumptionInput())
        value =  ec.getOutputValue(time)        
      }

      if (value) {
        this.status.bind(this)({
          fill: "green",
          shape: "dot",
          text: "Last Update at " + new Date(time).toLocaleTimeString(),
        });
        try {
          if( value != this.lastSetPoint){
            if( typeof value === "number")
            this.send([
            {
              payload: value,
              time: time,
            },
            ])
            else
              debugger;
          this.lastSetPoint = value;
          }
     
        } catch (e) {
          this.status.bind(this)({
            fill: "red",
            shape: "dot",
            text: e.message,
          });
        }
      } else
        this.status.bind(this)({
          fill: "red",
          shape: "dot",
          text: "No Schedule available",
        });
    }

    onFullHour(time: number = Date.now()) {
      try {
        this.onTime(time);
      } catch (e: any) {
        this.status({ fill: "red", shape: "dot", text: e.message });
      }
    }
    scheduleTimerOnFullHours(time: number) {
      let nextFullHour = new Date(time + toleranceInMillis);
      if (
        nextFullHour.getMilliseconds() < 2 * toleranceInMillis &&
        nextFullHour.getSeconds() == 0 &&
        nextFullHour.getMinutes() == 0
      ) {
        this.waitUntilNextHourTimer = setInterval(
          this.onFullHour,
          1000 * 60 * 60,
        );
        this.onFullHour(time);
      } else {
        nextFullHour = new Date(time);
        nextFullHour.setHours(nextFullHour.getHours() + 1);
        nextFullHour.setMilliseconds(0);
        nextFullHour.setSeconds(0);
        nextFullHour.setMinutes(0);
        let nextFullHourTime = nextFullHour.getTime();
        setTimeout(() => {
          this.scheduleTimerOnFullHours(nextFullHour.getTime());
          this.onFullHour();
        }, nextFullHourTime - time);
      }
    }
  }
  // In unit tests, registerType returns the node class in production, the return code is not used
  return RED.nodes.registerType(
    "Heating",
    HeatingNode,
  );
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;

