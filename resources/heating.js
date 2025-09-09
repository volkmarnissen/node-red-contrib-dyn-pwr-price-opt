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
      required: true,
    },
    maximaltemperature: {
      value: 23,
      required: true,
    },
    increasetemperatureperhour: {
      value: 0.2,
      required: true,
    },
    decreasetemperatureperhour: {
      value: 0.2,
      required: true,
    },
    designtemperature: {
      value: -12,
      required: true,
    },
    cheapestpriceoutput: {
      validate: RED.validators.typedInput("cheapestpriceoutputType", false),
    },
    cheapestpriceoutputType: { required: false },
    outputValueSecond: {
      required: false,
      validate: RED.validators.typedInput("outputValueSecondType", false),
    },
    outputValueSecondType: { required: false },
    outputValueThird: {
      required: false,
      validate: RED.validators.typedInput("outputValueThirdType", false),
    },
    outputValueThirdType: { required: false },

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
