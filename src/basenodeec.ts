import { PriceData, TypeDescription } from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNode } from "./basenode";
import * as fs from 'fs'
import { EnergyConsumption, EnergyConsumptionInput } from "./energyconsumption";
import {
  convertPrice,
  IpriceInfo,
  priceConverterFilterRegexs,
} from "./periodgenerator";
const toleranceInMillis = 100;

export abstract class BaseNodeEnergyConsumption<T> extends BaseNode<T> {
  priceInfo: IpriceInfo | undefined = undefined;
  outertemperature: number | undefined = undefined;
  currenttemperature: number | undefined = undefined;
  lastSetPoint: number | undefined = undefined;
  constructor(config: any, tConfig: TypeDescription, RED: any) {
    super(config, tConfig, RED);
  }
  readPricePayload(payload: any): boolean {
    if (!this.config) throw new Error("config is not available.");
    let periodlength = 1;
    if (this.getPeriodLength() != undefined && this.getPeriodLength() != 0)
      periodlength = this.getPeriodLength();
    let rc = convertPrice(periodlength, payload);
    if (undefined != rc) this.priceInfo = rc;
    // Allow other listeners to process the message
    return false;
  }
  readHeatpumpPayload(payload: any) {
    let rc = false;
    if (payload.hasOwnProperty("outertemperature")) {
      this.outertemperature = payload.outertemperature;
      rc = true;
    }

    if (payload.hasOwnProperty("currenttemperature")) {
      this.currenttemperature = payload.currenttemperature;
      return true;
    }
    return rc;
  }
  protected getEstimconsumptionperiods(currentTime:number): number {
    return 0;
  }

  abstract getEstimstoreperiods(): number;
  abstract getcheapestpriceoutput(): any;
  abstract gethighestpriceoutput(): any;
  abstract getNightTimeOutput(): any;
  abstract getNightTimeStartHour(): number;
  abstract getNightTimeEndHour(): number;
  abstract getPeriodLength(): number;
  waitUntilNextHourTimer: any = undefined;
  private buildEnergyConsumptionInput(currentTime:number): EnergyConsumptionInput {
    if (!this.priceInfo || !this.priceInfo.priceDatas || !this.priceInfo.prices)
      throw new Error("No Price Data available");
    let eci: EnergyConsumptionInput = {
      priceInfo: this.priceInfo,
      estimconsumptionperiods: this.getEstimconsumptionperiods(currentTime),
      estimstoreperiods: this.getEstimstoreperiods(),
      cheapestpriceoutput: this.getcheapestpriceoutput(),
      highestpriceoutput: this.gethighestpriceoutput(),
      nighttimeoutput: this.getNightTimeOutput(),
      nighttimestarthour: this.getNightTimeStartHour(),
      nighttimeendhour: this.getNightTimeEndHour()
    };
    return eci;
  }
    protected isNightTime(currentTime:number):boolean{
    if( this.getNightTimeStartHour() == undefined ||
        this.getNightTimeEndHour() == undefined ||
        this.getNightTimeOutput() == undefined)
        return false;
    let hour = new Date(currentTime).getHours()
    return (this.getNightTimeStartHour() >= hour) || (this.getNightTimeEndHour() < hour); 
  }
  onTime(time: number): void {
    if (this.configInvalid) throw new Error(this.configInvalid);
    let currentHour = new Date(time).getHours();
    let eci = this.buildEnergyConsumptionInput(time);
    let ec = new EnergyConsumption(eci);
    let value = ec.getOutputValue(time);
    if( this.isNightTime( time) && value == (this.config as HeatingConfig).minimaltemperature )
      value = (this.config as HeatingConfig).nighttargettemperature;
    fs.appendFile("/share/node-red-contrib-dyn-pwr-price-opt.log", currentHour.toLocaleString() + " " + 
      (this.config as HeatingConfig).name + ": " + value, (err)=>{ /* Ignore errors */})
    if (value) {
      this.status.bind(this)({
        fill: "green",
        shape: "dot",
        text: "Last Update at " + new Date(time).toLocaleTimeString(),
      });
      try {
        if (value != this.lastSetPoint) {
          if (typeof value === "number")
            this.send([
              {
                payload: value,
                time: time,
              },
            ]);
          else debugger;
          this.lastSetPoint = value;
        }
      } catch (e) {
        this.status.bind(this)({
          fill: "red",
          shape: "dot",
          text: e.message,
        });
      }
    } else
      this.status.bind(this)({
        fill: "red",
        shape: "dot",
        text: "No Schedule available",
      });
  }

  onFullHour(time: number = Date.now()) {
    try {
      this.onTime(time);
    } catch (e: any) {
      this.status({ fill: "red", shape: "dot", text: e.message });
    }
  }
  scheduleTimerOnFullHours(time: number) {
    let nextFullHour = new Date(time + toleranceInMillis);
    if (
      nextFullHour.getMilliseconds() < 2 * toleranceInMillis &&
      nextFullHour.getSeconds() == 0 &&
      nextFullHour.getMinutes() == 0
    ) {
      this.waitUntilNextHourTimer = setInterval(
        this.onFullHour,
        1000 * 60 * 60,
      );
      this.onFullHour(time);
    } else {
      nextFullHour = new Date(time);
      nextFullHour.setHours(nextFullHour.getHours() + 1);
      nextFullHour.setMilliseconds(0);
      nextFullHour.setSeconds(0);
      nextFullHour.setMinutes(0);
      let nextFullHourTime = nextFullHour.getTime();
      setTimeout(() => {
        this.scheduleTimerOnFullHours(nextFullHour.getTime());
        this.onFullHour();
      }, nextFullHourTime - time);
    }
  }
}
