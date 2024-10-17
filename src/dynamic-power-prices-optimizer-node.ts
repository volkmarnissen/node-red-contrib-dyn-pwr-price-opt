import { DateTime } from "luxon";
import {
  MessageType,
  PriceData,
  PriceRangeConfig,
  PriceRangePayload,
  TypeDescription,
} from "./@types/dynamic-power-prices-optimizer-node";
import { Strategy } from "./strategy";
import { convertPrice, IpriceInfo } from "./priceconverter";

const tConfig: TypeDescription = {
  typeFields: [
    "outputValueFirst",
    "outputValueSecond",
    "outputValueThird",
    "outputValueLast",
    "outputValueNoPrices",
  ],
  numberFields: ["fromTime", "toTime", "tolerance", "outputValueHours", "pricedatelimit"],
  booleanFields: ["sendCurrentValueWhenRescheduling"],
};
const tMsg: TypeDescription = {
  typeFields: [
    "outputValueFirst",
    "outputValueSecond",
    "outputValueThird",
    "outputValueLast",
    "outputValueNoPrices",
  ],
  numberFields: ["fromTime", "toTime", "tolerance", "pricedatelimit"],
  booleanFields: ["sendCurrentValueWhenRescheduling"],
};
enum RangeIds {
  cheapest=0,
  intermediate1 = 1,
  intermediate2 = 2,
  mostExpensive = 3

}
interface ScheduleEntry extends PriceData {
  returnValue?:any
}
const toleranceInMillis = 100
export default function register(RED: any): any {
  class StrategyDynamicPowerPricesOptimizerNode extends Strategy<PriceRangeConfig> {
    priceInfo:IpriceInfo |undefined = undefined
    schedule:ScheduleEntry[] = []
    constructor( config: any) {
      super(config, tConfig, RED);
      this.registerInputListener(/^payload$/g, this.readPriceData.bind(this))
    }
    readPriceData(msg:any){
       let rc = convertPrice(msg)
       if( undefined != rc)
        this.priceInfo = rc
    }

    waitUntilNextHourTimer: any = undefined;

    onTime(time: number): void {
      if( this.schedule.length == 0 ){
        let range = this.getPricesInDateRange(time)
        this.validatePriceData(time, range)
        this.buildSchedule(range)
        this.status.bind(this)({ fill:"green", shape:"dot", text: "Last Update at " + new Date(time).toLocaleTimeString()})      
      }
      this.send.bind(this)([ {payload:{schedule: this.schedule, time: time, value: this.getValueFromSchedule(time)  }}]) 
    }

    private buildSchedule(range:PriceData[]){
      range.forEach(entry=>{ this.schedule.push(entry)})
      // sort by price
      this.schedule.sort((a,b)=>a.value - b.value)
      // Assign cheapest hours to first range
      let cheapIdx = this.config.outputValueHours
      let idx = 0
      let rangeValues:any[] = []
    
      if( cheapIdx ){
        this.schedule.every(entry=>{ 
          // entry.rangeId = RangeIds.cheapest ;
          entry.returnValue = this.config.outputValueFirst
          idx++
          return idx < cheapIdx })
          
      }else
        rangeValues.push( this.config.outputValueFirst)
       if( this.config.outputValueSecond != undefined ) {
        rangeValues.push( this.config.outputValueSecond)
        }
     
      if( this.config.outputValueThird != undefined ) 
        rangeValues.push( this.config.outputValueThird)
      if( this.config.outputValueLast != undefined ) 
        rangeValues.push( this.config.outputValueLast)
      // divide other ranges in equal pieces
      let rangeSize = (this.config.pricedatelimit - idx) / rangeValues.length
      for( let i = 0; i < this.config.pricedatelimit - idx; i++){
          let rangeIdx = Math.floor(i / rangeSize )
          this.schedule[idx + i].returnValue = rangeValues[rangeIdx]
      }
      //Sort by hour again
      this.schedule.sort((a,b)=>a.start - b.start)
    }

    private getPricesInDateRange(startTime:number):PriceData[]{
      // Make sure, that time is in Range
      let d = new Date(startTime)
      d.setMinutes(0)
      d.setSeconds(0)
      d.setMilliseconds(0)
      let t = d.getTime()
      return this.priceInfo.priceDatas.filter(data=>data.start >= t && data.start < t + this.getDuration() )
    }
    private getDuration(){
      return  this.config.pricedatelimit * 60 * 60 * 1000 // hours to millis
     }
    private validatePriceData(time:number, range:PriceData[]):void{
      // We require at least as many entries as configured in pricedatelimit
      if( this.priceInfo == undefined ){
        throw new Error( "No Price Data")
      }
      let end = time + this.getDuration()
      if(range.length < this.config.pricedatelimit){
        throw new Error("Not enough Price Data")
      }
    }
    getValueFromSchedule(time:number):any{
      if(this.schedule.length == 0)
        throw new Error( "No Schedule available") 
      let rc = this.schedule.filter(entry=>entry.start <= time && entry.start + 60*60 * 1000 > entry.start )
      if( rc.length > 1)
        throw new Error( "More than one value found")
      if( rc.length == 0)
        throw new Error( "No value found") 
      return rc[0].returnValue.value
    }
    onFullHour(time:number = Date.now()) {
      try{
        this.onTime(time)
       }
      catch( e:any){
        this.status({ fill:"red", shape:"dot", text:e.message})
      }
    }
    scheduleTimerOnFullHours(time: number) {
      let nextFullHour = new Date(time+toleranceInMillis);
      if (
        nextFullHour.getMilliseconds() < 2 * toleranceInMillis &&
        nextFullHour.getSeconds() == 0 &&
        nextFullHour.getMinutes() == 0
      ){
         this.waitUntilNextHourTimer = setInterval(
          this.onFullHour,
          1000 * 60 * 60,
        );
        this.onFullHour(time)
      }
      else {
        nextFullHour = new Date(time)
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
    "Dyn. Pwr. consumption optimization",
    StrategyDynamicPowerPricesOptimizerNode,
  );
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;

// export function StrategyPriceRangesNode(RED:any ) {
//   function StrategyPriceRangesNode(config) {
//       RED.nodes.createNode(this, config);
//     const node = this;
//     node.status({});

//     node.on("close", function () {
//       clearTimeout(node.schedulingTimeout);
//     });

//     node.on("input", function (msg) {
//       strategyOnInput(node, fixOutputValues(config, tConfig), fixOutputValues(msg,tMsg), doPlanning, calcNullSavings);
//     });
//   }
//   RED.nodes.registerType("ps-strategy-price-ranges", StrategyPriceRangesNode);
// };

function doPlanning(node, priceData) {
  const values = priceData.map((pd) => pd.value);
  const startTimes = priceData.map((pd) => pd.start);

  const from = parseInt(node.fromTime);
  const to = parseInt(node.toTime);
  const periodStatus = [];
  const startIndexes = [];
  const endIndexes = [];
  let currentStatus =
    from < (to === 0 && to !== from ? 24 : to) ? "Outside" : "StartMissing";
  let hour;
  startTimes.forEach((st, i) => {
    hour = DateTime.fromISO(st).hour;
    if (hour === to && to === from && currentStatus === "Inside") {
      endIndexes.push(i - 1);
    }
    if (hour === to && to !== from && i > 0) {
      if (currentStatus !== "StartMissing") {
        endIndexes.push(i - 1);
      }
      currentStatus = "Outside";
    }
    if (hour === from) {
      currentStatus = "Inside";
      startIndexes.push(i);
    }
    periodStatus[i] = currentStatus;
  });
  if (currentStatus === "Inside" && hour !== (to === 0 ? 23 : to - 1)) {
    // Last period incomplete
    let i = periodStatus.length - 1;
    do {
      periodStatus[i] = "EndMissing";
      hour = DateTime.fromISO(startTimes[i]).hour;
      i--;
    } while (periodStatus[i] === "Inside" && hour !== from);
    startIndexes.splice(startIndexes.length - 1, 1);
  }
  if (hour === (to === 0 ? 23 : to - 1)) {
    endIndexes.push(startTimes.length - 1);
  }

  const onOff = [];

  // Set onOff for hours that will not be planned
  periodStatus.forEach((s, i) => {
    onOff[i] =
      s === "Outside"
        ? node.outputOutsidePeriod
        : s === "StartMissing" || s === "EndMissing"
          ? node.outputIfNoSchedule
          : null;
  });

  startIndexes.forEach((s, i) => {
    //  makePlan(node, values, onOff, s, endIndexes[i]);
  });

  return onOff;
}

// function makePlan(node, values, onOff, fromIndex, toIndex) {
//   const valuesInPeriod = values.slice(fromIndex, toIndex + 1);
//   const res = node.doNotSplit
//     ? getBestContinuous(valuesInPeriod, node.hoursOn)
//     : getBestX(valuesInPeriod, node.hoursOn);
//   const sumPriceOn = res.reduce((p, v, i) => {
//     return p + (v ? valuesInPeriod[i] : 0);
//   }, 0);
//   const average = sumPriceOn / node.hoursOn;
//   res.forEach((v, i) => {
//     onOff[fromIndex + i] =
//       node.maxPrice == null
//         ? v
//         : node.doNotSplit
//         ? v && average <= node.maxPrice
//         : v && valuesInPeriod[i] <= node.maxPrice;
//   });
//   return onOff;
// }
