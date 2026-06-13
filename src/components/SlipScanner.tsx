import { ScanLine, X, ZoomIn } from "lucide-react"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { createWorker, PSM } from "tesseract.js"

import type { Account, Category } from "../domain/types"
import { matchSlip } from "../lib/ocr/match"
import { parseSlipText, type SlipData } from "../lib/ocr/parse"
import { preprocessSlip } from "../lib/ocr/preprocess"
import { validateSlipFile } from "../lib/ocr/validate"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

type ScanStatus =
  | { status: "idle" }
  | { status: "processing"; progress: number; message: string }
  | {
      status: "done"
      slip: SlipData
      type?: "transfer"
      categoryId?: string
      accountId?: string
      fromAccountId?: string
      toAccountId?: string
      preview: string
    }
  | { status: "error"; message: string }

export interface SlipFillData {
  amount?: number
  date?: string
  time?: string
  type?: "transfer"
  categoryId?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  refNumber?: string
}

interface SlipScannerProps {
  categories: Category[]
  accounts: Account[]
  autoOpenFilePicker?: boolean
  onFill: (data: SlipFillData) => void
  onClose: () => void
}

export function SlipScanner({
  categories,
  accounts,
  autoOpenFilePicker = false,
  onFill,
  onClose,
}: SlipScannerProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<ScanStatus>({ status: "idle" })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoOpenedRef = useRef(false)

  useLayoutEffect(() => {
    if (!autoOpenFilePicker || autoOpenedRef.current || state.status !== "idle") {
      return
    }

    autoOpenedRef.current = true
    fileInputRef.current?.click()
  }, [autoOpenFilePicker, state.status])

  const processFile = useCallback(
    async (file: File) => {
      const validationError = await validateSlipFile(file)
      if (validationError) {
        setState({ status: "error", message: t(`slip.${validationError}`) })
        return
      }

      const previewUrl = URL.createObjectURL(file)

      setState({
        status: "processing",
        progress: 0,
        message: t("slip.preparing"),
      })

      try {
        const preprocessed = await preprocessSlip(file)

        const worker = await createWorker("tha+eng", 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") {
              setState({
                status: "processing",
                progress: 0.35 + m.progress * 0.6,
                message: t("slip.recognizing"),
              })
            } else if (
              m.status.includes("load") ||
              m.status.includes("initializ")
            ) {
              setState({
                status: "processing",
                progress: m.progress * 0.35,
                message: t("slip.loadingModel"),
              })
            }
          },
        })

        // PSM.SPARSE_TEXT: find text of any size anywhere without assuming
        // page structure — needed for slips like mymo GSB where the amount
        // is in a very large font that AUTO mode skips as a non-text element.
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })

        const { data } = await worker.recognize(
          preprocessed,
          {},
          { hocr: true },
        )
        await worker.terminate()

        const text = data.text ?? ""
        const hocr = data.hocr ?? undefined

const slip = parseSlipText(text, hocr)
        const match = matchSlip(slip, categories, accounts)

        setState({
          status: "done",
          slip,
          type: match.type,
          categoryId: match.categoryId,
          accountId: match.accountId,
          fromAccountId: match.fromAccountId,
          toAccountId: match.toAccountId,
          preview: previewUrl,
        })
      } catch (err) {
        URL.revokeObjectURL(previewUrl)
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      }
    },
    [categories, accounts, t],
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleApply() {
    if (state.status !== "done") return
    onFill({
      amount: state.slip.amount,
      date: state.slip.date,
      time: state.slip.time,
      type: state.type,
      categoryId: state.categoryId,
      accountId: state.accountId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      refNumber: state.slip.refNumber,
    })
    onClose()
  }

  function handleRescan() {
    if (state.status === "done") URL.revokeObjectURL(state.preview)
    setState({ status: "idle" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className='rounded-xl border border-line bg-surface-2 p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ScanLine className='h-4 w-4 text-primary' />
          <span className='text-xs font-semibold text-ink'>
            {t("slip.title")}
          </span>
        </div>
        <button
          type='button'
          aria-label={t("common.cancel")}
          className='rounded p-0.5 text-muted hover:text-ink'
          onClick={onClose}
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      <input
        ref={fileInputRef}
        accept='image/*'
        className='sr-only'
        type='file'
        onChange={handleFileChange}
      />

      {state.status === "idle" && (
        <button
          type='button'
          className='flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-8 transition-colors hover:border-primary/50 hover:bg-primary/5'
          onClick={() => fileInputRef.current?.click()}
        >
          <ScanLine className='h-8 w-8 text-muted' />
          <p className='text-sm font-medium text-ink'>
            {t("slip.uploadPrompt")}
          </p>
          <p className='text-xs text-muted'>{t("slip.uploadHint")}</p>
        </button>
      )}

      {state.status === "processing" && (
        <div className='flex flex-col items-center gap-3 py-6'>
          <div className='h-1.5 w-full overflow-hidden rounded-full bg-line'>
            <div
              className='h-full rounded-full bg-primary transition-all duration-300'
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <p className='text-xs text-muted'>{state.message}</p>
        </div>
      )}

      {state.status === "done" && (
        <div className='flex flex-col gap-3'>
          <div className='flex gap-3'>
            <button
              aria-label={t("slip.viewFull")}
              className='group relative h-24 w-20 shrink-0'
              type='button'
              onClick={() => setLightboxOpen(true)}
            >
              <img
                alt={t("slip.preview")}
                className='h-full w-full rounded-lg border border-line object-cover'
                src={state.preview}
              />
              <span className='absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/30'>
                <ZoomIn className='h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100' />
              </span>
            </button>
            <div className='flex min-w-0 flex-col justify-center gap-1.5'>
              <SlipField
                confidence={state.slip.confidence?.amount ?? "low"}
                label={t("slip.amount")}
                value={state.slip.amount?.toLocaleString()}
              />
              <SlipField
                confidence={state.slip.confidence?.date ?? "low"}
                label={t("slip.date")}
                value={state.slip.date}
              />
              <SlipField
                confidence={state.slip.confidence?.time ?? "low"}
                label={t("slip.time")}
                value={state.slip.time}
              />
              {state.type === "transfer" ? (
                <>
                  <SlipField
                    confidence='medium'
                    label={t("slip.fromAccount")}
                    value={
                      accounts.find(a => a.id === state.fromAccountId)?.name
                    }
                  />
                  <SlipField
                    confidence='medium'
                    label={t("slip.toAccount")}
                    value={accounts.find(a => a.id === state.toAccountId)?.name}
                  />
                </>
              ) : (
                <>
                  <SlipField
                    confidence='medium'
                    label={t("slip.account")}
                    value={accounts.find(a => a.id === state.accountId)?.name}
                  />
                  <SlipField
                    confidence='low'
                    label={t("slip.category")}
                    value={
                      categories.find(c => c.id === state.categoryId)?.name
                    }
                  />
                </>
              )}
            </div>
          </div>

          <p className='text-[11px] text-muted'>{t("slip.reviewHint")}</p>

          <div className='flex gap-2'>
            <Button
              size='sm'
              type='button'
              variant='primary'
              onClick={handleApply}
            >
              {t("slip.apply")}
            </Button>
            <Button
              size='sm'
              type='button'
              variant='ghost'
              onClick={handleRescan}
            >
              {t("slip.rescan")}
            </Button>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className='flex flex-col items-center gap-2 py-6 text-center'>
          <p className='text-sm font-medium text-danger'>{t("slip.error")}</p>
          <p className='text-xs text-muted'>{state.message}</p>
          <Button
            size='sm'
            type='button'
            variant='ghost'
            onClick={handleRescan}
          >
            {t("slip.retry")}
          </Button>
        </div>
      )}

      {lightboxOpen && state.status === "done" && createPortal(
        <div
          aria-label={t("slip.viewFull")}
          aria-modal='true'
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4'
          role='dialog'
          style={{ pointerEvents: "auto" }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            aria-label={t("common.cancel")}
            className='absolute right-4 top-4 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70'
            type='button'
            onClick={() => setLightboxOpen(false)}
          >
            <X className='h-5 w-5' />
          </button>
          <img
            alt={t("slip.preview")}
            className='max-h-full max-w-full rounded-lg object-contain shadow-2xl'
            src={state.preview}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}

function SlipField({
  label,
  value,
  confidence,
}: {
  label: string
  value?: string
  confidence: "high" | "medium" | "low"
}) {
  const { t } = useTranslation()

  const dotClass = {
    high: "bg-primary",
    medium: "bg-warning",
    low: "bg-danger",
  }[confidence]

  return (
    <div className='flex items-center gap-2 text-xs'>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
      <span className='shrink-0 text-muted'>{label}:</span>
      <span
        className={cn(
          "truncate font-medium",
          value ? "text-ink" : "text-muted/60",
        )}
      >
        {value ?? t("slip.notFound")}
      </span>
    </div>
  )
}
