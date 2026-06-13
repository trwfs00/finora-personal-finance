// Thai OCR text normalization, applied once before bank detection and parsing.
// Every rule here is backed by observed Tesseract output in temp/ocr-debug/.
export function normalizeOcrText(rawText: string): string {
  return (
    rawText
      // Tesseract often decomposes sara-am into nikhahit + sara-aa:
      // ํา (U+0E4D + U+0E32) → ำ (U+0E33)
      .replace(/ํา/g, "ำ")
      // Non-breaking spaces → regular spaces
      .replace(/ /g, " ")
      // Masked-account tokens: `x` misread as `%` ("%3526-%", "%%%-%-%5774-%")
      // and `-` misread as `=` ("X=XXXX-XXXX0-55-4"). Only rewrite inside
      // account-shaped tokens (≥6 chars of mask/digit/dash) to avoid touching
      // percentages or math elsewhere.
      .replace(/[%xX*\d][\d\-=%xX*]{4,}[%xX*\d]/g, (token) =>
        token.replace(/%/g, "x").replace(/=/g, "-"),
      )
      // PSM sparse-text splits large-font amounts across lines in two patterns:
      //   "500.\n\n00"  (integer first)  → "500.00"
      //   "00\n\n500."  (decimal first)  → "500.00"
      // Rejoin so the parser sees a qualified decimal candidate.
      .replace(/(\d+)\.\s*\n[\s\n]*(\d{1,2})(?!\d)/g, "$1.$2")
      .replace(/\b(\d{2})\s*\n[\s\n]*(\d{1,6})\.(?!\d)/g, "$2.$1")
      // PSM sparse-text also splits a large-font amount with a SPACE inside the
      // integer part ("1 54.00" → 154.00, "21 68.00" → 2168.00). Rejoin a short
      // leading digit group glued to a decimal value on the same line. Comma
      // grouping ("1,361.00") is untouched — no space precedes the decimals.
      .replace(/\b(\d{1,3}) (\d{1,3}\.\d{2})\b/g, "$1$2")
  );
}
