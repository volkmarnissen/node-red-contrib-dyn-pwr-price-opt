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

RED.nodes.registerType("Dyn. Pwr. consumption optimization", {
  category: "Power Saver",
  color: "#a6bbcf",
  defaults: {
    name: { value: "Dyn. Pwr. consumption optimization" },
    storagecapacity: {
      value: 24,
      required: true,
    },
    fromTime: { value: 1 },
    toTime: { value: 3 },

    outputValueFirst: { value: "test" },
    outputValueFirstType: { value: "str", required: true },
    outputValueSecond: {
      value: 45,
      required: false,
      validate: RED.validators.typedInput("outputValueSecondType", false),
    },
    outputValueSecondType: { value: "num", required: true },
    outputValueThird: {
      required: false,
      validate: RED.validators.typedInput("outputValueThirdType", false),
    },
    outputValueThirdType: { value: "num", required: true },
    outputValueLast: {
      value: false,
      required: true,
      validate: RED.validators.typedInput("outputValueLastType", false),
    },
    outputValueLastType: { value: "bool", required: true },
    outputValueLastHours: {
      value: 1,
      required: true,
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
    generateOutputValues();
  },
  oneditsave: function () {},
});
