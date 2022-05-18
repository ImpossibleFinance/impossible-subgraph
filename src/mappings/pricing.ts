/* eslint-disable prefer-const */
import { Pair, Token } from "../../generated/schema";
import { BigDecimal } from "@graphprotocol/graph-ts/index";
import {
  DAI_NATIVE_TOKEN_PAIR,
  NATIVE_TOKEN_ADDRESS,
  USDC_NATIVE_TOKEN_PAIR,
  USDT_NATIVE_TOKEN_PAIR,
  WHITELIST,
} from "./network_constants";
import { ONE_BD, TOTAL_NUMBER_OF_TOKENS, ZERO_BD } from "./general_constants";
import { factoryContract, getBundle, isEqualToZeroAddress, stringToAddress } from "./common";
import { getPair, pairNotFound } from "../helpers/pair";

export function getNativeTokenPriceInUSD(): BigDecimal {
  let usdtPair = getPair(stringToAddress(USDT_NATIVE_TOKEN_PAIR)); // usdt is token0
  let usdcPair = getPair(stringToAddress(USDC_NATIVE_TOKEN_PAIR)); // usdc is token0
  let daiPair = getPair(stringToAddress(DAI_NATIVE_TOKEN_PAIR)); // dai is token0

  // USDC/USDT/DAI pairs found
  if (usdcUsdtDaiExist(usdtPair, usdcPair, daiPair)) {
    return setPriceWithUsdtUsdcDaiPairs(usdtPair, usdcPair, daiPair);
  }

  // Only USDC/USDT pair found
  if (onlyUsdcUsdtExist(usdtPair, usdcPair, daiPair)) {
    return setPriceWithUsdtUsdcPairsOnly(usdtPair, usdcPair);
  }

  // Only USDT/DAI pair found
  if (onlyUsdtDaiExist(usdtPair, usdcPair, daiPair)) {
    return setPriceWithUsdtDaiPairsOnly(usdtPair, daiPair);
  }

  // Only USDC/DAI pair found
  if (onlyUsdcDaiExist(usdtPair, usdcPair, daiPair)) {
    return setPriceWithUsdcDaiPairsOnly(usdcPair, daiPair);
  }

  // Only USDC pair found
  if (onlyUsdcExist(usdtPair, usdcPair, daiPair)) {
    return usdcPair.token0Price;
  }

  // Only USDT pair found
  if (onlyUsdtExist(usdtPair, usdcPair, daiPair)) {
    return usdtPair.token0Price;
  }

  // Only DAI pair found
  if (onlyDaiExist(usdtPair, usdcPair, daiPair)) {
    return daiPair.token0Price;
  }

  // No pair found
  return ZERO_BD;
}

/**
 * Search through graph to find derived BNB per token.
 * @todo update to be derived BNB (add stablecoin estimates)
 **/
export function getTokenPriceInNativeToken(token: Token): BigDecimal {
  if (token.id == stringToAddress(NATIVE_TOKEN_ADDRESS).toHexString()) {
    return ONE_BD;
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(stringToAddress(token.id), stringToAddress(WHITELIST[i]));
    if (isEqualToZeroAddress(pairAddress)) {
      return ZERO_BD;
    }

    let pair = getPair(pairAddress);
    if (pairNotFound(pair)) {
      return ZERO_BD;
    }

    if (pair.token0 == token.id) {
      let token1 = Token.load(pair.token1)!;
      return pair.token1Price.times(token1.derivedBNB as BigDecimal); // return token1 per our token * BNB per token 1
    }

    if (pair.token1 == token.id) {
      let token0 = Token.load(pair.token0)!;
      return pair.token0Price.times(token0.derivedBNB as BigDecimal); // return token0 per our token * BNB per token 0
    }
  }
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): BigDecimal {
  let bundle = getBundle();
  let price0 = token0.derivedBNB.times(bundle.bnbPrice);
  let price1 = token1.derivedBNB.times(bundle.bnbPrice);

  // both are whitelist tokens, take average of both amounts
  if (bothTokensAreWhitelisted(token0, token1)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString(TOTAL_NUMBER_OF_TOKENS));
  }

  // take full value of the whitelisted token amount
  if (onlyFirstTokenIsWhitelisted(token0, token1)) {
    return tokenAmount0.times(price0);
  }

  // take full value of the whitelisted token amount
  if (onlySecondTokenIsWhitelisted(token0, token1)) {
    return tokenAmount1.times(price1);
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): BigDecimal {
  let bundle = getBundle();
  let price0 = token0.derivedBNB.times(bundle.bnbPrice);
  let price1 = token1.derivedBNB.times(bundle.bnbPrice);

  // both are whitelist tokens, take average of both amounts
  if (bothTokensAreWhitelisted(token0, token1)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1));
  }

  // take double value of the whitelisted token amount
  if (onlyFirstTokenIsWhitelisted(token0, token1)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString(TOTAL_NUMBER_OF_TOKENS));
  }

  // take double value of the whitelisted token amount
  if (onlySecondTokenIsWhitelisted(token0, token1)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString(TOTAL_NUMBER_OF_TOKENS));
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD;
}

function setPriceWithUsdtUsdcDaiPairs(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): BigDecimal {
  let totalLiquidityBNB = usdcPair.reserve1.plus(usdtPair.reserve1).plus(daiPair.reserve1);
  if (totalLiquidityBNB.equals(ZERO_BD)) {
    return ZERO_BD;
  }

  let usdcWeight = usdcPair.reserve1.div(totalLiquidityBNB);
  let usdtWeight = usdtPair.reserve1.div(totalLiquidityBNB);
  let daiWeight = daiPair.reserve1.div(totalLiquidityBNB);
  return usdcPair.token0Price
    .times(usdcWeight)
    .plus(usdtPair.token0Price.times(usdtWeight))
    .plus(daiPair.token0Price.times(daiWeight));
}

function setPriceWithUsdtUsdcPairsOnly(usdtPair: Pair, usdcPair: Pair): BigDecimal {
  let totalLiquidityBNB = usdcPair.reserve1.plus(usdtPair.reserve1);
  if (totalLiquidityBNB.equals(ZERO_BD)) {
    return ZERO_BD;
  }
  let usdcWeight = usdcPair.reserve1.div(totalLiquidityBNB);
  let usdtWeight = usdtPair.reserve1.div(totalLiquidityBNB);
  return usdcPair.token0Price.times(usdcWeight).plus(usdtPair.token0Price.times(usdtWeight));
}

function setPriceWithUsdtDaiPairsOnly(usdtPair: Pair, daiPair: Pair): BigDecimal {
  let totalLiquidityBNB = usdtPair.reserve1.plus(daiPair.reserve1);
  if (totalLiquidityBNB.equals(ZERO_BD)) {
    return ZERO_BD;
  }
  let usdtWeight = usdtPair.reserve1.div(totalLiquidityBNB);
  let daiWeight = daiPair.reserve1.div(totalLiquidityBNB);
  return usdtPair.token0Price.times(usdtWeight).plus(daiPair.token0Price.times(daiWeight));
}

function setPriceWithUsdcDaiPairsOnly(usdcPair: Pair, daiPair: Pair): BigDecimal {
  let totalLiquidityBNB = usdcPair.reserve1.plus(daiPair.reserve1);
  if (totalLiquidityBNB.equals(ZERO_BD)) {
    return ZERO_BD;
  }
  let usdcWeight = usdcPair.reserve1.div(totalLiquidityBNB);
  let daiWeight = daiPair.reserve1.div(totalLiquidityBNB);
  return usdcPair.token0Price.times(usdcWeight).plus(daiPair.token0Price.times(daiWeight));
}

function usdcUsdtDaiExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (pairNotFound(usdcPair) && pairNotFound(usdtPair) && pairNotFound(daiPair)) {
    return false;
  }
  return true;
}

function onlyUsdcUsdtExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(usdcPair) && !pairNotFound(usdtPair) && pairNotFound(daiPair)) {
    return true;
  }
  return false;
}

function onlyUsdcDaiExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(usdcPair) && !pairNotFound(daiPair) && pairNotFound(usdtPair)) {
    return true;
  }
  return false;
}

function onlyUsdtDaiExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(usdtPair) && !pairNotFound(daiPair) && pairNotFound(usdcPair)) {
    return true;
  }
  return false;
}

function onlyUsdtExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(usdtPair) && pairNotFound(usdcPair) && pairNotFound(daiPair)) {
    return true;
  }
  return false;
}

function onlyUsdcExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(usdcPair) && pairNotFound(usdtPair) && pairNotFound(daiPair)) {
    return true;
  }
  return false;
}

function onlyDaiExist(usdtPair: Pair, usdcPair: Pair, daiPair: Pair): boolean {
  if (!pairNotFound(daiPair) && pairNotFound(usdcPair) && pairNotFound(usdtPair)) {
    return true;
  }
  return false;
}

function bothTokensAreWhitelisted(token0: Token, token1: Token): boolean {
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return true;
  }
  return false;
}

function onlyFirstTokenIsWhitelisted(token0: Token, token1: Token): boolean {
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return true;
  }
  return false;
}

function onlySecondTokenIsWhitelisted(token0: Token, token1: Token): boolean {
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return true;
  }
  return false;
}
