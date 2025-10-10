import { BaseNodeECConfig } from "../src/@types/basenodeec";
import { HeatingConfig } from "../src/@types/heating";
import {
  EnergyConsumption,
  EnergyConsumptionInput,
} from "../src/energyconsumption";
import { IpriceInfo, PriceSources } from "../src/periodgenerator";
import { getPriceInfo, readPriceData } from "./executeFlow";

let hotwaterConfig:BaseNodeECConfig = {
    name:"hotwater",
    nighttemperature: 40,
    nightstarthour: 22,
    nightendhour: 5,
    minimaltemperature: 44,
    maximaltemperature: 48,
    increasetemperatureperhour: 0,
    decreasetemperatureperhour: 0,
    tolerance: 0.02
  }

let eciHotwater: EnergyConsumptionInput = {
  priceInfo: {
    source: PriceSources.tibber,
    priceDatas: [],
    prices: { starttime: 2, endtime: 3, periodsperhour: 1 },
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
let priceInfo = {
      source: PriceSources.other,
      priceDatas: readPriceData(),
    };
it("getStartTime 4 periods per hour ", () => {
  eciHotwater.currenttemperature = 42;
  eciHotwater.priceInfo.prices.periodsperhour = 4;

  let ec = new EnergyConsumption(eciHotwater);
  let tt = getTestTime(2)
  let td = new Date(tt);
  expect(new Date(ec["getStartTime"](tt)).getMinutes()).toBe(0);
  td.setMinutes(14); tt = td.getTime();
  expect(new Date(ec["getStartTime"](tt)).getMinutes()).toBe(15);
  td.setMinutes(15);tt = td.getTime();
  expect(new Date(ec["getStartTime"](tt)).getMinutes()).toBe(15);
  td.setMinutes(16);tt = td.getTime();
  expect(new Date(ec["getStartTime"](tt)).getMinutes()).toBe(30);
  td.setMinutes(29);tt = td.getTime();
  expect(new Date(ec["getStartTime"](tt)).getMinutes()).toBe(30);;

});


it("Hotwater: getNumberOfHeatingPeriods", () => {
  eciHotwater.decreasetemperatureperhour = 0.2;
  eciHotwater.config.increasetemperatureperhour = 0.8;
  eciHotwater.currenttemperature = 42;
  let ec = new EnergyConsumption(eciHotwater);
  ec.checkConfig();
  expect(ec.getNumberOfHeatingPeriods( 10 )).toBe(2);
});

it("Hotwater: getOutputValue at daytimec curr temp < minimal temp=> immediate heating", () => {
  eciHotwater.decreasetemperatureperhour = 0.2;
  eciHotwater.currenttemperature = 42;
  let ec = new EnergyConsumption(eciHotwater);
  ec.checkConfig();
  expect(ec.getOutputValue(getTestTime(7))).toBe(heatingConfig.minimaltemperature);
});


it("Heating: getOutputValue at nighttime cheap price", () => {
  eciHeating.decreasetemperatureperhour = 0.2;
  eciHeating.currenttemperature = 22;
  let ec = new EnergyConsumption(eciHeating);
  ec.checkConfig();
  expect(ec.getOutputValue(getTestTime(2))).toBe(heatingConfig.minimaltemperature);
});

it("Heating: getOutputValue at daytimec curr temp > minimal temp=> calculate periods", () => {
  eciHeating.decreasetemperatureperhour = 0.2;
  eciHeating.currenttemperature = 22;
  eciHeating.priceInfo = (getPriceInfo() as IpriceInfo);
  let ec = new EnergyConsumption(eciHeating);
  ec.checkConfig();
  expect(ec.getOutputValue(getTestTime(7))).toBe(heatingConfig.minimaltemperature);
});

it("Heating: setValueRange with Tolerance", () => {
  eciHeating.decreasetemperatureperhour = 0.2;
  eciHeating.currenttemperature = 22;
  eciHeating.priceInfo = (getPriceInfo() as IpriceInfo);
  eciHeating.config.tolerance  = 0.02
  let ec = new EnergyConsumption(eciHeating);
  ec.checkConfig();
  ec.setValueRanges(eciHeating.priceInfo.priceDatas,48)
  let count =0;
  eciHeating.priceInfo.priceDatas.forEach(p=>{if(p.value == 0) count++})
  expect( count).toBeGreaterThan(1);
});