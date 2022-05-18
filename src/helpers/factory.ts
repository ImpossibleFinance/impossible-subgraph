import { Address, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";

import { Factory, Pair, Token } from "../../generated/schema";
import { ImpossiblePair } from "../../generated/templates";
import { getBundle } from "../mappings/common";
import { ADDRESS_ZERO, ONE_BI, ONE_INT, ZERO_BD, ZERO_BI, ZERO_INT } from "../mappings/general_constants";
import { FACTORY_ADDRESS } from "../mappings/network_constants";
import { createPair, getPair, pairNotFound } from "./pair";
import { createToken, getToken, tokenNotFound } from "./token";

export function updateFactoryVolumes(factory: Factory, trackedAmounts: BigDecimal[]): void {
  factory.totalVolumeUSD = factory.totalVolumeUSD.plus(trackedAmounts[0]);
  factory.totalVolumeBNB = factory.totalVolumeBNB.plus(trackedAmounts[1]);

  factory.save();
}

export function updateFactoryUntrackedVolumeUSD(factory: Factory, derivedAmountUSD: BigDecimal): void {
  factory.untrackedVolumeUSD = factory.untrackedVolumeUSD.plus(derivedAmountUSD);
  factory.save();
}

export function updateFactoryTotalLiquidity(factory: Factory, trackedLiquidityBNB: BigDecimal): void {
  let bundle = getBundle();

  factory.totalLiquidityBNB = factory.totalLiquidityBNB.plus(trackedLiquidityBNB);
  factory.totalLiquidityUSD = factory.totalLiquidityBNB.times(bundle.bnbPrice);

  factory.save();
}

export function normalizeFactoryNativeTokenTotalLiquidity(factory: Factory, pair: Pair): void {
  // reset factory liquidity by subtracting only tracked liquidity
  factory.totalLiquidityBNB = factory.totalLiquidityBNB.minus(pair.trackedReserveBNB);
  factory.save();
}

export function handleCreateTokenPair(token0Address: Address, token1Address: Address): Token[] {
  let token0 = getToken(token0Address);
  if (tokenNotFound(token0)) {
    token0 = createToken(token0Address);
  } else {
    token0 = getToken(token0Address);
  }

  let token1 = getToken(token1Address);
  if (tokenNotFound(token1)) {
    token1 = createToken(token1Address);
  } else {
    token1 = getToken(token1Address);
  }

  let tokens = [token0, token1];
  return tokens;
}

export function handleCreateAndTrackNewPair(event: ethereum.Event, pairAddress: Address, tokens: Token[]): void {
  let pair = getPair(pairAddress);
  if (pairNotFound(pair)) {
    createPair(event, pairAddress, tokens);
    // Tracks Pair
    ImpossiblePair.create(pairAddress);
  }
}

export function createFactory(event: ethereum.Event): Factory {
  let id = event.address;
  let factory = getFactory(id);
  if (!factoryNotFound(factory)) {
    return factory;
  }
  factory = createDefaultFactory(id.toHexString());
  factory.save();

  return factory;
}

export function getFactory(factoryAddress: Address = Address.fromString(FACTORY_ADDRESS)): Factory {
  let factory = Factory.load(factoryAddress.toHexString());
  if (factory !== null) {
    return factory;
  }
  log.warning("Factory address {} not found", [factoryAddress.toHexString()]);
  let noFactoryFound = nullFactory();
  return noFactoryFound;
}

export function factoryNotFound(factory: Factory): boolean {
  let noFactoryFound = nullFactory();
  return factory.id == noFactoryFound.id
}

export function incrementFactoryPairCount(event: ethereum.Event): void {
  let factory = getFactory(event.address);
  let noFactoryFound = nullFactory();
  if (factory.id !== noFactoryFound.id) {
    factory.pairCount = factory.pairCount + ONE_INT;
    factory.save();
  }
  return;
}

export function incrementFactoryTransactionCount(): void {
  let factory = getFactory();
  let noFactoryFound = nullFactory();
  if (factory.id !== noFactoryFound.id) {
    factory.txCount = factory.txCount.plus(ONE_BI);
    factory.save();
  }
  return;
}

function nullFactory(): Factory {
  let factory = createDefaultFactory();
  return factory;
}

function createDefaultFactory(id: string = ADDRESS_ZERO): Factory {
  let factory = new Factory(id);
  factory.pairCount = ZERO_INT;
  factory.totalVolumeUSD = ZERO_BD;
  factory.totalVolumeBNB = ZERO_BD;
  factory.totalLiquidityUSD = ZERO_BD;
  factory.totalLiquidityBNB = ZERO_BD;
  factory.txCount = ZERO_BI;
  factory.untrackedVolumeUSD = ZERO_BD;

  return factory;
}
