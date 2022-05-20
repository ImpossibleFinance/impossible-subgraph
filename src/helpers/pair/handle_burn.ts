import { ethereum, BigInt } from "@graphprotocol/graph-ts";

import { getPair, incrementPairTransactionCount, pairSafetyCheck } from "./index";
import { bytesToAddress, stringToAddress } from "../../mappings/common";
import {
  updateImpossibleDayData,
  updatePairDayData,
  updatePairHourData,
  updateTokenDayData,
} from "../../mappings/day_update";
import { burnSafetyCheck, getBurn, updateBurnAmounts, updateBurnLogIndex, updateBurnTotalAmountUSD } from "../burn";
import { incrementFactoryTransactionCount } from "../factory";
import { createLiquidityPosition, createLiquiditySnapshot } from "../liquidity";
import {
  tokensAmountInBigDecimal,
  totalTokensAmountInUSD,
  incrementTokensTransactionCount,
  createToken,
} from "../token";
import { getTransaction, transactionSafetyCheck } from "../transaction";

export function handleBurnEvent(event: ethereum.Event, amounts: BigInt[]): void {
  let pair = getPair(event.address);
  pairSafetyCheck(pair);

  let transaction = getTransaction(event.transaction.hash.toHexString());
  transactionSafetyCheck(transaction);

  let token0 = createToken(stringToAddress(pair.token0));
  let token1 = createToken(stringToAddress(pair.token1));

  let tokens = [token0, token1];
  let tokensAmount = tokensAmountInBigDecimal(tokens, amounts);

  let burns = transaction.burns;
  let burn = getBurn(burns[burns.length - 1]);
  burnSafetyCheck(burn);

  incrementTokensTransactionCount(tokens);
  incrementFactoryTransactionCount();
  incrementPairTransactionCount(pair);
  updateBurnAmounts(burn, tokensAmount);
  updateBurnLogIndex(event, burn);

  let amountTotalUSD = totalTokensAmountInUSD(tokens, tokensAmount);
  updateBurnTotalAmountUSD(burn, amountTotalUSD);

  // update the LP position
  let liquidityPosition = createLiquidityPosition(event.address, bytesToAddress(burn.sender));
  createLiquiditySnapshot(liquidityPosition, event);

  // update day entities
  updatePairDayData(event);
  updatePairHourData(event);
  updateImpossibleDayData(event);
  updateTokenDayData(tokens[0], event);
  updateTokenDayData(tokens[1], event);
}
