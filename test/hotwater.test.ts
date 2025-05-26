// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";

import powerPriceOptimizer from "../src/hotwater";
import { RED } from "./RED";

import { NodeTestHelper } from "node-red-node-test-helper";

import { Mutex } from "async-mutex";


let helper = new NodeTestHelper();
helper.init(require.resolve("node-red"));
type OnOutputFunction = (msg: any) => void;

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
          type: "Hotwater",
          name: "test name",
          outputValueFirst: '{ "hotwatertargettemp": 48 }',
          outputValueFirstType: "json",
          outputValueLast: '{ "hotwatertargettemp": 45 }',
          outputValueLastType: "json",
        },
      ];
     
      helper.load(powerPriceOptimizer, flow, function () {
          const n1 = helper.getNode("n1");
          expect(n1["name"]).toBeDefined();
          expect(n1["name"]).toBe("test name");
          done();
        });
    });

 
  });
