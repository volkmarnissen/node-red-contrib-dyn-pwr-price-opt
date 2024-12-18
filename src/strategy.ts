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
    try{
      this.overwriteConfigProperties(this.config, config);
  
    }catch (e){
      console.log(e.message)
    }
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
    let time = Date.now();
    if (msg.payload && msg.payload.time) time = msg.payload.time;
    let nodes: { name: string; node: any }[] = [];
    this.buildNameList(msg, "", nodes);
    this.inputListeners.forEach((listener) => {
      nodes.forEach((node) => {
        if (node.name.match(listener.re)) listener.func(node.node);
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
  private setField(target: Object, field: string, value: any, type: string) {
    let newValue = structuredClone(value);
    if (typeof value == "string" && newValue.length == 0) 
      newValue = undefined;
    else
    if (typeof value == "string")
      switch (type) {
        case "num":
          newValue = Number.parseFloat(value);
          break;
        case "bool":
          newValue = "true " == value;
          break;
        case "json":
          newValue = JSON.parse(value);
          break;

        default:
      }

   
    if (target[field] == undefined)
      Object.defineProperty(target, field, { value: newValue, writable: true });
    else target[field] = newValue;
  }

  private overwriteConfigProperties(target: Config, config: any): void {
    for (let field of Object.keys(config)) {
      if (config.hasOwnProperty(field)){
        let fieldType  = config.hasOwnProperty(field + "Type")? config[field + "Type"]:target.hasOwnProperty(field + "Type")?target[field + "Type"]:"copy"
        this.setField(target, field, config[field], fieldType);

      }

      
    }

    if (this.configType.typeFields)
      for (let typeField of this.configType.typeFields) {
        if (! typeField.endsWith("Type") && config[typeField] != undefined ) {
          if (config[typeField + "Type"] == undefined)
            config[typeField + "Type"] = this.config[typeField].type;

          if (typeof config[typeField] != "string")
            this.setField(target, typeField, config[typeField], "copy");
          else
            if (config[typeField] == "")
              this.setField(target, typeField, undefined, "copy");
            else
              if( ["num", "bool", "json"].includes(String(config[typeField + "Type"])) )
                   this.setField(
                      target,
                      typeField,
                      config[typeField],
                      config[typeField + "Type"],
                    )
              else 
                this.setField(target, typeField, config[typeField], "copy");
        }
      }

    if (this.configType.numberFields)
      for (let numberField of this.configType.numberFields)
        if (config[numberField] != undefined)
          this.setField(target, numberField, config[numberField], "number");
    if (this.configType.booleanFields)
      for (let booleanField of this.configType.booleanFields)
        if (config[booleanField] != undefined)
          this.setField(
            target,
            booleanField,
            config[booleanField] === "true",
            "boolean",
          );
  }
}
