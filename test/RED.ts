import { Type } from "typescript";

function REDon(this: Object, msg: any) {}
function REDsend(this: Object, msg: any) {}
function REDstatus(this: Object, options: any) {}

export var testNodeConfiguration: any;
export const RED = {
  nodes: {
    createNode: (obj: Object, config: any): void => {
      obj["on"] = REDon;
      obj["send"] = REDsend;
      obj["status"] = REDstatus;
    },
    registerType: (name: string, theClass: any): Type => {
      return theClass;
    },
  },
};
