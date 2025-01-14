function generateOutputValueTypedInput(index, defaultType) {
  var nt = "#node-input-outputValue" + index + "Type";
  if ($(nt).length != 1) RED.notify("not right" + index);

  var typedInp = {
    default: defaultType,
    types: ["str", "num", "bool", "json"],
    typeField: nt,
  };
  var n = $("#node-input-outputValue" + index);
  if (n.length != 1) RED.notify("also not right" + index);
  try {
    n.typedInput(typedInp);
  } catch (e) {
    RED.notify("does not  return " + JSON.stringify(e));
  }
}

const moreLabel = "Show";
const lessLabel = "Hide";
function toggleIntermediate() {
  var button = document.getElementById("more-button");
  var div = document.getElementById("intermediate");
  if (button.innerText == moreLabel) {
    button.innerText = lessLabel;
    div.style.display = "";
  } else {
    button.innerText = moreLabel;
    div.style.display = "none";
  }
}

function generateOutputValues() {
  let indexes = [
    { field: "First", defaultType: "bool" },
    { field: "Second", defaultType: "num" },
    { field: "Third", defaultType: "num" },
    { field: "Last", defaultType: "bool" },
    { field: "NoPrices", defaultType: "bool" },
  ];

  for (n of indexes) generateOutputValueTypedInput(n.field, n.defaultType);
  // generateOutputValueTypedInput("NoPrices", "bool")
}

RED.nodes.registerType("Heating", {
  category: "Dynamic Prices Energy Saver",
  color: "#a6bbcf",
  defaults: {
    name: { value: "Heating" },
    periodlength: {
      value: 1,
      required: true,
    },
    nightstarthour: { required: false },
    nightendhour: { required: false },
    nighttargettemperature: { required: false },
    minimaltemperature: {
      value: 21,
      required: true
    },
    maximaltemperature: {
      value: 23,
      required: true
    },
    increasetemperatureperhour: {
      value: 0.2,
      required: true
    },
    decreasetemperatureperhour: {
      value: 0.2,
      required: true
    },
    designtemperature: {
      value: -12,
      required: true
    },
    cheapestpriceoutput: { 
      validate: RED.validators.typedInput("cheapestpriceoutputType", false), 
    },
    cheapestpriceoutputType: { required: false },
    outputValueSecond: {
      required: false,
      validate: RED.validators.typedInput("outputValueSecondType", false),
    },
    outputValueSecondType: {  required: false },
    outputValueThird: {
      required: false,
      validate: RED.validators.typedInput("outputValueThirdType", false),
    },
    outputValueThirdType: {  required: false },

    highestpriceoutput: {
      required: false,
      validate: RED.validators.typedInput("highestpriceoutputType", false),
    },
    highestpriceoutputType: { required: false },
  },
  inputs: 1,
  outputs: 1,
  icon: "font-awesome/fa-bar-chart",
  color: "#FFCC66",
  label: function () {
    return this.name || "Heating";
  },
  outputLabels: ["on", "off", "schedule"],
  oneditsave: function () {},
});
