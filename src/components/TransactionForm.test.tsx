import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFinanceData, clearAllData } from "../storage/repository";
import { useFinanceStore } from "../store/finance-store";
import { TransactionForm } from "./TransactionForm";

describe("TransactionForm", () => {
  beforeEach(async () => {
    await clearAllData();
    const data = await getFinanceData();
    useFinanceStore.setState({ ...data, initialized: true, loading: false, error: null });
  });

  it("shows validation errors for an incomplete expense", async () => {
    render(<TransactionForm onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    expect(await screen.findByText("Amount must be greater than 0")).toBeInTheDocument();
    expect(await screen.findByText("Choose a category")).toBeInTheDocument();
    expect(await screen.findByText("Choose an account")).toBeInTheDocument();
  });

  it("adds a valid transaction", async () => {
    const onSaved = vi.fn();
    render(<TransactionForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1200" } });
    await chooseOption("Category", "Food");
    await chooseOption("Account", "Cash");
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Lunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(useFinanceStore.getState().transactions[0]?.note).toBe("Lunch");
  });
});

async function chooseOption(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}
