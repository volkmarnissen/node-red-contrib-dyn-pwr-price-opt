import { start } from "repl";
import { PriceData } from "./@types/basenode";
import { ScheduleEntry } from "./heating";
import { IpriceInfo } from "./periodgenerator";
import { tmpdir } from "os";
const maxHours = 48; // maximal number of hours in forecast
const noheattemperature = 21;

export enum HighestPriceUsageEnum {
  consumption,
  storage,
}
export interface EnergyConsumptionInput {
  priceInfo: IpriceInfo;
  highestpriceperiodsusage?: HighestPriceUsageEnum;
  nighttimeoutput?: any;
  nighttimestarthour?: number;
  nighttimeendhour?: number;
  currenttemperature: number;
  minimaltemperature: number;
  maximaltemperature: number;
  increasetemperatureperhour: number;
  decreasetemperatureperhour: number;
  designtemperature?: number;
  outertemperature?: number;
}
export class EnergyConsumption {
  schedule: ScheduleEntry[] = [];
  constructor(private inputData: EnergyConsumptionInput) {}
  private getStartTime(time: number): number {
    this.checkConfig();
    let startPeriodTime = new Date(time);
    let periodMinutes = Math.round(
      Math.floor(
        startPeriodTime.getMinutes() /
          60 /
          this.inputData.priceInfo.prices.periodlength,
      ) *
        (60 * this.inputData.priceInfo.prices.periodlength),
    );
    if (startPeriodTime.getMinutes() != 0)
      startPeriodTime.setMinutes(periodMinutes);
    startPeriodTime.setSeconds(0);
    startPeriodTime.setMilliseconds(0);
    return startPeriodTime.getTime();
  }
  checkConfig() {
    if (!this.inputData) throw new Error("EnergyConsumption: No config");
    if (!this.inputData.priceInfo)
      throw new Error("EnergyConsumption: No priceInfo");
    if (!this.inputData.priceInfo.priceDatas)
      throw new Error("EnergyConsumption: No priceInfo.priceDatas");
    if (!this.inputData.priceInfo.prices)
      throw new Error("EnergyConsumption: No priceInfo.prices");
    if (!this.inputData.priceInfo.prices.periodlength)
      throw new Error("EnergyConsumption: No priceInfo.prices.periodlength");
  }

  private buildSchedule(currentTime: number) {
    let range: PriceData[] = structuredClone(
      this.getPricesInDateRange(currentTime),
    );
    this.schedule.forEach((s) => {
      if (s.returnValue != undefined) delete s.returnValue;
    });
    if (range == undefined || range.length == 0) return;
    range.forEach((entry) => {
      this.schedule.push(entry);
    });
     // Assign cheapest hours to first range
    let idx = 0;
    let rangeValues: any[] = [];
    let cheapestHours = this.getEstimstoreperiods();
    // let mostExpHours = this.config.new property;
    if (cheapestHours == undefined) 
      cheapestHours = 0;
    let estimconsumptionperiods = this.getEstimconsumptionPeriods(currentTime);
    let priceRangeSize = estimconsumptionperiods;
    if (estimconsumptionperiods >= range.length)
      priceRangeSize = range.length; // range is smaller than estim. consum.
    else if (estimconsumptionperiods == 0 && range.length > 0)
      priceRangeSize = 1; // immediate heating is required we need price for this.
    this.schedule.splice(priceRangeSize);
    // sort by price
    this.schedule.sort((a, b) => a.value - b.value);

    // if (cheapestHours + mostExpHours > (priceRangeSize * 2) / 3) {
    //   cheapestHours = 0;
    //   mostExpHours = 0;
    // }
    if (cheapestHours) {
      this.schedule.forEach((entry, idx) => {
        // entry.rangeId = RangeIds.cheapest ;

        if (idx < cheapestHours)
          entry.returnValue = this.inputData.maximaltemperature;
      });
    }
    // if (this.config.cheapestpriceoutput)
    //   rangeValues.push(this.config.cheapestpriceoutput);

    // if (this.config.outputValueSecond != undefined) {
    //   rangeValues.push(this.config.outputValueSecond);
    // }

    // if (this.config.outputValueThird != undefined)
    //   rangeValues.push(this.config.outputValueThird);
    // let mostExpHours = range.length - cheapestHours;
    let mostExpHours = range.length - cheapestHours;
    let expIdx = mostExpHours;
    if (expIdx) {
      this.schedule.forEach((entry, idx) => {
        // entry.rangeId = RangeIds.cheapest ;
        if (
          idx >= this.schedule.length - mostExpHours &&
          entry.returnValue == undefined
        ) {
          if (this.isNightTime(entry.start))
            entry.returnValue = this.inputData.nighttimeoutput;
          else entry.returnValue = this.inputData.minimaltemperature;
        }
      });
    }
    if (this.inputData.minimaltemperature != undefined)
      rangeValues.push(this.inputData.minimaltemperature);
    // divide other ranges in equal pieces
    // only. required for more than two price ranges
    // let rangeSize = Math.floor(
    //   (priceRangeSize - cheapestHours - mostExpHours) /
    //     (rangeValues.length - (cheapestHours ? 1 : 0) - (mostExpHours ? 1 : 0)),
    // );
    // for (let i = cheapestHours; i < priceRangeSize - mostExpHours; i++) {
    //   let rangeIdx =
    //     Math.floor((i - cheapestHours) / rangeSize) + (cheapestHours ? 1 : 0);
    //   if (this.schedule && this.schedule.length > i)
    //     this.schedule[i].returnValue = rangeValues[rangeIdx];
    // }
    //Sort by hour again
    this.schedule.sort((a, b) => a.start - b.start);
  }
  private getPricesInDateRange(startTime: number): PriceData[] {
    // Make sure, that time is in Range
    let t = this.getStartTime(startTime);
    if (!this.inputData.priceInfo || !this.inputData.priceInfo.priceDatas)
      return undefined;
    let storageCapacity = this.getStorageCapacityDuration(startTime);
    let rc = this.inputData.priceInfo.priceDatas.filter(
      (data) => data.start >= t && t <= data.start + storageCapacity,
    );
    return rc;
  }
  private getStorageCapacityDuration(currentTime: number) {
    // return at least one period
    return this.getEstimconsumptionPeriods(currentTime) * 60 * 60 * 1000; // hours to millis
  }
  getOutputValue(time: number): any {
    this.buildSchedule(time);
    let rc = this.schedule.filter(
      (entry) =>
        entry.start <= time &&
        time <
          entry.start +
            60 * 60 * this.inputData.priceInfo.prices.periodlength * 1000,
    );
    if (rc && rc.length > 1)
      throw new Error("More than one value found  in schedule");
    if (!rc || rc.length == 0) return this.inputData.minimaltemperature; // no heating
    if (!this.schedule || this.schedule.length == 0) return undefined;

    if (rc[0].returnValue == undefined)
      throw new Error("No return value found in schedule");
    return rc[0].returnValue;
  }
  getEstimconsumptionPeriods(currentTime: number): number {
    if (this.inputData.currenttemperature == undefined) {
      console.log("No current temperature available in payload");
      return (
        this.inputData.minimaltemperature /
        this.inputData.decreasetemperatureperhour
      );
    }
    if (this.isNightTime(currentTime)) {
      if (this.inputData.currenttemperature < this.inputData.nighttimeoutput)
        return 0; // immediate heating required
    } else {
      if (this.inputData.currenttemperature < this.inputData.minimaltemperature)
        return 0; // immediate heating required
    }
    let minimaltemperature = this.isNightTime(currentTime)
      ? this.inputData.nighttimeoutput
      : this.inputData.minimaltemperature;

    if (this.inputData.designtemperature == undefined)
      // hotwater
      return Math.floor(
        (this.inputData.currenttemperature - minimaltemperature) /
          this.inputData.decreasetemperatureperhour,
      );
    // Heating
    let decreasetemperatureperhour = this.inputData.decreasetemperatureperhour;
    if (
      this.inputData.outertemperature != undefined &&
      this.inputData.designtemperature != undefined
    ) {
      if (this.inputData.outertemperature > noheattemperature) return maxHours; // no heating required
      decreasetemperatureperhour *=
        (noheattemperature - this.inputData.outertemperature) /
        (noheattemperature - this.inputData.designtemperature);
    }
    let periods = Math.floor(
      ((this.inputData.currenttemperature - minimaltemperature) /
        decreasetemperatureperhour) *
        this.getPeriodLength(),
    );
    if (this.isNightTime(currentTime)) {
      let currentHour = new Date(currentTime).getHours();
      let remainingNightPeriods = this.inputData.nighttimeendhour - currentHour;
      if (currentHour > this.inputData.nighttimestarthour)
        remainingNightPeriods =
          24 - currentHour + this.inputData.nighttimeendhour;
      if (periods > remainingNightPeriods)
        periods = Math.floor(
          ((this.inputData.currenttemperature -
            this.inputData.minimaltemperature) /
            decreasetemperatureperhour) *
            this.getPeriodLength(),
        );
    }
    return periods;
  }

  isNightTime(currentTime: number): boolean {
    if (
      this.inputData.nighttimestarthour == undefined ||
      this.inputData.nighttimeendhour == undefined ||
      this.inputData.nighttimeoutput == undefined
    )
      return false;
    let hour = new Date(currentTime).getHours();
    return (
      this.inputData.nighttimestarthour <= hour ||
      this.inputData.nighttimeendhour > hour
    );
  }
  getPeriodLength() {
    let periodlength = 1;
    if (
      this.inputData.priceInfo &&
      this.inputData.priceInfo.prices &&
      this.inputData.priceInfo.prices.periodlength
    )
      periodlength = this.inputData.priceInfo.prices.periodlength;
    return periodlength;
  }
  getEstimstoreperiods(): number {
    let currenttemperature = this.inputData.currenttemperature;
    if (this.inputData.currenttemperature == undefined)
      currenttemperature = this.inputData.minimaltemperature;
    if (currenttemperature != undefined && this.inputData.maximaltemperature) {
      if (currenttemperature > this.inputData.maximaltemperature) return 0; // no heating required
    }
    let sp =
      ((this.inputData.maximaltemperature - currenttemperature) /
        this.inputData.increasetemperatureperhour) *
      this.getPeriodLength();
    if (sp > 0)
      if (sp < 1)
        return 1; // too low, heating is required, but floor would return 0
      else return Math.floor(sp);
    else return 0; // too hot no heating required
  }
}
