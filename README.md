# node-red-contrib-dyn-pwr-price-opt

Node-RED nodes that minimizes costs for heatpump energy consumption for electric energy tarifs that provide dynamic prices.

## Features

- Read prices from (Tibber)[https://tibber.com]
- change room temperature set point based on estimated energy prices
- change hot water temperature set point  based on estimated energy prices

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
   Use the <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/book.svg" width="20" height="20"> documentation Icon
3. Connect your tibber node to the input
4. Connect a node which provides input data to the same input
5. Connect a node which gets the output (set point temperature) and hands it over to the heat pump

### Configuration Options

For the configuration check the  use the <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/book.svg" width="20" height="20"> documentation Icon


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
- 📧 **Email**: your.email@example.com

## Related Nodes

- [node-red-contrib-tibber-api](https://flows.nodered.org/node/node-red-contrib-tibber-api) - Get tibber prices
