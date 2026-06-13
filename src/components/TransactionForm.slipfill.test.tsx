import { act, fireEvent, render, screen } from "@testing-library/react"
import { createContext, createElement as h, Fragment, type ReactNode, useContext } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SlipFillData } from "./SlipScanner"

// ── Store mock: two accounts, no categories/transactions ───────────────────────
const accounts = [
  { id: "acc-mymo", name: "MyMo by GSB", type: "savings", color: "#0a0" },
  { id: "acc-make", name: "Make by KBank", type: "bank", color: "#00a" },
]
const addTransaction = vi.fn()
const state = {
  categories: [],
  accounts,
  transactions: [],
  addTransaction,
  updateTransaction: vi.fn(),
  loading: false,
}
vi.mock("../store/finance-store", () => ({
  useFinanceStore: (selector: (s: typeof state) => unknown) => selector(state),
}))

// ── SlipScanner mock: a button that fires onFill with a transfer payload ───────
const TRANSFER: SlipFillData = {
  type: "transfer",
  amount: 175,
  date: "2026-04-13",
  time: "15:47",
  fromAccountId: "acc-mymo",
  toAccountId: "acc-make",
  refNumber: "REF123",
}
vi.mock("./SlipScanner", () => ({
  SlipScanner: ({ onFill }: { onFill: (d: SlipFillData) => void }) =>
    h("button", { type: "button", onClick: () => onFill(TRANSFER) }, "mock-fill"),
}))

// ── ui/select mock: native-ish, exposes current value as data-value on the id ──
vi.mock("./ui/select", () => {
  type Kids = { children?: ReactNode }
  type SelectProps = Kids & { value?: string; onValueChange: (v: string) => void }
  const Ctx = createContext<{ value: string; onValueChange: (v: string) => void }>({
    value: "",
    onValueChange: () => {},
  })
  return {
    Select: ({ value, onValueChange, children }: SelectProps) =>
      h(Ctx.Provider, { value: { value: value ?? "", onValueChange } }, children),
    SelectTrigger: ({ id, children }: Kids & { id?: string }) => {
      const { value } = useContext(Ctx)
      return h("div", { id, "data-value": value }, children)
    },
    SelectValue: () => null,
    SelectContent: ({ children }: Kids) => h(Fragment, null, children),
    SelectItem: ({ value, children }: Kids & { value: string }) => {
      const { onValueChange } = useContext(Ctx)
      return h("button", { type: "button", onClick: () => onValueChange(value) }, children)
    },
    SelectGroup: ({ children }: Kids) => children,
    SelectLabel: ({ children }: Kids) => children,
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  }
})

// Avoid Radix popover/portal heaviness in jsdom for the date/time pickers.
vi.mock("./ui/date-picker", () => ({
  DatePicker: ({ id, value }: { id?: string; value?: string }) =>
    h("input", { id, readOnly: true, value: value ?? "" }),
}))
vi.mock("./ui/time-picker", () => ({
  TimePicker: ({ id, value }: { id?: string; value?: string }) =>
    h("input", { id, readOnly: true, value: value ?? "" }),
}))

import { TransactionForm } from "./TransactionForm"

function dataValue(id: string): string | null {
  return document.getElementById(id)?.getAttribute("data-value") ?? null
}

describe("TransactionForm slip fill — transfer", () => {
  beforeEach(() => {
    addTransaction.mockClear()
  })

  it("populates BOTH from and to accounts when filling a transfer from Expense", async () => {
    render(h(TransactionForm, { onSaved: vi.fn() }))

    // Open the (mocked) scanner, then fire the transfer fill.
    fireEvent.click(screen.getByText("Scan from slip"))
    await act(async () => {
      fireEvent.click(screen.getByText("mock-fill"))
    })

    // fromAccountId is the FIRST account set — the one reported lost.
    expect(dataValue("toAccountId")).toBe("acc-make")
    expect(dataValue("fromAccountId")).toBe("acc-mymo")
  })
})
