import { TypeDescription } from "./@types/basenode";
import { BaseNodeECConfig } from "./@types/basenodeec";
import { BaseNode } from "./basenode";
import { EnergyConsumption, EnergyConsumptionInput } from "./energyconsumption";
import {
  convertPrice,
  IpriceInfo,
  priceConverterFilterRegexs,
} from "./periodgenerator";
const toleranceInMillis = 100;


export abstract class BaseNodeEnergyConsumption<T extends BaseNodeECConfig> extends BaseNode<T> {
  priceInfo: IpriceInfo | undefined = undefined;
  currenttemperature: number | undefined = undefined;
  hysteresis: number | undefined = 0;
  lastSetPoint: number | undefined = undefined;
  lastSetPointTime: number | undefined = undefined;
  constructor(config: any, tConfig: TypeDescription, RED: any) {
    super(config, tConfig, RED);
    priceConverterFilterRegexs.forEach((regex) => {
      this.registerInputListener(regex, this.readPricePayload.bind(this));
    });
    this.registerInputListener(
      /^payload$/g,
      this.readHeatpumpPayload.bind(this),
    );
    this.scheduleTimerOnFullHours(Date.now());
  }
  readPricePayload(payload: any): boolean {
    if (!this.config) throw new Error("config is not available.");
    let periodsPerHour = 1;
    if (this.config.periodsperhour != undefined && this.config.periodsperhour != 0)
      periodsPerHour = this.config.periodsperhour;
    let rc = convertPrice(periodsPerHour, payload);
    if (undefined != rc) this.priceInfo = rc;
    let st = this.buildNodeRedStatus();
    this.sendNodeRedStatus(st.text, st.color);
      
    // Allow other listeners to process the message
    return false;
  }
  buildNodeRedStatus():{color:"green"|"yellow"|"red", text:string}{
    let pricesAvailable = (this && this.priceInfo && this.priceInfo.prices && this.priceInfo.priceDatas.length > 0);
    let tempAvailable = (this && this.currenttemperature != undefined); 
    let hysteresisAvailable = (this && this.hysteresis != undefined);
    let lastSetPointTimeStr = this.lastSetPointTime ? new Date(this.lastSetPointTime).toLocaleTimeString() : "never";
    return {
      color: (pricesAvailable && tempAvailable && hysteresisAvailable) ? this.lastSetPointTime ? "green":"yellow" : "red",
      text: "Last Update: " + lastSetPointTimeStr + (pricesAvailable ?  "" : "No Prices. ") +
            (tempAvailable ? "" : "No temperature. ") +
            (hysteresisAvailable ? "" : "No hysteresis.")
    }
  }
  readHeatpumpPayload(payload: any) {
    let rc = false;
    if (payload.hasOwnProperty("currenttemperature")) {
      this.currenttemperature = payload.currenttemperature;
      rc = true;
    }
    if (payload.hasOwnProperty("hysteresis")) {
      this.hysteresis = payload.hysteresis;
      rc = true;
    }
    let st = this.buildNodeRedStatus();
    this.sendNodeRedStatus(st.text, st.color);
    return rc;
  }
  protected getEstimconsumptionperiods(currentTime: number): number {
    return 0;
  }
  abstract  getDecreaseTemperaturePerHour(): number;
  waitUntilNextHourTimer: any = undefined;
  protected buildEnergyConsumptionInput(): EnergyConsumptionInput {
    if (!this.priceInfo || !this.priceInfo.priceDatas || !this.priceInfo.prices)
      throw new Error("No Price Data available");
    let eci: EnergyConsumptionInput = {
      priceInfo: this.priceInfo,
      config: this.config,
      decreasetemperatureperhour: this.getDecreaseTemperaturePerHour(),
      hysteresis: this.hysteresis,
      currenttemperature: this.currenttemperature
    };
    if (this.currenttemperature == undefined)
      throw new Error("No current temperature in payload available");
    if (eci.priceInfo == undefined || eci.priceInfo.priceDatas.length == 0)
      throw new Error("No price info available");

    return eci;
  }

  onTime(time: number): void {
    // on Time will always send a payload even in case of errors
    // This makes testing easier
    // if (!this.processOutput(time))
    //   this.send([
    //     {
    //       payload: { error: "See node status" },
    //     },
    //   ]);
    try{
      this.processOutput(time);
    } catch (e) {
        this.sendNotification( e.message,"error")
        this.sendNodeRedStatus( e.message , "red");
    }

  }
  sendNodeRedStatus(message:string, color:string="green"){
    if(this && this.status)
      this.status.bind(this)({
        fill:color,
        shape: "dot",
        text: message} ) 
    else {
            this.log("Unable to set status for error" + message)
        }
  }

  processOutput(time: number): boolean {
    if (this.configInvalid) throw new Error(this.configInvalid);
    let ec: EnergyConsumption;
    try {
      let eci = this.buildEnergyConsumptionInput();
      ec = new EnergyConsumption(eci);
      ec.checkConfig();
    } catch (e) {
      this.sendNodeRedStatus( e.message  + " " + new Date(time).toLocaleTimeString(), "red");
      return false;
    }
    let value = ec.getOutputValue(time);
    if (value) {
        this.lastSetPointTime = time;
        let st = this.buildNodeRedStatus();
        this.sendNodeRedStatus(st.text, st.color);
        this.log("Setpoint " + value + " at " + new Date(time).toLocaleTimeString() +(value != this.lastSetPoint ? " changed":" unchanged"));
        if (value != this.lastSetPoint) {
          if (typeof value === "number")
            this.send([
              {
                payload: value,
                time: time,
              },
            ]);
          else debugger;
          this.lastSetPoint = value;
        }
        return true;
     
    } else
      this.sendNodeRedStatus("No Schedule available","red")

    return false;
  }

  onFullHour(time: number = Date.now()) {
    try {
      this.processOutput(time);
    } catch (e: any) {
      this.sendNodeRedStatus( e.message , "red");
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
        this.onFullHour.bind(this),
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
        this.scheduleTimerOnFullHours.bind(this)(nextFullHour.getTime());
        this.onFullHour.bind(this)();
      }, nextFullHourTime - time);
    }
  }
}
