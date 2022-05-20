import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";

import { getPair, pairSafetyCheck } from ".";
import { convertTokenToDecimal, i32ToBigInt, isEqualToZeroAddress } from "../../mappings/common";
import { BI_18, INITIAL_TRANSFER_AMOUNT } from "../../mappings/general_constants";
import { createUser } from "../account";
import { createTransaction } from "../transaction";
import {
  pairIsSenderAndReceiverIsZeroAddress,
  pairIsTheReceiver,
  receiverIsNotPairOrZeroAddress,
  senderIsNotPairOrZeroAddress,
  senderIsZeroAddress,
} from "../transfer";

export function handleTransferEvent(event: ethereum.Event, transferAddresses: Address[], amountValue: BigInt): void {
  let from = transferAddresses[0];
  let to = transferAddresses[1];
  let amount = convertTokenToDecimal(amountValue, BI_18);

  // get pair and load contract
  let pair = getPair(event.address);
  pairSafetyCheck(pair);

  // ignore initial transfers for first adds
  initialTransferCheck(to, amountValue);

  // user stats
  createUser(from);
  createUser(to);

  // get or create transaction
  let transaction = createTransaction(event);

  // mints
  senderIsZeroAddress(event, transferAddresses, pair, amount, transaction);

  // case where direct send first on BNB withdrawls
  pairIsTheReceiver(event, transferAddresses, pair, amount, transaction);

  // burn
  pairIsSenderAndReceiverIsZeroAddress(event, transferAddresses, pair, amount, transaction);

  senderIsNotPairOrZeroAddress(event, transferAddresses, pair);

  receiverIsNotPairOrZeroAddress(event, transferAddresses, pair);
}

function initialTransferCheck(to: Address, amountValue: BigInt): void {
  if (isEqualToZeroAddress(to) && amountValue.equals(i32ToBigInt(INITIAL_TRANSFER_AMOUNT))) {
    return;
  }
}
