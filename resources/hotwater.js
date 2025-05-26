

RED.nodes.registerType("Hotwater", {
  category: "Dynamic Prices Energy Saver",
  color: "#a6bbcf",
  defaults: {
    name: { value: "Hotwater" },
    periodlength: {
      value: 1,
      required: true,
    },
    nightstarthour: { required: false },
    nightendhour: { required: false },
    nighttargettemperature: { required: false },
    minimaltemperature: {
      value: 45,
      required: true
    },
    maximaltemperature: {
      value: 60,
      required: true
    },
    increasetemperatureperhour: {
      value: 3,
      required: true
    },
    decreasetemperatureperhour: {
      value: 0.3,
      required: true
    },
  inputs: 1,
  outputs: 1,
  icon: "font-awesome/fa-bar-chart",
  color: "#FFCC66",
  label: function () {
    return this.name || "Hotwater";
  },
  outputLabels: ["on", "off", "schedule"],
  oneditsave: function () {},
}});
