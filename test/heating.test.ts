// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import { resolveCaa } from "dns";
import { registerNodeForTest, ScheduleEntry } from "../src/heating";
import powerPriceOptimizer from "../src/heating";
import { RED } from "./RED";
import fs from "fs";
import { NodeTestHelper } from "node-red-node-test-helper";
import { join } from "path";

import { PriceSources } from "../src/periodgenerator";
import { PriceData } from "../src/@types/basenode";
import { HeatingConfig } from "../src/@types/heating";
import { on } from "events";

const config: HeatingConfig = {
  name: "Heating",
  periodlength: 1,
  nightstarthour: 22,
  nightendhour: 5,
  nighttargettemperature: 12,
  minimaltemperature: 20,
  maximaltemperature: 22,
  increasetemperatureperhour: 0.2,
  decreasetemperatureperhour: 0.3,
  designtemperature: -12,
};
const cheapHour:number = 4
const expensiveHour= 18
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
function getTestTime(hour:number):number{
  return Date.parse("2021-10-11T" + String(hour).padStart(2,'0') + ":00:00.000+02:00");
}
describe("Standalone Tests", () => {
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
});
type OnOutputFunction = { fct: (msg: any) => void, payload?:any, hour?:number};

function buildPayload(onOutput:OnOutputFunction):any{
  if(onOutput.payload != undefined)
    return onOutput
  if( onOutput.hour != undefined ) 
    return {payload:{time:getTestTime(onOutput.hour)}}
}

function executeFlow(
  helper: any,
  attrs: any,
  onOutput: OnOutputFunction[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      let cfg = Object.assign(config, attrs);

      Object.keys(cfg).forEach((key) => {
        if (cfg[key] === undefined) delete cfg[key];
        else cfg[key] = cfg[key].toString();
      });
      cfg.name = "test name";
      cfg.id = "heating";
      cfg.type = "Heating";
      let output = [["output"]];
      cfg.wires = output;

      let flow: any[] = []
      flow.push(cfg)
      flow.push( { id: "output", type: "helper" });
      helper.load(powerPriceOptimizer, flow, function () {
        try {
          const powerPriceOptimizerNode = helper.getNode("heating");
          expect(powerPriceOptimizerNode).not.toBeNull();
          const outputNode = helper.getNode("output");
          expect(outputNode).not.toBeNull();
          let callCount = 0
          outputNode.on("input", (msg:any)=>{
            onOutput[callCount].fct(msg)
            ++callCount
            if( onOutput.length > callCount){
              powerPriceOptimizerNode.receive(buildPayload(onOutput[callCount]));    
            }
            else
              resolve() // No second call
          })
               
   
          let data = fs.readFileSync(
            "test/data/tibber-prices-single-home.json",
            {
              encoding: "utf-8",
            },
          );
          let msg = {payload:Object.assign(JSON.parse(data).payload,buildPayload(onOutput[0]).payload)}
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
describe("Node Server tests", () => {
  let helper = new NodeTestHelper();
  helper.init(require.resolve("node-red"));

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
      },
    ];
    Object.keys(config).forEach((k) => {
      flow[0][k] = config[k];
    });
    flow[0]["name"] = "test name";
    helper.load(powerPriceOptimizer, flow).then(() => {
      let n1 = helper.getNode("n1");
      expect(n1["name"]).toBeDefined();
      expect(n1["name"]).toBe("test name");
      expect(n1["config"].designtemperature).toBe(-12);
      done();
    });
  });

  it("should return a temperature", function () {
    return executeFlow(
        helper,
        {
          minimaltemperature: "21",
          maximaltemperature: "23",
          decreasetemperatureperhour: "0.1",
          increasetemperatureperhour: "0.2",
        },
          [{ hour:5,fct:function (msg) {
            expect(msg.payload).toBe(21);
          }}
          ]

      )
  
  });

  it("Hotwater: low price => maximal temperature  ", function () {
    return executeFlow(
      helper,
      {
        minimaltemperature: "45",
        maximaltemperature: "57",
        designtemperature: undefined,
      },
      [
        {hour:cheapHour,fct:function (msg) {
          expect(msg.payload).toBe(57);
        }}
      ],
    );
  });
  it("Hotwater: high price => minimal temperature  ", function () {
    return executeFlow(
      helper,
      {
        minimaltemperature: "45",
        maximaltemperature: "57",
        designtemperature: undefined,
      },
      [
        {hour:18,fct:function (msg) {
          expect(msg.payload).toBe(45);
        }},
      ],
    );
  });
  it(" Heating: high price => minimal temperature", function () {
    return executeFlow(
      helper,
      {
        minimaltemperature: "21",
        maximaltemperature: "23",
        decreasetemperatureperhour: "0.1",
        increasetemperatureperhour: "0.2",
      },
     [
        { hour:18, fct:function (msg) {
          expect(msg.payload as any).toBe(21);
        }, payload: {time: getTestTime(7)}}
      ],
    );
  });
  it(" nightlyhours: low price => maximal temperature", function () {
    return executeFlow(
      helper,
      {
        minimaltemperature: "21",
        maximaltemperature: "23",
        decreasetemperatureperhour: "0.1",
        increasetemperatureperhour: "0.2",
        nightstarthour: "22",
        nightendhour: "6",
        nighttargettemperature: "12",
      },
      [
        { hour:23, fct:function (msg) {
          expect(msg.payload as any).toBe(21);
        }, payload: {time: getTestTime(7)}}
      ],
    );
  });
  it("Night high price => night temperature", function () {
    return executeFlow(
      helper,
      {
        minimaltemperature: "21",
        maximaltemperature: "23",
        decreasetemperatureperhour: "0.1",
        increasetemperatureperhour: "0.2",
        nightstarthour: "22",
        nightendhour: "6",
        nighttargettemperature: "12",
      },
      [{ hour:getTestTime(5), fct: function (msg) {}},
       { payload:{ currenttemperature: 15, hour:getTestTime(5)}, fct: function (msg) {expect(msg.payload as any).toBe(12)}}],
    );
  });
  it("Night low price => maximal temperature", function () {
    return executeFlow(
      helper,
      {
        storagecapacity: "24",

        outputValueLastHours: "5",
        outputValueSecond: '{ "hotwatertargettemp": 47 }',
        outputValueSecondType: "json",
      },
      [{ hour:5, fct: function (msg) {expect(msg.payload as any).toBe(12)}}],
    );
  });
});
