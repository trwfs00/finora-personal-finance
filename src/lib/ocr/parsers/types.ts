export type BankId =
  | "make"
  | "kbank"
  | "gsb"
  | "krungthai"
  | "scb"
  | "bangkok"
  | "paotang"
  | "generic";

// How a field value was extracted — drives confidence scoring.
export type ExtractionMethod =
  | "anchor"            // amount: keyword anchor + scored candidate
  | "max-fallback"      // amount: Math.max over all numbers (guess)
  | "thai-month"        // date: clean Thai month abbreviation
  | "thai-month-garble" // date: month recovered via OCR garble alias
  | "numeric-date"      // date: DD/MM/YYYY
  | "embedded-date"     // date: YYYYMMDD inside a reference number
  | "keyword-exact"     // ref: clean keyword match
  | "keyword-tolerant"  // ref: OCR-tolerant keyword pattern
  | "pattern"           // time / account: direct pattern match
  | "not-found";

export interface FieldResult<T> {
  value?: T;
  method: ExtractionMethod;
}

export interface ParseResult {
  amount: FieldResult<number>;
  date: FieldResult<string>;
  time: FieldResult<string>;
  ref: FieldResult<string>;
  accounts: FieldResult<string[]>;
  recipientName?: string;
  bankName?: string;
}

// A bank parser receives normalized OCR text and returns extraction results.
// leftColText, when provided, is the same slip restricted to x < 60% of the
// image width (derived from HOCR word positions) — used to isolate the amount
// value from QR-code noise that occupies the right column on make/kbank slips.
export type BankParser = (text: string, leftColText?: string) => ParseResult;
