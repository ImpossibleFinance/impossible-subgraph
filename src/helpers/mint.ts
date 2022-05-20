import { Address, BigDecimal, Bytes, ethereum, log, store } from "@graphprotocol/graph-ts";

import { Mint as MintEvent, Pair, Transaction } from "../../generated/schema";
import { i32ToBigInt } from "../mappings/common";
import { ADDRESS_ZERO, ZERO_BD, ZERO_BI } from "../mappings/general_constants";

export function updateMintTotalAmountUSD(mint: MintEvent, amountTotalUSD: BigDecimal): void {
  mint.amountUSD = amountTotalUSD;
  mint.save();
}

export function updateMintAmounts(mint: MintEvent, amounts: BigDecimal[]): void {
  mint.amount0 = amounts[0];
  mint.amount1 = amounts[1];
  mint.save();
}

export function updateMintSender(mint: MintEvent, sender: Bytes): void {
  mint.sender = sender;
  mint.save();
}

export function updateMintReceiver(mint: MintEvent, to: Address): void {
  mint.to = to;
  mint.save();
}

export function updateMintPair(mint: MintEvent, pair: Pair): void {
  mint.pair = pair.id;
  mint.save();
}

export function updateMintTransaction(mint: MintEvent, transaction: Transaction): void {
  mint.transaction = transaction.id;
  mint.save();
}

export function updateMintLiquidity(mint: MintEvent, amount: BigDecimal): void {
  mint.liquidity = amount;
  mint.save();
}

export function updateMintTimestamp(mint: MintEvent, transaction: Transaction): void {
  mint.timestamp = transaction.timestamp;
  mint.save();
}

export function removeLogicalMint(mints: string[]): void {
  store.remove("Mint", mints[mints.length - 1]);
}

export function getMint(id: string): MintEvent {
  let mint = MintEvent.load(id);
  if (mint !== null) {
    return mint;
  }
  log.warning("Mint transaction {} not found", [id]);
  let noMintEventFound = nullMintEvent();
  return noMintEventFound;
}

export function mintSafetyCheck(mint: MintEvent): void {
  if (mintEventNotFound(mint)) {
    return;
  }
}

export function createMint(event: ethereum.Event, mints: string[]): MintEvent {
  let mintId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(i32ToBigInt(mints.length).toString());

  let mint = getMint(mintId);
  if (!mintEventNotFound(mint)) {
    return mint;
  }
  mint = new MintEvent(mintId);
  mint.transaction = ADDRESS_ZERO;
  mint.pair = ADDRESS_ZERO;
  mint.to = Bytes.fromHexString(ADDRESS_ZERO);
  mint.liquidity = ZERO_BD;
  mint.timestamp = event.block.timestamp;
  mint.save();

  return mint;
}

export function mintEventNotFound(mint: MintEvent): boolean {
  let noMintEventFound = nullMintEvent();
  return mint.id == noMintEventFound.id
}

export function nullMintEvent(): MintEvent {
  let mint = new MintEvent(ADDRESS_ZERO);
  mint.transaction = ADDRESS_ZERO;
  mint.pair = ADDRESS_ZERO;
  mint.to = Bytes.fromHexString(ADDRESS_ZERO);
  mint.liquidity = ZERO_BD;
  mint.timestamp = ZERO_BI;
  mint.transaction = "";

  return mint;
}
