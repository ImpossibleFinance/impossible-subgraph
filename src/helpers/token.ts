import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../generated/ImpossibleSwapFactory/ERC20";
import { Pair, Token } from "../../generated/schema";
import { convertTokenToDecimal, getBundle, isEqualToBigDecimalZero } from "../mappings/common";
import { ADDRESS_ZERO, BI_18, ONE_BI, ZERO_BD, ZERO_BI } from "../mappings/general_constants";
import { getTokenPriceInNativeToken } from "../mappings/pricing";

export function updateTokensUntrackedVolumeUSD(tokens: Token[], derivedAmountUSD: BigDecimal): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD);
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD);

  token0.save();
  token1.save();
}

export function normalizeTokenTotalLiquidity(pair: Pair, tokens: Token[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1);

  token0.save();
  token1.save();
}

export function updateTokenTotalLiquidity(tokens: Token[], pair: Pair): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0);
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1);

  token0.save();
  token1.save();
}

export function updateTokensDerivedPrices(tokens: Token[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  token0.derivedBNB = getTokenPriceInNativeToken(token0);
  token1.derivedBNB = getTokenPriceInNativeToken(token1);

  token0.save();
  token1.save();
}

export function updateTokenPrices(pair: Pair): void {
  if (!isEqualToBigDecimalZero(pair.reserve1)) {
    pair.token0Price = pair.reserve0.div(pair.reserve1);
  } else {
    pair.token0Price = ZERO_BD;
  }

  if (!isEqualToBigDecimalZero(pair.reserve0)) {
    pair.token1Price = pair.reserve1.div(pair.reserve0);
  } else {
    pair.token1Price = ZERO_BD;
  }

  pair.save();
}

export function totalTokensAmountInUSD(tokens: Token[], tokensAmounts: BigDecimal[]): BigDecimal {
  let bundle = getBundle();
  let token0 = tokens[0];
  let token1 = tokens[1];
  let token0Amount = tokensAmounts[0];
  let token1Amount = tokensAmounts[1];

  let token0DerivedAmount = token0.derivedBNB.times(token0Amount);
  let token1DerivedAmount = token1.derivedBNB.times(token1Amount);
  let totalTokensAmountUSD = token1DerivedAmount.plus(token0DerivedAmount).times(bundle.bnbPrice);

  return totalTokensAmountUSD;
}

export function tokensAmountInBigDecimal(tokens: Token[], tokensAmounts: BigInt[]): BigDecimal[] {
  let token0 = tokens[0];
  let token1 = tokens[1];

  let token0Amount = convertTokenToDecimal(tokensAmounts[0], token0.decimals);
  let token1Amount = convertTokenToDecimal(tokensAmounts[1], token1.decimals);

  return [token0Amount, token1Amount];
}

export function incrementTokensTransactionCount(tokens: Token[]): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  token0.txCount = token0.txCount.plus(ONE_BI);
  token1.txCount = token1.txCount.plus(ONE_BI);

  token0.save();
  token1.save();
}

export function createToken(address: Address): Token {
  let token = getToken(address);
  if (!tokenNotFound(token)) {
    return token as Token;
  }

  token = new Token(address.toHexString());
  let tokenInstance = ERC20.bind(address);
  let tryName = tokenInstance.try_name();
  if (!tryName.reverted) {
    token.name = tryName.value;
  }

  let trySymbol = tokenInstance.try_symbol();
  if (!trySymbol.reverted) {
    token.symbol = trySymbol.value;
  }

  let tryDecimals = tokenInstance.try_decimals();
  if (!tryDecimals.reverted) {
    token.decimals = BigInt.fromI32(tryDecimals.value);
  }

  let tryTotalSupply = tokenInstance.try_totalSupply();
  if (!tryTotalSupply.reverted) {
    token.totalSupply = tryTotalSupply.value;
  }

  token.tradeVolume = ZERO_BD;
  token.tradeVolumeUSD = ZERO_BD;
  token.untrackedVolumeUSD = ZERO_BD;
  token.txCount = ZERO_BI;
  token.totalLiquidity = ZERO_BD;
  token.derivedBNB = ZERO_BD;

  token.save();
  return token as Token;
}

export function getToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null) {
    log.warning("Token {} not found", [tokenAddress.toHexString()]);
    return nullToken();
  }
  return token;
}

export function tokenNotFound(token: Token): boolean {
  return token.id == nullToken().id
}

export function nullToken(): Token {
  let token = new Token(ADDRESS_ZERO);
  token.name = "";
  token.symbol = "";
  token.decimals = BI_18;
  token.totalSupply = ZERO_BI;
  token.tradeVolume = ZERO_BD;
  token.tradeVolumeUSD = ZERO_BD;
  token.untrackedVolumeUSD = ZERO_BD;
  token.txCount = ZERO_BI;
  token.totalLiquidity = ZERO_BD;
  token.derivedBNB = ZERO_BD;

  return token;
}
