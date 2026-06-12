import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { SavingsGoal } from "../domain/types";
import { useFinanceStore } from "../store/finance-store";
import { CATEGORY_SWATCHES } from "./CategoryManager";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Field, Input } from "./ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "../lib/utils";

type FormValues = {
  name: string;
  targetAmount: number;
  linkedAccountId?: string;
  deadline?: string;
  color?: string;
  note?: string;
};

interface GoalFormProps {
  goal?: SavingsGoal;
  onSaved: () => void;
}

export function GoalForm({ goal, onSaved }: GoalFormProps) {
  const { t } = useTranslation();
  const accounts = useFinanceStore((state) => state.accounts);
  const settings = useFinanceStore((state) => state.settings);
  const addGoal = useFinanceStore((state) => state.addGoal);
  const updateGoal = useFinanceStore((state) => state.updateGoal);
  const loading = useFinanceStore((state) => state.loading);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("goals.goalName")),
        targetAmount: z.coerce.number().positive(t("form.amountError")),
        linkedAccountId: z.string().optional(),
        deadline: z.string().optional(),
        color: z.string().optional(),
        note: z.string().optional(),
      }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal?.targetAmount ?? 0,
      linkedAccountId: goal?.linkedAccountId ?? "",
      deadline: goal?.deadline ?? "",
      color: goal?.color ?? CATEGORY_SWATCHES[3],
      note: goal?.note ?? "",
    },
  });

  const selectedColor = form.watch("color") ?? CATEGORY_SWATCHES[3];
  const selectedLinkedAccount = form.watch("linkedAccountId");
  const selectedDeadline = form.watch("deadline");

  async function onSubmit(values: FormValues) {
    const draft = {
      name: values.name,
      targetAmount: values.targetAmount,
      savedAmount: goal?.savedAmount ?? 0,
      linkedAccountId: values.linkedAccountId || undefined,
      currency: settings.currency,
      deadline: values.deadline || undefined,
      color: values.color,
      note: values.note || undefined,
      isArchived: goal?.isArchived ?? false,
    };

    if (goal) {
      await updateGoal(goal.id, draft);
    } else {
      await addGoal(draft);
    }
    onSaved();
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <Field
        label={t("goals.goalName")}
        htmlFor="g-name"
        error={form.formState.errors.name?.message}
      >
        <Input
          id="g-name"
          placeholder={t("goals.goalNamePlaceholder")}
          {...form.register("name")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("goals.targetAmount")}
          htmlFor="g-target"
          error={form.formState.errors.targetAmount?.message}
        >
          <Input id="g-target" min="0" step="0.01" type="number" {...form.register("targetAmount")} />
        </Field>

        <Field
          label={t("goals.deadline")}
          htmlFor="g-deadline"
          hint={t("goals.deadlineHint")}
        >
          <DatePicker
            ariaLabel={t("goals.deadline")}
            id="g-deadline"
            onChange={(v) => form.setValue("deadline", v)}
            value={selectedDeadline}
          />
        </Field>
      </div>

      <Field
        label={t("goals.linkedAccount")}
        htmlFor="g-account"
        hint={t("goals.linkedAccountHint")}
      >
        <Select
          onValueChange={(v) => form.setValue("linkedAccountId", v === "__none__" ? "" : v)}
          value={selectedLinkedAccount || "__none__"}
        >
          <SelectTrigger id="g-account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted">{t("goals.noLinkedAccount")}</span>
            </SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("goals.note")} htmlFor="g-note">
        <Input id="g-note" placeholder="Optional" {...form.register("note")} />
      </Field>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">{t("goals.color")}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_SWATCHES.map((swatch) => {
            const isSelected = selectedColor === swatch;
            return (
              <button
                key={swatch}
                aria-label={t("category.selectColor")}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center rounded-full transition-transform",
                  isSelected ? "scale-110 ring-2 ring-offset-1 ring-ink/40" : "hover:scale-110",
                )}
                onClick={() => form.setValue("color", swatch)}
                style={{ background: swatch }}
                type="button"
              >
                {isSelected && <Check aria-hidden className="h-3 w-3 text-white drop-shadow-sm" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={loading} type="submit" variant="primary">
          {goal ? t("goals.formSave") : t("goals.formAdd")}
        </Button>
      </div>
    </form>
  );
}
