import { PairCreated } from "../../generated/ImpossibleSwapFactory/ImpossibleSwapFactory";
import {
  handleCreateAndTrackNewPair,
  handleCreateTokenPair,
  incrementFactoryPairCount,
  createFactory,
} from "../helpers/factory";
import { createBundle } from "./common";

export function handlePairCreated(event: PairCreated): void {
  createFactory(event);
  createBundle();
  incrementFactoryPairCount(event);
  let tokens = handleCreateTokenPair(event.params.token0, event.params.token1);
  handleCreateAndTrackNewPair(event, event.params.pair, tokens);
}
