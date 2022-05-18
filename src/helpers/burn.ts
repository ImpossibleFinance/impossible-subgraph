import { Address, BigDecimal, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import { Burn as BurnEvent, Pair, Transaction } from "../../generated/schema";
import { hexStringToBytes, i32ToBigInt } from "../mappings/common";
import { ADDRESS_ZERO, ZERO_BD, ZERO_BI } from "../mappings/general_constants";

export function updateBurnTotalAmountUSD(burn: BurnEvent, amountTotalUSD: BigDecimal): void {
  burn.amountUSD = amountTotalUSD;
  burn.save();
}

export function updateBurnAmounts(burn: BurnEvent, amounts: BigDecimal[]): void {
  burn.amount0 = amounts[0];
  burn.amount1 = amounts[1];
  burn.save();
}

export function updateBurnSender(burn: BurnEvent, from: Address): void {
  burn.sender = from;
  burn.save();
}

export function updateBurnReceiver(burn: BurnEvent, to: Address): void {
  burn.to = to;
  burn.save();
}

export function updateBurnTimestamp(burn: BurnEvent, transaction: Transaction): void {
  burn.timestamp = transaction.timestamp;
  burn.save();
}

export function updateBurnLiquidity(burn: BurnEvent, amount: BigDecimal): void {
  burn.liquidity = amount;
  burn.save();
}

export function updateBurnPair(burn: BurnEvent, pair: Pair): void {
  burn.pair = pair.id;
  burn.save();
}

export function updateBurnTransaction(burn: BurnEvent, transaction: Transaction): void {
  burn.transaction = transaction.id;
  burn.save();
}
export function updateBurnNeedsComplete(burn: BurnEvent, complete: boolean): void {
  burn.needsComplete = complete;
  burn.save();
}

export function updateBurnFeeLiquiduty(burn: BurnEvent, mintLiquidity: BigDecimal): void {
  burn.feeLiquidity = mintLiquidity;
  burn.save();
}

export function updateBurnFeeTo(burn: BurnEvent, feeReceiver: Bytes): void {
  burn.feeTo = feeReceiver;
  burn.save();
}

export function updateBurnLogIndex(event: ethereum.Event, burn: BurnEvent): void {
  burn.logIndex = event.logIndex;
  burn.save();
}

export function getBurn(id: string): BurnEvent {
  let burn = BurnEvent.load(id);
  if (burn !== null) {
    return burn;
  }
  log.warning("Burn transaction {} not found", [id]);
  let noBurnEventFound = nullBurn();
  return noBurnEventFound;
}

export function burnSafetyCheck(burn: BurnEvent): void {
  if (burnNotFound(burn)) {
    return;
  }
}

export function createBurn(event: ethereum.Event, burns: string[]): BurnEvent {
  let burnId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(i32ToBigInt(burns.length).toString());

  let burn = getBurn(burnId);
  if (!burnNotFound) {
    return burn;
  }
  burn = new BurnEvent(burnId);
  burn.transaction = ADDRESS_ZERO;
  burn.pair = ADDRESS_ZERO;
  burn.liquidity = ZERO_BD;
  burn.timestamp = event.block.timestamp;
  burn.to = hexStringToBytes(ADDRESS_ZERO);
  burn.sender = hexStringToBytes(ADDRESS_ZERO);
  burn.needsComplete = true;
  burn.save();

  return burn;
}

export function burnNotFound(burn: BurnEvent): boolean {
  let noBurnEventFound = nullBurn();
  return burn.id == noBurnEventFound.id;
}

export function nullBurn(): BurnEvent {
  let burn = new BurnEvent(ADDRESS_ZERO);
  burn.transaction = "";
  burn.pair = "";
  burn.liquidity = ZERO_BD;
  burn.timestamp = ZERO_BI;
  burn.to = Bytes.fromHexString(ADDRESS_ZERO);
  burn.sender = Bytes.fromHexString(ADDRESS_ZERO);
  burn.needsComplete = true;

  return burn;
}
