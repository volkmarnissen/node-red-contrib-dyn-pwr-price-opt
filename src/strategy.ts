
import { MessageType, PriceData, TypeDescription } from './@types/dynamic-power-prices-optimizer-node';

// Strategy creates the node, does does type conversions for Config and payload
// It reacts on input messages by doing type conversion and forwarding to onPayload, onTime or onConfig
export  class Strategy<Config, Payload>    {
    private RED:any
    protected config:Config;
    private on: (event: string, handler: Function) => void;
    constructor( config: any, private configType: TypeDescription, RED:any) {
        this.RED=RED;
        RED.nodes.createNode(this, config);
        if( this.config == undefined)
            this.config = config
        this.overwriteConfigProperties(this.config, config)       
        this.on('input', this.onInput);
        this.on('close', this.onClose);
    }

    protected onInput(msg: MessageType):void{
        if(msg.payload.config!=undefined)
            this.onConfigLocal(msg.payload.config)
        if(msg.payload.priceData!=undefined)
            this.onPriceData(this.toPriceData(msg.payload.priceData))
        if( msg.payload.time != undefined )
            this.onTime(msg.payload.time)
    };

    private onConfigLocal(config:any):void{
        this.overwriteConfigProperties(this.config,config)  
        this.onConfig()
    }

 
    // overwritables
    onConfig(){}
    onPriceData(priceData:PriceData[]):void{};
    onTime(time:string):void{};
    onClose():void{}
  
    toPriceData(priceData : PriceData[]):PriceData[] {
        return priceData
    }
   
    private overwriteConfigProperties(target:Config, config : any):void {
    if(this.configType.typeFields)
     for(let typeField of this.configType.typeFields){
       if( config[typeField ] != undefined && config[typeField + "Type"] != undefined){
        let val:{ value:any, type:string} = {
            value: 45,
            type:"num"
        }
        switch(String(config[typeField + "Type"])){
         case "bool": 
             val.value = (config[typeField] === 'true');
             break;
             case "num": 
             val.value = Number(config[typeField]);
             break;
             default: break;
        }
        val.type = (config[typeField + "Type"]);
        config[typeField] = val
        delete (config as any)[typeField+"Type"]     
       }

     }
    if(this.configType.numberFields)
        for(let numberField of this.configType.numberFields)
            if( config[numberField ] != undefined )
                config[numberField] = Number.parseFloat(config[numberField]);
    if(this.configType.booleanFields)
     for(let booleanField of this.configType.booleanFields)
        if( config[booleanField ] != undefined )
           config[booleanField] = (config[booleanField] ==='true');
    for( let field of Object.keys(config)){
        if(target[field] == undefined )
            Object.defineProperty(target,field, {value:config[field]});
        else
            target[field] = config[field]
    }
   }
}
