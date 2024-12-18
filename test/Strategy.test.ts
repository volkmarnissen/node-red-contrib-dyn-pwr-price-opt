// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import { Strategy } from "./../src/strategy";
import { TypeDescription } from "../src/@types/dynamic-power-prices-optimizer-node";
import { RED } from "./RED";
const tTest: TypeDescription = {};
describe("Strategy Tests", () => {
  it("toConfig", () => {
    let s = new Strategy<any>(
      {
        num: "45",
        numType: "num",
        boo: true,
        booType: "bool",
        tf: "45",
        tfType: "num",
        fld: "Just a field",
        jsonType: "json",
        json: '{ "name": "test" }',
      },
      {
        numberFields: ["num"],
        booleanFields: ["boo"],
        typeFields: ["tf", "json"],
      },
      RED,
    );
    expect(typeof s["config"].num).toBe("number");
    expect(typeof s["config"].json).toBe("object");
    expect(s["config"].tf).toBe(45);
    let newTarget = {num: 47};

    s["onConfigLocal"](newTarget);
    expect(typeof s["config"].num).toBe("number");
    expect(typeof s["config"].json).toBe("object");
    expect(s["config"].tf).toBe(45);
    expect(s["config"].num).toBe(47);
  });
});
