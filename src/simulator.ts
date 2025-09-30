import { IpriceInfo } from "./../src/periodgenerator";
import { ScheduleEntry } from "./energyconsumption";
let counter =0;
const periodLengthInHours = 1;
interface IcalculationResult {
  heating: boolean;
  price: number;
  noSolution?: boolean;
  finished?: boolean;
}
const noheattemperature = 21;
interface IsimulationContext {
  requiredHeatingPeriods: number;
}
export class Simulator {
  coolDownTempPerHour: number;
  constructor(
    private schedule: ScheduleEntry[],
    private coolDownTempAtDesinTempPerHour: number,
    private outerTemp: number,
    private heatUpTempPerHour: number,
    private designTemp: number = undefined,
  ) {
    if (designTemp != undefined)
      this.coolDownTempPerHour =
        ((this.outerTemp - this.designTemp) /
          (noheattemperature - this.designTemp)) *
        this.coolDownTempAtDesinTempPerHour;
    else this.coolDownTempPerHour = this.coolDownTempAtDesinTempPerHour;
  }
  private getScheduleIndexForHour(time: number) {
    let endPeriodTime = new Date(time);
    endPeriodTime.setHours(endPeriodTime.getHours() + 1);
    endPeriodTime.setSeconds(0);
    endPeriodTime.setMinutes(0);
    endPeriodTime.setMilliseconds(0);

    return this.schedule.findIndex(
      (s) => s.start >= time && s.start < endPeriodTime.getTime(),
    );
  }
  simulate(startHour: number, startTemperature: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      let heatupHours =
        (this.schedule[0].maxtemperature - startTemperature) /
        this.heatUpTempPerHour;
      let simulationContext: IsimulationContext = {
        requiredHeatingPeriods: heatupHours,
      };
      let periodIndex = this.getScheduleIndexForHour(startHour);
      let calcResult = this.calculateLowestPriceForPeriod(
        periodIndex,
        startTemperature,
        simulationContext,
      );
      resolve(
        calcResult.heating
          ? this.schedule[periodIndex].maxtemperature
          : this.getNoHeatingTemperature(periodIndex),
      );
      // }).catch( (e:any)=>{
      //     if( this.schedule[periodIndex].mintemperature > startTemperature )
      //         resolve(this.schedule[periodIndex].maxtemperature) // heating
      //     reject(e)
      // })
    });
  }
  private getNoHeatingTemperature(periodIndex) {
    return this.schedule[periodIndex].mintemperature;
  }
  private calculateLowestPriceForPeriod(
    periodIndex: number,
    temperature: number,
    simulationContext: IsimulationContext,
    startSumOfPrices: number = 0,
    heatingPeriods: number = 0,
  ): IcalculationResult {
    if( counter++ %10000000000 == 0)
        console.log(" " + periodIndex + " " +  counter )
    if(periodIndex >= this.schedule.length)
        return { heating: false, price: startSumOfPrices, finished:true };
    
    if (this.schedule[periodIndex].mintemperature >= temperature)
      // House is warm enough
      return { heating: false, price: startSumOfPrices };
    // Performance improvement, check if the min temp can be
    // reached for all the following schedule
    let t = temperature;
    for (let i = periodIndex; i < this.schedule.length; i++) {
      // Impossible to heat to min Temperature in time
      if (this.schedule[periodIndex].mintemperature > t) {
        return { heating: false, price: startSumOfPrices, noSolution: true };
      }
      if (i < this.schedule.length) t += this.heatUpTempPerHour;
      else {
        // heating started too late. There are better solutions
        return { heating: false, price: startSumOfPrices, noSolution: true };
      }
    }
    if (this.schedule[periodIndex].mintemperature > temperature)
      return {
        heating: true,
        price: startSumOfPrices + this.schedule[periodIndex].value,
      };
    else if (this.schedule[periodIndex].maxtemperature < temperature)
      return { heating: false, price: startSumOfPrices };
    else {
      // temperature is in normal range and there are heatingschedule to cover
      let calcResults: IcalculationResult[] = [];
      let heatupHours =
        (this.schedule[periodIndex].maxtemperature - temperature) /
        this.heatUpTempPerHour;
      if (heatupHours > 1) heatupHours = 1; // maximum 1 hour heating per period, because this is the periodlength
      if (heatupHours < 0.5)
        if (temperature < this.schedule[periodIndex].maxtemperature)
          heatupHours = 0.5; // minimum 0.5 hours. The heatpump should not run for shorter periods
        else return { heating: false, price: startSumOfPrices }; // No more heating required
      // 0.5 <= heatUpHours <= 1
      calcResults.push(
        this.calculateLowestPriceForPeriod(
          periodIndex + 1,
          temperature - this.coolDownTempPerHour,
          simulationContext,
          startSumOfPrices,
          heatingPeriods,
        ),
      );
      calcResults.push(
        this.calculateLowestPriceForPeriod(
          periodIndex + 1,
          temperature + heatupHours * this.heatUpTempPerHour,
          simulationContext,
          startSumOfPrices + heatupHours * this.schedule[periodIndex].value,
          heatingPeriods + 1,
        ),
      );
      //Promise.allSettled<IcalculationResult>(allPromisses).then((calcResults)=>{
      //Choose the cheapest option
      let rc: IcalculationResult = undefined;
      if (calcResults[0] != undefined && !calcResults[0].noSolution )
        if (
          calcResults.length &&
          calcResults[1] != undefined &&
          !calcResults[1].noSolution
        )
          rc =
            calcResults[0].price > calcResults[1].price
              ? calcResults[1]
              : calcResults[0];
        else rc = calcResults[0];
      // result 0 rejected
      else if (
        calcResults.length &&
        calcResults[1] != undefined &&
        !calcResults[1].noSolution
      )
        rc = calcResults[1];
      return rc;
      // else
      //   reject(new Error( "No result")
      //   })
    }
  }
}
//  private calculateLowestPriceForPeriod( periodIndex:number, temperature:number, startSumOfPrices:number, heating?:boolean):IcalculationResult{
//       return this.calculateLowestPriceForPeriodCb.bind(this,periodIndex,temperature,startSumOfPrices,heating)
// }
