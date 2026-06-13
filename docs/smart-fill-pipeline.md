# Smart Fill — OCR Pipeline

เอกสารนี้อธิบาย flow การทำงานของฟีเจอร์ Smart Fill ตั้งแต่ user เลือกรูปจนถึง form ถูกกรอกอัตโนมัติ

---

## ภาพรวม

```
รูป slip
    │
    ▼
[1] Validate
    │  ตรวจ file type / ขนาด / resolution
    │
    ▼
[2] Preprocess (browser canvas)
    │  resize → color-preserving contrast boost
    │
    ▼
[3] Tesseract OCR  (PSM 11 — sparse text)
    │  ได้ raw text + HOCR (word-level bounding boxes)
    │
    ▼
[4] Normalize
    │  sara-am, non-breaking space, account token chars,
    │  split-number rejoining (PSM 11 artifact)
    │
    ▼
[5] Detect Bank
    │  regex signal จาก normalized text → BankId
    │
    ▼
[6] Extract Left-Column Text  (make / kbank เท่านั้น)
    │  กรอง HOCR words ที่ x < 60% ของภาพ
    │  ตัด QR code noise ออกจากช่อง amount
    │
    ▼
[7] Parse Fields  (per-bank parser)
    │  amount / date / time / ref / accounts / recipient
    │  แต่ละ field รายงาน ExtractionMethod
    │
    ▼
[8] Score Confidence
    │  ExtractionMethod → high / medium / low ต่อ field
    │
    ▼
[9] Match Accounts & Categories
    │  digit-run matching กับ accountNumber ที่บันทึกไว้
    │  fuzzy match recipient name กับ category
    │
    ▼
form ถูก pre-fill + confidence dots แสดง
```

---

## รายละเอียดแต่ละขั้น

### 1 — Validate  `src/lib/ocr/validate.ts`

| เงื่อนไข | Error key |
|----------|-----------|
| ไม่ใช่ image/* | `errorFileType` |
| > 10 MB | `errorFileSize` |
| กว้างหรือสูง < 300 px | `errorResolution` |

ถ้า fail แสดง error ใน UI และหยุดทันที

---

### 2 — Preprocess  `src/lib/ocr/preprocess.ts`

```
file → browser-image-compression (max 1 MB, max 1600 px)
     → canvas: applyContrastToPixels()
     → PNG blob
```

**`applyContrastToPixels`** — boost contrast ต่อ channel แยกกัน (ไม่แปลงเป็น grayscale):

```
channel' = clamp((channel − 128) × 1.5 + 128, 0, 255)
```

เหตุผลที่ไม่ทำ grayscale: slip ที่มี text สีอ่อนบนพื้นสีเข้ม (เช่น white-on-color) จะหายไปถ้าแปลง grayscale ก่อน Tesseract แต่ color-preserving ช่วยรักษา contrast ไว้ได้

---

### 3 — Tesseract OCR  `src/components/SlipScanner.tsx`

```typescript
createWorker("tha+eng", OEM.DEFAULT)
worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }) // PSM 11
worker.recognize(preprocessed, {}, { hocr: true })
```

**PSM 11 (Sparse Text)** — ค้นหา text ทุกขนาดโดยไม่สมมติ page structure  
เหตุผล: slip บางธนาคาร (เช่น mymo GSB) แสดงจำนวนเงินด้วย font ใหญ่ผิดปกติ PSM AUTO จะข้ามไป

ได้ output 2 อย่าง:
- `data.text` — raw OCR string
- `data.hocr` — XML ที่มี bounding box ของแต่ละ word

---

### 4 — Normalize  `src/lib/ocr/normalize.ts`

| กฎ | ก่อน | หลัง |
|----|------|------|
| sara-am decomposed | `ํา` | `ำ` |
| non-breaking space | ` ` | ` ` |
| account token `%` → `x` | `%3526-%` | `x3526-x` |
| account token `=` → `-` | `X=XXXX` | `X-XXXX` |
| split number (PSM 11 artifact) integer first | `500.\n\n00` | `500.00` |
| split number (PSM 11 artifact) decimal first | `00\n\n500.` | `500.00` |

split-number rejoining เกิดจาก PSM 11 อ่านตัวเลข font ใหญ่แล้วแยก integer กับ decimal ออกเป็นคนละ text block

---

### 5 — Detect Bank  `src/lib/ocr/detect-bank.ts`

ตรวจ regex signal จาก normalized text ตามลำดับ (most-distinctive first):

| BankId | Signal |
|--------|--------|
| `make` | `ma[kK]e`, `KCank`, `สแกนเพื่อตรวจสอบ` |
| `gsb` | `MyMo`, `ธนาคารออมสิน` |
| `paotang` | `เป๋าตัง`, `เบาตง`, `G-Wallet` |
| `scb` | `SCB`, `ไทยพาณิช` |
| `bangkok` | `Bangkok Bank`, `ธนาคารกรุงเทพ` |
| `krungthai` | `Krungthai`, `วันที่ทำรายการ` |
| `kbank` | `สแกนตรวจสอบสลิป`, `กสิกร`, `K PLUS` |
| `generic` | fallback |

หมายเหตุ: `make` ตรวจก่อน `kbank` เพราะ make slip มีคำว่า กสิกร ปนอยู่ด้วย

---

### 6 — Extract Left-Column Text  `src/lib/ocr/parse.ts`

ทำเฉพาะ `make` และ `kbank` เท่านั้น

```
HOCR XML → parse ocrx_word spans
         → กรองเอาเฉพาะ word ที่ xCenter < 60% ของความกว้างภาพ
         → จัดเรียงตาม y แล้ว reconstruct text
```

เหตุผล: slip make by kbank มี QR code อยู่ที่ x > 65% QR noise รบกวนการอ่าน amount keyword เมื่อกรอง left column ออก noise หายไป

---

### 7 — Parse Fields  `src/lib/ocr/parsers/generic.ts`

ทุก bank ใช้ `parseGeneric` (ยังไม่มี bank-specific override)

#### Amount

```
1. หา keyword: จำนวนเงินที่ชำระ → จำนวนเงิน → จำนวน  (ใน leftColText ถ้ามี)
2. scan 6 บรรทัดถัดจาก keyword
3. qualify candidate: ต้องมี .XX decimals หรือตามด้วย บาท/THB/฿
4. ถ้าไม่เจอ keyword → Math.max ของ qualified candidates ทั้งหน้า (max-fallback)
```

#### Date

```
1. Thai month regex (รวม garble aliases):
   เม.ย./w.9./ww.9./10.9./1318. → April (4)
   มิ.ย./0.9./1.9./do.          → June  (6)
   พ.ค./w.n.                    → May   (5)
   ฯลฯ
2. Numeric date: DD/MM/YYYY หรือ DD-MM-YYYY
3. Embedded date: YYYYMMDD ใน ref number (Bangkok Bank)
```

#### Time

`HH:MM` pattern (ต้องมี colon)

#### Accounts

```
pattern รองรับหลาย format:
  xxx-x-x3526-x   masked prefix
  x3526-x          single mask
  0203xxxx1174     digits-mask-digits
  **** ******* 0003  G-Wallet star groups
```

#### Ref

```
1. หา keyword exact: เลขที่รายการ, รหัสอ้างอิง, Ref No., ฯลฯ
2. หา keyword tolerant (OCR garble): เลขที?รายการ, ฮ้างอิง
3. เลือก keyword ที่อยู่ก่อนในข้อความ (earliest match)
4. ดึง [A-Za-z0-9]{4,} แรกใน 200 chars ถัดจาก keyword
```

#### Recipient

```
1. keyword: ผู้รับ, ปลายทาง, ถึง, to, ชื่อ
2. fallback: บรรทัดถัดจาก account number ที่มี Thai chars หรือ proper name
```

---

### 8 — Score Confidence  `src/lib/ocr/confidence.ts`

| ExtractionMethod | Confidence |
|-----------------|------------|
| `anchor` | high |
| `thai-month` | high |
| `pattern` | high |
| `keyword-exact` | high |
| `thai-month-garble` | medium |
| `numeric-date` | medium |
| `embedded-date` | medium |
| `keyword-tolerant` | medium |
| `max-fallback` | low |
| `not-found` | low |

แสดงผลเป็น colored dot ต่อ field ใน UI:
- 🟢 high — ใช้ค่านี้ได้เลย
- 🟡 medium — ตรวจสอบก่อน apply
- 🔴 low — กรอกเอง

---

### 9 — Match Accounts & Categories  `src/lib/ocr/match.ts`

**Account matching** — digit-run matching:

```
accountSuffixes[0] → extract digit runs (≥3 digits)
                   → เทียบกับ account.accountNumber ที่บันทึกไว้
                   → ถ้า stored digits ครอบคลุม run → match

ถ้า suffixes ≥ 2 และ match ทั้ง sender+receiver → type = "transfer"
```

**Category matching** — fuzzy match ด้วย Fuse.js (threshold 0.45):

```
recipientName → เทียบกับ expense categories ทั้งหมด
```

**Fallback** — ถ้า accountNumber ไม่มี → fuzzy match ชื่อบัญชีกับ bankName + accountSuffix

---

## Accuracy ปัจจุบัน (dataset 31 slips, PSM 11)

| Field | Pass | % |
|-------|------|---|
| amount | 31/31 | **100%** |
| date | 28/31 | 90% |
| time | 30/31 | 97% |
| acct | 28/31 | 90% |
| ref | 9/31 | 29% |
| transfer | 29/31 | 94% |

ref ต่ำเพราะ char-level OCR misread (O↔0, b↔h) เป็น hard ceiling ของ Tesseract

---

## ประวัติ Accuracy (14 runs)

| Run | Mode | Amount | Date | Time | Acct | Ref | Transfer | หมายเหตุ |
|-----|------|--------|------|------|------|-----|----------|---------|
| 1 | — | 14/31 45% | 16/31 52% | 31/31 | 23/31 | 8/31 | — | parser เดิม ก่อน redesign |
| 2 | — | 23/31 74% | 16/31 52% | 31/31 | 23/31 | 8/31 | — | แก้ amount candidate scoring |
| 3–8 | cached/full | 28/31 90% | 30/31 97% | 31/31 | 28/31 | 11/31 | 28/31 | pipeline redesign ครบ + HOCR left-column + garble aliases |
| 9 | cached | 27/31 | 26/31 | 30/31 | 30/31 | 11/31 | 30/31 | ลอง sharp preprocessing — date regression |
| 10–11 | cached | 29/31 | 25/31 | 30/31 | 28/31 | 9/31 | 29/31 | PSM 11 + sharp, ยังไม่มี normalize fix |
| 12 | cached | **31/31 100%** | 25/31 | 30/31 | 28/31 | 9/31 | 29/31 | normalize split-number rejoining |
| 13–14 | cached | **31/31** | 28/31 90% | 30/31 | 28/31 | 9/31 | 29/31 | เพิ่ม garble alias `ww.9.` + `do.` |

---

## ปัญหาที่เจอระหว่างพัฒนา

### 1. `data.words` / `data.lines` ว่างเสมอใน Tesseract.js v7

**อาการ**: เรียก `worker.recognize()` แล้ว `data.words` เป็น `[]` ทุกครั้ง  
**สาเหตุ**: Tesseract.js v7 เปลี่ยน API — word-level data ถูกย้ายไปอยู่ใน HOCR XML แทน  
**แก้**: ส่ง `{ hocr: true }` เป็น argument ที่ 3 แล้ว parse XML เอา

```typescript
// ผิด
const { data: { text, words } } = await worker.recognize(img);

// ถูก
const { data } = await worker.recognize(img, {}, { hocr: true });
// parse data.hocr เพื่อดึง bounding boxes
```

---

### 2. make / kbank: QR noise ปนกับ amount keyword

**อาการ**: parser อ่าน amount ได้ `2` แทน `608` — เพราะ QR code อยู่ข้างๆ บรรทัด `จำนวน` พอดี  
**สาเหตุ**: Tesseract อ่าน QR code บางส่วนออกมาเป็น digit noise ที่ x > 65% ของภาพ  
**ค้นพบ**: dump word positions จาก HOCR แล้วดู x% ของแต่ละ word

```
จำนวน    x=5%       ← label
608.00   x=16%      ← ค่าจริง
2แวง1ๆ  x=80–87%   ← QR noise
```

**แก้**: `extractLeftColumnText()` — กรอง HOCR words ที่ x > 60% ออกก่อนส่งเข้า parser

---

### 3. mymo GSB: amount ไม่ปรากฏใน OCR เลย

**อาการ**: OCR text มี `จำนวนเงิน` และ `0.00 ค่าธรรมเนียม` แต่ไม่มีตัวเลข amount (500 / 199 / 175)  
**สาเหตุ**: ตัวเลขจำนวนเงินใช้ font ใหญ่ผิดปกติ (~5× ของ text ทั่วไป) — PSM AUTO (3) classify ว่าไม่ใช่ text แล้วข้ามไป  
**ค้นพบ**: ดูรูป slip จริงพบว่า 500.00 อยู่บนพื้นขาว ตัวหนังสือดำปกติ — ไม่ใช่ปัญหา contrast ตามที่สันนิษฐานไว้แรก  
**แก้**: เปลี่ยน PSM เป็น 11 (Sparse Text) ซึ่งค้นหา text ทุกขนาดโดยไม่สมมติ page structure

---

### 4. PSM 11 split ตัวเลขใหญ่ออกเป็น 2 บรรทัด

**อาการ**: หลังเปลี่ยนเป็น PSM 11 — mymo slip บางใบมี OCR text แบบนี้

```
00        ← บรรทัด A (decimal part)
500.      ← บรรทัด B (integer part)
```

parser ไม่รับ เพราะ `500.` ไม่ match `\d+\.\d{2}` และ `00` คนเดียวก็ไม่ผ่าน format check  
**สาเหตุ**: PSM 11 อ่าน text blocks ไม่เป็นลำดับ — decimal อาจ output ก่อน integer  
**แก้**: เพิ่ม normalize rule 2 แบบ ใน `normalizeOcrText()`

```typescript
.replace(/(\d+)\.\s*\n[\s\n]*(\d{1,2})(?!\d)/g, "$1.$2")  // integer ก่อน
.replace(/\b(\d{2})\s*\n[\s\n]*(\d{1,6})\.(?!\d)/g, "$2.$1") // decimal ก่อน
```

---

### 5. Thai month garbles เปลี่ยนตาม bank-app font

**อาการ**: date accuracy ต่ำ 52% ตั้งแต่แรก — parser อ่านเดือนไม่ออกเพราะ Tesseract แปลง `มิ.ย.` เป็น `1.9.` หรือ `0.9.`  
**สาเหตุ**: แต่ละ bank ใช้ font ต่างกัน ทำให้ garble pattern ต่างกันแต่ consistent  
**แก้**: สร้าง garble alias table จาก corpus จริง

```typescript
const MONTH_GARBLES = {
  "w.9.":  4,  // เม.ย. (make by kbank)
  "ww.9.": 4,  // เม.ย. (make by kbank, PSM 11 variant)
  "10.9.": 4,  // เม.ย. (make by kbank)
  "1318.": 4,  // เม.ย. (kbank)
  "0.9.":  6,  // มิ.ย. (make by kbank)
  "1.9.":  6,  // มิ.ย. (make by kbank)
  "w.n.":  5,  // พ.ค.  (bangkok)
  "do.":   6,  // มิ.ย. (paotang, PSM 11)
};
```

**ปัญหาที่เหลือ**: alias `1.9.` conflict — slip บางใบเป็น April แต่ OCR อ่านเป็น `1.9.` ซึ่ง map ไป June ไม่มีทางแก้ด้วย alias table

---

### 6. Sharp preprocessing ≠ Browser canvas preprocessing

**อาการ**: ใช้ `sharp` ใน dump script เพื่อ simulate preprocessing — แต่ผล OCR ต่างจาก browser  
**สาเหตุ**: browser canvas ผ่าน JPEG compression + color space rendering ของ `createImageBitmap` ซึ่งให้ pixel values ต่างจาก sharp's raw pixel manipulation  
**ผล**: date regression -4 slip เมื่อใช้ sharp preprocessing ใน test  
**แก้**: dump script ยังใช้ sharp (ดีกว่า raw image) แต่ยอมรับว่า test บางส่วนไม่ตรง browser 100%

---

### 7. PSM 11 ทำให้ date / ref regression บน bank อื่น

**อาการ**: หลังเปลี่ยน PSM 11 — make by kbank บางใบ date undefined, bangkok ref อ่านได้ embedded timestamp แทน ref จริง  
**สาเหตุ**: PSM 11 อ่าน text มากขึ้น (รวม noise จาก watermark / outer frame) และ output ไม่เป็นลำดับ top-to-bottom  
**แก้บางส่วน**: เพิ่ม garble alias `ww.9.` และ `do.`  
**ที่ยังเหลือ**: make-by-kbank-4 date garble รวม วัน+เดือน+ปี เป็น `952569` — parse ไม่ได้

---

### 8. accountNumber ไม่ save ลง IndexedDB

**อาการ**: กรอก account number แล้ว reload หายไป  
**สาเหตุ**: `accountSchema` (Zod) ไม่มี field `accountNumber` — Zod `.parse()` strip unknown fields ก่อน save  
**แก้**: เพิ่ม `accountNumber: z.string().optional()` ใน `src/domain/schemas.ts`

---

### 9. Sara-am Unicode decomposed

**อาการ**: regex `จำนวน` ไม่ match แม้ text ดูเหมือนถูก  
**สาเหตุ**: Tesseract บางครั้ง output sara-am เป็น `ํ` (nikhahit U+0E4D) + `า` (sara-aa U+0E32) แทน `ำ` (U+0E33) เดียว  
**แก้**: normalize ใน `normalizeOcrText()` ก่อน parse ทุกครั้ง

```typescript
.replace(/ํา/g, "ำ")
```

---

## ปัญหาแยกตาม Bank (dataset 31 slips)

### make by kbank — 12 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 12/12 | — ✓ แก้ด้วย HOCR left-column filter |
| date | 10/12 | slip 4: `952569` garble (วัน+เดือน+ปีรวมกัน parse ไม่ได้) · slip 9: `1.9.` alias conflict (OCR ได้ June แต่จริงเป็น April) |
| time | 12/12 | — ✓ |
| acct | 12/12 | — ✓ |
| ref | 3/12 | ref format ยาว ~20 chars mixed case — char misread สะสม (O→0, v→y, D→0) ทำให้ tail ผิดเสมอ |
| transfer | 10/12 | slip 2, 7 ตรวจไม่เจอ account ที่ 2 (receiver อยู่ใน region ที่ OCR อ่านพลาด) |

**root cause หลัก**: QR code อยู่ทางขวาของ slip บน bounding box เดียวกับ keyword `จำนวน` — แก้ด้วย left-column filter แล้ว

**ปัญหาที่เหลือ**: ref ยาวที่ Tesseract ตัดทิ้งกลางคัน หรือ misread ตัวท้าย — ไม่มีทางแก้ที่ parser layer

---

### kbank — 5 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 5/5 | — ✓ |
| date | 4/5 | slip 3: off by 1 day (อ่านได้ 12 แทน 11) — OCR misread digit |
| time | 5/5 | — ✓ |
| acct | 5/5 | — ✓ |
| ref | 2/5 | slip 3: ref มี 2 ส่วนต่อกัน (`016163185206` + `BOR09242`) OCR พ่วง noise เข้ามา · slip 4: `F→O` misread (`ATF01158` → `ATFO1158`) |

**note**: kbank ใช้ signal `สแกนตรวจสอบสลิป` (ไม่มี เพื่อ) ส่วน make ใช้ `สแกนเพื่อตรวจสอบ` — ต้องตรวจลำดับใน `BANK_SIGNALS` ให้ถูก

---

### mymo GSB — 5 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 5/5 | — ✓ แก้ด้วย PSM 11 + split-number rejoining |
| date | 5/5 | — ✓ |
| time | 5/5 | — ✓ |
| acct | 4/5 | slip 5: account ที่ 2 OCR อ่านได้ `10xxxx7741` แทน `14xxxx5262` — digit misread |
| ref | 0/5 | ref format เฉพาะ GSB: `6159208824591000012B9790` — ส่วน `B9790` ถูกอ่านเป็น digit noise หรือหายไป ไม่ match `REF_VALUE_RE` |
| transfer | 4/5 | slip 5 ล้มเหลวตาม acct ที่ผิด |

**root cause หลักของ amount**: ตัวเลขจำนวนเงินแสดงด้วย font ใหญ่ ~5× — PSM AUTO ข้ามไปว่าไม่ใช่ text  
**ref เป็น hard ceiling**: format `...B9790` suffix เป็น pattern เฉพาะ GSB ที่ Tesseract อ่านไม่ได้สม่ำเสมอ — ควร mark confidence `low` เสมอ

---

### Krungthai — 4 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 4/4 | — ✓ |
| date | 4/4 | — ✓ |
| time | 4/4 | — ✓ |
| acct | 4/4 | — ✓ |
| ref | 2/4 | slip 3: ref หายไปทั้งหมด (keyword ไม่ถูก detect) · slip 4: `l→1` misread (`elf` → `e1f`) |

**สถานะดีที่สุดรองจาก bangkok** — layout ชัดเจน keyword ตรง

---

### SCB — 2 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 2/2 | — ✓ |
| date | 2/2 | — ✓ |
| time | 2/2 | — ✓ |
| acct | 1/2 | slip 1: account ที่ 2 (`xxx-xxx537-7`) ไม่ถูก detect — ACCT_RE ไม่ match format นี้ |
| ref | 0/2 | ref มี 2 ส่วน: numeric prefix + alphanumeric suffix (`202606095` + `VkOWTRQ5pGMYjTnH`) — parser เก็บแค่ prefix ส่วนหน้า |
| transfer | 1/2 | slip 1 ล้มเหลวตาม acct |

**root cause**: SCB ref แบ่งเป็น 2 token ด้วย space — `REF_VALUE_RE = /[A-Za-z0-9]{4,}/` หยิบได้แค่ token แรก  
**แนวทางแก้**: สำหรับ SCB ให้ join tokens ใน ref window ที่ไม่มี whitespace เกิน 1 ตัว

---

### Bangkok Bank — 2 slips

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 2/2 | — ✓ |
| date | 2/2 | — ✓ (ดึงจาก embedded date ใน ref: `20260530...`) |
| time | 2/2 | — ✓ |
| acct | 2/2 | — ✓ |
| ref | 0/2 | PSM 11 regression: ได้ embedded timestamp `20260530185327240099` แทน ref จริง `494919` |

**root cause**: Bangkok slip มี embedded timestamp ใน text ที่ OCR อ่านได้ก่อน ref keyword — PSM 11 เปลี่ยน text order ทำให้ parser หยิบ timestamp ขึ้นมาแทน  
**PSM 3 ทำได้ปกติ** — เป็น regression จากการเปลี่ยน PSM เพื่อแก้ mymo

---

### เป๋าตัง (Paotang) — 1 slip

| Field | Pass | ปัญหา |
|-------|------|-------|
| amount | 1/1 | — ✓ (ดึงจาก `จำนวนเงินที่ชำระ` keyword) |
| date | 1/1 | — ✓ แก้ด้วย garble alias `do.` → มิ.ย. |
| time | 0/1 | OCR อ่านได้ `1835 น` — ไม่มี colon `TIME_RE = /(\d{2}):(\d{2})/` ไม่ match |
| acct | 0/1 | G-Wallet format `**** ******* 0003` — PSM 11 อ่าน format แตกต่าง ACCT_RE ไม่ครอบคลุม |
| ref | 0/1 | `O→0` misread (ref ขึ้นต้นด้วย `O` แต่ OCR อ่านเป็น `0`) |

**แนวทางแก้ time**: เพิ่ม `TIME_RE` ให้รับ `HHMM` ไม่มี colon: `/(\d{2}):(\d{2})|(\d{2})(\d{2})\s*น/`  
**แนวทางแก้ acct**: เพิ่ม ACCT_RE pattern สำหรับ G-Wallet `**** \d+\*+ \d{4}`

---

## Accuracy Ceiling ที่แก้ไม่ได้

| Field | Ceiling | สาเหตุ |
|-------|---------|--------|
| ref ~29% | hard | char-level misread (O↔0, l↔1, b↔h) — Tesseract อ่านผิดระดับ character ไม่สามารถ fix ที่ parser |
| make/kbank date ~83% | soft | PSM 11 garble บางรูปแบบ conflict กัน (`1.9.` → June vs April) |
| acct transfer make | soft | slip บางใบ account ที่ 2 อยู่ใน region ที่ OCR อ่านไม่ชัด |

---

## ไฟล์ที่เกี่ยวข้อง

```
src/
  components/
    SlipScanner.tsx          UI + orchestration
  lib/ocr/
    validate.ts              file validation
    preprocess.ts            canvas contrast (applyContrastToPixels)
    normalize.ts             text normalization
    detect-bank.ts           bank identification
    parse.ts                 pipeline orchestrator + extractLeftColumnText
    confidence.ts            ExtractionMethod → confidence level
    match.ts                 account + category matching
    parsers/
      types.ts               BankId, ExtractionMethod, FieldResult, ParseResult
      generic.ts             field extractors (ใช้กับทุก bank)
      index.ts               parser registry

temp/
  slip/                      test images (31 slips, 7 banks)
  ocr-debug/                 cached OCR text + HOCR per slip
  test-ocr-e2e.ts            e2e accuracy test
  dump-ocr-text.mjs          regenerate OCR cache (sharp preprocessing + PSM 11)
  ocr-accuracy-history.json  history ของทุก test run
```
