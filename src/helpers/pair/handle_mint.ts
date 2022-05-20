import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import { getPair, incrementPairTransactionCount, pairSafetyCheck } from "./index";
import { bytesToAddress, stringToAddress } from "../../mappings/common";
import {
  updateImpossibleDayData,
  updatePairDayData,
  updatePairHourData,
  updateTokenDayData,
} from "../../mappings/day_update";
import { incrementFactoryTransactionCount } from "../factory";
import { createLiquidityPosition, createLiquiditySnapshot } from "../liquidity";
import { getMint, mintSafetyCheck, updateMintAmounts, updateMintSender, updateMintTotalAmountUSD } from "../mint";
import {
  createToken,
  incrementTokensTransactionCount,
  tokensAmountInBigDecimal,
  totalTokensAmountInUSD,
} from "../token";
import { getTransaction, transactionSafetyCheck } from "../transaction";

export function handleMintEvent(event: ethereum.Event, sender: Bytes, amounts: BigInt[]): void {
  let transaction = getTransaction(event.transaction.hash.toHexString());
  transactionSafetyCheck(transaction);

  let pair = getPair(event.address);
  pairSafetyCheck(pair);

  let token0 = createToken(stringToAddress(pair.token0));
  let token1 = createToken(stringToAddress(pair.token1));

  let tokens = [token0, token1];
  let tokensAmount = tokensAmountInBigDecimal(tokens, amounts);

  let mints = transaction.mints;
  let mint = getMint(mints[mints.length - 1]);
  mintSafetyCheck(mint);

  incrementTokensTransactionCount(tokens);
  incrementPairTransactionCount(pair);
  incrementFactoryTransactionCount();

  updateMintSender(mint, sender);
  updateMintAmounts(mint, tokensAmount);

  let amountTotalUSD = totalTokensAmountInUSD(tokens, tokensAmount);
  updateMintTotalAmountUSD(mint, amountTotalUSD);

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, bytesToAddress(mint.to));
  createLiquiditySnapshot(liquidityPosition, event);

  // update day entities
  updatePairDayData(event);
  updatePairHourData(event);
  updateImpossibleDayData(event);
  updateTokenDayData(tokens[0], event);
  updateTokenDayData(tokens[1], event);
}
