import { describe, expect, it } from "vitest";

import { findDuplicate } from "./duplicate";
import type { Transaction, TransactionDraft } from "./types";

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    type: "expense",
    amount: 100,
    date: "2026-06-11",
    time: "18:35",
    accountId: "acct-main",
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...over,
  };
}

function draft(over: Partial<TransactionDraft>): TransactionDraft {
  return {
    type: "expense",
    amount: 100,
    date: "2026-06-11",
    time: "18:35",
    accountId: "acct-main",
    ...over,
  };
}

describe("findDuplicate", () => {
  it("matches an identical expense", () => {
    const existing = [tx({})];
    expect(findDuplicate(draft({}), existing)?.id).toBe("t1");
  });

  it("ignores amounts that differ by more than a cent", () => {
    const existing = [tx({ amount: 100 })];
    expect(findDuplicate(draft({ amount: 100.5 }), existing)).toBeUndefined();
  });

  it("treats sub-cent amount differences as the same", () => {
    const existing = [tx({ amount: 100 })];
    expect(findDuplicate(draft({ amount: 100.004 }), existing)?.id).toBe("t1");
  });

  it("does not match a different date", () => {
    const existing = [tx({ date: "2026-06-12" })];
    expect(findDuplicate(draft({ date: "2026-06-11" }), existing)).toBeUndefined();
  });

  it("does not match a different account", () => {
    const existing = [tx({ accountId: "acct-other" })];
    expect(findDuplicate(draft({ accountId: "acct-main" }), existing)).toBeUndefined();
  });

  it("does not match a different type", () => {
    const existing = [tx({ type: "income" })];
    expect(findDuplicate(draft({ type: "expense" }), existing)).toBeUndefined();
  });

  it("keeps same-amount same-day purchases distinct when times differ beyond the window", () => {
    const existing = [tx({ time: "18:35" })];
    expect(findDuplicate(draft({ time: "20:00" }), existing)).toBeUndefined();
  });

  it("matches when times fall within the window", () => {
    const existing = [tx({ time: "18:35" })];
    expect(findDuplicate(draft({ time: "18:38" }), existing)?.id).toBe("t1");
  });

  it("falls back to amount+date+account when a time is missing", () => {
    const existing = [tx({ time: undefined })];
    expect(findDuplicate(draft({ time: "18:35" }), existing)?.id).toBe("t1");
  });

  it("matches a transfer only when both accounts match", () => {
    const transfer = tx({
      type: "transfer",
      accountId: undefined,
      fromAccountId: "a",
      toAccountId: "b",
    });
    const sameDraft = draft({
      type: "transfer",
      accountId: undefined,
      fromAccountId: "a",
      toAccountId: "b",
    });
    const swappedDraft = draft({
      type: "transfer",
      accountId: undefined,
      fromAccountId: "b",
      toAccountId: "a",
    });
    expect(findDuplicate(sameDraft, [transfer])?.id).toBe("t1");
    expect(findDuplicate(swappedDraft, [transfer])).toBeUndefined();
  });

  it("returns undefined against an empty list", () => {
    expect(findDuplicate(draft({}), [])).toBeUndefined();
  });
});
