import { start } from "repl";
import { PriceData } from "./@types/basenode";
import { ScheduleEntry } from "./heating";
import { IpriceInfo } from "./periodgenerator";

export enum HighestPriceUsageEnum {
  consumption,
  storage,
}
export interface EnergyConsumptionInput {
  priceInfo: IpriceInfo;
  estimconsumptionperiods: number;
  estimstoreperiods?: number;
  highestpriceperiodsusage?: HighestPriceUsageEnum;
  cheapestpriceoutput: any;
  outputValueSecond?: any;
  outputValueThird?: any;
  highestpriceoutput: any;
  nighttimeoutput: any,
  nighttimestarthour: number,
  nighttimeendhour:number
}
export class EnergyConsumption {
  schedule: ScheduleEntry[] = [];
  constructor(private config: EnergyConsumptionInput) {}
  private getStartTime(time: number): number {
    this.checkConfig();
    let startPeriodTime = new Date(time);
    let periodMinutes = Math.round(
      Math.floor(
        startPeriodTime.getMinutes() /
          60 /
          this.config.priceInfo.prices.periodlength,
      ) *
        (60 * this.config.priceInfo.prices.periodlength),
    );
    if (startPeriodTime.getMinutes() != 0)
      startPeriodTime.setMinutes(periodMinutes);
    startPeriodTime.setSeconds(0);
    startPeriodTime.setMilliseconds(0);
    return startPeriodTime.getTime();
  }
  checkConfig() {
    if (!this.config) throw new Error("EnergyConsumption: No config");
    if (!this.config.priceInfo)
      throw new Error("EnergyConsumption: No priceInfo");
    if (!this.config.priceInfo.priceDatas)
      throw new Error("EnergyConsumption: No priceInfo.priceDatas");
    if (!this.config.priceInfo.prices)
      throw new Error("EnergyConsumption: No priceInfo.prices");
    if (!this.config.priceInfo.prices.periodlength)
      throw new Error("EnergyConsumption: No priceInfo.prices.periodlength");
  }
  private getHighestPriceOutout(entry:ScheduleEntry):any{
    let hour = new Date(entry.start).getHours()
    if (
      this.config.nighttimestarthour != undefined && this.config.nighttimestarthour >= new Date(entry.start).getHours() &&
      this.config.nighttimeendhour != undefined && this.config.nighttimeendhour < new Date(entry.start).getHours() &&
      this.config.nighttimeoutput != undefined &&
      (hour < this.config.nighttimeendhour ||
        hour >= this.config.nighttimestarthour)
    )
    return this.config.nighttimeoutput 
    return  this.config.highestpriceoutput;

  }
  private buildSchedule(currentTime: number) {
    let range: PriceData[] = this.getPricesInDateRange(currentTime);
    if (range == undefined || range.length == 0) {
      this.schedule.forEach((s) => {
        s.returnValue = undefined;
      });
      return;
    }

    range.forEach((entry) => {
      this.schedule.push(entry);
    });
    // sort by price
    this.schedule.sort((a, b) => a.value - b.value);
    // Assign cheapest hours to first range
    let idx = 0;
    let rangeValues: any[] = [];
    let cheapestHours = this.config.estimstoreperiods;
    // let mostExpHours = this.config.new property;
    let mostExpHours = 0; // currently not implemented
    if (cheapestHours == undefined) cheapestHours = 0;
    if (mostExpHours == undefined) mostExpHours = 0;
    let priceRangeSize =
      this.config.estimconsumptionperiods < range.length
        ? this.config.estimconsumptionperiods
        : range.length;

    if (cheapestHours + mostExpHours > (priceRangeSize * 2) / 3) {
      cheapestHours = 0;
      mostExpHours = 0;
    }
    if (cheapestHours) {
      this.schedule.forEach((entry, idx) => {
        // entry.rangeId = RangeIds.cheapest ;
        if (idx < cheapestHours)
          entry.returnValue = this.config.cheapestpriceoutput;
      });
    }
    if (this.config.cheapestpriceoutput)
      rangeValues.push(this.config.cheapestpriceoutput);

    if (this.config.outputValueSecond != undefined) {
      rangeValues.push(this.config.outputValueSecond);
    }

    if (this.config.outputValueThird != undefined)
      rangeValues.push(this.config.outputValueThird);

    let expIdx = mostExpHours;
    if (expIdx) {
      this.schedule.forEach((entry, idx) => {
        // entry.rangeId = RangeIds.cheapest ;
        if (
          idx >= this.schedule.length - mostExpHours &&
          entry.returnValue == undefined
        ){
            entry.returnValue = this.getHighestPriceOutout(entry);
        }
      });
    }
    if (this.config.highestpriceoutput != undefined)
      rangeValues.push(this.config.highestpriceoutput);
    // divide other ranges in equal pieces
    let rangeSize = Math.floor(
      (priceRangeSize - cheapestHours - mostExpHours) /
        (rangeValues.length - (cheapestHours ? 1 : 0) - (mostExpHours ? 1 : 0)),
    );
    for (let i = cheapestHours; i < priceRangeSize - mostExpHours; i++) {
      let rangeIdx =
        Math.floor((i - cheapestHours) / rangeSize) + (cheapestHours ? 1 : 0);
      if (this.schedule && this.schedule.length > i)
        this.schedule[i].returnValue = rangeValues[rangeIdx];
    }
    //Sort by hour again
    this.schedule.sort((a, b) => a.start - b.start);
  }
  private getPricesInDateRange(startTime: number): PriceData[] {
    // Make sure, that time is in Range
    let t = this.getStartTime(startTime);
    if (
      !this.config.priceInfo ||
      !this.config.priceInfo.priceDatas ||
      !this.config.estimconsumptionperiods
    )
      return undefined;
    return this.config.priceInfo.priceDatas.filter(
      (data) =>
        data.start >= t && data.start < t + this.getStorygeCapacityDuration(),
    );
  }
  private getStorygeCapacityDuration() {
    return this.config.estimconsumptionperiods * 60 * 60 * 1000; // hours to millis
  }
  getOutputValue(time: number): any {
    this.buildSchedule(time);
    let rc = this.schedule.filter(
      (entry) =>
        entry.start <= time &&
        time <
          entry.start +
            60 * 60 * this.config.priceInfo.prices.periodlength * 1000,
    );
    if (rc && rc.length > 1)
      throw new Error("More than one value found  in schedule");
    if (!rc || rc.length == 0) return this.config.highestpriceoutput; // no heating
    if (!this.schedule || this.schedule.length == 0) return undefined;

    if (rc[0].returnValue == undefined)
      throw new Error("No return value found in schedule");
    return rc[0].returnValue;
  }
}
