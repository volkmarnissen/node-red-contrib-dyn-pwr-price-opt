// tests/calculator.spec.tx
//import { expect, it, describe } from "@jest/globals";
import {registerNodeForTest} from "./../src/dynamic-power-prices-optimizer-node";
import { PriceRangeConfig, PriceRangePayload, TypeDescription } from "../src/@types/dynamic-power-prices-optimizer-node";
import{ RED} from './RED'
import { Strategy } from "../src/strategy";
const config ={
   test:"test"
}
describe("dynamic-power-prices-optimizer-node Tests", () => {
  
   it("fix range", () => {
      var classType = registerNodeForTest(RED)
      var node = new classType( config )
      expect( node['config'].test ).toBe("test")
      node.onPriceData([{ value:"test", start:"Some Time"}])
      console.log("XXX")     
   });

})