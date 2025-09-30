import { BaseNodeECConfig } from "./basenodeec";

export interface HeatingConfig extends BaseNodeECConfig {
  designtemperature?: number;
}
