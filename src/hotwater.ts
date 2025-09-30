import { TypeDescription } from "./@types/basenode";
import { HotwaterConfig } from "./@types/hotwater";
import { BaseNodeEnergyConsumption } from "./basenodeec";
const tConfig: TypeDescription = {
  typeFields: [],
  numberFields: [
    { name: "periodsperhour", required: false },
    { name: "nightstarthour", required: false },
    { name: "nightendhour", required: false },
    { name: "nighttemperature", required: false },
    { name: "minimaltemperature", required: true },
    { name: "maximaltemperature", required: true },
    { name: "increasetemperatureperhour", required: true },
    { name: "decreasetemperatureperhour", required: true }
  ],
  booleanFields: [],
};
export default function register(RED: any): any {
  class HotwaterNode extends BaseNodeEnergyConsumption<HotwaterConfig> {
    constructor(config: any) {
      super(config,  tConfig,RED);
    }
    getDesignTemperature(): number | undefined {
      return undefined;
    }
    getDecreaseTemperaturePerHour() {
    return this.config.decreasetemperatureperhour;
  }
  }
  // In unit tests, registerType returns the node class in production, the return code is not used
  return RED.nodes.registerType("Hotwater", HotwaterNode);
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;
