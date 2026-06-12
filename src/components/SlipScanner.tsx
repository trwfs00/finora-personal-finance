import { ScanLine, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createWorker } from "tesseract.js";

import type { Account, Category } from "../domain/types";
import { matchSlip } from "../lib/ocr/match";
import { parseSlipText, type SlipData } from "../lib/ocr/parse";
import { preprocessSlip } from "../lib/ocr/preprocess";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

type ScanStatus =
  | { status: "idle" }
  | { status: "processing"; progress: number; message: string }
  | { status: "done"; slip: SlipData; categoryId?: string; accountId?: string; preview: string }
  | { status: "error"; message: string };

export interface SlipFillData {
  amount?: number;
  date?: string;
  time?: string;
  categoryId?: string;
  accountId?: string;
  refNumber?: string;
}

interface SlipScannerProps {
  categories: Category[];
  accounts: Account[];
  onFill: (data: SlipFillData) => void;
  onClose: () => void;
}

export function SlipScanner({ categories, accounts, onFill, onClose }: SlipScannerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ScanStatus>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);

      setState({ status: "processing", progress: 0, message: t("slip.preparing") });

      try {
        const preprocessed = await preprocessSlip(file);

        const worker = await createWorker("tha+eng", 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") {
              setState({
                status: "processing",
                progress: 0.35 + m.progress * 0.6,
                message: t("slip.recognizing"),
              });
            } else if (
              m.status.includes("load") ||
              m.status.includes("initializ")
            ) {
              setState({
                status: "processing",
                progress: m.progress * 0.35,
                message: t("slip.loadingModel"),
              });
            }
          },
        });

        const {
          data: { text },
        } = await worker.recognize(preprocessed);
        await worker.terminate();

        const slip = parseSlipText(text);
        const match = matchSlip(slip, categories, accounts);

        setState({
          status: "done",
          slip,
          categoryId: match.categoryId,
          accountId: match.accountId,
          preview: previewUrl,
        });
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [categories, accounts, t],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleApply() {
    if (state.status !== "done") return;
    onFill({
      amount: state.slip.amount,
      date: state.slip.date,
      time: state.slip.time,
      categoryId: state.categoryId,
      accountId: state.accountId,
      refNumber: state.slip.refNumber,
    });
    onClose();
  }

  function handleRescan() {
    if (state.status === "done") URL.revokeObjectURL(state.preview);
    setState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-ink">{t("slip.title")}</span>
        </div>
        <button
          type="button"
          aria-label={t("common.cancel")}
          className="rounded p-0.5 text-muted hover:text-ink"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*"
        className="sr-only"
        type="file"
        onChange={handleFileChange}
      />

      {state.status === "idle" && (
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
          onClick={() => fileInputRef.current?.click()}
        >
          <ScanLine className="h-8 w-8 text-muted" />
          <p className="text-sm font-medium text-ink">{t("slip.uploadPrompt")}</p>
          <p className="text-xs text-muted">{t("slip.uploadHint")}</p>
        </button>
      )}

      {state.status === "processing" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted">{state.message}</p>
        </div>
      )}

      {state.status === "done" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <img
              alt={t("slip.preview")}
              className="h-24 w-20 shrink-0 rounded-lg border border-line object-cover"
              src={state.preview}
            />
            <div className="flex min-w-0 flex-col justify-center gap-1.5">
              <SlipField
                confidence="high"
                label={t("slip.amount")}
                value={state.slip.amount?.toLocaleString()}
              />
              <SlipField
                confidence="high"
                label={t("slip.date")}
                value={state.slip.date}
              />
              <SlipField
                confidence="high"
                label={t("slip.time")}
                value={state.slip.time}
              />
              <SlipField
                confidence="medium"
                label={t("slip.account")}
                value={
                  state.accountId
                    ? accounts.find((a) => a.id === state.accountId)?.name
                    : undefined
                }
              />
              <SlipField
                confidence="low"
                label={t("slip.category")}
                value={
                  state.categoryId
                    ? categories.find((c) => c.id === state.categoryId)?.name
                    : undefined
                }
              />
            </div>
          </div>

          <p className="text-[11px] text-muted">{t("slip.reviewHint")}</p>

          <div className="flex gap-2">
            <Button size="sm" type="button" variant="primary" onClick={handleApply}>
              {t("slip.apply")}
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={handleRescan}>
              {t("slip.rescan")}
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-danger">{t("slip.error")}</p>
          <p className="text-xs text-muted">{state.message}</p>
          <Button size="sm" type="button" variant="ghost" onClick={handleRescan}>
            {t("slip.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}

function SlipField({
  label,
  value,
  confidence,
}: {
  label: string;
  value?: string;
  confidence: "high" | "medium" | "low";
}) {
  const { t } = useTranslation();

  const dotClass = {
    high: "bg-primary",
    medium: "bg-warning",
    low: "bg-danger",
  }[confidence];

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
      <span className="shrink-0 text-muted">{label}:</span>
      <span className={cn("truncate font-medium", value ? "text-ink" : "text-muted/60")}>
        {value ?? t("slip.notFound")}
      </span>
    </div>
  );
}
