import fs from "fs";
import {
  convertPrice,
  IpriceInfo,
  PriceSources,
} from "./../src/periodgenerator";
import { join } from "path";
describe("PriceConverter Tests", () => {
  it("convertPrice", () => {
    let files = [
      // {
      //   filename: "nordpool-current-state-prices.json",
      //   source: PriceSources.nordpool,
      // },
      // { filename: "nordpool-event-prices.json", source: PriceSources.nordpool },
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
      expect(priceInfo).toBeDefined();
      expect(priceInfo!.prices).toBeDefined();
      expect(priceInfo!.prices.periodsperhour).toBeGreaterThan(0);
      expect(priceInfo!.priceDatas.length).toBeGreaterThan(0);
      expect(priceInfo!.source).toBe(f.source);
      expect(priceInfo!.priceDatas[0].value).toBeGreaterThanOrEqual(0);
      expect(priceInfo!.priceDatas[0].start).toBeGreaterThan(0);
      // Check if periods are continuous
      for (let i = 1; i < priceInfo!.priceDatas.length; i++) {
        expect(
          priceInfo!.priceDatas[i].start -
            priceInfo!.priceDatas[i - 1].start -
            3600000 / priceInfo!.prices.periodsperhour,
        ).toBeLessThan(2 * 60 * 1000); // Allow 2 minutes tolerance
      } 
    });
  });
});
