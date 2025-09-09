import { PriceData, TypeDescription } from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNodeEnergyConsumption } from "./basenodeec";
import { IpriceInfo, priceConverterFilterRegexs } from "./periodgenerator";

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
const noheattemperature = 21;

export interface ScheduleEntry extends PriceData {
  returnValue?: any;
}

export class HeatingNode extends BaseNodeEnergyConsumption<HeatingConfig> {
  priceInfo: IpriceInfo | undefined = undefined;
  outertemperature: number | undefined = undefined;
  currenttemperature: number | undefined = undefined;
  lastSetPoint: number | undefined = undefined;
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
  getEstimconsumptionperiods(): number {
    if(this.config.designtemperature == undefined) // hotwater
      if( this.currenttemperature == undefined ){
        console.log("No current temperature available in payload")
        return this.config.minimaltemperature /this.config.decreasetemperatureperhour
      }
      else
        if(this.currenttemperature > this.config.minimaltemperature)
          return 0 // no heating required
        else
          return (this.config.minimaltemperature - this.currenttemperature)*this.config.decreasetemperatureperhour
    // Heating
    let decreasetemperatureperhour = this.config.decreasetemperatureperhour;
    if (this.outertemperature != undefined && this.config.designtemperature != undefined ) {
      if (this.outertemperature > noheattemperature)
        return this.priceInfo.priceDatas.length; // no heating required
      decreasetemperatureperhour *=
        (noheattemperature - this.outertemperature) /
        (noheattemperature - this.config.designtemperature);
    }
    let currenttemperature = this.currenttemperature;
    if (
      this.currenttemperature == undefined ||
      this.currenttemperature >= this.config.minimaltemperature
    )
      return 0;

    return Math.floor(
      ((this.config.minimaltemperature - currenttemperature) *
        decreasetemperatureperhour) *
        this.getPeriodLength(),
    );
  }
  getPeriodLength() {
    let periodlength = 1;
    if (
      this.priceInfo &&
      this.priceInfo.prices &&
      this.priceInfo.prices.periodlength
    )
      periodlength = this.priceInfo.prices.periodlength;
    return periodlength;
  }
  getEstimstoreperiods(): number {
    let increasetemperatureperhour = this.config.increasetemperatureperhour;
    let currenttemperature = this.currenttemperature;
    if (this.currenttemperature == undefined)
      currenttemperature = this.config.minimaltemperature;
    if (currenttemperature != undefined && this.config.maximaltemperature) {
      if (currenttemperature > this.config.maximaltemperature) return 0; // no heating required
    }

    return Math.floor(
      ((this.config.maximaltemperature - currenttemperature) *
        this.config.increasetemperatureperhour) *
        this.getPeriodLength(),
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
