import { IpriceInfo } from "./priceconverter";
interface IPeriod{
    price:number;
    minTemperature:number;
    maxTemperature:number;
}
const periodLengthInHours = 1
interface IcalculationResult{heating:boolean, price:number, noSolution?: boolean}

export class Simulator{
    constructor( private prices:IpriceInfo, 
        private minMaxTempForHourOfDay:{hour:number, min:number, max:number}[],
        private coolDownTempPerHour:number,
        private heatUpTempPerHour:number){
    }
    periods: IPeriod[];
    maxNumberOfHeatingPeriods:number;
    generatePeriodstable(startHour:number){
        // selects time data from minMaxTempForHourOfDay and prices starting at startTime
        // ending at minimal length of both arrays
    }
    calculateNumberOfPeriods(startTemperature:number):number{
        let tempDiff =  startTemperature -  this.periods.length * periodLengthInHours * this.coolDownTempPerHour/this.heatUpTempPerHour
        if( tempDiff < 0)
            return Math.ceil( - tempDiff/ this.heatUpTempPerHour)
    }
    simulate(startHour:number,startTemperature:number):Promise<boolean>{
        return new Promise<boolean>((resolve, reject)=>{
            this.generatePeriodstable(startHour)
            this.calculateLowestPriceForPeriod(0,startTemperature,0,this.calculateNumberOfPeriods(startTemperature)).then(calcResult=>{
                resolve(calcResult.heating)
            })
        }) 
    }

    calculateLowestPriceForPeriod(periodIndex:number, startTemperature:number, startSumOfPrices:number, numberOfHeatingPeriods:number,heating?:boolean ):Promise<IcalculationResult>{
        return new Promise<IcalculationResult>((resolve, reject)=>{
            let period = this.periods[periodIndex]
            if(numberOfHeatingPeriods <= 0 ) // House is warm enough for rest of periods
                resolve({ heating:false, price: startSumOfPrices})
            // heating can take longer than one period
            // compare the following periods min Temperature with reachable temperature
            // If reachable temperature is too low, there is no solution
            let t = startTemperature
            let nhp = numberOfHeatingPeriods
            for( let i = periodIndex; i < this.periods.length;i++){
                // Impossible to heat to min Temperature in time
                if( this.periods[periodIndex].minTemperature > t ){
                    resolve({heating:false, price:startSumOfPrices, noSolution: true})
                    return
                }
                if(nhp < this.maxNumberOfHeatingPeriods){
                    nhp++;
                    t +=  this.heatUpTempPerHour / periodLengthInHours
                }
                else // heating started too late. There are better solutions
                    resolve({heating:false, price:startSumOfPrices, noSolution: true})
            }
            if( this.periods[periodIndex].minTemperature > startTemperature)
                resolve({ heating:true, price: startSumOfPrices + this.periods[periodIndex].price})
            else if( this.periods[periodIndex].maxTemperature < startTemperature)
                resolve({ heating:false, price: startSumOfPrices })
            else {
                // temperature is in normal range and there are heatingperiods to cover
                let allPromisses:Promise<IcalculationResult>[] = []
                if( this.periods.length < periodIndex-1){
                    allPromisses.push(this.calculateLowestPriceForPeriod( periodIndex+1,startTemperature - this.coolDownTempPerHour,startSumOfPrices, numberOfHeatingPeriods, false))
                    allPromisses.push(this.calculateLowestPriceForPeriod( periodIndex+1,startTemperature + this.coolDownTempPerHour,startSumOfPrices +this.periods[periodIndex].price,numberOfHeatingPeriods - 1, true))
                    Promise.all<IcalculationResult>(allPromisses).then((calcResults)=>{
                         //Choose the cheaper option
                         resolve(calcResults[ calcResults[0].price > calcResults[1].price? 1:0])
                    })
                }
                else{
                    resolve({ heating:heating, price: startSumOfPrices})
                }
            }
        })
    }
}