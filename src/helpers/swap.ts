import { Address, BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";

import { Pair, Swap as SwapEvent, Token, Transaction } from "../../generated/schema";
import {
  convertTokenToDecimal,
  hexStringToBytes,
  i32ToBigInt,
  isEqualToBigDecimalZero
} from "../mappings/common";
import { ADDRESS_ZERO, ZERO_BD, ZERO_BI } from "../mappings/general_constants";

export function updateSwapTokensTradeVolumes(
  tokens: Token[],
  swapAmounts: BigInt[],
  trackedAmountUSD: BigDecimal,
): void {
  let token0 = tokens[0];
  let token1 = tokens[1];

  let amounts = swapTokensAmounts(tokens, swapAmounts);
  let amount0In = amounts[0];
  let amount1In = amounts[1];
  let amount0Out = amounts[2];
  let amount1Out = amounts[3];

  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out));
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD);
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out));
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD);

  token0.save();
  token1.save();
}

export function updateSwapAmounts(swap: SwapEvent, amounts: BigDecimal[]): void {
  let amount0In = amounts[0];
  let amount1In = amounts[1];
  let amount0Out = amounts[2];
  let amount1Out = amounts[3];

  swap.amount0In = amount0In;
  swap.amount1In = amount1In;
  swap.amount0Out = amount0Out;
  swap.amount1Out = amount1Out;

  swap.save();
}

export function totalSwapTokenAmounts(tokens: Token[], tokensAmounts: BigInt[]): BigDecimal[] {
  let amounts = swapTokensAmounts(tokens, tokensAmounts);
  let amount0In = amounts[0];
  let amount1In = amounts[1];
  let amount0Out = amounts[2];
  let amount1Out = amounts[3];

  let amount0Total = amount0Out.plus(amount0In);
  let amount1Total = amount1Out.plus(amount1In);

  return [amount0Total, amount1Total];
}

export function swapTokensAmounts(tokens: Token[], tokensAmounts: BigInt[]): BigDecimal[] {
  let token0 = tokens[0];
  let token1 = tokens[1];

  let amount0In = convertTokenToDecimal(tokensAmounts[0], token0.decimals);
  let amount1In = convertTokenToDecimal(tokensAmounts[1], token1.decimals);
  let amount0Out = convertTokenToDecimal(tokensAmounts[2], token0.decimals);
  let amount1Out = convertTokenToDecimal(tokensAmounts[3], token1.decimals);

  return [amount0In, amount1In, amount0Out, amount1Out];
}

export function updateSwapAmountUSD(swap: SwapEvent, trackedAmountUSD: BigDecimal, derivedAmountUSD: BigDecimal): void {
  swap.amountUSD = isEqualToBigDecimalZero(trackedAmountUSD) ? derivedAmountUSD : trackedAmountUSD;
  swap.save();
}

export function updateSwapAddresses(swap: SwapEvent, swapAddresses: Address[]): void {
  swap.sender = swapAddresses[0];
  swap.to = swapAddresses[1];
  swap.save();
}

export function updateSwapTransaction(swap: SwapEvent, transaction: Transaction): void {
  swap.transaction = transaction.id;
  swap.save();
}

export function updateSwapPair(swap: SwapEvent, pair: Pair): void {
  swap.pair = pair.id;
  swap.save();
}

export function updateSwapTimestamp(swap: SwapEvent, transaction: Transaction): void {
  swap.timestamp = transaction.timestamp;
  swap.save();
}

export function createSwap(event: ethereum.Event, swaps: string[]): SwapEvent {
  let swapId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(i32ToBigInt(swaps.length).toString());

  let swap = getSwap(swapId);
  if (!swapNotFound(swap)) {
    return swap;
  }

  swap = new SwapEvent(swapId);
  swap.transaction = ADDRESS_ZERO;
  swap.pair = ADDRESS_ZERO;
  swap.timestamp = event.block.timestamp;
  swap.sender = hexStringToBytes(ADDRESS_ZERO);
  swap.amount0In = ZERO_BD;
  swap.amount1In = ZERO_BD;
  swap.amount0Out = ZERO_BD;
  swap.amount1Out = ZERO_BD;
  swap.to = hexStringToBytes(ADDRESS_ZERO);
  swap.logIndex = event.logIndex;
  swap.amountUSD = ZERO_BD;
  swap.save();

  return swap;
}

export function getSwap(swapId: string): SwapEvent {
  let swap = SwapEvent.load(swapId);
  if (swap == null) {
    log.warning("Swap transaction {} not found", [swapId]);
    let noSwapEventFound = nullSwapEvent();
    return noSwapEventFound;
  }
  return swap;
}

export function swapNotFound(swap: SwapEvent): boolean {
  return swap.id == nullSwapEvent().id
}

function nullSwapEvent(): SwapEvent {
  let swap = new SwapEvent(ADDRESS_ZERO);

  swap.transaction = "";
  swap.pair = "";
  swap.timestamp = ZERO_BI;
  swap.transaction = "";
  swap.sender = hexStringToBytes(ADDRESS_ZERO);
  swap.amount0In = ZERO_BD;
  swap.amount1In = ZERO_BD;
  swap.amount0Out = ZERO_BD;
  swap.amount1Out = ZERO_BD;
  swap.to = hexStringToBytes(ADDRESS_ZERO);
  swap.logIndex = ZERO_BI;
  swap.amountUSD = ZERO_BD;

  return swap;
}
