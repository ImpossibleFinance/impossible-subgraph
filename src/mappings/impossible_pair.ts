import { Mint as MintEvent } from "../../generated/schema";
import { Mint, Burn, Swap, Transfer, Sync } from "../../generated/templates/ImpossiblePair/Pair";
import { handleTransferEvent } from "../helpers/pair/handle_transfer";
import { handleSyncEvent } from "../helpers/pair/handle_sync";
import { handleMintEvent } from "../helpers/pair/handle_mint";
import { handleBurnEvent } from "../helpers/pair/handle_burn";
import { handleSwapEvent } from "../helpers/pair/handle_swap";

export function isCompleteMint(mintId: string): boolean {
  return MintEvent.load(mintId)!.sender !== null; // sufficient checks
}

export function handleTransfer(event: Transfer): void {
  let from = event.params.from;
  let to = event.params.to;
  let amountValue = event.params.value;
  let eventAddresses = [from, to];

  handleTransferEvent(event, eventAddresses, amountValue);
}

export function handleSync(event: Sync): void {
  let reserves = [event.params.reserve0, event.params.reserve1];

  handleSyncEvent(event, reserves);
}

export function handleMint(event: Mint): void {
  let sender = event.params.sender;
  let amounts = [event.params.amount0, event.params.amount1];

  handleMintEvent(event, sender, amounts);
}

export function handleBurn(event: Burn): void {
  let amounts = [event.params.amount0, event.params.amount1];

  handleBurnEvent(event, amounts);
}

export function handleSwap(event: Swap): void {
  let swapAmounts = [event.params.amount0In, event.params.amount1In, event.params.amount0Out, event.params.amount1Out];
  let swapAddresses = [event.params.sender, event.params.to];

  handleSwapEvent(event, swapAmounts, swapAddresses);
}
