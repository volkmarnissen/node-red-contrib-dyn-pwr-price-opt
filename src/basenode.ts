import {
  IfieldDescription,
  MessageType,
  PriceData,
  TypeDescription,
} from "./@types/basenode";
export const dataSeparator = "|";
// Strategy creates the node, does type conversions for Config
// It reacts on input messages by doing type conversion and forwarding to onPayload, onTime or onConfig
export class BaseNode<Config> {
  private RED: any;
  private inputListeners: { re: RegExp; func: (msg: any) => boolean }[] = [];
  protected config: Config;
  protected configInvalid: string = undefined;
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
    try {
      this.overwriteConfigProperties(this.config, config);
    } catch (e) {
      console.log(e.message);
    }
    this.on("input", this.onInput.bind(this));
    this.on("close", this.onClose.bind(this));
    this.registerInputListener(/^config$/g, this.onConfigLocal.bind(this));
  }
  protected registerInputListener(re: RegExp, func: (msg: any) => boolean) {
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
    try {
      let handled = false;
      this.inputListeners.forEach((listener) => {
        nodes.forEach((node) => {
          if (node.name.match(listener.re))
            handled = handled || listener.func(node.node);
        });
      });
      if (time != undefined) this.onTime(time);
    } catch (e) {
      console.log(e);
      throw e;
    }
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
  private setField(
    target: Object,
    field: IfieldDescription,
    value: any,
    type: string,
  ) {
    let newValue = structuredClone(value);
    if (typeof value == "string" && newValue.length == 0) newValue = undefined;
    else if (typeof value == "string")
      switch (type) {
        case "num":
          newValue = Number.parseFloat(value);
          if (field.required && Number.isNaN(value))
            throw new Error(
              "Required field " + field.name + " is not a valid number ",
            );
          break;
        case "bool":
          newValue = "true " == value;
          break;
        case "json":
          newValue = JSON.parse(value);
          break;

        default:
      }

    if (target[field.name] == undefined)
      Object.defineProperty(target, field.name, {
        value: newValue,
        writable: true,
      });
    else target[field.name] = newValue;
  }
  private findMissingRequiredFields(fields: IfieldDescription[], config: any) {
    let rc = fields.find(
      (bf) => bf.required && !config.hasOwnProperty(bf.name),
    );
    if (rc != null) {
      this.configInvalid = "Required field " + rc.name + " is not configured ";
    }
    return rc;
  }
  private overwriteConfigProperties(target: Config, config: any): void {
    this.configInvalid = undefined;
    if (this.configType.booleanFields)
      this.findMissingRequiredFields(this.configType.booleanFields, config);
    if (this.configInvalid == undefined && this.configType.numberFields)
      this.findMissingRequiredFields(this.configType.numberFields, config);
    if (this.configInvalid == undefined && this.configType.typeFields)
      this.findMissingRequiredFields(this.configType.typeFields, config);
    for (let field of Object.keys(config)) {
      if (config.hasOwnProperty(field)) {
        let cType = this.configType.booleanFields.find((f) => f.name == field);
        if (cType == null)
          cType = this.configType.numberFields.find((f) => f.name == field);
        if (cType == null)
          cType = this.configType.typeFields.find((f) => f.name == field);
        let fieldType = config.hasOwnProperty(field + "Type")
          ? config[field + "Type"]
          : target.hasOwnProperty(field + "Type")
            ? target[field + "Type"]
            : "copy";
        this.setField(
          target,
          { name: field, required: cType != null ? cType.required : false },
          config[field],
          fieldType,
        );
      }
    }

    if (this.configType.typeFields)
      for (let typeFieldDescription of this.configType.typeFields) {
        let typeField = typeFieldDescription.name;
        if (!typeField.endsWith("Type") && config[typeField] != undefined) {
          if (config[typeField + "Type"] == undefined)
            config[typeField + "Type"] = this.config[typeField].type;

          if (typeof config[typeField] != "string")
            this.setField(
              target,
              typeFieldDescription,
              config[typeField],
              "copy",
            );
          else if (config[typeField] == "")
            this.setField(
              target,
              { name: typeField, required: false },
              undefined,
              "copy",
            );
          else if (
            ["num", "bool", "json"].includes(String(config[typeField + "Type"]))
          )
            this.setField(
              target,
              { name: typeField, required: false },
              config[typeField],
              config[typeField + "Type"],
            );
          else
            this.setField(
              target,
              { name: typeField, required: false },
              config[typeField],
              "copy",
            );
        }
      }

    if (this.configType.numberFields)
      for (let numberFieldDescription of this.configType.numberFields)
        if (config[numberFieldDescription.name] != undefined)
          this.setField(
            target,
            numberFieldDescription,
            config[numberFieldDescription.name],
            "num",
          );
    if (this.configType.booleanFields)
      for (let booleanFieldDescription of this.configType.booleanFields)
        if (config[booleanFieldDescription.name] != undefined)
          this.setField(
            target,
            booleanFieldDescription,
            config[booleanFieldDescription.name] === "true",
            "bool",
          );
  }
}
