import { HeatingNode } from "./heating";

export default function register(RED: any): any {
  class HotwaterNode extends HeatingNode {
    constructor(config: any) {
      super(config, RED);
    }
  }
  // In unit tests, registerType returns the node class in production, the return code is not used
  return RED.nodes.registerType("Hotwater", HotwaterNode);
}

//For unit tests: Calls RED.nodes.registerType with mocked  RED
export var registerNodeForTest = register;
