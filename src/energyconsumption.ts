import { PriceData } from "./@types/basenode";
import { IpriceInfo } from "./periodgenerator";
import { BaseNodeECConfig } from "./@types/basenodeec";
const factor = 4;// multiplier for noheat -> biggest range
export interface EnergyConsumptionInput{
  config: BaseNodeECConfig;
  priceInfo: IpriceInfo;
  decreasetemperatureperhour: number;
  currenttemperature:number;
  hysteresis:number;
}
export class EnergyConsumption {
  constructor(private inputData: EnergyConsumptionInput) {
    if(this.inputData.config.tolerance == undefined)
      this.inputData.config.tolerance =0;
  }
  private getStartTime(time: number): number {
    this.checkConfig();
    let startPeriodTime = new Date(time);
    let periodlengthInMinutes =   60 / this.inputData.priceInfo.prices.periodsperhour;
    let startMinute = (Math.ceil( startPeriodTime.getMinutes() /
      (periodlengthInMinutes)))*periodlengthInMinutes;
    if (startPeriodTime.getMinutes() != 0)
      startPeriodTime.setMinutes(startMinute);
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
    if (!this.inputData.currenttemperature)
      throw new Error("EnergyConsumption: No currenttemperature in payload");
    if (this.inputData.hysteresis == undefined|| Number.isNaN(this.inputData.hysteresis ))
      throw new Error("EnergyConsumption: No hysteresis in payload");
    if (this.inputData.decreasetemperatureperhour == undefined || Number.isNaN(this.inputData.decreasetemperatureperhour ))
      throw new Error("EnergyConsumption: No decreasetemperatureperhour");

    if (!this.inputData.priceInfo.prices)
      throw new Error("EnergyConsumption: No priceInfo.prices");
    if (!this.inputData.priceInfo.prices.periodsperhour)
      throw new Error("EnergyConsumption: No priceInfo.prices.periodlength");
  }

  
  private getPricesByTimes(startTime: number, periods:number): PriceData[] {
    // Make sure, that time is in Range
    let t = this.getStartTime(startTime);
    if (!this.inputData.priceInfo || !this.inputData.priceInfo.priceDatas)
      return undefined;
    var num:number=0
    let rc = this.inputData.priceInfo.priceDatas.filter(
      (data) => data.start >= t && num ++ < periods
    );

    return rc;
  }
  getNumberOfNoHeatingPeriods(){
    var count=0;
    var temp=this.inputData.currenttemperature;
    this.inputData.priceInfo.priceDatas.forEach(price => {
        temp -= this.inputData.decreasetemperatureperhour / this.inputData.priceInfo.prices.periodsperhour;
        var minTemp;
        if(EnergyConsumption.isNightTime( this.inputData.config,price.start))
            minTemp= this.inputData.config.nighttemperature - this.inputData.hysteresis
        else
          minTemp = this.inputData.config.minimaltemperature - this.inputData.hysteresis
        if( temp > minTemp)
          count++;
    });
    return count;
  }
  getNumberOfHeatingPeriods(periodCount:number){
    if( this.inputData.config.increasetemperatureperhour > 0)
        return Math.floor(periodCount * this.inputData.decreasetemperatureperhour /this.inputData.config.increasetemperatureperhour);
    return 0;
  }
  setValueRanges( ranges:PriceData[], priceRangeSize:number){
     ranges.sort((a,b)=>a.value - b.value);
    let lowestPrice = ranges[0].value + this.inputData.config.tolerance;

    for(let idx:number=0; idx < priceRangeSize;idx++)
      if( ranges[idx].value < lowestPrice){
        ranges[idx].value = 0
      }
    ranges.sort((a,b)=>a.start - b.start);

  }
  getOutputValue(time: number): any {
    var noHeatPeriods = this.getNumberOfNoHeatingPeriods();
    let smallesRange: PriceData[] = structuredClone(this.getPricesByTimes(time,noHeatPeriods));
    var maxPeriods= noHeatPeriods * factor;
    let biggestRange: PriceData[] = structuredClone(this.getPricesByTimes(time,maxPeriods));
    if( biggestRange.length < maxPeriods)
      maxPeriods = biggestRange.length;
    
    var heatPeriods  = this.getNumberOfHeatingPeriods(maxPeriods);
    var outputValue:number=this.inputData.config.minimaltemperature;
    if( noHeatPeriods == 0 || maxPeriods == 0 || heatPeriods ==0)
      return outputValue;
    this.setValueRanges(biggestRange, Math.floor(maxPeriods/heatPeriods))
    if(biggestRange[0].value ==0)
      outputValue = this.inputData.config.maximaltemperature
    else if( null != biggestRange.find((p,idx)=> p.value == 0 && idx <= noHeatPeriods))
      outputValue = this.inputData.config.minimaltemperature
    else {
      this.setValueRanges(smallesRange, 1);
      if( smallesRange[0].value ==0)
        outputValue = this.inputData.config.maximaltemperature
    }
    if( outputValue == this.inputData.config.minimaltemperature && EnergyConsumption.isNightTime(this.inputData.config,time))
      return this.inputData.config.nighttemperature;
    return outputValue;
  }

  static isNightTime(config: BaseNodeECConfig,currentTime: number): boolean {
    if (
      config.nightstarthour == undefined ||
      config.nightendhour == undefined ||
      config.nighttemperature == undefined
    )
      return false;
    let hour = new Date(currentTime).getHours();
    return (
      config.nightstarthour <= hour ||
      config.nightendhour > hour
    );
  }
}
