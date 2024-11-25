export interface PriceRangeConfig {
  schedule: Array<ScheduleEntryType>;
  name: string;
  tolerance?: number;
  fromtime: number;
  toTime: number;
  storagecapacity: number;

  outputValueFirst: ValueType;
  outputValueSecond: ValueType;
  outputValueThird: ValueType;
  outputValueLast: ValueType;
  outputValueNoPrices: ValueType;
  outputValueHours: number;
  outputValueLastHours: number;
  sendCurrentValueWhenRescheduling: boolean;
}
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

export interface Payload3Type {
  schedule: Array<ScheduleEntryType>;
  hours: number[];
  source: string;
  config: PriceRangeConfig;
  time: string;
  version: string;
  strategyNodeId: number;
  current: ValueType;
}

export interface TypeDescription {
  typeFields?: string[];
  numberFields?: string[];
  booleanFields?: string[];
}
