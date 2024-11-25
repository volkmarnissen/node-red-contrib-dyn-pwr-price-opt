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
  numberFields: [
    "fromTime",
    "toTime",
    "tolerance",
    "outputValueHours",
    "storagecapacity",
  ],
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
  numberFields: ["fromTime", "toTime", "tolerance", "storagecapacity"],
  booleanFields: ["sendCurrentValueWhenRescheduling"],
};
enum RangeIds {
  cheapest = 0,
  intermediate1 = 1,
  intermediate2 = 2,
  mostExpensive = 3,
}
interface ScheduleEntry extends PriceData {
  returnValue?: any;
}
const toleranceInMillis = 100;
export default function register(RED: any): any {
  class StrategyDynamicPowerPricesOptimizerNode extends Strategy<PriceRangeConfig> {
    priceInfo: IpriceInfo | undefined = undefined;
    schedule: ScheduleEntry[] = [];
    constructor(config: any) {
      super(config, tConfig, RED);
      this.registerInputListener(/^payload$/g, this.readPriceData.bind(this));
    }
    readPriceData(msg: any) {
      let rc = convertPrice(msg);
      if (undefined != rc) this.priceInfo = rc;
    }

    waitUntilNextHourTimer: any = undefined;

    onTime(time: number): void {
      if (this.schedule.length == 0) {
        let range = this.getPricesInDateRange(time);
        this.validatePriceData(time, range);
        this.buildSchedule(range);
        this.status.bind(this)({
          fill: "green",
          shape: "dot",
          text: "Last Update at " + new Date(time).toLocaleTimeString(),
        });
      }
      try{
       this.send([
        {
          payload: {
            schedule: this.schedule,
            time: time,
            value: this.getValueFromSchedule(time),
          },
        },
      ]);       
      }catch( e)
      {
        console.log( e)
      }

    }

    private buildSchedule(range: PriceData[]) {
      range.forEach((entry) => {
        this.schedule.push(entry);
      });
      // sort by price
      this.schedule.sort((a, b) => a.value - b.value);
      // Assign cheapest hours to first range
      let idx = 0;
      let rangeValues: any[] = [];
      let cheapestHours = this.config.outputValueHours
      let mostExpHours = this.config.outputValueLastHours
      if( cheapestHours == undefined )
        cheapestHours = 0
      if( mostExpHours == undefined )
        mostExpHours = 0
      while( cheapestHours + mostExpHours > this.config.storagecapacity){
        if( cheapestHours > 0 && cheapestHours > mostExpHours)
          cheapestHours--;
        else
          mostExpHours--;
      }
      if (cheapestHours) {
        this.schedule.every((entry) => {
          // entry.rangeId = RangeIds.cheapest ;
          entry.returnValue = this.config.outputValueFirst;
          idx++;
          return idx < cheapestHours;
        });
      } else 
        rangeValues.push(this.config.outputValueFirst);

      if (this.config.outputValueSecond != undefined) {
        rangeValues.push(this.config.outputValueSecond);
      }

      if (this.config.outputValueThird != undefined)
        rangeValues.push(this.config.outputValueThird);

      let expIdx = mostExpHours
      if (expIdx) {
        this.schedule.forEach((entry, idx) => {
          // entry.rangeId = RangeIds.cheapest ;
          if(idx >= this.schedule.length - mostExpHours - 1 && 
            entry.returnValue == undefined)
            entry.returnValue = this.config.outputValueLast;
        });
      } else if (this.config.outputValueLast != undefined)
        rangeValues.push(this.config.outputValueLast);
      
      // divide other ranges in equal pieces
      let rangeSize = (this.config.storagecapacity - cheapestHours - mostExpHours) / rangeValues.length;
      for (let i = 0; i < this.config.storagecapacity - cheapestHours - mostExpHours; i++) {
        let rangeIdx = Math.floor(i / rangeSize);
        this.schedule[cheapestHours + i].returnValue = rangeValues[rangeIdx];
      }
      //Sort by hour again
      this.schedule.sort((a, b) => a.start - b.start);
    }

    private getPricesInDateRange(startTime: number): PriceData[] {
      // Make sure, that time is in Range
      let d = new Date(startTime);
      d.setMinutes(0);
      d.setSeconds(0);
      d.setMilliseconds(0);
      let t = d.getTime();
      return this.priceInfo.priceDatas.filter(
        (data) => data.start >= t && data.start < t + this.getDuration(),
      );
    }
    private getDuration() {
      return this.config.storagecapacity * 60 * 60 * 1000; // hours to millis
    }
    private validatePriceData(time: number, range: PriceData[]): void {
      // We require at least as many entries as configured in storagecapacity
      if (this.priceInfo == undefined) {
        throw new Error("No Price Data");
      }
      let end = time + this.getDuration();
      if (range.length < this.config.storagecapacity) {
        throw new Error("Not enough Price Data");
      }
    }
    getValueFromSchedule(time: number): any {
      if (this.schedule.length == 0) throw new Error("No Schedule available");
      let rc = this.schedule.filter(
        (entry) =>
          entry.start <= time && entry.start + 60 * 60 * 1000 > entry.start,
      );
      if (rc.length > 1) throw new Error("More than one value found  in schedule");
      if (rc.length == 0) throw new Error("No value found  in schedule");
      if (rc[0].returnValue == undefined) throw new Error("No return value found in schedule");
     return rc[0].returnValue.value;
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
    "Dyn. Pwr. consumption optimization",
    StrategyDynamicPowerPricesOptimizerNode,
  );
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;
