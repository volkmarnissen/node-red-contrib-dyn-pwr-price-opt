import { PriceData } from "./@types/dynamic-power-prices-optimizer-node";

export enum PriceSources {
  tibber = "tibber",
  nordpool = "nordpool",
  other = "other",
}
export interface IpriceInfo {
  source: PriceSources;
  priceDatas: PriceData[];
}
interface ItibberPriceInfo {
  total: number;
  startsAt: string;
}
abstract class PriceConverter {
  abstract convert(msg: any): IpriceInfo | undefined;
}

class TibberPriceConverter extends PriceConverter {
  override convert(msg: any): IpriceInfo | undefined {
    if (undefined == msg.payload) return undefined;
    let p = msg.payload;
    let pi: { today: ItibberPriceInfo[]; tomorrow: ItibberPriceInfo[] };
    if (
      p.viewer &&
      p.viewer.home &&
      p.viewer.home.currentSubscription &&
      p.viewer.home.currentSubscription.priceInfo
    )
      pi = p.viewer.home.currentSubscription.priceInfo;
    else if (
      p.viewer &&
      p.viewer.homes &&
      p.viewer.homes[0] &&
      p.viewer.homes[0].currentSubscription &&
      p.viewer.homes[0].currentSubscription.priceInfo
    )
      pi = p.viewer.homes[0].currentSubscription.priceInfo;
    if (pi == undefined) return undefined;
    let result: PriceData[] = [];
    ["today", "tomorrow"].forEach((day) => {
      pi[day].forEach((priceInfo: ItibberPriceInfo) => {
        result.push({
          value: priceInfo.total,
          start: Date.parse(priceInfo.startsAt),
        });
      });
    });
    if (0 == result.length) return undefined;
    return { source: PriceSources.tibber, priceDatas: result };
  }
}

class NordpoolPriceConverter extends PriceConverter {
  private copyData(pi: any, result: PriceData[]) {
    ["today", "tomorrow"].forEach((day) => {
      pi["raw_" + day].forEach((priceInfo) => {
        if (undefined != priceInfo.value && null != priceInfo.value)
          result.push({
            value: priceInfo.value,
            start: Date.parse(priceInfo.start),
          });
      });
    });
  }
  override convert(msg: any): IpriceInfo | undefined {
    let result: PriceData[] = [];

    if (msg.data && msg.data.new_state && msg.data.new_state.attributes)
      this.copyData(msg.data.new_state.attributes, result);
    if (msg.payload && msg.payload.attributes)
      this.copyData(msg.payload.attributes, result);

    if (0 == result.length) return undefined;
    return { source: PriceSources.nordpool, priceDatas: result };
  }
}
class OthersPriceConverter extends PriceConverter {
  override convert(msg: any): IpriceInfo | undefined {
    if (
      msg.payload &&
      msg.payload.length &&
      msg.payload[0].value &&
      msg.payload[0].start
    )
      return { source: PriceSources.other, priceDatas: msg.payload };
    return undefined;
  }
}

let priceConverters: PriceConverter[] = [
  new TibberPriceConverter(),
  new NordpoolPriceConverter(),
  new OthersPriceConverter(),
];

export function convertPrice(msg: any): IpriceInfo | undefined {
  let rc: IpriceInfo;
  priceConverters.every((pc) => {
    rc = pc.convert(msg);
    return undefined == rc;
  });
  return rc;
}
