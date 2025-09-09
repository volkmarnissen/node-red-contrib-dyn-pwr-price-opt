import {EnergyConsumption, EnergyConsumptionInput} from '../src/energyconsumption'
import { PriceSources } from '../src/periodgenerator'

let eci:EnergyConsumptionInput = {
    priceInfo:{ source:PriceSources.tibber,priceDatas:[],prices:{starttime:2,endtime:3,periodlength:1}},
    estimconsumptionperiods:3, 
    cheapestpriceoutput:48, 
    highestpriceoutput:44, 
    nighttimeoutput: 40,
    nighttimestarthour:22, 
    nighttimeendhour:5
}

it("estimate",()=>{

    let ec = new EnergyConsumption(eci)
    ec.checkConfig()
    ec.getOutputValue( )
})