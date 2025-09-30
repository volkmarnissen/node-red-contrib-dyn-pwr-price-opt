import { BaseNodeECConfig } from "../src/@types/basenodeec";
import { HeatingConfig } from "../src/@types/heating";
import {
  EnergyConsumption,
  EnergyConsumptionInput,
} from "../src/energyconsumption";
import { PriceSources } from "../src/periodgenerator";

let hotwaterConfig:BaseNodeECConfig = {
    name:"hotwater",
    nighttemperature: 40,
    nightstarthour: 22,
    nightendhour: 5,
    minimaltemperature: 44,
    maximaltemperature: 48,
    increasetemperatureperhour: 0,
    decreasetemperatureperhour: 0,
    periodsperhour: 1
  }

let eciHotwater: EnergyConsumptionInput = {
  priceInfo: {
    source: PriceSources.tibber,
    priceDatas: [],
    prices: { starttime: 2, endtime: 3, periodlength: 1 },
  },
  config: hotwaterConfig,
  decreasetemperatureperhour: 0,
  hysteresis:1,
  currenttemperature: 0
};

let heatingConfig:HeatingConfig = hotwaterConfig;
heatingConfig.designtemperature = -12;
heatingConfig.name = "Heating";
heatingConfig.maximaltemperature = 23;
heatingConfig.minimaltemperature = 21;

let eciHeating: EnergyConsumptionInput = eciHotwater;
eciHeating.config = heatingConfig;
function getTestTime(hour: number): number {
  return Date.parse(
    "2021-10-11T" + String(hour).padStart(2, "0") + ":00:00.000+02:00",
  );
}
it("Hotwater: getEstimconsumptionPeriods at nighttime", () => {
  eciHotwater.decreasetemperatureperhour = 0.2;
  eciHotwater.currenttemperature = 42;
  let ec = new EnergyConsumption(eciHotwater);
  ec.checkConfig();
  // TODO expect(ec.getEstimconsumptionPeriods(getTestTime(2))).toBe(10);
});

it("Hotwater: getEstimconsumptionPeriods at daytimec curr temp < minimal temp=> immediate heating", () => {
  eciHotwater.decreasetemperatureperhour = 0.2;
  eciHotwater.currenttemperature = 42;
  let ec = new EnergyConsumption(eciHotwater);
  ec.checkConfig();
  //TODO expect(ec.getEstimconsumptionPeriods(getTestTime(7))).toBe(0);
});


it("Heating: getEstimconsumptionPeriods at nighttime", () => {
  eciHeating.decreasetemperatureperhour = 0.2;
  eciHeating.currenttemperature = 22;
  let ec = new EnergyConsumption(eciHeating);
  ec.checkConfig();
  //TODO expect(ec.getEstimconsumptionPeriods(getTestTime(2))).toBe(6);
});

it("Heating: getEstimconsumptionPeriods at daytimec curr temp > minimal temp=> calculate periods", () => {
  eciHeating.decreasetemperatureperhour = 0.2;
  eciHeating.currenttemperature = 22;
  let ec = new EnergyConsumption(eciHeating);
  ec.checkConfig();
  //TODO expect(ec.getEstimconsumptionPeriods(getTestTime(7))).toBe(6);
});
