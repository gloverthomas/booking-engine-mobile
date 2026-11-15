import { money } from "./format";
import type { Outcome } from "./api/schemas";

/** A plain sentence for what cancelling or a no-show did to the money. */
export function describeOutcome(outcome: Outcome): string {
  const deposit = {
    refund: "The deposit is being refunded.",
    keep: "The deposit was kept.",
    none: "There was no deposit to deal with.",
  }[outcome.depositAction];
  const fee =
    outcome.feeCents > 0
      ? ` A ${money(outcome.feeCents)} fee applies under your policy; if the card could not be charged it is flagged for you to collect.`
      : "";
  return deposit + fee;
}
