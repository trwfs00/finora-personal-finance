import { scoreConfidence, type SlipConfidence } from "./confidence";
import { detectBank } from "./detect-bank";
import { normalizeOcrText } from "./normalize";
import { getParser } from "./parsers";
import type { BankId } from "./parsers/types";

export interface SlipData {
  amount?: number;
  date?: string;
  time?: string;
  bankName?: string;
  bankId?: BankId;
  accountSuffix?: string;
  accountSuffixes?: string[];
  recipientName?: string;
  refNumber?: string;
  confidence?: SlipConfidence;
}

// Extracts text from HOCR restricted to x < xThreshold (fraction of image
// width). Used to build a QR-noise-free search space for amount extraction on
// slips where the QR code column sits to the right of the slip content.
function extractLeftColumnText(hocr: string, xThreshold = 0.60): string {
  const pageM = hocr.match(/class='ocr_page'[^>]*bbox\s+\d+\s+\d+\s+(\d+)\s+(\d+)/);
  const imgW = pageM ? parseInt(pageM[1]) : 1;
  const imgH = pageM ? parseInt(pageM[2]) : 1;
  const lineTol = imgH * 0.015;

  const words: Array<{ xCtr: number; yCtr: number; text: string }> = [];
  const re =
    /<span class='ocrx_word'[^>]*title='bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)[^']*'[^>]*>([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(hocr)) !== null) {
    const xCtr = (parseInt(m[1]) + parseInt(m[3])) / 2;
    if (xCtr / imgW >= xThreshold) continue;
    const text = m[5]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    if (text) words.push({ xCtr, yCtr: (parseInt(m[2]) + parseInt(m[4])) / 2, text });
  }

  words.sort((a, b) => a.yCtr - b.yCtr || a.xCtr - b.xCtr);

  const lines: string[][] = [];
  let curY = -9999;
  for (const { yCtr, text } of words) {
    if (yCtr - curY > lineTol) {
      lines.push([]);
      curY = yCtr;
    }
    lines[lines.length - 1].push(text);
  }

  return lines.map((l) => l.join(" ")).join("\n");
}

// Pipeline: normalize OCR text → detect bank → bank parser → confidence.
// hocr (optional): full HOCR string from Tesseract, used to extract a
// left-column-only view for banks where QR noise occupies the right half.
export function parseSlipText(rawText: string, hocr?: string): SlipData {
  const text = normalizeOcrText(rawText);
  const bankId = detectBank(text);

  const leftColText =
    hocr && (bankId === "make" || bankId === "kbank")
      ? normalizeOcrText(extractLeftColumnText(hocr))
      : undefined;

  const parsed = getParser(bankId)(text, leftColText);

  return {
    amount: parsed.amount.value,
    date: parsed.date.value,
    time: parsed.time.value,
    bankName: parsed.bankName,
    bankId,
    accountSuffix: parsed.accounts.value?.[0],
    accountSuffixes: parsed.accounts.value,
    recipientName: parsed.recipientName,
    refNumber: parsed.ref.value,
    confidence: scoreConfidence(parsed),
  };
}
