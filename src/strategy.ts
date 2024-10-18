import {
  MessageType,
  PriceData,
  TypeDescription,
} from "./@types/dynamic-power-prices-optimizer-node";
export const dataSeparator = "|";
// Strategy creates the node, does type conversions for Config
// It reacts on input messages by doing type conversion and forwarding to onPayload, onTime or onConfig
export class Strategy<Config> {
  private RED: any;
  private inputListeners: { re: RegExp; func: (msg: any) => void }[] = [];
  protected config: Config;
  private on: (event: string, handler: Function) => void;
  protected send: (outputs: any[]) => void;
  protected status: (options: {
    fill: string;
    shape: string;
    text: string;
  }) => void;
  constructor(
    config: any,
    private configType: TypeDescription,
    RED: any,
  ) {
    this.RED = RED;
    RED.nodes.createNode(this, config);
    if (this.config == undefined) this.config = config;
    this.overwriteConfigProperties(this.config, config);
    this.on("input", this.onInput.bind(this));
    this.on("close", this.onClose.bind(this));
    this.registerInputListener(/^config$/g, this.onConfigLocal.bind(this));
  }
  protected registerInputListener(re: RegExp, func: (msg: any) => void) {
    this.inputListeners.push({ re: re, func: func });
  }
  // builds recursive list of the data structure in node
  private buildNameList(
    node: any,
    nodePath: string,
    result: { name: string; node: any }[],
  ) {
    if (Array.isArray(node) || node.length != undefined) return;
    let newNames = Object.getOwnPropertyNames(node);
    if (undefined != newNames)
      newNames.forEach((name) => {
        let newNodePath =
          nodePath == "" ? name : nodePath + dataSeparator + name;
        result.push({ name: newNodePath, node: node[name] });
        this.buildNameList(node[name], newNodePath, result);
      });
  }
  protected onInput(msg: MessageType): void {
    let time = msg.payload.time;
    if (time == undefined) time = Date.now();
    let nodes: { name: string; node: any }[] = [];
    this.buildNameList(msg, "", nodes);
    this.inputListeners.forEach((listener) => {
      nodes.forEach((node) => {
        if (node.name.match(listener.re)) listener.func(msg);
      });
    });
    if (time != undefined) this.onTime(time);
  }

  private onConfigLocal(config: any): void {
    this.overwriteConfigProperties(this.config, config);
    this.onConfig();
  }

  // overwritables
  onConfig() {}
  onTime(time: number): void {}
  onClose(): void {}

  toPriceData(priceData: any): PriceData[] {
    var rc: PriceData[] = [];
    priceData.forEach((pd: any) => {
      var pdRC: PriceData = {
        start: Date.parse(pd.start),
        value: Number.parseFloat(pd.value),
      };
      rc.push(pdRC);
    });

    return rc;
  }

  private overwriteConfigProperties(target: Config, config: any): void {
    if (this.configType.typeFields)
      for (let typeField of this.configType.typeFields) {
        if (
          config[typeField] != undefined &&
          config[typeField + "Type"] != undefined
        ) {
          let val: { value: any; type: string } = {
            value: 45,
            type: "num",
          };
          switch (String(config[typeField + "Type"])) {
            case "bool":
              val.value = config[typeField] === "true";
              break;
            case "num":
              val.value = Number(config[typeField]);
              break;
            case "json":
              val.value = JSON.parse(config[typeField]);
              break;
            default:
              break;
          }
          val.type = config[typeField + "Type"];
          config[typeField] = val;
          delete (config as any)[typeField + "Type"];
        }
      }
    if (this.configType.numberFields)
      for (let numberField of this.configType.numberFields)
        if (config[numberField] != undefined)
          config[numberField] = Number.parseFloat(config[numberField]);
    if (this.configType.booleanFields)
      for (let booleanField of this.configType.booleanFields)
        if (config[booleanField] != undefined)
          config[booleanField] = config[booleanField] === "true";
    for (let field of Object.keys(config)) {
      if (target[field] == undefined)
        Object.defineProperty(target, field, { value: config[field] });
      else target[field] = config[field];
    }
  }
}
