import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { Account } from "../domain/types";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";
import { CATEGORY_SWATCHES } from "./CategoryManager";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type AccountFormValues = {
  name: string;
  type: "cash" | "bank" | "credit_card" | "e_wallet" | "savings" | "investment" | "debt";
  initialBalance: number;
  currency: string;
  color?: string;
  includeInNetWorth: boolean;
};

interface AccountFormProps {
  account?: Account;
  onSaved: () => void;
}

export function AccountForm({ account, onSaved }: AccountFormProps) {
  const { t } = useTranslation();
  const addAccount = useFinanceStore((state) => state.addAccount);
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const loading = useFinanceStore((state) => state.loading);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("accounts.formNameError")),
        type: z.enum(["cash", "bank", "credit_card", "e_wallet", "savings", "investment", "debt"]),
        initialBalance: z.coerce.number(),
        currency: z.string().trim().min(1),
        color: z.string().optional(),
        includeInNetWorth: z.boolean(),
      }),
    [t],
  );

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      initialBalance: account?.initialBalance ?? 0,
      currency: account?.currency ?? "THB",
      color: account?.color ?? CATEGORY_SWATCHES[0],
      includeInNetWorth: account?.includeInNetWorth ?? true,
    },
  });

  const selectedType = form.watch("type");
  const selectedColor = form.watch("color") ?? CATEGORY_SWATCHES[0];

  async function onSubmit(values: AccountFormValues) {
    if (account) {
      await updateAccount(account.id, values);
    } else {
      await addAccount(values);
    }
    onSaved();
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <Field
        label={t("accounts.formName")}
        htmlFor="account-name"
        error={form.formState.errors.name?.message}
      >
        <Input id="account-name" {...form.register("name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("accounts.formType")} htmlFor="account-type">
          <Select
            onValueChange={(value) =>
              form.setValue("type", value as AccountFormValues["type"], { shouldValidate: true })
            }
            value={selectedType}
          >
            <SelectTrigger id="account-type">
              <SelectValue placeholder={t("accounts.formSelectType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t("accounts.typeCash")}</SelectItem>
              <SelectItem value="bank">{t("accounts.typeBank")}</SelectItem>
              <SelectItem value="credit_card">{t("accounts.typeCreditCard")}</SelectItem>
              <SelectItem value="e_wallet">{t("accounts.typeEWallet")}</SelectItem>
              <SelectItem value="savings">{t("accounts.typeSavings")}</SelectItem>
              <SelectItem value="investment">{t("accounts.typeInvestment")}</SelectItem>
              <SelectItem value="debt">{t("accounts.typeDebt")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("accounts.formInitialBalance")}
          htmlFor="initial-balance"
          error={form.formState.errors.initialBalance?.message}
        >
          <Input
            id="initial-balance"
            step="0.01"
            type="number"
            {...form.register("initialBalance")}
          />
        </Field>
      </div>

      <Field label={t("accounts.formCurrency")} htmlFor="account-currency">
        <Input id="account-currency" maxLength={3} {...form.register("currency")} />
      </Field>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">{t("accounts.formColor")}</p>
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
                  isSelected
                    ? "scale-110 ring-2 ring-offset-1 ring-ink/40"
                    : "hover:scale-110",
                )}
                onClick={() => form.setValue("color", swatch)}
                style={{ background: swatch }}
                type="button"
              >
                {isSelected && (
                  <Check aria-hidden className="h-3 w-3 text-white drop-shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          className="rounded border-line text-primary"
          type="checkbox"
          {...form.register("includeInNetWorth")}
        />
        {t("accounts.formIncludeNetWorth")}
      </label>

      <div className="flex justify-end">
        <Button disabled={loading} type="submit" variant="primary">
          {account ? t("accounts.formSave") : t("accounts.formAdd")}
        </Button>
      </div>
    </form>
  );
}
