import { DateTime } from "luxon";

export interface PriceRangeConfig {
    schedule:Array<ScheduleEntryType>;
    name: string,
    tolerance?: number
    fromtime:number,
    toTime:  number,
    pricedatelimit:number,

    outputValueFirst: ValueType,
    outputValueSecond: ValueType,
    outputValueThird: ValueType,
    outputValueLast: ValueType,
    outputValueNoPrices:ValueType,
    outputValueHours: number,
    outputValueLastOption: number,
   sendCurrentValueWhenRescheduling: boolean,
}
export interface ScheduleEntryType{
    time: DateTime,
    value:ValueType,
}
export interface PriceData {
    value: any,
    start: string
}

export interface MessageType{
    payload: {
        priceData?: PriceData[],
        time?:string,
        config?: any
    }
}
export interface PriceRangePayload{

}

export interface  ValueType{
    value: boolean|number,
    type: "bool"| "num"
}
export interface PlanType {
    hours:DateTime [],
    schedule:Array<ScheduleEntryType>,
    source: string
}

export interface Payload3Type 
{
    schedule: Array<ScheduleEntryType>,
    hours: DateTime [],
    source: string,
    config: PriceRangeConfig,
    time: string,
    version: string,
    strategyNodeId: number,
    current: ValueType
}

export interface TypeDescription{
     typeFields?:string[],
        numberFields?:string[],
        booleanFields?:string[]
}