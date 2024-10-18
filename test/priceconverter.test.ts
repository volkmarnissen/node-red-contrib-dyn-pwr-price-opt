import fs from "fs";
import {
  convertPrice,
  IpriceInfo,
  PriceSources,
} from "./../src/priceconverter";
import { join } from "path";
describe("PriceConverter Tests", () => {
  it("convertPrice", () => {
    let files = [
      {
        filename: "nordpool-current-state-prices.json",
        source: PriceSources.nordpool,
      },
      { filename: "nordpool-event-prices.json", source: PriceSources.nordpool },
      {
        filename: "tibber-prices-single-home.json",
        source: PriceSources.tibber,
      },
      { filename: "tibber-prices.json", source: PriceSources.tibber },
    ];
    files.forEach((f) => {
      let data = fs.readFileSync(join("test/data", f.filename), {
        encoding: "utf-8",
      });
      let priceInfo: IpriceInfo | undefined = convertPrice(JSON.parse(data));

      //expect(priceInfo!.source).toBe(f.source)
    });
  });
});
