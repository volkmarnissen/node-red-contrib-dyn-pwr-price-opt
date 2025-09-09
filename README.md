# node-red-contrib-dyn-pwr-price-opt

This contribution contains Node-RED nodes that minimizes costs for heatpump energy consumption for electric energy tarifs that provide dynamic prices.

## Features

- Read prices from (Tibber)[https://tibber.com]
- change room temperature set point based on estimated energy prices
- change hot water temperature set point  based on estimated energy prices
# Basic Model

The nodes will try to move heatpump activities into time slots with lower prices.

The **Heating** node will read the estimated energy prices.
It will then identify the low price time ranges.
If the current time range is a low price range, the node will output a lower temperature set point for the **reference room temperature**.
If heating is required, because the room temperature is below the set point, the heat pump will start.
The temperature range can be configured for the node. A larger range will result in more flexibility to find lower price ranges.
On the other hand, it might lower the comfort.

If the house has a **good insulation**, this will also give more flexibility.
It is optimal if all rooms in the house can be controlled by the **reference room temperature**, because the node treats the house as a temperature storage.
A good **hydraulic balancing** will make this possible.
The larger the storage, the more flexibility is available.

The **Hotwater** does the same thing for hot water. 

# Hardware Preconditions
- For the **Heating** node, it is required to have a good insulation to get minimal flexibility to find the lower price ranges.
- It is also required to control the heating by reference room temperature.
- For the **Hotwater** node, it is required to have a hot water tank. This tank should also have a good insulation.

# Software Preconditions
- The Heat Pump must be accessible via Node RED (E.g. Modbus, MQTT, REST API ...)
- It must provide the outer temperature and the current room temperature dynamically.
- It must have the option to set the room temperature
- For **Hotwater** it must provide the current hot water temperature dynamically.

## Installation

### Via Node-RED Palette Manager
1. Go to Node-RED settings → Manage Palette → Install
2. Search for `node-red-contrib-dyn-pwr-price-opt`
3. Click Install

### Via npm
```bash
cd ~/.node-red
npm install node-red-contrib-dyn-pwr-price-opt
```

### Manual Installation
```bash
git clone https://github.com/modbus2mqtt/node-red-contrib-dyn-pwr-price-opt.git
cd node-red-contrib-dyn-pwr-price-opt
npm install
npm link
cd ~/.node-red
npm link node-red-contrib-dyn-pwr-price-opt
```

## Usage

### Basic Usage

1. Drag the **Heating** or **Hotwater**node from the function category into your flow
2. Double-click to configure:
   Use the <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/book.svg" width="20" height="20"> documentation Icon in Node Reds flow UI
3. Connect your tibber node to the input
4. Connect a node which provides input data to the same input
5. Connect a node which gets the output (set point temperature) and hands it over to the heat pump

## Development

### Local Development
```bash
git clone https://github.com/modbus2mqtt/node-red-contrib-dyn-pwr-price-opt.git
cd node-red-contrib-dyn-pwr-price-opt
npm install
npm link
cd ~/.node-red
npm link node-red-contrib-dyn-pwr-price-opt
# Restart Node-RED
```

### Testing
```bash
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/modbus2mqtt/node-red-contrib-dyn-pwr-price-opt/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/modbus2mqtt/node-red-contrib-dyn-pwr-price-opt/discussions)
- 📧 **Email**: info@carcam360.de

## Related Nodes

- [node-red-contrib-tibber-api](https://flows.nodered.org/node/node-red-contrib-tibber-api) - Get tibber prices
