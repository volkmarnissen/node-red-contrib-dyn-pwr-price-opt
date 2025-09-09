import { HotwaterConfig } from "./hotwater";

export interface HeatingConfig extends HotwaterConfig {
  designtemperature?: number;
}
