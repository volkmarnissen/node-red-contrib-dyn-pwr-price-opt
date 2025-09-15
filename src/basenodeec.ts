import { PriceData, TypeDescription } from "./@types/basenode";
import { HeatingConfig } from "./@types/heating";
import { BaseNode } from "./basenode";
import * as fs from "fs";
import { EnergyConsumption, EnergyConsumptionInput } from "./energyconsumption";
import {
  convertPrice,
  IpriceInfo,
  priceConverterFilterRegexs,
} from "./periodgenerator";
import { debug } from "console";
const toleranceInMillis = 100;

export abstract class BaseNodeEnergyConsumption<T> extends BaseNode<T> {
  priceInfo: IpriceInfo | undefined = undefined;
  outertemperature: number | undefined = undefined;
  currenttemperature: number | undefined = undefined;
  lastSetPoint: number | undefined = undefined;
  constructor(config: any, tConfig: TypeDescription, RED: any) {
    super(config, tConfig, RED);
    this.scheduleTimerOnFullHours(Date.now());
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
  protected getEstimconsumptionperiods(currentTime: number): number {
    return 0;
  }
  abstract getcheapestpriceoutput(): any;
  abstract gethighestpriceoutput(): any;
  abstract getNightTimeOutput(): any;
  abstract getNightTimeStartHour(): number;
  abstract getNightTimeEndHour(): number;
  abstract getPeriodLength(): number;
  abstract getCurrentTemperature(): number;
  abstract getMinimalTemperature(): number;
  abstract getMaximalTemperature(): number;
  abstract getIncreaseTemperaturePerHour(): number;
  abstract getDecreaseTemperaturePerHour();
  abstract getDesignTemperature(): number;
  abstract getOuterTemperature(): number;
  waitUntilNextHourTimer: any = undefined;
  private buildEnergyConsumptionInput(
    currentTime: number,
  ): EnergyConsumptionInput {
    if (!this.priceInfo || !this.priceInfo.priceDatas || !this.priceInfo.prices)
      throw new Error("No Price Data available");
    let eci: EnergyConsumptionInput = {
      priceInfo: this.priceInfo,
      nighttimeoutput: this.getNightTimeOutput(),
      nighttimestarthour: this.getNightTimeStartHour(),
      nighttimeendhour: this.getNightTimeEndHour(),
      currenttemperature: this.getCurrentTemperature(),
      minimaltemperature: this.getMinimalTemperature(),
      maximaltemperature: this.getMaximalTemperature(),
      increasetemperatureperhour: this.getIncreaseTemperaturePerHour(),
      decreasetemperatureperhour: this.getDecreaseTemperaturePerHour(),
      designtemperature: this.getDesignTemperature(),
      outertemperature: this.getOuterTemperature(),
    };
    if (eci.currenttemperature == undefined)
      throw new Error("No current temperature in payload available");
    if (eci.designtemperature != undefined && eci.outertemperature == undefined)
      throw new Error("No outer temperature in payload available");
    if (eci.priceInfo == undefined || eci.priceInfo.priceDatas.length == 0)
      throw new Error("No price info available");

    return eci;
  }

  onTime(time: number): void {
    // on Time will always send a payload even in case of errors
    // This makes testing easier
    if (!this.processOutput(time))
      this.send([
        {
          payload: { error: "See node status" },
        },
      ]);
  }
  processOutput(time: number): boolean {
    if (this.configInvalid) throw new Error(this.configInvalid);
    let currentHour = new Date(time).getHours();
    let ec: EnergyConsumption;
    try {
      let eci = this.buildEnergyConsumptionInput(time);
      ec = new EnergyConsumption(eci);
    } catch (e) {
      this.status.bind(this)({
        fill: "red",
        shape: "dot",
        text: e.message,
      });
      return false;
    }

    let value = ec.getOutputValue(time);
    if (
      ec.isNightTime(time) &&
      value == (this.config as HeatingConfig).minimaltemperature
    )
      value = (this.config as HeatingConfig).nighttargettemperature;
    let s = "";
    ec.schedule.forEach((e) => {
      s += new Date(e.start).getHours().toString() + " " + e.returnValue + ", ";
    });
    fs.appendFile(
      "/share/node-red-contrib-dyn-pwr-price-opt.log",
      new Date(time).toLocaleString() +
        " " +
        (this.config as HeatingConfig).name +
        ": " +
        value +
        (this.lastSetPoint == value ? "" : " changed") +
        s +
        "\n",
      (err) => {
        /* Ignore errors */
      },
    );
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
