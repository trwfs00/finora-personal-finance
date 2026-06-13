import type { BankId } from "./parsers/types";

// Signals chosen from observed OCR text (temp/ocr-debug/) to avoid
// cross-contamination: kbank slips mention กรุงไทย as the receiver bank,
// mymo slips mention กสิกรไทย, and a kbank slip pays "ร้านค้าออมสิน".
// Order matters — most distinctive signals are checked first.
const BANK_SIGNALS: Array<[BankId, RegExp]> = [
  // "maKe by KCank" header garble; สแกนเพื่อตรวจสอบ is the make footer
  // (kbank's footer is สแกนตรวจสอบสลิป — no เพื่อ)
  ["make", /ma[kK]e|KCank|สแกนเพื่อตรวจสอบ/],
  // ธนาคารออมสิน (full bank name) — not ร้านค้าออมสิน on kbank slips
  ["gsb", /MyMo|ธนาคารออมสิน/],
  ["paotang", /เป๋าตัง|เบาตง|G-Wallet/i],
  ["scb", /SCB|ไทยพาณิช/],
  ["bangkok", /Bangkok\s?Bank|ธนาคารกรุงเทพ/i],
  // Latin header survives OCR; วันที่ทำรายการ is krungthai's layout label
  ["krungthai", /Krungthai|วันที่ทำรายการ/i],
  ["kbank", /สแกนตรวจสอบสลิป|กสิกร|K\s?PLUS/],
];

export function detectBank(normalizedText: string): BankId {
  for (const [bankId, signal] of BANK_SIGNALS) {
    if (signal.test(normalizedText)) return bankId;
  }
  return "generic";
}
