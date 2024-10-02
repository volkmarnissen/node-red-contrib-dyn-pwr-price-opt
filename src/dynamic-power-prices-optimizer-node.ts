import { DateTime }  from 'luxon';
import { MessageType, PriceData, PriceRangeConfig, PriceRangePayload, TypeDescription } from './@types/dynamic-power-prices-optimizer-node';
import { Strategy } from './strategy';


const tConfig:TypeDescription = {
  typeFields: ["outputValueFirst",
 "outputValueSecond",
 "outputValueThird",
 "outputValueLast",
 "outputValueNoPrices"
],
 numberFields:[
 "fromTime",
 "toTime",
 "tolerance",
 "pricedatelimit",
],
 booleanFields:[ "sendCurrentValueWhenRescheduling"]    
}
const  tMsg:TypeDescription = {
 typeFields: ["outputValueFirst",
"outputValueSecond",
"outputValueThird",
"outputValueLast",
"outputValueNoPrices"
],
numberFields:[
"fromTime",
"toTime",
"tolerance",
"pricedatelimit",
],
booleanFields:[ "sendCurrentValueWhenRescheduling"]    
}

export default function register(RED: any):any {

  class StrategyDynamicPowerPricesOptimizerNode  extends Strategy<PriceData,PriceRangeConfig> {
      constructor(public config: any) {
          super(config, tConfig, RED)          
       }
       onPriceData(_priceData: PriceData[]): void {
         console.log("Now it's working")
       }
       onTime(time: string): void {
        throw new Error('Method not implemented.');
      }
  }
  // In unit tests, registerType returns the node class in production, the return code is not used
  return RED.nodes.registerType("Dyn. Pwr. consumption optimization", StrategyDynamicPowerPricesOptimizerNode);
};

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register

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
  let currentStatus = from < (to === 0 && to !== from ? 24 : to) ? "Outside" : "StartMissing";
  let hour;
  startTimes.forEach((st, i) => {
    hour = DateTime.fromISO(st).hour;
    if (hour === to && to === from && currentStatus === "Inside") {
      endIndexes.push(i - 1);
    }
    if (hour === to && to !== from && i > 0 ) {
      if(currentStatus !== "StartMissing") {
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
