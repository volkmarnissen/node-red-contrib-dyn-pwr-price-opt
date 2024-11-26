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
  abstract convert(payload: any): IpriceInfo | undefined;
}

class TibberPriceConverter extends PriceConverter {
  override convert(payload: any): IpriceInfo | undefined {
    if (undefined == payload) return undefined;
    let p = payload;
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
  override convert(dataOrPayload: any): IpriceInfo | undefined {
    let result: PriceData[] = [];

    if (
      dataOrPayload &&
      dataOrPayload.new_state &&
      dataOrPayload.new_state.attributes
    )
      this.copyData(dataOrPayload.new_state.attributes, result);
    if (dataOrPayload && dataOrPayload.attributes)
      this.copyData(dataOrPayload.attributes, result);

    if (0 == result.length) return undefined;
    return { source: PriceSources.nordpool, priceDatas: result };
  }
}
class OthersPriceConverter extends PriceConverter {
  override convert(payload: any): IpriceInfo | undefined {
    if (payload && payload.length && payload[0].value && payload[0].start)
      return { source: PriceSources.other, priceDatas: payload };
    return undefined;
  }
}

let priceConverters: PriceConverter[] = [
  new TibberPriceConverter(),
  new NordpoolPriceConverter(),
  new OthersPriceConverter(),
];

export const priceConverterFilterRegexs = [/^payload$/g, /^data$/g];

export function convertPrice(payload: any): IpriceInfo | undefined {
  let rc: IpriceInfo;
  priceConverters.every((pc) => {
    rc = pc.convert(payload);
    return undefined == rc;
  });
  return rc;
}
