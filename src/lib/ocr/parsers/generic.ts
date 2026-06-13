import type {
  BankParser,
  ExtractionMethod,
  FieldResult,
  ParseResult,
} from "./types";

// ─── Amount ───────────────────────────────────────────────────────────────────
// Priority order: "จำนวนเงินที่ชำระ" = amount actually paid (after discounts).
const AMOUNT_KEYWORDS = [/จำนวนเงินที่ชำระ/, /จำนวนเงิน/, /จำนวน/];

// A number qualifies as an amount candidate when it has 2 decimals
// ("608.00", "2,000.00") or is directly followed by a currency word
// ("2,000 THB"). Bare integers are rejected — they're QR-noise digits
// on the keyword line ("2แวง1ๆ" would otherwise yield 2).
const NUMBER_RE = /\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2}|\d+/g;
const CURRENCY_SUFFIX_RE = /^\s*(?:บาท|THB|฿)/i;

// Lines that carry a currency value that is NOT the paid amount.
const AMOUNT_EXCLUDE_LINE_RE = /ค่าธรรมเนียม|สิทธิ/;

// ─── Date ─────────────────────────────────────────────────────────────────────
const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 1,  "ก.พ.": 2,  "มี.ค.": 3, "เม.ย.": 4,
  "พ.ค.": 5,  "มิ.ย.": 6, "ก.ค.": 7,  "ส.ค.": 8,
  "ก.ย.": 9,  "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
};

// Observed Tesseract garbles of Thai month abbreviations (temp/ocr-debug/).
// Garbling is systematic per bank-app font, so a literal alias table works.
const MONTH_GARBLES: Record<string, number> = {
  "1318.": 4, // เม.ย.  (kbank,  "291318. 69")
  "10.9.": 4, // เม.ย.  (make,   "12 10.9. 2569")
  "w.9.":  4, // เม.ย.  (make,   "27 W.9. 2569" / "10 w.9. 2569")
  "ww.9.": 4, // เม.ย.  (make,   "13 Ww.9. 2569" — PSM sparse-text variant)
  "0.9.":  6, // มิ.ย.  (make,      "10 0.9. 2569" / "11 0.9. 2569")
  "0.11.": 6, // มิ.ย.  (krungthai, "12 0.11. 2569" — browser OCR)
  "0.4.":  6, // มิ.ย.  (krungthai, "13 0.4. 2569"  — node OCR)
  "1.9.":  4, // เม.ย.  (make,   "12 1.9. 2569" — เม.ย. leading เ garbles to 1;
              //        มิ.ย. uses 0.9. so the leading digit disambiguates)
  "w.n.":  5, // พ.ค.   (bangkok, app-preprocessed scan)
  "ii.n.": 3, // มี.ค.  (mymo,    "22ii.n. 2569" — PSM sparse-text variant)
  "do.":   6, // มิ.ย.  (paotang, "11 Do. 2569" — PSM sparse-text variant)
};

const ALL_MONTHS: Record<string, number> = { ...THAI_MONTHS, ...MONTH_GARBLES };
// Longest-first so "10.9." wins over its substring "0.9."
const MONTH_PATTERN = Object.keys(ALL_MONTHS)
  .sort((a, b) => b.length - a.length)
  .map((k) => k.replace(/\./g, "\\."))
  .join("|");
// \s* (not \s+): mymo and kbank print dates without spaces ("8มิ.ย.2569")
const THAI_DATE_RE = new RegExp(
  `(\\d{1,2})\\s*(${MONTH_PATTERN})\\s*(25\\d{2}|\\d{2})\\b`,
  "i",
);
const NUMERIC_DATE_RE = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
// Last resort: YYYYMMDD embedded in a long reference number (Bangkok Bank)
const EMBEDDED_DATE_RE = /(20\d{2})(0[1-9]|1[0-2])([0-2]\d|3[01])\d/;

// ─── Time ─────────────────────────────────────────────────────────────────────
// Colon form is the reliable separator across all banks ("20:57", "18:35:03").
const TIME_COLON_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\b/;
// Colon-less forms only when anchored by น (นาฬิกา): "1835 น", "18 35 น",
// "18.35 น". The anchor prevents matching bare 4-digit runs (years, amounts).
const TIME_THAI_RE = /\b(\d{1,2})[.\s]?(\d{2})\s*น/;

// ─── Bank name (display string) ───────────────────────────────────────────────
const BANK_RE =
  /กสิกร(?:ไทย)?|กรุงไทย|ไทยพาณิชย์|กรุงศรี|ทหารไทย|ออมสิน|กรุงเทพ|KBANK|KTB|SCB|BAY|TTB|GSB|make\s+by\s+KBank/i;

// ─── Account suffix ───────────────────────────────────────────────────────────
// Branches (after normalize: % → x, = → -):
//   xxx-x-x3526-x / x-5283        masked prefix
//   x3526-x / อ5307-x             single mask then digits (OCR-trimmed prefix;
//                                 Tesseract reads a lone x as อ)
//   0203xxxx1174                  digits-mask-digits
//   **** **xx#xx 0003             star groups with spaces (G-Wallet)
//   **** 4******* 0003            same, with OCR-inserted stray digit
// The G-Wallet branch tolerates stray digits/extra spaces between star groups
// (Tesseract often hallucinates a lone digit inside the masked run) and ends on
// a 2–4 digit tail.
const ACCT_RE =
  /(?:(?:[xX*]{2,}|[xX*](?=-))[\d\-xX*]*\d[\d\-xX*]*|[xXอ*]\d{3,}[\d\-xX*]*|\d+[xX*]{3,}\d+|[xX*]{2,}(?:[\s\d]*[xX*#]+)+\s*\d{2,4})/;

// Fallback for receiver lines where the masked prefix garbled into non-ASCII
// (SCB: "2๐9๐->๑๓537-7" — Thai numerals in the mask), so ACCT_RE's mask branches
// miss it. The ASCII digit-tail "537-7" is the real account suffix + check
// digit. Only accepted when it follows a recipient keyword (below) and isn't
// already covered by an ACCT_RE match, so it can't fire on dates/amounts.
const ACCT_TAIL_RE = /\d{3,}[-–]\d(?!\d)/g;
const ACCT_RECIPIENT_KEYWORD_RE = /จาก|ไปยัง|ไปที่|ถึง|ผู้รับ/g;
const ACCT_RECIPIENT_WINDOW = 80;

// ─── Reference number ─────────────────────────────────────────────────────────
const REF_KEYWORD_EXACT_RE =
  /เลขที่รายการ|รหัสอ้างอิง|หมายเลขอ้างอิง|เลขที่อ้างอิง|เลขอ้างอิง|หลักอ้างอิง|Ref\.?\s?No\.?/g;
// Observed garbles: เลขทีรายการ (tone mark dropped), รหัสฮ้างอิง, รหัสอฮ้างอิง,
// อ้างอฮิง, โสอ้างอิง — the core "างอ…ง" survives, prefixes don't.
const REF_KEYWORD_TOLERANT_RE = /เลขที?รายการ|[อฮ]ฮ?้?างอฮ?ิง/g;
const REF_VALUE_RE = /[A-Za-z0-9]{4,}/;
const REF_WINDOW = 200;

// ─── Recipient ────────────────────────────────────────────────────────────────
const RECIPIENT_KEYWORD_RE =
  /(?:ผู้รับ|ปลายทาง|ถึง|ไปยัง|ไปที่|to|ชื่อ|name)[:\s]+([^\n\r]+)/i;
const THAI_CHAR_RE = /[฀-๿]/;
const REF_CODE_RE = /^[0-9A-Z]{10,}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function beToYear(y: number): number {
  if (y > 2400) return y - 543; // full BE year, e.g. 2569 → 2026
  if (y < 100) return 2500 + y - 543; // 2-digit short BE, e.g. 69 → 2026
  return y;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Field extractors ─────────────────────────────────────────────────────────

function amountCandidatesInLine(line: string): number[] {
  if (AMOUNT_EXCLUDE_LINE_RE.test(line)) return [];
  const candidates: number[] = [];
  const re = new RegExp(NUMBER_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > 0 && line[m.index - 1] === "-") continue; // discount line
    const hasDecimals = /\.\d{2}$/.test(m[0]);
    const hasCurrency = CURRENCY_SUFFIX_RE.test(line.slice(m.index + m[0].length));
    if (!hasDecimals && !hasCurrency) continue;
    const value = parseFloat(m[0].replace(/,/g, ""));
    if (value > 0) candidates.push(value);
  }
  return candidates;
}

// leftColText: when provided, use it as the search space so QR-code noise
// in the right column never interferes with the amount keyword/value.
export function extractAmount(text: string, leftColText?: string): FieldResult<number> {
  const searchText = leftColText ?? text;
  for (const keyword of AMOUNT_KEYWORDS) {
    const m = keyword.exec(searchText);
    if (!m) continue;
    // Scan keyword line + next 5 lines. Qualify by format, not position.
    const windowLines = searchText.slice(m.index + m[0].length).split("\n").slice(0, 6);
    for (const line of windowLines) {
      const [first] = amountCandidatesInLine(line);
      if (first !== undefined) return { value: first, method: "anchor" };
    }
  }

  // Fallback on full text (not left-col-only) to catch any remaining cases.
  const candidates = text.split("\n").flatMap(amountCandidatesInLine);
  if (candidates.length > 0) {
    return { value: Math.max(...candidates), method: "max-fallback" };
  }
  return { method: "not-found" };
}

export function extractDate(text: string): FieldResult<string> {
  const thaiMatch = THAI_DATE_RE.exec(text);
  if (thaiMatch) {
    const [, d, monthToken, y] = thaiMatch;
    const month = ALL_MONTHS[monthToken] ?? ALL_MONTHS[monthToken.toLowerCase()];
    if (month) {
      const isGarble = !(monthToken in THAI_MONTHS);
      return {
        value: isoDate(beToYear(parseInt(y, 10)), month, parseInt(d, 10)),
        method: isGarble ? "thai-month-garble" : "thai-month",
      };
    }
  }
  const numericMatch = NUMERIC_DATE_RE.exec(text);
  if (numericMatch) {
    const [, d, mo, y] = numericMatch;
    return {
      value: isoDate(beToYear(parseInt(y, 10)), parseInt(mo, 10), parseInt(d, 10)),
      method: "numeric-date",
    };
  }
  const embedded = EMBEDDED_DATE_RE.exec(text);
  if (embedded) {
    return {
      value: `${embedded[1]}-${embedded[2]}-${embedded[3]}`,
      method: "embedded-date",
    };
  }
  return { method: "not-found" };
}

function buildTime(h: string, m: string): FieldResult<string> | null {
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (hh > 23 || mm > 59) return null;
  return {
    value: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    method: "pattern",
  };
}

export function extractTime(text: string): FieldResult<string> {
  const colon = TIME_COLON_RE.exec(text);
  if (colon) {
    const t = buildTime(colon[1], colon[2]);
    if (t) return t;
  }
  const thai = TIME_THAI_RE.exec(text);
  if (thai) {
    const t = buildTime(thai[1], thai[2]);
    if (t) return t;
  }
  return { method: "not-found" };
}

export function extractAccounts(text: string): FieldResult<string[]> {
  const found: Array<{ idx: number; val: string }> = [];
  const re = new RegExp(ACCT_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) found.push({ idx: m.index, val: m[0] });

  // Recipient-scoped digit-tail fallback (see ACCT_TAIL_RE).
  const keywordPositions: number[] = [];
  const kwRe = new RegExp(ACCT_RECIPIENT_KEYWORD_RE.source, "g");
  while ((m = kwRe.exec(text)) !== null) keywordPositions.push(m.index);

  const tailRe = new RegExp(ACCT_TAIL_RE.source, "g");
  while ((m = tailRe.exec(text)) !== null) {
    const idx = m.index;
    const insideExisting = found.some((f) => idx >= f.idx && idx < f.idx + f.val.length);
    if (insideExisting) continue;
    const afterKeyword = keywordPositions.some(
      (k) => idx - k >= 0 && idx - k <= ACCT_RECIPIENT_WINDOW,
    );
    if (!afterKeyword) continue;
    found.push({ idx, val: m[0] });
  }

  if (found.length === 0) return { method: "not-found" };
  found.sort((a, b) => a.idx - b.idx);
  const seen = new Set<string>();
  const value = found.filter((f) => !seen.has(f.val) && seen.add(f.val)).map((f) => f.val);
  return { value, method: "pattern" };
}

export function extractRef(text: string): FieldResult<string> {
  // Earliest keyword in the text wins (krungthai prints the transaction ref
  // first, then unrelated payment refs); exact beats tolerant at the same spot.
  const exactRe = new RegExp(REF_KEYWORD_EXACT_RE.source, "g");
  const tolerantRe = new RegExp(REF_KEYWORD_TOLERANT_RE.source, "g");
  const exact = exactRe.exec(text);
  const tolerant = tolerantRe.exec(text);

  let match: RegExpExecArray | null = null;
  let method: ExtractionMethod = "keyword-exact";
  if (exact && (!tolerant || exact.index <= tolerant.index)) {
    match = exact;
  } else if (tolerant) {
    match = tolerant;
    method = "keyword-tolerant";
  }
  if (!match) return { method: "not-found" };

  const window = text.slice(
    match.index + match[0].length,
    match.index + match[0].length + REF_WINDOW,
  );
  const value = REF_VALUE_RE.exec(window);
  if (value) return { value: value[0], method };
  return { method: "not-found" };
}

function extractRecipientAfterAccount(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    if (ACCT_RE.test(lines[i])) {
      const next = lines[i + 1];
      const hasThaiOrWords =
        THAI_CHAR_RE.test(next) || /^[A-Z][A-Z0-9\s.,()&'-]{3,}$/.test(next);
      if (hasThaiOrWords && !REF_CODE_RE.test(next) && !/^\d+$/.test(next)) {
        return next;
      }
    }
  }
  return undefined;
}

export function extractRecipient(text: string): string | undefined {
  const keywordMatch = RECIPIENT_KEYWORD_RE.exec(text);
  if (keywordMatch) return keywordMatch[1].trim();
  return extractRecipientAfterAccount(text);
}

// ─── Parser ───────────────────────────────────────────────────────────────────
// All extraction logic is shared; bank modules wrap this with overrides where
// a bank needs different behavior.
export const parseGeneric: BankParser = (text: string, leftColText?: string): ParseResult => ({
  amount: extractAmount(text, leftColText),
  date: extractDate(text),
  time: extractTime(text),
  ref: extractRef(text),
  accounts: extractAccounts(text),
  recipientName: extractRecipient(text),
  bankName: BANK_RE.exec(text)?.[0],
});
