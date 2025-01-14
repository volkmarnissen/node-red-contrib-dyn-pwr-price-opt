import { ScheduleEntryType } from "./basenode";

export interface HeatingConfig {
  schedule: Array<ScheduleEntryType>;
  name: string;
  tolerance?: number;
  periodlength:number;
  nightstarthour:number;
  nightendhour:number;
  nighttargettemperature:number;
  minimaltemperature:number,
  maximaltemperature:number,
  increasetemperatureperhour:number,
  decreasetemperatureperhour:number,
  designtemperature?:number;
}