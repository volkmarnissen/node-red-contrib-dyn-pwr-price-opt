// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import { resolveCaa } from "dns";
import {
  registerNodeForTest,
  ScheduleEntry,
} from "../src/heating";
import powerPriceOptimizer from "../src/heating";
import { RED } from "./RED";
import fs from "fs";
import { NodeTestHelper, TestFlows } from "node-red-node-test-helper";
import { join } from "path";
import { Mutex } from "async-mutex";

import { PriceSources } from "../src/periodgenerator";
import { PriceData } from "../src/@types/basenode";
let mutex = new Mutex();

let helper = new NodeTestHelper();
helper.init(require.resolve("node-red"));
type OnOutputFunction = (msg: any) => void;
function executeFlow(
  attrs: any,
  hour: string,
  onOutput: OnOutputFunction,
): void {
  try {
    let m = new Mutex();
    let flow = [
      Object.assign(
        {
          id: "heating",
          type: "Heating",
          name: "Receive prices",
          maximaltemperature: "23",
          increasetemperatureperhour: "0.2",
           decreasetemperatureperhour: "0.2",
          designtemperature: "-12",
          wires: [["output"]],
        },
        attrs,
      ),
      { id: "output", type: "helper" },
    ];
    mutex.runExclusive(() => {
      helper.load(powerPriceOptimizer, flow, function () {
        try {
        const powerPriceOptimizerNode = helper.getNode("heating");
        expect( powerPriceOptimizerNode).not.toBeNull()
        const outputNode = helper.getNode("output");
        outputNode.on("input", onOutput);
        let data = fs.readFileSync("test/data/tibber-prices-single-home.json", {
          encoding: "utf-8",
        });
        let msg = JSON.parse(data);

        msg.payload.time = Date.parse(
          "2021-10-11T" + hour + ":00:00.000+02:00",
        );
        powerPriceOptimizerNode.receive(msg);          
        }catch(e){
          console.log(e);
          debugger;
        }

      });
    });
  } catch (e) {
    console.log(e);
  }
}
const config = {
  id: "0c44d5befabf904d",
  type: "Dyn. Pwr. consumption optimization",
  z: "a644eb1881b7f311",
  name: "Price Ranges",
  tolerance: "",
  storagecapacity: "5",
  fromTime: 1,
  toTime: 3,
  outputValueFirst: '{"val1": 45.1,"val2": "test"}',
  outputValueFirstType: "json",
  outputValueSecond: 45,
  outputValueSecondType: "num",
  outputValueThird: "",
  outputValueThirdType: "num",
  outputValueLast: "false",
  outputValueLastType: "bool",
  outputValueNoPrices: "false",
  outputValueNoPricesType: "bool",
  outputValueHours: 2,
  outputValueLastHours: 1,
  sendCurrentValueWhenRescheduling: true,
  x: 130,
  y: 140,
  wires: [[]],
};
let priceDataPostfix = ":00:00.000+02:00";
let datePrefixes: string[] = ["2021-10-10T", "2021-10-11T"];
let priceDataTemplate: number[] = [0.2, 0.24, 0.26, 0.23, 0.19, 0.22];
var myformat = new Intl.NumberFormat("en-US", {
  minimumIntegerDigits: 2,
  minimumFractionDigits: 0,
});
function buildPriceData(): any {
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
describe("dynamic-power-prices-optimizer-node Tests", () => {
  it("Generate schedule from payload", () => {
    mutex.runExclusive(() => {
      var classType = registerNodeForTest(RED);
      var node = new classType(config);
      node.send = function (this: any, msg: any) {
        expect(msg[0].payload.value).toBeFalsy();
        expect(msg[0].payload.schedule.length).toBe(
          node["config"].storagecapacity,
        );
      };
      expect(node["config"].outputValueFirst.val1).toBe(45.1);
      expect(node["config"].outputValueFirst.val2).toBe("test");

      var testDate = new Date(2021, 9, 10, 2, 15, 0);
      node["priceInfo"] = {
        source: PriceSources.other,
        priceDatas: buildPriceData(),
      };
      node["onFullHour"](testDate.getTime());

      // node.onPriceData(node["toPriceData"](buildPriceData()), testDate.getTime());
    });
  });
  it("validate hourly timer", () => {
    new Promise<void>((resolve, reject) => {
      mutex.runExclusive(() => {
        var classType = registerNodeForTest(RED);
        var node = new classType(config);
        // schedule 3 ms before full hour
        // expect the onFullHour method to be called  after max 4 ms
        var time = new Date(2024, 10, 2, 2, 59, 59, 997);
        var start = Date.now();

        node["scheduleTimerOnFullHours"](time);
        let oldOnFullHour = classType.prototype.onFullHour;
        classType.prototype.onFullHour = () => {
          var end = Date.now();
          // 3 ms
          expect(end - start).toBeLessThanOrEqual(100);
          expect(end - start).toBeGreaterThanOrEqual(3);
          classType.prototype.onFullHour = () => {
            var end = Date.now();
            // 3 ms
            expect(end - start).toBeLessThanOrEqual(100);
            expect(end - start).toBeGreaterThanOrEqual(3);

            classType.prototype.onFullHour = oldOnFullHour;
            resolve();
          };
        };
      });
    });
  });
  describe("Node Server tests", () => {
    beforeEach(function (done) {
      helper.startServer(done);
    });

    afterEach(function (done) {
      helper.unload().then(function () {
        helper.stopServer(done);
      });
    });
    it("should be loaded", function (done) {
      const flow = [
        {
          id: "n1",
          type: "Heating",
          name: "test name",
          outputValueFirst: '{ "hotwatertargettemp": 48 }',
          outputValueFirstType: "json",
          outputValueLast: '{ "hotwatertargettemp": 45 }',
          outputValueLastType: "json",
        },
      ];
      mutex.runExclusive(() => {
        helper.load(powerPriceOptimizer, flow, function () {
          const n1 = helper.getNode("n1");
          expect(n1["name"]).toBeDefined();
          expect(n1["name"]).toBe("test name");
          done();
        });
      });
    });

    it("should return a temperature", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            minimaltemperature: "21",
            maximaltemperature: "23",
            decreasetemperatureperhour: "0.1",
            increasetemperatureperhour: "0.2"
          },
          "05",
          function (msg) {
            try {
              expect(msg.payload ).toBe(23);

              resolve();
            } catch (e) {
              reject();
            }
          },
        );
      });
    });
    interface Icount {
      temp: number;
      count: number;
      minPrice: number;
      maxPrice: number;
      minHour: number;
      maxHour: number;
    }
    function countTemps(schedule: ScheduleEntry[]): Icount[] {
      let count: Icount[] = [];
      let rc = schedule.forEach((entry) => {
        let e = count.find(
          (e) => e.temp == entry.returnValue.hotwatertargettemp,
        );
        if (e) {
          e.count++;
          e.maxPrice = entry.value > e.maxPrice ? entry.value : e.maxPrice;
          e.minPrice = entry.value < e.minPrice ? entry.value : e.minPrice;
          e.minHour = entry.start < e.minHour ? entry.start : e.minHour;
          e.maxHour = entry.start > e.maxHour ? entry.start : e.maxHour;
        } else
          count.push({
            temp: entry.returnValue.hotwatertargettemp,
            count: 1,
            minPrice: entry.value,
            maxPrice: entry.value,
            minHour: entry.start,
            maxHour: entry.start,
          });
      });
      count.forEach((e) => {
        e.minHour = new Date(e.minHour).getHours();
        e.maxHour = new Date(e.maxHour).getHours();
      });
      return count;
    }
    xit(" mostExpensive hours set return low price range", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            storagecapacity: "24",
            outputValueLastHours: "5",
          },
          "05",
          function (msg) {
            expect((msg.payload as any).hotwatertargettemp).toBe(48);
            let count = countTemps(msg.schedule);
            expect(count.find((e) => e.minHour == 5)).toBeDefined();
            console.log(JSON.stringify(count, null, "\t"));

            resolve();
          },
        );
      });
    });
    xit(" mostExpensive hours set return middle price range", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            storagecapacity: "24",
            outputValueLastHours: "5",
            outputValueSecond: '{ "hotwatertargettemp": 47 }',
            outputValueSecondType: "json",
          },
          "10",
          function (msg) {
            try {
              console.log(
                "first entry in schedule: " +
                  JSON.stringify(msg.schedule[0], null, "\t"),
              );
              expect((msg.payload as any).hotwatertargettemp).toBe(47);
              let count = countTemps(msg.schedule);
              expect(count.find((e) => e.minHour == 10)).toBeDefined();
              console.log(JSON.stringify(count, null, "\t"));

              resolve();
            } catch (e) {
              reject(e);
            }
          },
        );
      });
    });

    xit(" mostExpensive hours set return high price range", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            storagecapacity: "24",
            outputValueLastHours: "5",
            outputValueSecond: '{ "hotwatertargettemp": 47 }',
            outputValueSecondType: "json",
          },
          "01",
          function (msg) {
            try {
              console.log(
                "first entry in schedule: " +
                  JSON.stringify(msg.schedule[0], null, "\t"),
              );
              expect((msg.payload as any).hotwatertargettemp).toBe(48);
              let count = countTemps(msg.schedule);

              console.log(JSON.stringify(count, null, "\t"));

              resolve();
            } catch (e) {
              reject(e);
            }
          },
        );
      });
    });
    it(" cheap hours set return high price range", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            minimaltemperature: "21",
            maximaltemperature: "23",
            decreasetemperatureperhour: "0.1",
            increasetemperatureperhour: "0.2"
          },
          "07",
          function (msg) {
            try {
              expect((msg.payload as any)).toBe(21);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        );
      });
    });
    it(" nightlyhours set return nighttemperature", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            minimaltemperature: "21",
            maximaltemperature: "23",
            decreasetemperatureperhour: "0.1",
            increasetemperatureperhour: "0.2",
            nightstarthour: "22",
            nightendhour:"6",
            nighttargettemperature: "12"
          },
          "23",
          function (msg) {
            try {
              expect((msg.payload as any)).toBe(12);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        );
      });
    });
    xit(" no hours set:: complete schedule has return values", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow(
          {
            storagecapacity: "24",

            outputValueLastHours: "5",
            outputValueSecond: '{ "hotwatertargettemp": 47 }',
            outputValueSecondType: "json",
          },
          "05",
          function (msg) {
            expect(
              msg.schedule.filter((s) => s.returnValue != undefined).length,
            ).toBe(24);
            resolve();
          },
        );
      });
    });
  });
});
