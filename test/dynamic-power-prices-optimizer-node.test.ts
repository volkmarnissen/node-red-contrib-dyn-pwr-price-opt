// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import { resolveCaa } from "dns";
import { registerNodeForTest } from "./../src/dynamic-power-prices-optimizer-node";
import powerPriceOptimizer from "./../src/dynamic-power-prices-optimizer-node";
import { RED } from "./RED";
import fs from "fs";
import { NodeTestHelper, TestFlows } from "node-red-node-test-helper";
import { join } from "path";
import { PriceSources } from "../src/priceconverter";
let helper = new NodeTestHelper();
helper.init(require.resolve("node-red"));
type OnOutputFunction = (msg:any)=>void 
function executeFlow( attrs:any, onOutput:OnOutputFunction ):void{
  try {
    let flow = [Object.assign({
      id: "powerPriceOptimizer",
      type: "Dyn. Pwr. consumption optimization",
      name: "Receive prices",
      outputValueFirst: '{ "hotwatertargettemp": 48 }',
      outputValueFirstType: "json",
      outputValueLast: '{ "hotwatertargettemp": 45 }',
      outputValueLastType: "json",
      wires: [["output"]],
    }, attrs ),
    { id: "output", type: "helper" },
]
    helper.load(powerPriceOptimizer, flow, function () {
      const powerPriceOptimizerNode = helper.getNode("powerPriceOptimizer");
      const outputNode = helper.getNode("output");
      outputNode.on("input", onOutput);
      let data = fs.readFileSync(
        "test/data/tibber-prices-single-home.json",
        { encoding: "utf-8" },
      );
      let msg = JSON.parse(data);
   
      msg.payload.time = Date.parse("2021-10-11T05:00:00.000+02:00");
      powerPriceOptimizerNode.receive(msg);
   })
  }
  catch(e){
    console.log(e)
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
  outputValueFirst: '{"value": 45.1,"type":"test"}',
  outputValueFirstType: "json",
  outputValueSecond: 45,
  outputValueSecondType: "num",
  outputValueThird: "This is a text",
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
    var classType = registerNodeForTest(RED);
    var node = new classType(config);
    node.send = function (this: any, msg: any) {
      expect(msg[0].payload.value).toBeFalsy();
      expect(msg[0].payload.schedule.length).toBe(
        node["config"].storagecapacity,
      );
    };
    expect(node["config"].outputValueFirst.value.value).toBe(45.1);
    expect(node["config"].outputValueFirst.value.type).toBe("test");

    expect(node["config"].outputValueFirst.type).toBe("json");
    var testDate = new Date(2021, 9, 10, 2, 15, 0);
    node["priceInfo"] = {
      source: PriceSources.other,
      priceDatas: buildPriceData(),
    };
    node["onFullHour"](testDate.getTime());

    // node.onPriceData(node["toPriceData"](buildPriceData()), testDate.getTime());
    console.log("XXX");
  });
  it("validate hourly timer", () => {
    new Promise<void>((resolve, reject) => {
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
          type: "Dyn. Pwr. consumption optimization",
          name: "test name",
        },
      ];
      helper.load(powerPriceOptimizer, flow, function () {
        const n1 = helper.getNode("n1");
        expect(n1["name"]).toBeDefined();
        expect(n1["name"]).toBe("test name");
        done();
      });
    });

   
    it("should have priceData", function () {
      return new Promise<void>((resolve, reject) => {
        executeFlow({
          storagecapacity : "24",
          outputValueHours : "3"
        },function (msg){
            expect((msg.payload as any).value.hotwatertargettemp).toBe(45);
            let rc = (msg.payload as any).schedule.filter(
              (entry) => entry.returnValue.value.hotwatertargettemp == 48,
            );
            expect(rc.length).toBe(3);
            expect(msg.payload.schedule.length).toBe(24)
            expect(msg.payload.schedule[0].start ).toBe(msg.payload.time)
            resolve();
          } )
        });
      });
      it(" mostExpensive hours set", function () {
        return new Promise<void>((resolve, reject) => {
          executeFlow({
            storagecapacity : "24",
            outputValueLastHours : "5"
          },function (msg){
              expect((msg.payload as any).value.hotwatertargettemp).toBe(48);
              let rc = (msg.payload as any).schedule.filter(
                (entry) => entry.returnValue.value.hotwatertargettemp == 45,
              );
              expect(rc.length).toBe(5);
              resolve();
            } )
          });
        });
        it(" no hours set:: complete schedule has return values", function () {
          return new Promise<void>((resolve, reject) => {
            executeFlow({
              storagecapacity : "24",
            },function (msg){
                expect( msg.payload.schedule.filter( s=>s.returnValue != undefined).length) .toBe(24)
                resolve();
              } )
            });
          });
    });
  });
