export interface BaseNodeECConfig {
  name: string;
  nightstarthour: number;
  nightendhour: number;
  nighttemperature: number;
  minimaltemperature: number;
  maximaltemperature: number;
  increasetemperatureperhour: number;
  decreasetemperatureperhour: number;
  tolerance:number;
}