# Guided Help / Use-case Guide Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add an in-app guidance system that teaches users how to use Finora pages and real finance scenarios such as SPayLater, credit cards, bank transfers, budgets, backup, and Google Drive sync.

**Architecture:** Build a reusable, local-first help system using structured guide content, shared UI components, and page-level contextual entry points. Start with page-specific help drawers and use-case cards; keep all content in the frontend and translate through the existing i18n system. Do not introduce a backend, CMS, or AI-generated answers for MVP.

**Tech Stack:** React, TypeScript, React Router, i18next, existing Dialog/Button/Badge UI components, Vitest/React Testing Library.

---

## Product Decision

Finora needs more than tooltips. Finance apps confuse users because the main questions are workflow/use-case questions, not just field definitions.

Examples:

- “SPayLater วงเงิน 20,000 ใช้ไปแล้ว 8,000 ต้องกรอกยังไง?”
- “จ่ายบัตรเครดิตต้องลงเป็น expense หรือ transfer?”
- “บัญชีหนี้ควรรวมใน net worth ไหม?”
- “Backup JSON กับ Google Drive sync ต่างกันยังไง?”
- “งบประมาณรายเดือนกับงบรายหมวดใช้ยังไง?”

Therefore the MVP should be a **Guided Help / Use-case Guide** system with three layers:

1. **Contextual page help**
   - A `วิธีใช้หน้านี้` / `How to use this page` button on key pages.
   - Opens a drawer/dialog with page-specific guidance.

2. **Use-case cards**
   - Real scenarios with exact recommended inputs and transaction behavior.
   - Example: SPayLater, credit card repayment, salary, transfer between own accounts.

3. **Guide center**
   - A Settings section or future `/guides` route listing all guides in one place.
   - MVP can start inside Settings to avoid changing primary navigation too much.

---

## Scope

### MVP pages

Implement contextual help first for:

1. Accounts
2. Transactions
3. Budgets
4. Settings / Backup & Sync

Optional after MVP:

5. Dashboard / Overview
6. Analytics

### MVP use cases

Accounts:

- Cash account
- Bank account
- E-wallet
- Credit card
- SPayLater / BNPL / debt account
- Investment account
- Include in net worth

Transactions:

- Cash purchase
- Bank/e-wallet purchase
- Credit card/SPayLater purchase
- Credit card/SPayLater repayment
- Transfer between own accounts
- Salary/income
- Debt payment vs interest/fee expense

Budgets:

- Monthly total budget
- Category budget
- Rollover budget
- Over-budget warning

Settings / Backup & Sync:

- Local-first data
- JSON backup
- JSON restore warning
- Google Drive sync
- Sync conflict choices
- Disconnect behavior

---

## Concerns List + How To Solve

### 1. Concern: Help content may become too long and overwhelming

**Solution:**
- Use short sections and cards.
- Put immediate “Recommended input” first.
- Put explanation below.
- Use progressive disclosure: page drawer first, full guide center later.

### 2. Concern: Hardcoded content will be difficult to translate

**Solution:**
- Store guide structure in TypeScript, but store human text in i18n keys.
- Use stable guide IDs and translation keys like `guides.accounts.spaylater.title`.
- Add both English and Thai in the same task.

### 3. Concern: Guides may get out of sync with app behavior

**Solution:**
- Keep use-case examples tied to existing model behavior:
  - debt is negative balance
  - repayment is transfer
  - purchase is expense
- Add tests for guide IDs and translation existence.
- Update guides in the same PR as related feature changes.

### 4. Concern: Tooltips alone are not enough

**Solution:**
- Do not rely on tooltips for workflows.
- Use a drawer/dialog with examples and exact field values.
- Tooltips can be added later for individual fields.

### 5. Concern: Too many new routes/navigation changes could distract from core app

**Solution:**
- MVP: add contextual buttons on pages and a Guide section in Settings.
- Do not add a top-level `/guides` nav item yet unless user asks.
- Future: add searchable `/guides` route after content proves useful.

### 6. Concern: Mobile layout may become cramped

**Solution:**
- Use existing Dialog component or create responsive drawer/dialog that is full-width on mobile.
- Keep page help button small and secondary.
- Use cards stacked vertically on mobile.

### 7. Concern: Users may confuse help examples with demo data creation

**Solution:**
- Clearly label examples as instructions, not automatically created data.
- Optional future enhancement: “Use this example” quick-fill buttons, but out of MVP.

### 8. Concern: Some use cases depend on future credit-limit feature

**Solution:**
- Write guide copy to work with current behavior first:
  - `initialBalance: -8000`
- If credit-limit feature is implemented, guide can include:
  - `creditLimit: 20000`
- Structure guide content so optional fields can be added without redesign.

### 9. Concern: Users could still double-count credit card payments

**Solution:**
- Make this a prominent transaction guide:
  - Purchase with credit card = Expense on credit card account.
  - Paying the card = Transfer from bank to credit card.
- Put this example in both Accounts and Transactions help.

### 10. Concern: Backup/restore guidance must emphasize destructive restore

**Solution:**
- Settings guide must explicitly state:
  - Export JSON is safe.
  - Restore JSON replaces local data.
  - Google Drive restore should never happen silently.
  - Conflict choices decide which snapshot wins.

### 11. Concern: Future AI/help search could leak finance data

**Solution:**
- MVP is static local content only.
- No user finance data is sent anywhere.
- If AI help is added later, require explicit privacy design.

### 12. Concern: Existing UI components may not include drawer

**Solution:**
- Prefer existing `Dialog` first to avoid adding dependency.
- Name component `HelpDialog` for MVP.
- Future can replace internals with Drawer without changing call sites.

---

## Acceptance Criteria

- Accounts page has a visible `How to use this page` / `วิธีใช้หน้านี้` action.
- Clicking it opens contextual help with account use cases.
- Transactions page has contextual help with transfer vs expense examples.
- Budgets page has contextual help explaining total/category/rollover budgets.
- Settings page has contextual help for backup, restore, and Google Drive sync.
- A guide center section exists in Settings listing all MVP guide topics.
- Thai and English translations exist for all guide UI and content.
- Guide content includes SPayLater example:
  - limit 20,000
  - used 8,000
  - initial balance -8000
  - credit limit 20000 if credit-limit feature exists
  - repayment is transfer from bank to SPayLater
- Tests verify guide content IDs and no missing translation keys.
- Typecheck, lint, tests, and build pass.

---

## Proposed File Structure

Create:

```text
src/domain/guides.ts
src/components/help/HelpDialog.tsx
src/components/help/HelpButton.tsx
src/components/help/UseCaseCard.tsx
src/components/help/GuideCenter.tsx
src/domain/guides.test.ts
```

Modify:

```text
src/pages/AccountsPage.tsx
src/pages/TransactionsPage.tsx
src/pages/BudgetsPage.tsx
src/pages/SettingsPage.tsx
src/locales/en.json
src/locales/th.json
src/test/setup.ts   # only if needed for new tests
```

Optional later:

```text
src/pages/GuidesPage.tsx
src/App.tsx
src/components/AppShell.tsx
```

---

## Data Model

Create `src/domain/guides.ts` with structured guide definitions.

Recommended types:

```ts
export type GuidePage = "accounts" | "transactions" | "budgets" | "settings";

export interface GuideUseCase {
  id: string;
  titleKey: string;
  descriptionKey: string;
  stepsKeys: string[];
  recommendedFields?: Array<{
    labelKey: string;
    value: string;
  }>;
  warningKey?: string;
}

export interface PageGuide {
  page: GuidePage;
  titleKey: string;
  introKey: string;
  useCases: GuideUseCase[];
}
```

Example account guide:

```ts
export const PAGE_GUIDES: PageGuide[] = [
  {
    page: "accounts",
    titleKey: "guides.accounts.title",
    introKey: "guides.accounts.intro",
    useCases: [
      {
        id: "spaylater",
        titleKey: "guides.accounts.spaylater.title",
        descriptionKey: "guides.accounts.spaylater.description",
        recommendedFields: [
          { labelKey: "guides.fields.accountName", value: "SPayLater" },
          { labelKey: "guides.fields.accountType", value: "Debt account" },
          { labelKey: "guides.fields.initialBalance", value: "-8000" },
          { labelKey: "guides.fields.creditLimit", value: "20000" },
        ],
        stepsKeys: [
          "guides.accounts.spaylater.step1",
          "guides.accounts.spaylater.step2",
          "guides.accounts.spaylater.step3",
        ],
        warningKey: "guides.accounts.spaylater.warning",
      },
    ],
  },
];
```

Add helper:

```ts
export function getPageGuide(page: GuidePage) {
  return PAGE_GUIDES.find((guide) => guide.page === page);
}
```

---

## Implementation Tasks

### Task 1: Create guide domain model and core content skeleton

**Objective:** Add typed guide definitions without rendering them yet.

**Files:**
- Create: `src/domain/guides.ts`
- Create: `src/domain/guides.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { getPageGuide, PAGE_GUIDES } from "./guides";

describe("guide definitions", () => {
  it("contains MVP page guides", () => {
    expect(getPageGuide("accounts")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("transactions")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("budgets")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("settings")?.useCases.length).toBeGreaterThan(0);
  });

  it("has stable unique use case ids per page", () => {
    for (const guide of PAGE_GUIDES) {
      const ids = guide.useCases.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("includes SPayLater account guidance", () => {
    const accounts = getPageGuide("accounts");
    const spaylater = accounts?.useCases.find((item) => item.id === "spaylater");
    expect(spaylater?.recommendedFields?.some((field) => field.value === "-8000")).toBe(true);
    expect(spaylater?.recommendedFields?.some((field) => field.value === "20000")).toBe(true);
  });
});
```

**Step 2: Run failing test**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/guides.test.ts
```

Expected: FAIL because files do not exist.

**Step 3: Implement `src/domain/guides.ts`**

Include these guide pages and IDs:

Accounts:

```text
cash
bank
ewallet
credit-card
spaylater
investment
net-worth
```

Transactions:

```text
cash-purchase
credit-purchase
credit-repayment
own-transfer
salary-income
debt-interest-fee
```

Budgets:

```text
monthly-budget
category-budget
rollover-budget
over-budget
```

Settings:

```text
local-first
json-backup
json-restore
google-drive-sync
sync-conflict
```

**Step 4: Run tests**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/guides.test.ts
```

Expected: PASS.

---

### Task 2: Add guide translations

**Objective:** Add English and Thai copy for guide content.

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/th.json`

**Step 1: Add common guide UI keys**

English:

```json
"guideUi": {
  "howToUsePage": "How to use this page",
  "guideCenter": "Guide center",
  "recommendedSetup": "Recommended setup",
  "steps": "How to use it",
  "warning": "Important",
  "openGuide": "Open guide",
  "closeGuide": "Close guide"
}
```

Thai:

```json
"guideUi": {
  "howToUsePage": "วิธีใช้หน้านี้",
  "guideCenter": "คู่มือการใช้งาน",
  "recommendedSetup": "ค่าที่แนะนำ",
  "steps": "วิธีใช้งาน",
  "warning": "สำคัญ",
  "openGuide": "เปิดคู่มือ",
  "closeGuide": "ปิดคู่มือ"
}
```

**Step 2: Add field label keys**

English:

```json
"guides": {
  "fields": {
    "accountName": "Account name",
    "accountType": "Account type",
    "initialBalance": "Initial balance",
    "creditLimit": "Credit limit",
    "transactionType": "Transaction type",
    "fromAccount": "From account",
    "toAccount": "To account",
    "amount": "Amount"
  }
}
```

Thai:

```json
"guides": {
  "fields": {
    "accountName": "ชื่อบัญชี",
    "accountType": "ประเภทบัญชี",
    "initialBalance": "ยอดเริ่มต้น",
    "creditLimit": "วงเงิน",
    "transactionType": "ประเภทรายการ",
    "fromAccount": "บัญชีต้นทาง",
    "toAccount": "บัญชีปลายทาง",
    "amount": "จำนวนเงิน"
  }
}
```

**Step 3: Add account guide content**

Minimum required Thai SPayLater copy:

```json
"spaylater": {
  "title": "SPayLater / สินเชื่อซื้อก่อนจ่ายทีหลัง",
  "description": "ใช้บัญชีประเภทหนี้สินเพื่อติดตามยอดที่ใช้ไปและยอดที่ต้องจ่ายคืน",
  "step1": "ถ้าใช้ไปแล้ว 8,000 ให้ใส่ยอดเริ่มต้นเป็น -8000 เพราะเป็นหนี้",
  "step2": "ถ้ามีวงเงิน 20,000 ให้ใส่ Credit limit เป็น 20000 เมื่อฟีเจอร์วงเงินเปิดใช้งาน",
  "step3": "เมื่อซื้อของเพิ่ม ให้บันทึกเป็นรายจ่ายในบัญชี SPayLater",
  "step4": "เมื่อจ่ายคืน ให้บันทึกเป็นรายการโอนจากบัญชีธนาคารไปยัง SPayLater",
  "warning": "อย่าบันทึกการจ่ายคืนเป็นรายจ่ายซ้ำ เพราะค่าใช้จ่ายเกิดตั้งแต่ตอนซื้อของแล้ว"
}
```

**Step 4: Verify JSON syntax**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('src/locales/th.json','utf8')); console.log('ok')"
```

Expected: `ok`.

---

### Task 3: Create reusable HelpDialog component

**Objective:** Render page guide content in a reusable dialog.

**Files:**
- Create: `src/components/help/HelpDialog.tsx`
- Create: `src/components/help/UseCaseCard.tsx`

**Step 1: Implement `UseCaseCard`**

Props:

```ts
interface UseCaseCardProps {
  useCase: GuideUseCase;
}
```

Render:

- title
- description
- recommended field table/list if present
- steps list
- warning box if present

Use `useTranslation()` for keys.

**Step 2: Implement `HelpDialog`**

Props:

```ts
interface HelpDialogProps {
  guide: PageGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Use existing `Dialog` component:

```tsx
<Dialog
  open={open}
  onOpenChange={onOpenChange}
  title={t(guide.titleKey)}
  description={t(guide.introKey)}
>
  <div className="space-y-4">
    {guide.useCases.map((item) => (
      <UseCaseCard key={item.id} useCase={item} />
    ))}
  </div>
</Dialog>
```

**Step 3: Verify typecheck**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
```

Expected: PASS.

---

### Task 4: Create HelpButton component

**Objective:** Add a small reusable trigger for contextual help.

**Files:**
- Create: `src/components/help/HelpButton.tsx`

**Implementation:**

```tsx
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { GuidePage } from "../../domain/guides";
import { getPageGuide } from "../../domain/guides";
import { Button } from "../ui/button";
import { HelpDialog } from "./HelpDialog";

export function HelpButton({ page }: { page: GuidePage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const guide = getPageGuide(page);

  if (!guide) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        <HelpCircle aria-hidden className="h-4 w-4" />
        {t("guideUi.howToUsePage")}
      </Button>
      <HelpDialog guide={guide} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

**Verify:**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
```

Expected: PASS.

---

### Task 5: Add contextual help to Accounts page

**Objective:** Make account use cases discoverable from the Accounts page.

**Files:**
- Modify: `src/pages/AccountsPage.tsx`

**Step 1: Import HelpButton**

```ts
import { HelpButton } from "../components/help/HelpButton";
```

**Step 2: Add button near Add Account**

Current header has Add Account button. Replace right-side action area with a grouped action area:

```tsx
<div className="flex flex-wrap gap-2">
  <HelpButton page="accounts" />
  <Button onClick={openNew} variant="primary">
    <Plus aria-hidden className="h-4 w-4" />
    {t("accounts.addAccount")}
  </Button>
</div>
```

**Manual QA:**

- Open Accounts page.
- Click `วิธีใช้หน้านี้`.
- Confirm SPayLater and credit card examples are shown.

---

### Task 6: Add contextual help to Transactions page

**Objective:** Explain common transaction workflows, especially transfer vs expense.

**Files:**
- Modify: `src/pages/TransactionsPage.tsx`

**Step 1: Inspect header actions**

Find Add Transaction / Export CSV action group.

**Step 2: Add HelpButton**

Add:

```tsx
<HelpButton page="transactions" />
```

near action buttons.

**Required guide examples:**

- Credit card purchase:
  - type: Expense
  - account: Credit card
- Credit card repayment:
  - type: Transfer
  - from: Bank
  - to: Credit card
- Salary:
  - type: Income
  - account: Bank

**Manual QA:**

- Open Transactions page.
- Help dialog explains repayment should be transfer, not expense.

---

### Task 7: Add contextual help to Budgets page

**Objective:** Explain how total/category/rollover budgets work.

**Files:**
- Modify: `src/pages/BudgetsPage.tsx`

Add:

```tsx
<HelpButton page="budgets" />
```

near page action/header.

Guide must explain:

- Total monthly budget is the overall spending cap.
- Category budget is per category.
- Rollover carries unused budget forward.
- Over-budget state means actual spending exceeded planned amount.

---

### Task 8: Add contextual help to Settings page

**Objective:** Explain local-first storage, backup/restore, and Google Drive sync.

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

Add `HelpButton page="settings"` near Settings header or near data controls.

Guide must explain:

- Data is local-first in browser IndexedDB.
- JSON export is a manual backup.
- JSON restore replaces local data.
- Google Drive sync stores hidden app data backup in user Drive.
- Conflict choices:
  - Use Drive data = replace local with remote.
  - Keep this device = upload local and overwrite remote.
- Disconnect stops sync metadata but local data remains.

---

### Task 9: Add Guide Center section in Settings

**Objective:** Provide one place to browse all guides without changing main navigation.

**Files:**
- Create: `src/components/help/GuideCenter.tsx`
- Modify: `src/pages/SettingsPage.tsx`

**Implementation idea:**

`GuideCenter` renders a panel:

```tsx
<div className="panel p-5">
  <h2>{t("guideUi.guideCenter")}</h2>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
    {PAGE_GUIDES.map((guide) => (
      <button ...>{t(guide.titleKey)}</button>
    ))}
  </div>
</div>
```

When a guide button is clicked, open `HelpDialog` for that guide.

Place it in Settings near the Privacy / Backup sections.

---

### Task 10: Add translation coverage test

**Objective:** Prevent guide content from missing translations.

**Files:**
- Modify: `src/domain/guides.test.ts`

**Step 1: Import locales**

```ts
import en from "../locales/en.json";
import th from "../locales/th.json";
```

If JSON imports are not supported in test config, use `fs.readFileSync` with `JSON.parse`.

**Step 2: Add helper**

```ts
function hasKey(locale: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, locale) !== undefined;
}
```

**Step 3: Test all guide keys**

Collect:

- guide title/intro keys
- use case title/description keys
- step keys
- field label keys
- warning keys
- guide UI keys

Assert every key exists in `en` and `th`.

**Run:**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/guides.test.ts
```

Expected: PASS.

---

### Task 11: Improve empty states with guide entry points

**Objective:** Help new users understand what to do before they have data.

**Files:**
- Modify: `src/pages/AccountsPage.tsx`
- Optional modify: `src/pages/TransactionsPage.tsx`
- Optional modify: `src/pages/BudgetsPage.tsx`

Accounts empty state should include:

```text
Examples:
- Bank account: initial balance = current bank balance
- Credit card/SPayLater: initial balance = negative debt, e.g. -8000
```

Actions:

```tsx
<Button>Add account</Button>
<HelpButton page="accounts" />
```

Do not overdo this for every page in MVP; Accounts is highest value.

---

### Task 12: Final verification

Run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
PATH=/home/freshy/.hermes/node/bin:$PATH npm run lint
PATH=/home/freshy/.hermes/node/bin:$PATH npm test
PATH=/home/freshy/.hermes/node/bin:$PATH npm run build
```

Expected:

- Typecheck passes.
- Lint has no new errors. Existing unrelated Fast Refresh warnings may remain.
- Tests pass.
- Build passes. Existing Vite chunk-size warning may remain.

Manual QA checklist:

1. Switch language to English.
2. Open Accounts help; confirm English content renders.
3. Switch language to Thai.
4. Open Accounts help; confirm Thai content renders.
5. Open Transactions help; confirm credit repayment says Transfer, not Expense.
6. Open Budgets help; confirm total/category/rollover explanation.
7. Open Settings help; confirm backup/restore/sync warning copy.
8. Open Guide Center in Settings; confirm all guide topics can be opened.
9. Test mobile width; dialog/cards remain readable.

---

## Suggested Commit Sequence

1. `feat(guides): add structured guide definitions`
2. `feat(guides): add bilingual guide translations`
3. `feat(guides): add reusable help dialog components`
4. `feat(accounts): add contextual account guide entry point`
5. `feat(transactions): add transaction workflow guide`
6. `feat(settings): add guide center and sync guidance`
7. `test(guides): verify guide translation coverage`

---

## Out of Scope for MVP

- AI-generated help.
- User-data-aware recommendations.
- Server/CMS-managed guide content.
- Searchable full guide route.
- “Use this example” one-click account/transaction creation.
- Embedded videos/tutorials.
- Analytics tracking for guide usage.

These can be future enhancements after the static guide content proves useful.

---

## Future Enhancements

### Phase 2: Searchable Guide Route

Add `/guides` route with:

- Search input
- Category filters
- All use cases
- Deep links to individual guides

### Phase 3: Quick-fill Examples

Add buttons such as:

```text
Create SPayLater example account
Create credit card repayment example
```

These must show confirmation before creating data.

### Phase 4: Smarter Contextual Hints

Examples:

- If user creates debt account with positive initial balance, show warning.
- If user records credit card payment as expense, suggest transfer.
- If user has no backup for a long time, suggest export/sync.

### Phase 5: More Debt/Credit Features

Connect guide content to credit-limit account UX:

- Show `creditLimit` examples once implemented.
- Show utilization examples.
- Add billing cycle guide when billing-cycle feature exists.
