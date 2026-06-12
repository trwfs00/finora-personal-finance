export interface SlipData {
  amount?: number;
  date?: string;
  time?: string;
  bankName?: string;
  accountSuffix?: string;
  recipientName?: string;
  refNumber?: string;
}

// ─── Amount ───────────────────────────────────────────────────────────────────
const CURRENCY_RE = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})/g;

// "จำนวนเงินที่ชำระ" = actual amount paid (after discount) — highest priority
const AMOUNT_ANCHOR_RE =
  /(?:จำนวนเงินที่ชำระ|จำนวนเงิน|จำนวน)[:\s]*\n?\s*([0-9,]+\.?\d*)/;

// ─── Date ─────────────────────────────────────────────────────────────────────
const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 1,  "ก.พ.": 2,  "มี.ค.": 3, "เม.ย.": 4,
  "พ.ค.": 5,  "มิ.ย.": 6, "ก.ค.": 7,  "ส.ค.": 8,
  "ก.ย.": 9,  "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
};
const THAI_MONTH_PATTERN = Object.keys(THAI_MONTHS)
  .join("|")
  .replace(/\./g, "\\.");
const THAI_DATE_RE = new RegExp(
  `(\\d{1,2})\\s+(${THAI_MONTH_PATTERN})\\s+(\\d{2,4})`,
);
const NUMERIC_DATE_RE = /(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/;

// ─── Time ─────────────────────────────────────────────────────────────────────
const TIME_RE = /(\d{2}):(\d{2})(?::\d{2})?/;

// ─── Bank ─────────────────────────────────────────────────────────────────────
const BANK_RE =
  /กสิกร(?:ไทย)?|กรุงไทย|ไทยพาณิชย์|กรุงศรี|ทหารไทย|ออมสิน|กรุงเทพ|KBANK|KTB|SCB|BAY|TTB|GSB|make\s+by\s+KBank/i;

// ─── Account suffix ───────────────────────────────────────────────────────────
// Matches: xxx-x-x3526-x  |  XXX-X-XX307-0  |  0203xxxx1174  |  x-xxxx-xxxx0-55-4  |  x-xxxx-xxxx9-74-7  |  x-5283  |  **** ******* 0003
const ACCT_RE = /(?:(?:[xX*]{2,}|[xX*](?=-))[\d\-xX*]*\d[\d\-xX*]*|\d+[xX*]{3,}\d+|[xX*]{2,}(?:\s+[xX*]+)+\s*\d+)/;

// ─── Reference number ─────────────────────────────────────────────────────────
const REF_RE =
  /(?:เลขที่รายการ|เลขที่อ้างอิง|หลักอ้างอิง|รหัสอ้างอิง|หมายเลขอ้างอิง|เลขอ้างอิง|Ref\.?No\.?)[:\s]+([^\n\r]+)/i;

// ─── Recipient ────────────────────────────────────────────────────────────────
// Keyword-based: mymo "ถึง", Krungthai "ไปยัง", Bangkok Bank "ไปที่", others
const RECIPIENT_KEYWORD_RE =
  /(?:ผู้รับ|ปลายทาง|ถึง|ไปยัง|ไปที่|to|ชื่อ|name)[:\s]+([^\n\r]+)/i;

// Thai char range for name detection
const THAI_CHAR_RE = /[฀-๿]/;
// Pure reference code: all caps+digits, no spaces, ≥10 chars
const REF_CODE_RE = /^[0-9A-Z]{10,}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function beToYear(y: number): number {
  if (y > 2400) return y - 543;        // full BE year, e.g. 2569 → 2026
  if (y < 100) return (2500 + y) - 543; // 2-digit short BE, e.g. 69 → 2026
  return y;
}

// Fallback recipient: the line immediately after the first account suffix
// that looks like a person/merchant name (not a reference code or bare number)
function extractRecipientAfterAccount(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    if (ACCT_RE.test(lines[i])) {
      const next = lines[i + 1];
      const hasThaiOrWords =
        THAI_CHAR_RE.test(next) ||
        /^[A-Z][A-Z0-9\s.,()&'-]{3,}$/.test(next);
      const isRefCode = REF_CODE_RE.test(next);
      const isBarNumber = /^\d+$/.test(next);
      if (hasThaiOrWords && !isRefCode && !isBarNumber) {
        return next;
      }
    }
  }
  return undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
export function parseSlipText(text: string): SlipData {
  const result: SlipData = {};

  // Amount — keyword anchor first ("จำนวนเงินที่ชำระ" = paid after discount)
  const anchorMatch = AMOUNT_ANCHOR_RE.exec(text);
  if (anchorMatch) {
    const val = parseFloat(anchorMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0) result.amount = val;
  }
  if (result.amount === undefined) {
    const amounts: number[] = [];
    const re = new RegExp(CURRENCY_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) amounts.push(val);
    }
    if (amounts.length > 0) result.amount = Math.max(...amounts);
  }

  // Date — Thai month name first (covers all real slips), numeric fallback
  const thaiMatch = THAI_DATE_RE.exec(text);
  if (thaiMatch) {
    const [, d, monthAbbr, y] = thaiMatch;
    const month = THAI_MONTHS[monthAbbr];
    const year = beToYear(parseInt(y, 10));
    if (month) {
      result.date = `${year}-${String(month).padStart(2, "0")}-${String(parseInt(d, 10)).padStart(2, "0")}`;
    }
  } else {
    const numericMatch = NUMERIC_DATE_RE.exec(text);
    if (numericMatch) {
      const [, d, mo, y] = numericMatch;
      const year = beToYear(parseInt(y, 10));
      result.date = `${year}-${String(parseInt(mo, 10)).padStart(2, "0")}-${String(parseInt(d, 10)).padStart(2, "0")}`;
    }
  }

  // Time
  const timeMatch = TIME_RE.exec(text);
  if (timeMatch) result.time = `${timeMatch[1]}:${timeMatch[2]}`;

  // Bank
  const bankMatch = BANK_RE.exec(text);
  if (bankMatch) result.bankName = bankMatch[0];

  // Account suffix
  const acctMatch = ACCT_RE.exec(text);
  if (acctMatch) result.accountSuffix = acctMatch[0];

  // Recipient — keyword first, then post-account-suffix line
  const keywordMatch = RECIPIENT_KEYWORD_RE.exec(text);
  if (keywordMatch) {
    result.recipientName = keywordMatch[1].trim();
  } else {
    result.recipientName = extractRecipientAfterAccount(text);
  }

  // Reference number
  const refMatch = REF_RE.exec(text);
  if (refMatch) result.refNumber = refMatch[1].trim();

  return result;
}
