import { Address, ethereum, log } from "@graphprotocol/graph-ts";

import { LiquidityPosition, LiquidityPositionSnapshot } from "../../generated/schema";
import { getBundle, stringToAddress } from "../mappings/common";
import { ADDRESS_ZERO, ZERO_BD } from "../mappings/general_constants";
import { getPair, incrementLiquidityProviderCount, pairNotFound } from "./pair";
import { createToken } from "./token";

export function createLiquidityPosition(exchange: Address, user: Address): LiquidityPosition {
  let id = exchange
    .toHexString()
    .concat("-")
    .concat(user.toHexString());
  let liquidityPosition = getLiquidityPosition(id);
  if (!liquidityPositionNotFound(liquidityPosition)) {
    return liquidityPosition;
  }

  liquidityPosition = new LiquidityPosition(id);
  liquidityPosition.liquidityTokenBalance = ZERO_BD;
  liquidityPosition.pair = exchange.toHexString();
  liquidityPosition.user = user.toHexString();
  liquidityPosition.save();
  incrementLiquidityProviderCount(exchange);
  log.error("LiquidityTokenBalance is null", [id]);

  return liquidityPosition;
}

export function getLiquidityPosition(id: string): LiquidityPosition {
  let liquidityPosition = LiquidityPosition.load(id);
  if (liquidityPosition !== null) {
    return liquidityPosition;
  }
  log.warning("Liquidity Position {} not found", [id]);
  return nullLiquidityPosition();
}

export function liquidityPositionNotFound(liquidityPosition: LiquidityPosition): boolean {
  return liquidityPosition.id == nullLiquidityPosition().id
}

export function nullLiquidityPosition(): LiquidityPosition {
  let liquidityPosition = new LiquidityPosition(ADDRESS_ZERO);
  liquidityPosition.liquidityTokenBalance = ZERO_BD;
  liquidityPosition.pair = ADDRESS_ZERO;
  liquidityPosition.user = ADDRESS_ZERO;

  return liquidityPosition;
}

export function createLiquiditySnapshot(position: LiquidityPosition, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32();
  let bundle = getBundle();
  let pair = getPair(stringToAddress(position.pair));
  if (pairNotFound(pair)) {
    return;
  }
  let token0 = createToken(stringToAddress(pair.token0));
  let token1 = createToken(stringToAddress(pair.token1));

  // create new snapshot
  let snapshot = new LiquidityPositionSnapshot(position.id.concat(timestamp.toString()));
  snapshot.liquidityPosition = position.id;
  snapshot.timestamp = timestamp;
  snapshot.block = event.block.number.toI32();
  snapshot.user = position.user;
  snapshot.pair = position.pair;
  snapshot.token0PriceUSD = token0.derivedBNB.times(bundle.bnbPrice);
  snapshot.token1PriceUSD = token1.derivedBNB.times(bundle.bnbPrice);
  snapshot.reserve0 = pair.reserve0;
  snapshot.reserve1 = pair.reserve1;
  snapshot.reserveUSD = pair.reserveUSD;
  snapshot.liquidityTokenTotalSupply = pair.totalSupply;
  snapshot.liquidityTokenBalance = position.liquidityTokenBalance;
  snapshot.liquidityPosition = position.id;
  snapshot.save();
  position.save();
}
