import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useShallow } from "zustand/react/shallow";

import type { Budget } from "../domain/types";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type BudgetFormValues = {
  totalBudget?: number;
  rollover: boolean;
  categoryBudgets: Array<{ categoryId: string; amount: number }>;
};

interface BudgetEditorProps {
  month: string;
  budget?: Budget;
}

export function BudgetEditor({ month, budget }: BudgetEditorProps) {
  const { t } = useTranslation();
  const categories = useFinanceStore(
    useShallow((state) =>
      state.categories.filter(
        (category) => category.type === "expense" && category.isActive,
      ),
    ),
  );
  const upsertBudget = useFinanceStore((state) => state.upsertBudget);
  const loading = useFinanceStore((state) => state.loading);
  const [addSelectValue, setAddSelectValue] = useState("");

  const budgetFormSchema = useMemo(
    () =>
      z.object({
        totalBudget: z.coerce
          .number()
          .nonnegative(t("budgetForm.budgetError"))
          .optional(),
        rollover: z.boolean(),
        categoryBudgets: z.array(
          z.object({
            categoryId: z.string().min(1),
            amount: z.coerce.number().nonnegative(t("budgetForm.budgetError")),
          }),
        ),
      }),
    [t],
  );

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: createDefaults(budget),
  });
  const fieldArray = useFieldArray({ control: form.control, name: "categoryBudgets" });

  useEffect(() => {
    form.reset(createDefaults(budget));
  }, [budget, form, month]);

  const usedCategoryIds = new Set(fieldArray.fields.map((f) => f.categoryId));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  function addCategory(categoryId: string) {
    if (!categoryId) return;
    fieldArray.append({ categoryId, amount: 0 });
    setAddSelectValue("");
  }

  async function onSubmit(values: BudgetFormValues) {
    await upsertBudget({
      month,
      totalBudget: values.totalBudget,
      rollover: values.rollover,
      categoryBudgets: values.categoryBudgets.filter((item) => item.amount > 0),
    });
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      {/* Overall budget / rollover */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("budgetForm.overallBudget")}
          htmlFor="total-budget"
          error={form.formState.errors.totalBudget?.message}
        >
          <Input
            id="total-budget"
            min="0"
            step="1"
            type="number"
            {...form.register("totalBudget")}
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-ink">
          <input
            className="rounded border-line text-primary"
            type="checkbox"
            {...form.register("rollover")}
          />
          {t("budgetForm.rollover")}
        </label>
      </div>

      {/* Category budgets */}
      <div className="space-y-2">
        {fieldArray.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
            {t("budgetForm.noCategoryBudgets")}
          </p>
        ) : (
          <div className="divide-y divide-line rounded-xl border border-line">
            {fieldArray.fields.map((field, index) => {
              const category = categories.find((c) => c.id === field.categoryId);
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {/* Color dot + name */}
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: category?.color ?? "oklch(var(--muted))" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {category?.name ?? t("common.category")}
                  </span>

                  {/* Amount input */}
                  <input
                    type="hidden"
                    {...form.register(`categoryBudgets.${index}.categoryId`)}
                  />
                  <div className="w-32 shrink-0">
                    <Input
                      aria-label={category?.name ?? t("common.category")}
                      className={cn(
                        form.formState.errors.categoryBudgets?.[index]?.amount &&
                          "border-danger",
                      )}
                      min="0"
                      step="1"
                      type="number"
                      {...form.register(`categoryBudgets.${index}.amount`)}
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    aria-label={t("budgetForm.removeCategory")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    onClick={() => fieldArray.remove(index)}
                    type="button"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add category select */}
        {availableCategories.length > 0 && (
          <Select onValueChange={addCategory} value={addSelectValue}>
            <SelectTrigger className="text-muted">
              <SelectValue placeholder={`+ ${t("budgetForm.addCategoryBudget")}`} />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: category.color ?? "oklch(var(--muted))" }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          disabled={!form.formState.isDirty}
          onClick={() => form.reset()}
          type="button"
          variant="ghost"
        >
          {t("common.cancel")}
        </Button>
        <Button
          disabled={loading || !form.formState.isDirty}
          type="submit"
          variant="primary"
        >
          {t("budgetForm.saveBudget")}
        </Button>
      </div>
    </form>
  );
}

function createDefaults(budget: Budget | undefined): BudgetFormValues {
  return {
    totalBudget: budget?.totalBudget ?? 0,
    rollover: budget?.rollover ?? false,
    categoryBudgets:
      budget?.categoryBudgets.filter((item) => item.amount > 0).map((item) => ({
        categoryId: item.categoryId,
        amount: item.amount,
      })) ?? [],
  };
}
