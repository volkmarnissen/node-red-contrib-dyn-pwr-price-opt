import { PriceData } from "./@types/basenode";

export enum PriceSources {
  tibber = "tibber",
  nordpool = "nordpool",
  other = "other",
}
interface IpriceInfoSource {
  source: PriceSources;
  priceDatas: PriceData[];
}
export interface IpriceInfo extends IpriceInfoSource {
  prices: {
    starttime: number;
    endtime: number;
    periodlength: number;
  };
}
interface ItibberPriceInfo {
  total: number;
  startsAt: string;
}
abstract class PriceConverter {
  abstract convert(payload: any): IpriceInfoSource | undefined;
}

class TibberPriceConverter extends PriceConverter {
  override convert(payload: any): IpriceInfoSource | undefined {
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
  override convert(dataOrPayload: any): IpriceInfoSource | undefined {
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
  override convert(payload: any): IpriceInfoSource | undefined {
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

export function convertPrice(
  periodlength: number,
  payload: any,
): IpriceInfo | undefined {
  let rc: IpriceInfo = undefined;
  let periodsperhour = Math.round(1 / periodlength);
  priceConverters.every((pc) => {
    let src = pc.convert(payload);
    let additionalPeriods: PriceData[] = [];
    if (rc && periodsperhour != 1)
      rc.priceDatas.forEach((pd) => {
        let dt = new Date(pd.start);
        if (periodsperhour >= 2)
          additionalPeriods.push({
            start: dt.setHours(dt.getMinutes() + 30),
            value: pd.value,
          });
        if (periodsperhour >= 4) {
          additionalPeriods.push({
            start: dt.setHours(dt.getMinutes() + 15),
            value: pd.value,
          });
          additionalPeriods.push({
            start: dt.setHours(dt.getMinutes() + 45),
            value: pd.value,
          });
        }
      });

    if (additionalPeriods.length > 0) {
      src.priceDatas = src.priceDatas.concat(additionalPeriods);
      src.priceDatas.sort((a, b) => a.start - b.start);
    }
    if (src)
      rc = {
        ...src,
        prices: {
          starttime: src.priceDatas[0].start,
          endtime: src.priceDatas[src.priceDatas.length - 1].start,
          periodlength: periodlength,
        },
      };
    return undefined == rc;
  });
  return rc;
}
