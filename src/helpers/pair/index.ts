import { Address, BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";

import { Pair as PairContract } from "../../../generated/templates/ImpossiblePair/Pair";
import { Pair, Token } from "../../../generated/schema";
import { convertTokenToDecimal, getBundle, isEqualToBigDecimalZero } from "../../mappings/common";
import { ADDRESS_ZERO, ONE_BI, TOTAL_NUMBER_OF_TOKENS, ZERO_BD, ZERO_BI } from "../../mappings/general_constants";
import { nullToken } from "../token";
import { getTrackedLiquidityUSD } from "../../mappings/pricing";

export function incrementPairTotalSupply(pair: Pair, amount: BigDecimal): void {
  pair.totalSupply = pair.totalSupply.plus(amount);
  pair.save();
}

export function decrementPairTotalSupply(pair: Pair, amount: BigDecimal): void {
  pair.totalSupply = pair.totalSupply.minus(amount);
  pair.save();
}

export function updatePairUntrackedVolumeUSD(pair: Pair, derivedAmountUSD: BigDecimal): void {
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD);
  pair.save();
}

export function updatePairVolumes(pair: Pair, amountsTotal: BigDecimal[], trackedAmountUSD: BigDecimal): void {
  let amount0Total = amountsTotal[0];
  let amount1Total = amountsTotal[1];

  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD);
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total);
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total);

  pair.save();
}

export function pairTrackedAmountInNativeToken(trackedAmountUSD: BigDecimal): BigDecimal {
  let bundle = getBundle();
  let trackedAmountBNB: BigDecimal;
  if (isEqualToBigDecimalZero(bundle.bnbPrice)) {
    trackedAmountBNB = ZERO_BD;
  } else {
    trackedAmountBNB = trackedAmountUSD.div(bundle.bnbPrice);
  }

  return trackedAmountBNB;
}

export function pairDerivedAmountUSD(tokens: Token[], amountTotal: BigDecimal[]): BigDecimal {
  let bundle = getBundle();
  let derivedAmountBNB = pairDerivedAmountInNativeToken(tokens, amountTotal);
  let derivedAmountUSD = derivedAmountBNB.times(bundle.bnbPrice);
  return derivedAmountUSD;
}

export function pairDerivedAmountInNativeToken(tokens: Token[], amountTotal: BigDecimal[]): BigDecimal {
  let token0 = tokens[0];
  let token1 = tokens[1];

  let derivedAmountBNB = token1.derivedBNB
    .times(amountTotal[1])
    .plus(token0.derivedBNB.times(amountTotal[0]))
    .div(BigDecimal.fromString(TOTAL_NUMBER_OF_TOKENS));

  return derivedAmountBNB;
}

export function pairTrackedLiquidityInNativeToken(pair: Pair, tokens: Token[]): BigDecimal {
  let token0 = tokens[0];
  let token1 = tokens[1];
  let bundle = getBundle();

  let trackedLiquidityBNB: BigDecimal;
  if (bundle.bnbPrice.notEqual(ZERO_BD)) {
    trackedLiquidityBNB = getTrackedLiquidityUSD(pair.reserve0, token0, pair.reserve1, token1).div(bundle.bnbPrice);
  } else {
    trackedLiquidityBNB = ZERO_BD;
  }

  return trackedLiquidityBNB;
}

export function updateDerivedPairReserves(pair: Pair, trackedLiquidityBNB: BigDecimal, tokens: Token[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];
  let bundle = getBundle();

  pair.trackedReserveBNB = trackedLiquidityBNB;
  pair.reserveBNB = pair.reserve0
    .times(token0.derivedBNB as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedBNB as BigDecimal));
  pair.reserveUSD = pair.reserveBNB.times(bundle.bnbPrice);
  pair.save();
}

export function updatePairReserves(pair: Pair, tokens: Token[], reserves: BigInt[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  pair.reserve0 = convertTokenToDecimal(reserves[0], token0.decimals);
  pair.reserve1 = convertTokenToDecimal(reserves[1], token1.decimals);
  pair.save();
}

export function createPair(event: ethereum.Event, pairAddress: Address, tokens: Token[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];
  let pair = new Pair(pairAddress.toHexString()) as Pair;
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.reserveBNB = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.trackedReserveBNB = ZERO_BD;
  pair.untrackedVolumeUSD = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  pair.txCount = ZERO_BI;
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.liquidityProviderCount = ZERO_BI;
  pair.save();
}

export function loadPairContract(pairAddress: Address): PairContract {
  let pairContract = PairContract.bind(pairAddress);
  return pairContract;
}

export function incrementLiquidityProviderCount(pairAddress: Address): void {
  let pair = getPair(pairAddress);
  if (pairNotFound(pair)) {
    return;
  }
  pair.liquidityProviderCount = pair.liquidityProviderCount.plus(ONE_BI);
  pair.save();
}

export function incrementPairTransactionCount(pair: Pair): void {
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.save();
}

export function getPair(pairAddress: Address): Pair {
  let pair = Pair.load(pairAddress.toHexString());
  if (pair == null) {
    log.warning("Pair {} not found", [pairAddress.toHexString()]);
    let noPairFound = nullPair();
    return noPairFound;
  }
  return pair;
}

export function pairSafetyCheck(pair: Pair): void {
  if (pairNotFound(pair)) {
    return;
  }
}

export function pairNotFound(pair: Pair): boolean {
  let noPairFound = nullPair();
  return pair.id == noPairFound.id;
}

export function nullPair(): Pair {
  let pair = new Pair(ADDRESS_ZERO);
  let token0 = nullToken();
  let token1 = nullToken();
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.reserve0 = ZERO_BD;
  pair.reserve1 = ZERO_BD;
  pair.totalSupply = ZERO_BD;
  pair.reserveBNB = ZERO_BD;
  pair.reserveUSD = ZERO_BD;
  pair.token0Price = ZERO_BD;
  pair.token1Price = ZERO_BD;
  pair.volumeToken0 = ZERO_BD;
  pair.volumeToken1 = ZERO_BD;
  pair.trackedReserveBNB = ZERO_BD;
  pair.untrackedVolumeUSD = ZERO_BD;
  pair.volumeUSD = ZERO_BD;
  pair.txCount = ZERO_BI;
  pair.createdAtTimestamp = ZERO_BI;
  pair.createdAtBlockNumber = ZERO_BI;
  pair.liquidityProviderCount = ZERO_BI;

  return pair;
}
