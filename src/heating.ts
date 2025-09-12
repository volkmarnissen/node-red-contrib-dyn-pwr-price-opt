import { PriceData, TypeDescription } from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNodeEnergyConsumption } from "./basenodeec";
import { priceConverterFilterRegexs } from "./periodgenerator";
const tConfig: TypeDescription = {
  typeFields: [],
  numberFields: [
    { name: "periodlength", required: false },
    { name: "nightstarthour", required: false },
    { name: "nightendhour", required: false },
    { name: "nighttargettemperature", required: false },
    { name: "minimaltemperature", required: true },
    { name: "maximaltemperature", required: true },
    { name: "increasetemperatureperhour", required: true },
    { name: "decreasetemperatureperhour", required: true },
    { name: "designtemperature", required: false },
  ],
  booleanFields: [],
};

export interface ScheduleEntry extends PriceData {
  returnValue?: any;
}

export class HeatingNode extends BaseNodeEnergyConsumption<HeatingConfig> {
  getPeriodLength(): number {
    return this.config.periodlength;
  }
  getCurrentTemperature(): number {
    return this.currenttemperature ;
  }
  getMinimalTemperature(): number {
    return this.config.minimaltemperature ;
  }
  getMaximalTemperature(): number {
    return this.config.maximaltemperature ;
  }
  getIncreaseTemperaturePerHour(): number {
    return this.config.increasetemperatureperhour ;
  }
  getDecreaseTemperaturePerHour() {
    return this.config.decreasetemperatureperhour ;
  }
  getcheapestpriceoutput() {
    return this.config.maximaltemperature;
  }
  gethighestpriceoutput() {
    return this.config.minimaltemperature;
  }
  getNightTimeOutput() {
    return this.config.nighttargettemperature;
  }
  getNightTimeStartHour(): number {
    return this.config.nightstarthour;
  }
  getNightTimeEndHour(): number {
    return this.config.nightendhour;
  }
  getDesignTemperature(): number|undefined {
    return this.config.designtemperature
  }
  getOuterTemperature(): number|undefined {
    return this.outertemperature
  }
  constructor(config: any, RED: any) {
    super(config, tConfig, RED);
    priceConverterFilterRegexs.forEach((regex) => {
      this.registerInputListener(regex, this.readPricePayload.bind(this));
    });
    this.registerInputListener(
      /^payload|currenttemperature$/g,
      this.readHeatpumpPayload.bind(this),
    );
  }
}
export default function register(RED: any): any {
  class HeatingNodeRef extends HeatingNode {
    constructor(config: any) {
      super(config, RED);
    }
  }
  // In unit tests, registerType returns the node class in production, the return code is not used
  return RED.nodes.registerType("Heating", HeatingNodeRef);
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;
