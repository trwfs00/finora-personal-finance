import { parseGeneric } from "./generic";
import type { BankId, BankParser } from "./types";

// All banks currently share the generic extractors — the OCR-garble fixes
// (month aliases, tolerant ref keywords, mask normalization) are global and
// were derived from every bank's debug corpus, so per-bank divergence isn't
// needed yet. The registry exists so a bank can override extraction the day
// its format actually diverges.
const PARSERS: Record<BankId, BankParser> = {
  make: parseGeneric,
  kbank: parseGeneric,
  gsb: parseGeneric,
  krungthai: parseGeneric,
  scb: parseGeneric,
  bangkok: parseGeneric,
  paotang: parseGeneric,
  generic: parseGeneric,
};

export function getParser(bankId: BankId): BankParser {
  return PARSERS[bankId];
}
