import type { ExtractionMethod, ParseResult } from "./parsers/types";

export type ConfidenceLevel = "high" | "medium" | "low";

export type SlipConfidence = Record<
  "amount" | "date" | "time" | "acct" | "ref",
  ConfidenceLevel
>;

const METHOD_CONFIDENCE: Record<ExtractionMethod, ConfidenceLevel> = {
  anchor: "high",
  "max-fallback": "low",
  "thai-month": "high",
  "thai-month-garble": "medium",
  "numeric-date": "medium",
  "embedded-date": "medium",
  "keyword-exact": "high",
  "keyword-tolerant": "medium",
  pattern: "high",
  "not-found": "low",
};

export function scoreConfidence(parsed: ParseResult): SlipConfidence {
  return {
    amount: METHOD_CONFIDENCE[parsed.amount.method],
    date: METHOD_CONFIDENCE[parsed.date.method],
    time: METHOD_CONFIDENCE[parsed.time.method],
    acct: METHOD_CONFIDENCE[parsed.accounts.method],
    ref: METHOD_CONFIDENCE[parsed.ref.method],
  };
}
