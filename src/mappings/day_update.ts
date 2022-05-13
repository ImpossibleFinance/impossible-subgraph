import { BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";

import { Token, ImpossibleDayData, PairHourData, PairDayData, TokenDayData } from "../../generated/schema";
import { getFactory } from "../helpers/factory";
import { getPair } from "../helpers/pair";
import { getBundle, getDayID, getHour, startDayTimestamp, startHour } from "./common";
import { ONE_BI, ZERO_BD, ZERO_BI } from "./general_constants";

export function updateTokenDayDataDailyVolumes(
  tokenDayData: TokenDayData,
  amountTotal: BigDecimal,
  tokens: Token[],
): void {
  let bundle = getBundle();
  let token0 = tokens[0];
  let token1 = tokens[1];

  tokenDayData.dailyVolumeToken = tokenDayData.dailyVolumeToken.plus(amountTotal);
  tokenDayData.dailyVolumeBNB = tokenDayData.dailyVolumeBNB.plus(amountTotal.times(token1.derivedBNB));
  tokenDayData.dailyVolumeUSD = tokenDayData.dailyVolumeUSD.plus(
    amountTotal.times(token0.derivedBNB).times(bundle.bnbPrice),
  );
  tokenDayData.save();
}

export function updatePairHourDataHourlyVolumes(
  pairHourData: PairHourData,
  trackedAmountUSD: BigDecimal,
  amountsTotal: BigDecimal[],
): void {
  let amount0Total = amountsTotal[0];
  let amount1Total = amountsTotal[1];

  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total);
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total);
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(trackedAmountUSD);
  pairHourData.save();
}

export function updatePairDayDataDailyVolumes(
  pairDayData: PairDayData,
  trackedAmountUSD: BigDecimal,
  amountsTotal: BigDecimal[],
): void {
  let amount0Total = amountsTotal[0];
  let amount1Total = amountsTotal[1];

  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total);
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total);
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(trackedAmountUSD);
  pairDayData.save();
}

export function updateImpossibleDayDataDailyVolumes(
  impossibleDayData: ImpossibleDayData,
  derivedAmountUSD: BigDecimal,
  trackedAmounts: BigDecimal[],
): void {
  let trackedAmountUSD = trackedAmounts[0];
  let trackedAmountBNB = trackedAmounts[1];

  impossibleDayData.dailyVolumeUSD = impossibleDayData.dailyVolumeUSD.plus(trackedAmountUSD);
  impossibleDayData.dailyVolumeBNB = impossibleDayData.dailyVolumeBNB.plus(trackedAmountBNB);
  impossibleDayData.dailyVolumeUntracked = impossibleDayData.dailyVolumeUntracked.plus(derivedAmountUSD);
  impossibleDayData.save();
}

export function updateImpossibleDayData(event: ethereum.Event): ImpossibleDayData {
  let factory = getFactory();
  let dayID = getDayID(event);
  let dayStartTimestamp = startDayTimestamp(event);
  let impossibleDayData = ImpossibleDayData.load(dayID.toString());
  if (impossibleDayData === null) {
    impossibleDayData = new ImpossibleDayData(dayID.toString());
    impossibleDayData.date = dayStartTimestamp as i32;
    impossibleDayData.dailyVolumeUSD = ZERO_BD;
    impossibleDayData.dailyVolumeBNB = ZERO_BD;
    impossibleDayData.totalVolumeUSD = ZERO_BD;
    impossibleDayData.totalVolumeBNB = ZERO_BD;
    impossibleDayData.dailyVolumeUntracked = ZERO_BD;
  }

  impossibleDayData.totalLiquidityUSD = factory.totalLiquidityUSD;
  impossibleDayData.totalLiquidityBNB = factory.totalLiquidityBNB;
  impossibleDayData.txCount = factory.txCount;
  impossibleDayData.save();

  return impossibleDayData as ImpossibleDayData;
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  let dayID = getDayID(event);
  let dayStartTimestamp = startDayTimestamp(event);
  let dayPairID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(dayID as i32).toString());

  let pair = getPair(event.address);
  let pairDayData = PairDayData.load(dayPairID);
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID);
    pairDayData.date = dayStartTimestamp as i32;
    pairDayData.token0 = pair.token0;
    pairDayData.token1 = pair.token1;
    pairDayData.pairAddress = event.address;
    pairDayData.dailyVolumeToken0 = ZERO_BD;
    pairDayData.dailyVolumeToken1 = ZERO_BD;
    pairDayData.dailyVolumeUSD = ZERO_BD;
    pairDayData.dailyTxns = ZERO_BI;
  }

  pairDayData.totalSupply = pair.totalSupply;
  pairDayData.reserve0 = pair.reserve0;
  pairDayData.reserve1 = pair.reserve1;
  pairDayData.reserveUSD = pair.reserveUSD;
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);
  pairDayData.save();

  return pairDayData as PairDayData;
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  let hourIndex = getHour(event); // get unique hour within unix history
  let hourStartUnix = startHour(event); // want the rounded effect
  let hourPairID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(hourIndex as i32).toString());
  let pair = getPair(event.address);
  let pairHourData = PairHourData.load(hourPairID);
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID);
    pairHourData.hourStartUnix = hourStartUnix as i32;
    pairHourData.pair = event.address.toHexString();
    pairHourData.hourlyVolumeToken0 = ZERO_BD;
    pairHourData.hourlyVolumeToken1 = ZERO_BD;
    pairHourData.hourlyVolumeUSD = ZERO_BD;
    pairHourData.hourlyTxns = ZERO_BI;
  }
  pairHourData.totalSupply = pair.totalSupply;
  pairHourData.reserve0 = pair.reserve0;
  pairHourData.reserve1 = pair.reserve1;
  pairHourData.reserveUSD = pair.reserveUSD;
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();

  return pairHourData as PairHourData;
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let dayID = getDayID(event);
  let dayStartTimestamp = startDayTimestamp(event);
  let tokenDayID = token.id
    .toString()
    .concat("-")
    .concat(BigInt.fromI32(dayID as i32).toString());

  let bundle = getBundle();
  let tokenDayData = TokenDayData.load(tokenDayID);
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID);
    tokenDayData.date = dayStartTimestamp as i32;
    tokenDayData.token = token.id;
    tokenDayData.priceUSD = token.derivedBNB.times(bundle.bnbPrice);
    tokenDayData.dailyVolumeToken = ZERO_BD;
    tokenDayData.dailyVolumeBNB = ZERO_BD;
    tokenDayData.dailyVolumeUSD = ZERO_BD;
    tokenDayData.dailyTxns = ZERO_BI;
    tokenDayData.totalLiquidityUSD = ZERO_BD;
  }
  tokenDayData.priceUSD = token.derivedBNB.times(bundle.bnbPrice);
  tokenDayData.totalLiquidityToken = token.totalLiquidity;
  tokenDayData.totalLiquidityBNB = token.totalLiquidity.times(token.derivedBNB as BigDecimal);
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityBNB.times(bundle.bnbPrice);
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI);
  tokenDayData.save();

  return tokenDayData as TokenDayData;
}
