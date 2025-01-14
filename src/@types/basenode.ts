

export interface ScheduleEntryType {
  time: number;
  value: ValueType;
}
export interface PriceData {
  value: number;
  start: number;
}

export interface MessageType {
  payload: {
    priceData?: PriceData[];
    time?: number;
    config?: any;
  };
}
export interface PriceRangePayload {}

export interface ValueType {
  value: boolean | number;
  type: "bool" | "num";
}
export interface PlanType {
  hours: number[];
  schedule: Array<ScheduleEntryType>;
  source: string;
}

export interface IfieldDescription{
  name:string,
  required:boolean
}

export interface TypeDescription {
  typeFields?: IfieldDescription[];
  numberFields?: IfieldDescription[];
  booleanFields?: IfieldDescription[];
}
