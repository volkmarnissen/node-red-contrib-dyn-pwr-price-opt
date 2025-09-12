import {EnergyConsumption, EnergyConsumptionInput} from '../src/energyconsumption'
import { PriceSources } from '../src/periodgenerator'

let eciHotwater:EnergyConsumptionInput = {
    priceInfo: { source: PriceSources.tibber, priceDatas: [], prices: { starttime: 2, endtime: 3, periodlength: 1 } },
    nighttimeoutput: 40,
    nighttimestarthour: 22,
    nighttimeendhour: 5,
    currenttemperature: 0,
    minimaltemperature: 44,
    maximaltemperature: 48,
    increasetemperatureperhour: 0,
    decreasetemperatureperhour: 0
}

function getTestTime(hour:number):number{
  return Date.parse("2021-10-11T" + String(hour).padStart(2,'0') + ":00:00.000+02:00");
}
it("Hotwater: getEstimconsumptionPeriods at nighttime",()=>{
    eciHotwater.decreasetemperatureperhour =0.2;
    eciHotwater.currenttemperature = 42;
    let ec = new EnergyConsumption(eciHotwater)
    ec.checkConfig()
    expect( ec.getEstimconsumptionPeriods(getTestTime(2))).toBe(10);
})

it("Hotwater: getEstimconsumptionPeriods at daytimec curr temp < minimal temp=> immediate heating",()=>{
    eciHotwater.decreasetemperatureperhour =0.2;
    eciHotwater.currenttemperature = 42;
    let ec = new EnergyConsumption(eciHotwater)
    ec.checkConfig()
    expect( ec.getEstimconsumptionPeriods(getTestTime(7))).toBe(0);
})

let eciHeating:EnergyConsumptionInput = {
    priceInfo: { source: PriceSources.tibber, priceDatas: [], prices: { starttime: 2, endtime: 3, periodlength: 1 } },
    nighttimeoutput: 16,
    nighttimestarthour: 22,
    nighttimeendhour: 5,
    currenttemperature: 0,
    minimaltemperature: 21,
    maximaltemperature: 23,
    designtemperature: -12,
    outertemperature: -6,
    increasetemperatureperhour: 0,
    decreasetemperatureperhour: 0
}

it("Heating: getEstimconsumptionPeriods at nighttime",()=>{
    eciHeating.decreasetemperatureperhour =0.2;
    eciHeating.currenttemperature = 22;
    let ec = new EnergyConsumption(eciHeating)
    ec.checkConfig()
    expect( ec.getEstimconsumptionPeriods(getTestTime(2))).toBe(36);
})

it("Heating: getEstimconsumptionPeriods at daytimec curr temp > minimal temp=> calculate periods",()=>{
    eciHeating.decreasetemperatureperhour =0.2;
    eciHeating.currenttemperature = 22;
    let ec = new EnergyConsumption(eciHeating)
    ec.checkConfig()
    expect( ec.getEstimconsumptionPeriods(getTestTime(7))).toBe(6);
})