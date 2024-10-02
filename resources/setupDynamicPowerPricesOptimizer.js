

  function generateOutputValueTypedInput(index, defaultType){
    var nt= "#node-input-outputValue" + index + "Type"
    if( $(nt).length != 1)
      RED.notify("not right" + index)
      
    var  typedInp = {
              default: defaultType,
              types:["str","num","bool"],
              typeField: nt
       }
      var n = $("#node-input-outputValue" + index )
      if( n.length!= 1)
        RED.notify("also not right" + index)
      try{
         n.typedInput(typedInp);
      }catch( e){
        RED.notify("does not  return " + JSON.stringify(e))
      }
     
      
  }

  function generateOutputValueFields(index, label, prefix, additionalInputField){

     var rc =   (prefix?prefix:"") + '<div class="form-row">\n' +
      ' <label for="node-input-outputValue' + index + '" style="text-indent: -8px;"><i class="fa fa-arrows-h"></i> '+ label + '</label>\n' + 
      ' <input type="text" id="node-input-outputValue' + index + '" style="width: 180px">\n' +
      ' <input type="hidden" id="node-input-outputValue' + index + 'Type">\n' + (additionalInputField ? additionalInputField:"")+
      '</div>\n'
      return rc;
  }
  const moreLabel= "More"
  const lessLabel= "Less"
  function toggleIntermediate(){
    var button = document.getElementById("more-button")
    var div = document.getElementById("intermediate")

    if(button.innerText == moreLabel){
      button.innerText  = lessLabel
      div.style.display=''
    }
    else{
      button.innerText = moreLabel
      div.style.display='none'
    }
      
  }

  function generateOutputValues(){

    let indexes= [ 
          {field: "First", label:"Cheapest", defaultType: "bool", additionalInputField: firstOptionAndMoreButton},
           {field: "Second", label:"Intermediate 1", defaultType: "num", prefix:'<div class="form-row" id="intermediate" style="display:none">\n'},
           {field: "Third", label:"Intermediate 2", defaultType: "num"},
           {field: "Last", label:"Most expensive", defaultType: "bool", prefix:'\n</div>', additionalInputField: lastOptionButton},
           {field: "NoPrices", label:"No Prices", defaultType: "bool"}
          ]

    for( n of indexes) 
       generateOutputValueTypedInput(n.field, n.defaultType)
    // generateOutputValueTypedInput("NoPrices", "bool")
  
  }
  
  RED.nodes.registerType("Dyn. Pwr. consumption optimization", {
    category: "Power Saver",
    color: "#a6bbcf",
    defaults: {
      name: { value: "Price Ranges" },
      tolerance: {},
      pricedatelimit: {
        value: 24,
        required: true,
      },
      fromTime: { value: 1 },
      toTime: { value: 3},

      outputValueFirst: { value: "test"},
      outputValueFirstType: { value: "bool", required:true  },
      outputValueSecond: { value: 45 , required:false,  validate: RED.validators.typedInput("outputValueSecondType", false) },
      outputValueSecondType: { value: "num", required:true  },
      outputValueThird: {  required:false,  validate: RED.validators.typedInput("outputValueThirdType", false) },
      outputValueThirdType: { value: "num", required:true  },
      outputValueLast: { value: false , required:true,  validate: RED.validators.typedInput("outputValueLastType", false) },
      outputValueLastType: { value: "bool", required:true  },
      outputValueNoPrices: { value: false , required:true,  validate: RED.validators.typedInput("outputValueNoPricesType", false) },
      outputValueNoPricesType: { value: "bool", required:true  },
      outputValueHours: {
        value: 2,
        required: true,
       },
      outputValueLastOption: {
        value: 1,
        required: true
      },
     sendCurrentValueWhenRescheduling: {
        value: "true",
        required: true,
        align: "left",
      },
     },
    inputs: 1,
    outputs: 1,
    icon: "font-awesome/fa-bar-chart",
    color: "#FFCC66",
    label: function () {
      return this.name || "Price Ranges";
    },
    outputLabels: ["on", "off", "schedule"],
    oneditprepare: function () {
      $("#node-input-outputOutsidePeriod").typedInput({
        types: [
          {
            value: "onoff",
            options: [
              { value: "true", label: "On" },
              { value: "false", label: "Off" },
            ],
          },
        ],
      });
      generateOutputValues()
    
    },
    oneditsave:function() {
    
      //this.tolerance = $("#node-input-tolerance").val()

    }
  });