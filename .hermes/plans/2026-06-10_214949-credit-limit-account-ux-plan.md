# Credit Limit Account UX Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Improve Finora account UX for credit cards, SPayLater, buy-now-pay-later, loans, and debt accounts by adding credit-limit fields, derived used/available credit display, guidance copy, and safe validation.

**Architecture:** Extend the existing `Account` model with optional credit metadata instead of creating a separate debt module. Keep `initialBalance` as the accounting source of truth for net worth and transaction balance calculations; use `creditLimit` as informational capacity metadata. Derive `usedCredit`, `availableCredit`, and utilization from the current calculated account balance so users do not need to manually maintain duplicate values.

**Tech Stack:** React, TypeScript, React Hook Form, Zod, Dexie/IndexedDB, Vitest, i18next, Tailwind-style utility classes.

---

## Product Decision

### Current behavior

Accounts currently store:

```ts
initialBalance: number;
type: "cash" | "bank" | "credit_card" | "e_wallet" | "savings" | "investment" | "debt";
includeInNetWorth: boolean;
```

Balance is calculated as:

```ts
currentBalance = initialBalance + income - expense +/- transfer;
```

For debt/credit accounts, negative balance means money owed.

Example today:

```text
SPayLater limit: 20,000
Already used / owed: 8,000
Initial balance: -8000
Current account balance: -8000
```

### Target behavior

Add optional credit metadata:

```ts
creditLimit?: number;
```

Derive these values from calculated balance:

```ts
usedCredit = account.type is credit/debt ? Math.max(0, -currentBalance) : 0
availableCredit = creditLimit - usedCredit
creditUtilization = usedCredit / creditLimit
```

Important: do **not** store `usedAmount` as a persistent field in MVP because it duplicates current balance and will drift after transactions. Show it as a derived value in UI.

For the user's SPayLater case:

```text
Name: SPayLater
Type: Debt account or Credit card
Initial balance: -8000
Credit limit: 20000
Derived used credit: 8000
Derived available credit: 12000
Utilization: 40%
Include in net worth: On
```

---

## Concerns List + How To Solve

### 1. Concern: Users may confuse credit limit with account balance

If the form shows both “initial balance” and “credit limit”, users may enter `20000` as the initial balance and inflate net worth.

**Solution:**
- Keep `initialBalance` labeled as current balance / starting debt contextually.
- For `credit_card` and `debt`, show helper text:
  - “If you already owe money, enter it as a negative number, e.g. -8000.”
- Label `creditLimit` separately:
  - “Credit limit / borrowing limit, e.g. 20000.”
- Add an inline example for SPayLater and credit cards.

### 2. Concern: Storing `usedAmount` creates duplicate source of truth

If both transactions and `usedAmount` exist, they can disagree.

**Solution:**
- Do not persist `usedAmount` in MVP.
- Derive used credit from account balance:
  - `Math.max(0, -balance)`
- Only persist `creditLimit`.

### 3. Concern: Existing backups may not have `creditLimit`

Old backup JSON and IndexedDB data must continue to load.

**Solution:**
- Make `creditLimit` optional in `Account` and Zod schema.
- No migration required for MVP.
- Existing accounts display no credit-limit section until edited.

### 4. Concern: Validation for limit values

Users may enter negative credit limits or limits lower than used amount.

**Solution:**
- `creditLimit` must be optional or `>= 0`.
- If `creditLimit < usedCredit`, allow save but show warning rather than blocking because real accounts can exceed limits.
- Display available credit as negative when over limit and style it as danger.

### 5. Concern: Credit card vs debt account semantics

Credit cards and debt accounts both behave like liabilities, but labels differ.

**Solution:**
- Enable credit limit field only for account types:
  - `credit_card`
  - `debt`
- Use generic label “Credit / loan limit” in English and “วงเงินสินเชื่อ/วงเงินกู้” in Thai.
- Keep calculations type-based but avoid changing transaction behavior.

### 6. Concern: Expense on debt account decreases balance further

Today, recording an expense against SPayLater decreases balance from `-8000` to `-9000`, which is correct for debt.

**Solution:**
- Preserve current calculation logic.
- Add guide text explaining:
  - Buying with SPayLater = Expense on SPayLater account.
  - Paying SPayLater from bank = Transfer from bank to SPayLater.

### 7. Concern: Payment/repayment may be wrongly entered as expense

Users might record paying credit card as expense, double-counting spending.

**Solution:**
- Add contextual guide examples on Accounts and Transactions.
- Repayment should be `transfer`, not `expense`.
- Buying item is the `expense`.

### 8. Concern: Net worth may look wrong if credit/debt is excluded

Debt accounts should usually be included in net worth.

**Solution:**
- Default `includeInNetWorth` remains true.
- Show helper text for debt/credit:
  - “Usually keep this on so debt reduces net worth.”

### 9. Concern: Multi-currency accounts

Credit limit should use account currency, not global settings currency.

**Solution:**
- Format limit/available values using `account.currency` and existing `formatCurrency()` pattern.

### 10. Concern: UI clutter for normal bank/cash accounts

Most accounts do not need credit-limit fields.

**Solution:**
- Show the credit limit field only when type is `credit_card` or `debt`.
- Hide credit utilization card for other account types.

### 11. Concern: Backup hash/sync changes

Adding `creditLimit` changes backup JSON and Google Drive sync hashes.

**Solution:**
- This is expected for local changes.
- Keep field optional and included in backup naturally through account serialization.
- Existing Drive sync conflict logic remains valid.

### 12. Concern: Demo data may not demonstrate new UX

Users may not discover the feature.

**Solution:**
- Add one demo credit/debt account with a credit limit in demo data if demo accounts are currently illustrative.
- If not, add examples to empty/help state instead.

---

## Acceptance Criteria

- Users can add/edit `Credit limit` for `credit_card` and `debt` accounts.
- Normal accounts do not show credit-limit-only UI.
- Account cards display for credit/debt accounts with a limit:
  - Current debt/used credit
  - Credit limit
  - Available credit
  - Utilization percentage/progress
- Existing accounts/backups without `creditLimit` keep working.
- Backup import/export includes `creditLimit` when present.
- SPayLater example works:
  - Initial balance `-8000`
  - Credit limit `20000`
  - Used `8000`
  - Available `12000`
  - Utilization `40%`
- Thai and English translations are added.
- Tests pass: typecheck, lint, unit tests, build.

---

## Implementation Tasks

### Task 1: Add account credit metadata type and schema

**Objective:** Add optional `creditLimit` to account data while preserving old data compatibility.

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/schemas.ts`
- Test: `src/domain/schemas.test.ts`

**Step 1: Write schema tests**

Add tests proving old and new account shapes are accepted:

```ts
it("accepts accounts without credit limit for backward compatibility", () => {
  const parsed = accountSchema.parse({
    id: "acct-bank",
    name: "Bank",
    type: "bank",
    initialBalance: 1000,
    currency: "THB",
    includeInNetWorth: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  expect(parsed.creditLimit).toBeUndefined();
});

it("accepts optional nonnegative credit limit", () => {
  const parsed = accountSchema.parse({
    id: "acct-spaylater",
    name: "SPayLater",
    type: "debt",
    initialBalance: -8000,
    creditLimit: 20000,
    currency: "THB",
    includeInNetWorth: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  expect(parsed.creditLimit).toBe(20000);
});

it("rejects negative credit limit", () => {
  expect(() =>
    accountSchema.parse({
      id: "acct-spaylater",
      name: "SPayLater",
      type: "debt",
      initialBalance: -8000,
      creditLimit: -1,
      currency: "THB",
      includeInNetWorth: true,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }),
  ).toThrow();
});
```

**Step 2: Run test to verify failure**

Run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/schemas.test.ts
```

Expected: tests fail because `creditLimit` is not in schema/type yet.

**Step 3: Update types**

In `src/domain/types.ts`, update `Account`:

```ts
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  creditLimit?: number;
  currency: string;
  color?: string;
  includeInNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Step 4: Update schema**

In `src/domain/schemas.ts`, update `accountSchema`:

```ts
creditLimit: z.coerce.number().nonnegative().optional(),
```

Place after `initialBalance`.

**Step 5: Run test to verify pass**

Run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/schemas.test.ts
```

Expected: PASS.

---

### Task 2: Add credit utilization calculation helpers

**Objective:** Centralize derived values for used credit, available credit, and utilization.

**Files:**
- Modify: `src/domain/calculations.ts`
- Test: `src/domain/calculations.test.ts`

**Step 1: Add failing tests**

Add:

```ts
import { calculateCreditUsage } from "./calculations";

it("derives credit usage from a negative account balance", () => {
  expect(calculateCreditUsage(-8000, 20000)).toEqual({
    usedCredit: 8000,
    availableCredit: 12000,
    utilization: 40,
    isOverLimit: false,
  });
});

it("marks accounts as over limit when used credit exceeds limit", () => {
  expect(calculateCreditUsage(-22000, 20000)).toEqual({
    usedCredit: 22000,
    availableCredit: -2000,
    utilization: 110,
    isOverLimit: true,
  });
});

it("returns zero utilization when no limit is set", () => {
  expect(calculateCreditUsage(-8000, undefined)).toEqual({
    usedCredit: 8000,
    availableCredit: undefined,
    utilization: undefined,
    isOverLimit: false,
  });
});
```

**Step 2: Run failing test**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/calculations.test.ts
```

Expected: FAIL because helper does not exist.

**Step 3: Implement helper**

Add to `src/domain/calculations.ts`:

```ts
export interface CreditUsage {
  usedCredit: number;
  availableCredit?: number;
  utilization?: number;
  isOverLimit: boolean;
}

export function calculateCreditUsage(balance: number, creditLimit?: number): CreditUsage {
  const usedCredit = Math.max(0, -balance);
  if (creditLimit === undefined || creditLimit <= 0) {
    return {
      usedCredit,
      availableCredit: undefined,
      utilization: undefined,
      isOverLimit: false,
    };
  }

  const availableCredit = creditLimit - usedCredit;
  return {
    usedCredit,
    availableCredit,
    utilization: (usedCredit / creditLimit) * 100,
    isOverLimit: availableCredit < 0,
  };
}
```

**Step 4: Run tests**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/calculations.test.ts
```

Expected: PASS.

---

### Task 3: Extend account form with contextual credit limit field

**Objective:** Allow users to enter credit limit for credit/debt accounts only.

**Files:**
- Modify: `src/components/AccountForm.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/th.json`

**Step 1: Update form values**

Add `creditLimit?: number` to `AccountFormValues`.

```ts
creditLimit?: number;
```

**Step 2: Update validation schema**

Add:

```ts
creditLimit: z.coerce.number().nonnegative().optional().or(z.literal("")),
```

Then normalize before save so empty string becomes `undefined`.

Recommended implementation in `onSubmit`:

```ts
const payload = {
  ...values,
  creditLimit:
    values.type === "credit_card" || values.type === "debt"
      ? values.creditLimit || undefined
      : undefined,
};
```

**Step 3: Add default value**

```ts
creditLimit: account?.creditLimit,
```

**Step 4: Show field only for credit/debt**

```ts
const isCreditAccount = selectedType === "credit_card" || selectedType === "debt";
```

Render:

```tsx
{isCreditAccount ? (
  <Field
    label={t("accounts.formCreditLimit")}
    htmlFor="credit-limit"
    hint={t("accounts.formCreditLimitHint")}
    error={form.formState.errors.creditLimit?.message}
  >
    <Input
      id="credit-limit"
      step="0.01"
      type="number"
      {...form.register("creditLimit")}
    />
  </Field>
) : null}
```

If `Field` does not support `hint`, render helper text below the input manually.

**Step 5: Add debt helper copy**

When selected type is `credit_card` or `debt`, show:

```tsx
<p className="rounded-xl border border-line bg-surface-2 p-3 text-xs leading-5 text-muted">
  {t("accounts.creditDebtExample")}
</p>
```

English:

```text
Example: SPayLater limit 20,000 and already used 8,000 → initial balance -8000, credit limit 20000.
```

Thai:

```text
ตัวอย่าง: SPayLater วงเงิน 20,000 และใช้ไปแล้ว 8,000 → ยอดเริ่มต้น -8000, วงเงิน 20000
```

**Step 6: Verify manually**

Run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
```

Expected: PASS.

---

### Task 4: Show credit usage on account cards

**Objective:** Display used/available credit on account cards for credit/debt accounts with a limit.

**Files:**
- Modify: `src/pages/AccountsPage.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/th.json`

**Step 1: Import helper**

```ts
import { calculateAccountBalance, calculateCreditUsage } from "../domain/calculations";
```

**Step 2: Add conditional display**

Inside each account card, after current balance/initial balance:

```tsx
{(account.type === "credit_card" || account.type === "debt") && account.creditLimit ? (
  <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
    ...
  </div>
) : null}
```

Use:

```ts
const credit = calculateCreditUsage(balance, account.creditLimit);
```

Display:

```text
Used: ฿8,000
Limit: ฿20,000
Available: ฿12,000
Utilization: 40%
```

**Step 3: Add progress bar**

Use existing utility styles:

```tsx
<div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
  <div
    className={cn(
      "h-full rounded-full",
      credit.isOverLimit ? "bg-danger" : "bg-primary",
    )}
    style={{ width: `${Math.min(100, credit.utilization ?? 0)}%` }}
  />
</div>
```

Import `cn` if needed.

**Step 4: Add translations**

English:

```json
"creditUsed": "Used",
"creditLimit": "Limit",
"creditAvailable": "Available",
"creditUtilization": "{{percent}}% used"
```

Thai:

```json
"creditUsed": "ใช้ไปแล้ว",
"creditLimit": "วงเงิน",
"creditAvailable": "วงเงินคงเหลือ",
"creditUtilization": "ใช้ไป {{percent}}%"
```

**Step 5: Verify**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
```

Expected: PASS.

---

### Task 5: Add backup/schema regression coverage

**Objective:** Ensure backup export/import round-trips `creditLimit`.

**Files:**
- Modify: `src/domain/backup.test.ts`

**Step 1: Add test**

```ts
it("preserves account credit limit through backup parse", () => {
  const backup = createBackup({
    transactions: [],
    categories: [],
    accounts: [
      {
        id: "acct-spaylater",
        name: "SPayLater",
        type: "debt",
        initialBalance: -8000,
        creditLimit: 20000,
        currency: "THB",
        includeInNetWorth: true,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    budgets: [],
    recurringTransactions: [],
    settings: DEFAULT_SETTINGS,
  });

  const parsed = parseBackupData(JSON.stringify(backup));
  expect(parsed.accounts[0]?.creditLimit).toBe(20000);
});
```

**Step 2: Run test**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npx vitest run src/domain/backup.test.ts
```

Expected: PASS.

---

### Task 6: Update guided help content for credit/debt accounts

**Objective:** Teach users how to enter SPayLater/credit card/loan scenarios.

**Files:**
- Modify existing guide/help files if Guided Help has already been implemented.
- Otherwise create later when implementing Guided Help:
  - `src/domain/guides.ts` or `src/content/guides.ts`
  - `src/locales/en.json`
  - `src/locales/th.json`

**Required use cases:**

1. SPayLater / BNPL:

```text
Limit: 20,000
Used: 8,000
Account type: Debt
Initial balance: -8000
Credit limit: 20000
Repayment: Transfer from bank to SPayLater
New purchase: Expense on SPayLater
```

2. Credit card:

```text
Outstanding statement: 12,000
Account type: Credit card
Initial balance: -12000
Credit limit: 50000
Card payment: Transfer from bank to credit card
```

3. Personal loan:

```text
Remaining principal: 80,000
Account type: Debt
Initial balance: -80000
Credit limit: optional original loan amount
Monthly payment: Transfer from bank to loan account
Interest/fees: Expense if tracked separately
```

**Acceptance:** User can understand when to use negative initial balance and when to use transfer vs expense.

---

### Task 7: Add/adjust demo data if appropriate

**Objective:** Make the credit-limit UI discoverable without forcing users to create data manually.

**Files:**
- Inspect/modify: `src/data/demo.ts`
- Test: existing repository/demo tests

**Step 1: Inspect demo accounts**

Check whether demo data already includes credit/debt accounts.

**Step 2: Add demo account only if useful**

Example:

```ts
{
  id: "acct-spaylater",
  name: "SPayLater",
  type: "debt",
  initialBalance: -8000,
  creditLimit: 20000,
  currency: "THB",
  includeInNetWorth: true,
  ...
}
```

**Step 3: Verify demo tests**

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm test
```

Expected: PASS.

---

### Task 8: Final verification

**Objective:** Prove the feature is safe and does not break the app.

Run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
PATH=/home/freshy/.hermes/node/bin:$PATH npm run lint
PATH=/home/freshy/.hermes/node/bin:$PATH npm test
PATH=/home/freshy/.hermes/node/bin:$PATH npm run build
```

Expected:
- Typecheck passes.
- Lint has no new errors. Existing Fast Refresh warnings may remain if unrelated.
- Tests pass.
- Build passes; existing Vite large chunk warning may remain if unrelated.

Manual QA:

1. Add SPayLater account:
   - Type: Debt
   - Initial balance: `-8000`
   - Credit limit: `20000`
   - Expected card shows used `8000`, available `12000`, utilization `40%`.

2. Add expense from SPayLater:
   - Amount `1000`
   - Expected used becomes `9000`, available `11000`.

3. Transfer repayment from bank to SPayLater:
   - Amount `2000`
   - Expected used becomes `7000`, available `13000`.

4. Export JSON backup and inspect account:
   - `creditLimit` is present.

5. Import old backup without `creditLimit`:
   - It succeeds.

---

## Suggested Commit Sequence

1. `feat(accounts): add optional credit limit metadata`
2. `feat(accounts): calculate credit usage metrics`
3. `feat(accounts): add credit limit fields to account form`
4. `feat(accounts): show credit usage on account cards`
5. `test(accounts): cover credit limit backup compatibility`
6. `docs(accounts): add credit and debt use cases to guides`

---

## Out of Scope for MVP

- Per-statement credit card billing cycles.
- Minimum payment due dates.
- Interest calculation.
- Installment schedules.
- Automatic debt amortization.
- Separate credit utilization reports across all cards.
- Persisting `usedAmount` separately from transactions/current balance.

These can be future features after the core model is correct.
