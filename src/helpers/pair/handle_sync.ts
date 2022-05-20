import { BigInt, ethereum } from "@graphprotocol/graph-ts";

import {
  getPair,
  pairSafetyCheck,
  pairTrackedLiquidityInNativeToken,
  updateDerivedPairReserves,
  updatePairReserves,
} from "./index";
import { stringToAddress, updateBundlePrice } from "../../mappings/common";
import { getFactory, normalizeFactoryNativeTokenTotalLiquidity, updateFactoryTotalLiquidity } from "../factory";
import {
  createToken,
  normalizeTokenTotalLiquidity,
  updateTokenPrices,
  updateTokensDerivedPrices,
  updateTokenTotalLiquidity,
} from "../token";

export function handleSyncEvent(event: ethereum.Event, reserves: BigInt[]): void {
  let pair = getPair(event.address);
  pairSafetyCheck(pair);

  let token0 = createToken(stringToAddress(pair.token0));
  let token1 = createToken(stringToAddress(pair.token1));
  let tokens = [token0, token1];
  let factory = getFactory();

  normalizeFactoryNativeTokenTotalLiquidity(factory, pair);

  // reset token total liquidity amounts
  normalizeTokenTotalLiquidity(pair, tokens);
  updatePairReserves(pair, tokens, reserves);
  updateTokenPrices(pair);

  // update BNB price now that reserves could have changed
  updateBundlePrice();
  updateTokensDerivedPrices(tokens);

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityBNB = pairTrackedLiquidityInNativeToken(pair, tokens);

  // use derived amounts within pair
  updateDerivedPairReserves(pair, trackedLiquidityBNB, tokens);

  // use tracked amounts globally
  updateFactoryTotalLiquidity(factory, trackedLiquidityBNB);

  // now correctly set liquidity amounts for each token
  updateTokenTotalLiquidity(tokens, pair);
}
