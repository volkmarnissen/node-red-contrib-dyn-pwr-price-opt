// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import { registerNodeForTest } from "../src/heating";
import powerPriceOptimizer from "../src/heating";
import { RED } from "./RED";
import { NodeTestHelper } from "node-red-node-test-helper";

import { PriceSources } from "../src/periodgenerator";
import { buildPriceData, config, executeFlow, getTestTime, OnOutputFunction } from "./executeFlow";


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
      (flow[0] as any)[k] = (config as any)[k];
    });
    (flow[0] as any)["name"] = "test name";
    helper.load(powerPriceOptimizer, flow).then(() => {
      let n1 = helper.getNode("n1");
      expect(n1["name"]).toBeDefined();
      expect(n1["name"]).toBe("test name");
      expect((n1 as any)["config"].designtemperature).toBe(-12);
      done();
    });
  });

  it("should return a temperature", function () {
    return expect(
      executeFlow(
        helper,
        {
          minimaltemperature: "21",
          maximaltemperature: "23",
          decreasetemperatureperhour: "0.1",
          increasetemperatureperhour: "0.2",
          nightstarthour: undefined,
        },
        [
          {
            hour: 5,
            fct: function (msg) {
              expect(msg.payload).toBeGreaterThan(20);
            },
            payload: {
              currenttemperature: 22,
              outertemperature: 15,
              time: getTestTime(5),
            },
            type:"Heating"
          },
        ],
      ),
    ).resolves.toBe("OK");
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
        {
          hour: 18,
          fct: function (msg) {
            expect(msg.payload as any).toBe(21);
          },
          payload: { currenttemperature: 22, time: getTestTime(7), outertemperature: 12 },
            type:"Heating"
        },
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
        increasetemperatureperhour: "0.5",
        nightstarthour: "22",
        nightendhour: "9",
        nighttemperature: "14",
      },
      [
        {
          hour: 23,
          fct: function (msg) {
            expect(msg.payload as any).toBe(23);
          },
          payload: {
            currenttemperature: 15,
            outertemperature: -10,
            time: getTestTime(4)
          },
          type:"Heating"
        },
      ],
    );
  });
  it("Night high price => night temperature", function () {
    let helper2 = new NodeTestHelper();

    return executeFlow(
      helper2,
      {
        minimaltemperature: "21",
        maximaltemperature: "23",
        decreasetemperatureperhour: "0.1",
        increasetemperatureperhour: "0.2",
        nightstarthour: "22",
        nightendhour: "6",
        nighttemperature: "19",
      },
      [
        {
          payload: {
            currenttemperature: 19.5,
            outertemperature: -10,
            time: getTestTime(23),
          },
          hour: 23,
          fct: function (msg) {
            console.log("In onInput " + msg.payload);
            expect(msg.payload as any).toBe(19);
          },
          type:"Heating"
        },
      ],
    );
  });
  // function executeExample(
  //   filename: string,
  //   nodesModifier: (node: any, data: any) => void,
  //   validationFunction:(msg:any)=>void,
  //   data: any,
  // ): Promise<string> {
  //   return new Promise<string>((resolve, reject) => {
  //     // read example json file
  //     helper.init('/Users/volkmar/node-red')
  //     let exampleFile = join(__dirname, "..", "examples", filename);
  //     let json = fs.readFileSync(exampleFile, { encoding: "utf8" });
  //     let flow = JSON.parse(json);
  //     let injectNode: any = undefined;
  //     let outputNodeId = undefined;
  //     let flowArray:any = []
  //     Object.keys(flow).forEach((key) => {
  //       if (flow[key].name != undefined) {
  //         let name: string = flow[key].name;
  //         if (name.startsWith("input")) injectNode = flow[key];
  //         if (name.startsWith("output")) {
  //           flow[key].type = "helper";
  //           outputNodeId = flow[key].id
  //           // helper will ignore the other attributes (hopefully)
  //         }
  //         nodesModifier(flow[key], data);
  //         flowArray.push(flow[key]);
  //       }
  //     });

  //     return helper.load(powerPriceOptimizer, flowArray, function () {
  //       try {
  //         if( outputNodeId == undefined){
  //           reject(new Error("outputNode not found"))
  //           return;
  //         }
  //         const outputNode = helper.getNode(outputNodeId);
  //         expect( outputNode).not.toBeNull();
  //         outputNode.on("input",validationFunction);
  //       } catch (e) {
  //         console.log(e);
  //         reject(e);
  //       }
  //     });
  //   });
  // }
  // function nodesModifier(node: any, data: any) {
  //   if (node.name.startsWith("currenttemperature") && data.currenttemperature) {
  //     node.op2 = '{"currenttemperature": ' + data.currenttemperature + "}";
  //   }
  //   if (node.name.startsWith("datetime trigger") && data.time) {
  //     node.op2 = '{"time": ' + data.time + "}";
  //   }
  // }
  // it("Simple Example 4:00 42°C-> 40°C", () => {
  //   for (let a: number = 0; a < 24; a++) {
  //     console.log("" + a + ":00", getTestTime(a));
  //   }
  // });
});
