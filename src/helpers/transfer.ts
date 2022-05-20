import { Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";

import { Burn as BurnEvent, Pair, Transaction } from "../../generated/schema";
import { Pair as PairContract } from "../../generated/templates/ImpossiblePair/Pair";
import { convertTokenToDecimal, isEqualToZeroAddress } from "../mappings/common";
import { BI_18 } from "../mappings/general_constants";
import { isCompleteMint } from "../mappings/impossible_pair";
import {
  createBurn,
  getBurn,
  updateBurnFeeLiquiduty,
  updateBurnFeeTo,
  updateBurnLiquidity,
  updateBurnNeedsComplete,
  updateBurnPair,
  updateBurnReceiver,
  updateBurnSender,
  updateBurnTimestamp,
  updateBurnTransaction,
} from "./burn";
import { createLiquidityPosition, createLiquiditySnapshot } from "./liquidity";
import {
  createMint,
  getMint,
  removeLogicalMint,
  updateMintLiquidity,
  updateMintPair,
  updateMintReceiver,
  updateMintTimestamp,
  updateMintTransaction,
} from "./mint";
import { decrementPairTotalSupply, incrementPairTotalSupply } from "./pair";
import { updateTransactionBurns, updateTransactionMints } from "./transaction";

export function senderIsZeroAddress(
  event: ethereum.Event,
  transferAddresses: Address[],
  pair: Pair,
  amount: BigDecimal,
  transaction: Transaction,
): void {
  let mints = transaction.mints;
  let from = transferAddresses[0];
  let to = transferAddresses[1];

  if (isEqualToZeroAddress(from)) {
    // update total supply
    incrementPairTotalSupply(pair, amount);

    // create new mint if no mints so far or if last one is done already
    if (mints.length == 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = createMint(event, mints);
      updateMintTransaction(mint, transaction);
      updateMintPair(mint, pair);
      updateMintReceiver(mint, to);
      updateMintLiquidity(mint, amount);
      updateMintTimestamp(mint, transaction);

      // update mints in transaction
      updateTransactionMints(transaction, mints.concat([mint.id]));
    }
  }
}

export function pairIsTheReceiver(
  event: ethereum.Event,
  transferAddresses: Address[],
  pair: Pair,
  amount: BigDecimal,
  transaction: Transaction,
): void {
  let from = transferAddresses[0];
  let to = transferAddresses[1];

  if (to.toHexString() == pair.id) {
    let burns = transaction.burns;
    let burn = createBurn(event, burns);

    updateBurnTransaction(burn, transaction);
    updateBurnPair(burn, pair);
    updateBurnLiquidity(burn, amount);
    updateBurnTimestamp(burn, transaction);
    updateBurnReceiver(burn, to);
    updateBurnSender(burn, from);
    updateBurnNeedsComplete(burn, true);

    burns.push(burn.id);
    updateTransactionBurns(transaction, burns);
  }
}

export function pairIsSenderAndReceiverIsZeroAddress(
  event: ethereum.Event,
  transferAddresses: Address[],
  pair: Pair,
  amount: BigDecimal,
  transaction: Transaction,
): void {
  let from = transferAddresses[0];
  let to = transferAddresses[1];

  if (isEqualToZeroAddress(to) && from.toHexString() == pair.id) {
    decrementPairTotalSupply(pair, amount);

    // this is a new instance of a logical burn
    let burns = transaction.burns;
    let burn: BurnEvent;
    if (burns.length > 0) {
      let currentBurn = getBurn(burns[burns.length - 1]);
      if (currentBurn.needsComplete) {
        burn = currentBurn as BurnEvent;
      } else {
        burn = handleLogicalBurn(event, pair, amount, transaction);
      }
    } else {
      burn = handleLogicalBurn(event, pair, amount, transaction);
    }

    // if this logical burn included a fee mint, account for this
    let mints = transaction.mints;
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = getMint(mints[mints.length - 1]);
      updateBurnFeeTo(burn, mint.to);
      updateBurnFeeLiquiduty(burn, mint.liquidity);
      removeLogicalMint(mints);
      // update the transaction
      mints.pop();
      updateTransactionMints(transaction, mints);
    }

    // if accessing last one, replace it
    if (burn.needsComplete) {
      burns[burns.length - 1] = burn.id;
    }
    // else add new one
    else {
      burns.push(burn.id);
    }
    updateTransactionBurns(transaction, burns);
  }
}

export function senderIsNotPairOrZeroAddress(event: ethereum.Event, transferAddresses: Address[], pair: Pair): void {
  let from = transferAddresses[0];
  let pairContract = PairContract.bind(event.address);

  if (!isEqualToZeroAddress(from) && from.toHexString() != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(event.address, from);
    fromUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(pairContract.balanceOf(from), BI_18);
    fromUserLiquidityPosition.save();
    createLiquiditySnapshot(fromUserLiquidityPosition, event);
  }
}

export function receiverIsNotPairOrZeroAddress(event: ethereum.Event, transferAddresses: Address[], pair: Pair): void {
  let to = transferAddresses[1];
  let pairContract = PairContract.bind(event.address);

  if (!isEqualToZeroAddress(to) && to.toHexString() != pair.id) {
    let toUserLiquidityPosition = createLiquidityPosition(event.address, to);
    toUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(pairContract.balanceOf(to), BI_18);
    toUserLiquidityPosition.save();
    createLiquiditySnapshot(toUserLiquidityPosition, event);
  }
}

export function handleLogicalBurn(
  event: ethereum.Event,
  pair: Pair,
  amount: BigDecimal,
  transaction: Transaction,
): BurnEvent {
  let burns = transaction.burns;
  let burn = createBurn(event, burns);

  updateBurnTransaction(burn, transaction);
  updateBurnNeedsComplete(burn, false);
  updateBurnPair(burn, pair);
  updateBurnLiquidity(burn, amount);
  updateBurnTimestamp(burn, transaction);

  return burn;
}
