import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts";

import {
  getPair,
  incrementPairTransactionCount,
  pairDerivedAmountUSD,
  pairSafetyCheck,
  pairTrackedAmountInNativeToken,
  updatePairUntrackedVolumeUSD,
  updatePairVolumes,
} from "./index";
import { stringToAddress } from "../../mappings/common";
import { createToken, incrementTokensTransactionCount, updateTokensUntrackedVolumeUSD } from "../token";
import { getTrackedVolumeUSD } from "../../mappings/pricing";
import {
  getFactory,
  incrementFactoryPairCount,
  updateFactoryUntrackedVolumeUSD,
  updateFactoryVolumes,
} from "../factory";
import { createTransaction, updateTransactionSwaps } from "../transaction";
import {
  updateImpossibleDayData,
  updateImpossibleDayDataDailyVolumes,
  updatePairDayData,
  updatePairDayDataDailyVolumes,
  updatePairHourData,
  updatePairHourDataHourlyVolumes,
  updateTokenDayData,
  updateTokenDayDataDailyVolumes,
} from "../../mappings/day_update";
import {
  createSwap,
  swapTokensAmounts,
  totalSwapTokenAmounts,
  updateSwapAddresses,
  updateSwapAmounts,
  updateSwapAmountUSD,
  updateSwapPair,
  updateSwapTimestamp,
  updateSwapTokensTradeVolumes,
  updateSwapTransaction,
} from "../swap";

export function handleSwapEvent(event: ethereum.Event, swapAmounts: BigInt[], swapAddresses: Address[]): void {
  let pair = getPair(event.address);
  pairSafetyCheck(pair);

  let token0 = createToken(stringToAddress(pair.token0));
  let token1 = createToken(stringToAddress(pair.token1));
  let tokens = [token0, token1];

  let amounts = swapTokensAmounts(tokens, swapAmounts);

  // totals for volume updates
  let amountsTotal = totalSwapTokenAmounts(tokens, swapAmounts);
  let amount0Total = amountsTotal[0];
  let amount1Total = amountsTotal[1];

  // get total amounts of derived USD and BNB for tracking
  let derivedAmountUSD = pairDerivedAmountUSD(tokens, amountsTotal);

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0, amount1Total, token1);
  let trackedAmountBNB = pairTrackedAmountInNativeToken(trackedAmountUSD);
  let trackedAmounts = [trackedAmountUSD, trackedAmountBNB];

  // update token0 global volume and token liquidity stats
  updateSwapTokensTradeVolumes(tokens, swapAmounts, trackedAmountUSD);
  updateTokensUntrackedVolumeUSD(tokens, derivedAmountUSD);

  // update txn counts
  incrementTokensTransactionCount(tokens);

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  updatePairVolumes(pair, amountsTotal, trackedAmountUSD);
  updatePairUntrackedVolumeUSD(pair, derivedAmountUSD);
  incrementPairTransactionCount(pair);

  // update global values, only used tracked amounts for volume
  let factory = getFactory();
  updateFactoryVolumes(factory, trackedAmounts);
  updateFactoryUntrackedVolumeUSD(factory, derivedAmountUSD);
  incrementFactoryPairCount(event);

  let transaction = createTransaction(event);

  let swaps = transaction.swaps;
  let swap = createSwap(event, swaps);

  // update swap event
  updateSwapTransaction(swap, transaction);
  updateSwapPair(swap, pair);
  updateSwapTimestamp(swap, transaction);
  updateSwapAmounts(swap, amounts);
  updateSwapAddresses(swap, swapAddresses);

  // use the tracked amount if we have it
  updateSwapAmountUSD(swap, trackedAmountUSD, derivedAmountUSD);

  // update the transaction
  swaps.push(swap.id);
  updateTransactionSwaps(transaction, swaps);

  // update day entities
  let pairDayData = updatePairDayData(event);
  let pairHourData = updatePairHourData(event);
  let impossibleDayData = updateImpossibleDayData(event);
  let token0DayData = updateTokenDayData(token0, event);
  let token1DayData = updateTokenDayData(token1, event);

  // swap specific updating
  updateImpossibleDayDataDailyVolumes(impossibleDayData, derivedAmountUSD, trackedAmounts);

  // swap specific updating for pair
  updatePairDayDataDailyVolumes(pairDayData, trackedAmountUSD, amountsTotal);

  // update hourly pair data
  updatePairHourDataHourlyVolumes(pairHourData, trackedAmountUSD, amountsTotal);

  // swap specific updating for token0
  updateTokenDayDataDailyVolumes(token0DayData, amount0Total, tokens);

  // swap specific updating
  updateTokenDayDataDailyVolumes(token1DayData, amount1Total, tokens);
}
