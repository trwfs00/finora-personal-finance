# Finora — Feature Plans

## Plan 1 — Full Recurring Transactions

**Status:** data model พร้อมแล้วส่วนใหญ่ — `RecurringTransaction` type มีอยู่แล้วใน `types.ts`, `recurringId` อยู่ใน `Transaction`, store state มี `recurringTransactions: []` แล้ว แต่ยังไม่มี actions, repository functions, UI, หรือ generation logic

### สิ่งที่ต้องทำ

1. **`src/storage/repository.ts`** — เพิ่ม `addRecurring`, `updateRecurring`, `deleteRecurring` (เทียบแบบ `addTransaction`)

2. **`src/domain/recurring.ts`** (ไฟล์ใหม่) — logic หลัก:
   - `calculateNextRunDate(frequency, interval, fromDate)` — คำนวณวันถัดไป
   - `generateDueTransactions(recurring[], today)` — คืน list ของ `TransactionDraft` ที่ครบกำหนด

3. **`src/store/finance-store.ts`** — เพิ่ม actions:
   - `addRecurring`, `updateRecurring`, `deleteRecurring`
   - `generateDueRecurring()` — เรียกตอน `initialize()`, วน loop recurring ที่ `nextRunDate <= today` และ `autoGenerate: true` สร้าง transaction + อัปเดต `nextRunDate`

4. **`src/components/RecurringForm.tsx`** — form สำหรับสร้าง/แก้ recurring คล้าย `TransactionForm` แต่มี field เพิ่ม:
   - Frequency selector (daily/weekly/monthly/yearly/custom)
   - Interval (ทุก N วัน/สัปดาห์/เดือน)
   - Start date, End date (optional)
   - Auto-generate toggle

5. **`src/pages/RecurringPage.tsx`** — list view แสดง:
   - ชื่อ/note, amount, frequency, next due date
   - Badge: active/paused
   - Actions: edit, pause/resume, delete
   - ปุ่ม "Generate now" สำหรับ manual trigger

6. **`src/App.tsx`** — เพิ่ม route `/recurring`

7. **`src/components/AppShell.tsx`** — เพิ่ม nav item

**Dependencies:** ไม่ต้องติดตั้งเพิ่ม

---

## Plan 2 — Savings Goals

**Status:** ยังไม่มีเลย ต้องสร้างตั้งแต่ type

### สิ่งที่ต้องทำ

1. **`src/domain/types.ts`** — เพิ่ม type:
   ```ts
   interface SavingsGoal {
     id: string
     name: string
     targetAmount: number
     savedAmount: number          // manual contributions
     linkedAccountId?: string     // optional: ดึง balance จาก account แทน
     currency: string
     deadline?: string            // "yyyy-MM-dd"
     color?: string
     note?: string
     isCompleted: boolean
     createdAt: string
     updatedAt: string
   }
   ```
   เพิ่มใน `StoredData`, `FinanceData`, `BackupData`

2. **`src/storage/repository.ts`** — `addGoal`, `updateGoal`, `deleteGoal`

3. **`src/store/finance-store.ts`** — เพิ่ม `savingsGoals: []` + actions

4. **`src/components/GoalForm.tsx`** — form: name, target, deadline, color, note, optional linked account

5. **`src/pages/GoalsPage.tsx`** — แต่ละ goal แสดง:
   - Progress ring (% ของ target)
   - Amount saved / target
   - Days remaining to deadline
   - ปุ่ม "Add contribution" — dialog กรอก amount เพิ่ม `savedAmount`
   - ถ้า linked account: ดึง balance ณ ปัจจุบันแทน `savedAmount`

6. **`src/App.tsx`** + **`AppShell`** — route `/goals` + nav

> **Note:** contribution ไม่สร้าง `Transaction` — เป็น standalone amount ใน goal เอง (ถ้าอยากเชื่อมกับ transaction ให้ทำ linked account approach แทน)

---

## Plan 3 — Net Worth Tracking (Historical)

**Status:** app คำนวณ net worth ปัจจุบันได้อยู่แล้วใน `calculations.ts` แต่ไม่มี historical data

### สิ่งที่ต้องทำ

1. **`src/domain/calculations.ts`** — เพิ่ม `calculateNetWorthHistory(accounts, transactions, months)`:
   - Retrospective calculation — ไม่ต้อง store snapshot
   - สำหรับแต่ละ month: คำนวณ account balance = `initialBalance` + ผลรวม transactions ถึง end of month นั้น
   - รองรับ `includeInNetWorth` flag ของ account

2. **`src/components/Charts.tsx`** — เพิ่ม `NetWorthTrendChart`:
   - Line chart รายเดือน
   - แสดง assets (บวก), liabilities (ลบ), net worth (ผลต่าง)
   - Tooltip แสดง breakdown per account type

3. **`src/pages/AnalyticsPage.tsx`** — เพิ่ม section "Net Worth Trend" (หรือ tab แยก)

4. **`src/pages/DashboardPage.tsx`** — เพิ่ม mini net worth sparkline card

**Dependencies:** ขึ้นอยู่กับ chart library ที่ใช้อยู่แล้ว

---

## Plan 4 — Calendar View (Spending Heatmap)

**Status:** ยังไม่มีเลย — ต้องสร้าง page ใหม่

### สิ่งที่ต้องทำ

1. **`src/pages/CalendarPage.tsx`** — layout หลัก:
   - MonthPicker ด้านบน
   - Calendar grid 7×5/6
   - Summary bar ด้านล่าง: total income / expense ของเดือน

2. **`src/components/SpendingCalendar.tsx`** — calendar grid component:
   - แต่ละ cell แสดงวันที่ + dot สีตาม intensity ของ spending
   - Color scale: percentile-based (วันที่ใช้เงินมากสุดของเดือน = darkest)
   - Click เปิด day detail panel แสดง list transactions ของวันนั้น

3. **`src/App.tsx`** + **`AppShell`** — route `/calendar` + nav

**Dependencies:** ไม่ต้องติดตั้งเพิ่ม — ใช้ Tailwind + CSS custom สำหรับ heat colors

---

## Plan 5 — Smart Fill OCR (Slip Scanner)

**Status:** ยังไม่มีเลย — feature ใหม่ทั้งหมด

### Dependencies ที่ต้องติดตั้ง
```
npm install tesseract.js browser-image-compression fuse.js
```
(date-fns และ zod มีอยู่แล้ว)

### Pipeline
```
Upload slip
↓
Compress / resize (browser-image-compression)
↓
Preprocess with Canvas API
  - grayscale
  - contrast boost
  - sharpen (convolution matrix)
↓
OCR with Tesseract.js (Web Worker)
↓
Parse text with regex/rules
↓
Fuzzy match account/category (fuse.js)
↓
Prefill TransactionForm
↓
User validates → Save
```

### สิ่งที่ต้องทำ

1. **`src/lib/ocr/preprocess.ts`** — Canvas pipeline รับ `File` → process → คืน `Blob`

2. **`src/lib/ocr/parse.ts`** — regex rules สำหรับ Thai bank slip:
   ```ts
   const AMOUNT_RE = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/
   const DATE_RE   = /(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})/
   const TIME_RE   = /(\d{2}):(\d{2})(?::(\d{2}))?/
   const BANK_RE   = /กสิกร|กรุงไทย|ไทยพาณิชย์|กรุงศรี|ทหารไทย|ออมสิน|KBANK|KTB|SCB|BAY|TTB/i
   const ACCT_RE   = /[Xข]{4,}\d{3,4}/
   ```
   คืน `SlipData { amount, date, time, bankName, accountSuffix, recipientName }`

3. **`src/lib/ocr/match.ts`** — Fuse.js fuzzy matching:
   - `matchAccount(bankName, accountSuffix, accounts)`
   - `matchCategory(recipientName, categories)`

4. **`src/components/SlipScanner.tsx`** — UI:
   - Dropzone / camera button (mobile: `capture="environment"`)
   - Loading state + progress
   - Preview รูป + parsed result พร้อม confidence indicator
   - ปุ่ม "เติมฟอร์ม" → ส่ง `Partial<FormValues>` กลับ

5. **`src/components/TransactionForm.tsx`** — เพิ่มปุ่ม "อ่านจากสลิป" ด้านบน form เปิด `SlipScanner` เป็น dialog แล้ว `form.setValue(...)` เมื่อยืนยัน

### Confidence ของแต่ละ field
| Field | Confidence |
|-------|-----------|
| Amount | สูง |
| Date / Time | สูง |
| Bank name | กลาง |
| Account suffix | กลาง |
| Category match | ต่ำ (ให้ user ยืนยันเสมอ) |

---

## สรุป

| Plan | ความซับซ้อน | เวลาโดยประมาณ |
|------|-------------|----------------|
| 1. Recurring Transactions | ต่ำ (type พร้อมแล้ว) | ~3-4 ชม. |
| 2. Savings Goals | ต่ำ-กลาง | ~3-4 ชม. |
| 3. Net Worth History | ต่ำ (calculation เท่านั้น) | ~1-2 ชม. |
| 4. Calendar Heatmap | กลาง | ~3-4 ชม. |
| 5. Smart Fill OCR | สูง | ~8-10 ชม. |
