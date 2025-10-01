import { PriceData, TypeDescription } from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNodeEnergyConsumption } from "./basenodeec";
import { EnergyConsumptionInput } from "./energyconsumption";
import { priceConverterFilterRegexs } from "./periodgenerator";
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
    { name: "decreasetemperatureperhour", required: true },
    { name: "designtemperature", required: false }
  ],
  booleanFields: [],
};
const noheattemperature = 21;

export class HeatingNode extends BaseNodeEnergyConsumption<HeatingConfig> {
 outertemperature: number | undefined = undefined;
 
  getDecreaseTemperaturePerHour() {
   // 0 ^= noheattemperature 
   // this.config.decreasetemperatureperhour ^= this.config.designtemperature
   // ? ^= this.outertemperature 
   // 0 = decreasetemperatureperhour * (outertemperature - noheatemperature) / ( designtemperature - noheattemperature)
   this.outertemperature - this.config.designtemperature
    let temp =  this.config.decreasetemperatureperhour * (this.outertemperature - noheattemperature)/(this.config.designtemperature - noheattemperature);
    if(temp <0)
      return 0;
    return temp;
  }
  readHeatpumpPayload(payload: any) {
    let rc = super.readHeatpumpPayload(payload);
    if (payload.hasOwnProperty("outertemperature")) {
      this.outertemperature = payload.outertemperature;
      rc = true;
    }
    return rc;
  };
  buildNodeRedStatus():{color:"green"|"yellow"|"red", text:string}{
    let baseStatus = super.buildNodeRedStatus();
    let outerTempAvailable = (this && this.outertemperature != undefined); 
    return {
      color: (baseStatus.color in ["green", "yellow"] && outerTempAvailable) ? baseStatus.color : "red",
      text: baseStatus.text +
            (outerTempAvailable ? "":"No Outer Temp.")
    }
  } 

   protected buildEnergyConsumptionInput(): EnergyConsumptionInput {
      if ( this.outertemperature == undefined)
        throw new Error("No outer temperature in payload available");
      let eci = super.buildEnergyConsumptionInput();
      return eci;
    }
  constructor(config: any, RED: any) {
    super(config, tConfig, RED);

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
