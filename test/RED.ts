import { Type } from "typescript";

function on(this: Object, msg: any) {}
export var testNodeConfiguration: any;
export const RED = {
  nodes: {
    createNode: (obj: Object, config: any): void => {
      obj["on"] = on;
    },
    registerType: (name: string, theClass: any): Type => {
      return theClass;
    },
  },
};
