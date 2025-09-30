import { PriceData, TypeDescription } from "./@types/basenode";
import { BaseNodeECConfig } from "./@types/basenodeec";
import { BaseNode } from "./basenode";
import * as fs from "fs";
import { EnergyConsumption, EnergyConsumptionInput } from "./energyconsumption";
import {
  convertPrice,
  IpriceInfo,
  priceConverterFilterRegexs,
} from "./periodgenerator";
import { debug } from "console";
import { HeatingConfig } from "./@types/heating";
const toleranceInMillis = 100;


export abstract class BaseNodeEnergyConsumption<T extends BaseNodeECConfig> extends BaseNode<T> {
  priceInfo: IpriceInfo | undefined = undefined;
  currenttemperature: number | undefined = undefined;
  hysteresis: number | undefined = 0;
  lastSetPoint: number | undefined = undefined;
  constructor(config: any, tConfig: TypeDescription, RED: any) {
    super(config, tConfig, RED);
    priceConverterFilterRegexs.forEach((regex) => {
      this.registerInputListener(regex, this.readPricePayload.bind(this));
    });
    this.registerInputListener(
      /^payload$/g,
      this.readHeatpumpPayload.bind(this),
    );
    this.scheduleTimerOnFullHours(Date.now());
  }
  readPricePayload(payload: any): boolean {
    if (!this.config) throw new Error("config is not available.");
    let periodsPerHour = 1;
    if (this.config.periodsperhour != undefined && this.config.periodsperhour != 0)
      periodsPerHour = this.config.periodsperhour;
    let rc = convertPrice(periodsPerHour, payload);
    if (undefined != rc) this.priceInfo = rc;
    // Allow other listeners to process the message
    return false;
  }
  readHeatpumpPayload(payload: any) {
    let rc = false;
    if (payload.hasOwnProperty("currenttemperature")) {
      this.currenttemperature = payload.currenttemperature;
      rc = true;
    }
    if (payload.hasOwnProperty("hysteresis")) {
      this.hysteresis = payload.hysteresis;
      rc = true;
    }
    return rc;
  }
  protected getEstimconsumptionperiods(currentTime: number): number {
    return 0;
  }
  abstract  getDecreaseTemperaturePerHour(): number;
  waitUntilNextHourTimer: any = undefined;
  protected buildEnergyConsumptionInput(): EnergyConsumptionInput {
    if (!this.priceInfo || !this.priceInfo.priceDatas || !this.priceInfo.prices)
      throw new Error("No Price Data available");
    let eci: EnergyConsumptionInput = {
      priceInfo: this.priceInfo,
      config: this.config,
      decreasetemperatureperhour: this.getDecreaseTemperaturePerHour(),
      hysteresis: this.hysteresis,
      currenttemperature: this.currenttemperature
    };
    if (this.currenttemperature == undefined)
      throw new Error("No current temperature in payload available");
    if (eci.priceInfo == undefined || eci.priceInfo.priceDatas.length == 0)
      throw new Error("No price info available");

    return eci;
  }

  onTime(time: number): void {
    // on Time will always send a payload even in case of errors
    // This makes testing easier
    // if (!this.processOutput(time))
    //   this.send([
    //     {
    //       payload: { error: "See node status" },
    //     },
    //   ]);
    this.processOutput(time);
  }
  
  processOutput(time: number): boolean {
    if (this.configInvalid) throw new Error(this.configInvalid);
    let ec: EnergyConsumption;
    try {
      let eci = this.buildEnergyConsumptionInput();
      ec = new EnergyConsumption(eci);
      ec.checkConfig();
    } catch (e) {
      this.status.bind(this)({
        fill: "red",
        shape: "dot",
        text: e.message  + " " + new Date(time).toLocaleTimeString(),
      });
      return false;
    }
    let value = ec.getOutputValue(time);
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
        return true;
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
    return false;
  }

  onFullHour(time: number = Date.now()) {
    try {
      this.processOutput(time);
    } catch (e: any) {
      this.status.bind(this)({ fill: "red", shape: "dot", text: e.message });
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
