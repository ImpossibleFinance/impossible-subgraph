import { ethereum } from "@graphprotocol/graph-ts";

import { Transaction } from "../../generated/schema";
import { ADDRESS_ZERO, ZERO_BI } from "../mappings/general_constants";

export function updateTransactionBurns(transaction: Transaction, burns: string[]): void {
  transaction.burns = burns;
  transaction.save();
}

export function updateTransactionMints(transaction: Transaction, mints: string[]): void {
  transaction.mints = mints;
  transaction.save();
}

export function updateTransactionSwaps(transaction: Transaction, swaps: string[]): void {
  transaction.swaps = swaps;
  transaction.save();
}

export function createTransaction(event: ethereum.Event): Transaction {
  let transactionHash = event.transaction.hash.toHexString();
  let transaction = getTransaction(transactionHash);
  if (transactionNotFound(transaction)) {
    let transaction = new Transaction(transactionHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.mints = [];
    transaction.burns = [];
    transaction.swaps = [];
    transaction.save();

    return transaction;
  }
  return transaction;
}

export function getTransaction(transactionHash: string): Transaction {
  let transaction = Transaction.load(transactionHash);
  if (transaction == null) {
    return nullTransaction();
  }
  return transaction;
}

export function transactionSafetyCheck(transaction: Transaction): void {
  if (transactionNotFound(transaction)) {
    return;
  }
}

export function transactionNotFound(transaction: Transaction): boolean {
  return transaction.id == nullTransaction().id
}

export function nullTransaction(): Transaction {
  let transaction = new Transaction(ADDRESS_ZERO);
  transaction.blockNumber = ZERO_BI;
  transaction.timestamp = ZERO_BI;
  transaction.mints = [];
  transaction.burns = [];
  transaction.swaps = [];

  return transaction;
}
