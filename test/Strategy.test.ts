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
      },
      { numberFields: ["num"], booleanFields: ["boo"], typeFields: ["tf"] },
      RED,
    );
    expect(typeof s["config"].num).toBe("number");
    expect(s["config"].tf.value).toBe(45);
    expect(s["config"].tf.type).toBe("num");
    expect(s["config"].tfType).not.toBeDefined();
  });
});
