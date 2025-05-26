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

import { PriceSources } from "../src/periodgenerator";
import { PriceData } from "../src/@types/basenode";
import { HeatingConfig } from "../src/@types/heating";

const config:HeatingConfig = {
  name:"Heating",
  periodlength:1,
  nightstarthour:22,
  nightendhour:5,
  nighttargettemperature:12,
  minimaltemperature:20,
  maximaltemperature:22,
  increasetemperatureperhour:0.2,
  decreasetemperatureperhour:0.3,
  designtemperature:-12,
};
let helper = new NodeTestHelper();
helper.init(require.resolve("node-red"));
type OnOutputFunction = (msg: any) => void;
function executeFlow(
  attrs: any,
  hour: string,
  onOutput: OnOutputFunction[],
): Promise<void> {
  return new Promise<void>((resolve, reject)=>{
    try {
      let cfg = Object.assign(config,attrs)
  
      Object.keys(cfg).forEach((key=>{ cfg[key] = cfg[key].toString()}))
      cfg.name="test name"
      cfg.id = "heating"
      cfg.type = "Heating"
      let output = [["output"]]
      cfg.wires = output
    
      let flow:any[] = [ cfg,
        { id: "output", type: "helper" },
      ];
        helper.load(powerPriceOptimizer, flow, function () {
          try {
          const powerPriceOptimizerNode = helper.getNode("heating");
          expect( powerPriceOptimizerNode).not.toBeNull()
          const outputNode = helper.getNode("output");
          outputNode.on("input", onOutput[0]);
          let data = fs.readFileSync("test/data/tibber-prices-single-home.json", {
            encoding: "utf-8",
          });
          let msg = JSON.parse(data);
          let testtime = Date.parse(
            "2021-10-11T" + hour + ":00:00.000+02:00",
          );
          msg.payload.time = testtime
          powerPriceOptimizerNode.receive(msg);  
          let msg2= {payload:{currenttemperature: 20.5, time:testtime}}
          outputNode.on("input", onOutput[1]);
        
          powerPriceOptimizerNode.receive(msg2);  
          resolve()       
          }catch(e){
            console.log(e);
            reject(e)
          }
  
        });
  
      } catch (e) {
      reject(e);
    }
  })
  
}
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
      var classType = registerNodeForTest(RED);
      var node = new classType(config);
      node.send = function (this: any, msg: any) {
        expect(msg[0].payload.value).toBeFalsy();
        expect(msg[0].payload.schedule.length).toBe(
          node["config"].storagecapacity,
        );
      };
      expect(node["config"].nightstarthour).toBe(22);
      expect(node["config"].name).toBe("Heating");

      var testDate = new Date(2021, 9, 10, 2, 15, 0);
      node["priceInfo"] = {
        source: PriceSources.other,
        priceDatas: buildPriceData(),
      };
      node["onFullHour"](testDate.getTime());

      // node.onPriceData(node["toPriceData"](buildPriceData()), testDate.getTime());
    
  });
  it("validate hourly timer", () => {
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
           };
        };
  
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
          type: "Heating"
        },
      ];
      Object.keys(config).forEach((k)=>{ flow[0][k] = config[k]})
      flow[0]['name'] = "test name"
        helper.load(powerPriceOptimizer, flow).then( ()=>{
          let n1 = helper.getNode("n1");
          expect(n1["name"]).toBeDefined();
          expect(n1["name"]).toBe("test name");
          expect(n1["config"].designtemperature).toBe(-12)
          done();
      });
    });

    it("should return a temperature", function () {
        return executeFlow(
          {
            minimaltemperature: "21",
            maximaltemperature: "23",
            decreasetemperatureperhour: "0.1",
            increasetemperatureperhour: "0.2"
          },
          "05",
          [function (msg) {
              expect(msg.payload ).toBe(23);
          },
          function (msg) {
              expect(msg.payload ).toBe(23);
              const heating = helper.getNode("heating");
              expect(heating['currenttemperature']  ).toBe(20.5)
        
          }
        ],
        );
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
          [function (msg) {
            expect((msg.payload as any).hotwatertargettemp).toBe(48);
            let count = countTemps(msg.schedule);
            expect(count.find((e) => e.minHour == 5)).toBeDefined();
            console.log(JSON.stringify(count, null, "\t"));
          }],
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
          [function (msg) {
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
          }],
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
          [function (msg) {
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
          }],
        );
      });
    });
    it(" cheap hours set return high price range", function () {
      return  executeFlow(
          {
            minimaltemperature: "21",
            maximaltemperature: "23",
            decreasetemperatureperhour: "0.1",
            increasetemperatureperhour: "0.2"
          },
          "07",
          [function (msg) {
            expect((msg.payload as any)).toBe(21);
            
          },function (msg) { 
          }],
        );
    });
    it(" nightlyhours set return nighttemperature", function () {
      return executeFlow(
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
          [function (msg) {
              expect((msg.payload as any)).toBe(12);
          },function (msg) {
        }],
        );
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
          [function (msg) {
            expect(
              msg.schedule.filter((s) => s.returnValue != undefined).length,
            ).toBe(24);
            resolve();
          }],
        );
      });
    });
  });
});
