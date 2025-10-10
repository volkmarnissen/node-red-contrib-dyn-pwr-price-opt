import { HeatingConfig } from "../src/@types/heating";
import * as fs from 'fs'
import { convertPrice, IpriceInfo } from "../src/periodgenerator";
import powerPriceOptimizerHotwater from "../src/hotwater";
import powerPriceOptimizerHeating from "../src/heating";
export const config: HeatingConfig = {
  name: "Heating",
  tolerance: 0.02,
  nightstarthour: 22,
  nightendhour: 5,
  nighttemperature: 12,
  minimaltemperature: 20,
  maximaltemperature: 22,
  increasetemperatureperhour: 0.2,
  decreasetemperatureperhour: 0.3,
  designtemperature: -12,
};
export const cheapHour: number = 4;
const expensiveHour = 18;
let priceDataPostfix = ":00:00.000+02:00";
let datePrefixes: string[] = ["2021-10-10T", "2021-10-11T"];
let priceDataTemplate: number[] = [0.2, 0.24, 0.26, 0.23, 0.19, 0.22];
var myformat = new Intl.NumberFormat("en-US", {
  minimumIntegerDigits: 2,
  minimumFractionDigits: 0,
});

export function buildPayload(onOutput: OnOutputFunction): any {
  if (onOutput.payload != undefined) return onOutput;
  if (onOutput.hour != undefined)
    return { payload: { time: getTestTime(onOutput.hour) } };
}

export function buildPriceData(): any {
  var rc: any[] = [];
  for (var prefix of datePrefixes)
    for (var i = 0; i < 4; i++)
      for (var j = 0; j < 6; j++) {
        var h = i * 6 + j;
        var pd = {
          value: priceDataTemplate[j],
          start: Date.parse(prefix + myformat.format(h) + priceDataPostfix),
        };
        rc.push(pd);
      }
  return rc;
}
export function getTestTime(hour: number): number {
  return Date.parse(
    "2021-10-11T" + String(hour).padStart(2, "0") + ":00:00.000+02:00",
  );
}

export type OnOutputFunction = {
  fct: (msg: any) => void;
  payload?: any;
  hour?: number;
  type:string;
};
export function readPriceData():any{
            let data = fs.readFileSync(
            "test/data/tibber-prices-single-home.json",
            {
              encoding: "utf-8",
            },
          );
          return JSON.parse(data).payload;
};
export function getPriceInfo():IpriceInfo | undefined{
  return convertPrice(readPriceData())
}
export function executeFlow(
  helper: any,
  attrs: any,
  onOutput: OnOutputFunction[],
  type:string ="Heating"
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      let cfg = Object.assign(config, attrs);

      Object.keys(cfg).forEach((key) => {
        if (cfg[key] === undefined) delete cfg[key];
        else cfg[key] = cfg[key].toString();
      });
      cfg.name = "test name";
      cfg.id = type.toLowerCase();
      cfg.type = type;
      let output = [["output"]];
      cfg.wires = output;

      let flow: any[] = [];
      flow.push(cfg);
      flow.push({ id: "output", type: "helper" });
      let powerPriceOptimizer = type.toLowerCase() == 'heating'? powerPriceOptimizerHeating:powerPriceOptimizerHotwater;
      helper.load(powerPriceOptimizer, flow, function () {
        try {
          const powerPriceOptimizerNode = helper.getNode(type.toLowerCase());
          expect(powerPriceOptimizerNode).not.toBeNull();
          const outputNode = helper.getNode("output");
          expect(outputNode).not.toBeNull();
          let callCount = 0;
          outputNode.on("input", (msg: any) => {
            expect(msg.payload.error).not.toBeDefined();
            onOutput[callCount].fct(msg);
            ++callCount;
            if (onOutput.length > callCount) {
              powerPriceOptimizerNode.receive(
                buildPayload(onOutput[callCount]),
              );
            } else resolve("OK"); // No further call
          });

          let data = fs.readFileSync(
            "test/data/tibber-prices-single-home.json",
            {
              encoding: "utf-8",
            },
          );

          let msg = {
            payload: Object.assign(
              readPriceData(),
              buildPayload(onOutput[0]).payload,
            ),
          };
          powerPriceOptimizerNode.receive(msg);
        } catch (e) {
          console.log(e);
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}