import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { Category } from "../domain/types"
import { cn } from "../lib/utils"
import { useFinanceStore } from "../store/finance-store"
import { Badge } from "./ui/badge"
import { Tooltip } from "./ui/tooltip"
import { Button } from "./ui/button"
import { Field, Input } from "./ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

export const CATEGORY_SWATCHES = [
  "oklch(0.56 0.16 145)",
  "oklch(0.58 0.14 110)",
  "oklch(0.60 0.13 75)",
  "oklch(0.60 0.13 55)",
  "oklch(0.57 0.16 30)",
  "oklch(0.56 0.18 15)",
  "oklch(0.56 0.18 350)",
  "oklch(0.56 0.17 330)",
  "oklch(0.55 0.16 305)",
  "oklch(0.53 0.17 280)",
  "oklch(0.52 0.15 255)",
  "oklch(0.57 0.13 200)",
]

export function CategoryManager() {
  const { t } = useTranslation()
  const categories = useFinanceStore(state => state.categories)
  const addCategory = useFinanceStore(state => state.addCategory)
  const updateCategory = useFinanceStore(state => state.updateCategory)
  const deleteCategory = useFinanceStore(state => state.deleteCategory)
  const [name, setName] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [color, setColor] = useState(CATEGORY_SWATCHES[0])
  const [editing, setEditing] = useState<Category | null>(null)
  const [pages, setPages] = useState<Record<string, number>>({
    expense: 0,
    income: 0,
  })
  const PAGE_SIZE = 5

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return

    if (editing) {
      await updateCategory(editing.id, { ...editing, name: trimmed, color })
      setEditing(null)
    } else {
      await addCategory({
        name: trimmed,
        type,
        icon: "circle-dot",
        color,
        isActive: true,
      })
    }
    setName("")
    setColor(CATEGORY_SWATCHES[0])
  }

  function startEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setType(category.type)
    setColor(category.color ?? CATEGORY_SWATCHES[0])
  }

  function cancelEdit() {
    setEditing(null)
    setName("")
    setColor(CATEGORY_SWATCHES[0])
  }

  return (
    <div className='space-y-5'>
      {/* Add / edit form */}
      <div className='space-y-3 rounded-xl border border-line bg-surface p-4'>
        <div className='grid gap-3 sm:grid-cols-[1fr_140px_auto]'>
          <Field
            label={
              editing ? t("category.editCategory") : t("category.newCategory")
            }
            htmlFor='category-name'
          >
            <Input
              id='category-name'
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void submit()}
              placeholder={t("category.namePlaceholder")}
              value={name}
            />
          </Field>
          <Field label={t("category.type")} htmlFor='category-type'>
            <Select
              disabled={Boolean(editing)}
              onValueChange={v => setType(v as "income" | "expense")}
              value={type}
            >
              <SelectTrigger id='category-type'>
                <SelectValue placeholder={t("category.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='expense'>{t("category.expense")}</SelectItem>
                <SelectItem value='income'>{t("category.income")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className='flex items-end gap-2'>
            <Button
              onClick={() => void submit()}
              type='button'
              variant='primary'
            >
              <Plus aria-hidden className='h-4 w-4' />
              {editing ? t("common.save") : t("common.add")}
            </Button>
            {editing ? (
              <Button onClick={cancelEdit} type='button' variant='ghost'>
                {t("common.cancel")}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Color swatch row */}
        <div>
          <p className='mb-2 text-xs font-medium text-muted'>
            {t("category.color")}
          </p>
          <div className='flex flex-wrap gap-2'>
            {CATEGORY_SWATCHES.map(swatch => {
              const isSelected = color === swatch
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
                  onClick={() => setColor(swatch)}
                  style={{ background: swatch }}
                  type='button'
                >
                  {isSelected && (
                    <Check
                      aria-hidden
                      className='h-3 w-3 text-white drop-shadow-sm'
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Category lists */}
      <div className='grid gap-3 md:grid-cols-2'>
        {(["expense", "income"] as const).map(categoryType => {
          const all = categories.filter(c => c.type === categoryType)
          const page = pages[categoryType]
          const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
          const slice = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

          return (
            <div className='panel p-4' key={categoryType}>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold capitalize text-ink'>
                  {categoryType === "expense"
                    ? t("category.expense")
                    : t("category.income")}
                  <span className='ml-1.5 text-xs font-normal text-muted'>
                    ({all.length})
                  </span>
                </h3>
                {totalPages > 1 && (
                  <div className='flex items-center gap-1'>
                    <button
                      className='rounded p-0.5 text-muted hover:text-ink disabled:opacity-30'
                      disabled={page === 0}
                      type='button'
                      onClick={() =>
                        setPages(p => ({
                          ...p,
                          [categoryType]: p[categoryType] - 1,
                        }))
                      }
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </button>
                    <span className='min-w-[3rem] text-center text-xs text-muted'>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      className='rounded p-0.5 text-muted hover:text-ink disabled:opacity-30'
                      disabled={page >= totalPages - 1}
                      type='button'
                      onClick={() =>
                        setPages(p => ({
                          ...p,
                          [categoryType]: p[categoryType] + 1,
                        }))
                      }
                    >
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                )}
              </div>
              <div className='mt-3 divide-y divide-line'>
                {slice.map(category => (
                  <div
                    className='flex items-center justify-between gap-3 py-2'
                    key={category.id}
                  >
                    <div className='flex min-w-0 items-center gap-2.5'>
                      <span
                        className='h-3 w-3 shrink-0 rounded-full'
                        style={{
                          background: category.color ?? "oklch(var(--muted))",
                        }}
                      />
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-ink'>
                          {category.name}
                        </p>
                        <div className='mt-0.5 flex gap-2'>
                          {category.isDefault ? (
                            <Badge>{t("category.default")}</Badge>
                          ) : null}
                          {!category.isActive ? (
                            <Badge tone='warning'>
                              {t("category.disabled")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className='flex shrink-0 gap-1'>
                      <Tooltip label={t("common.edit")}>
                        <Button
                          aria-label={`${t("common.edit")} ${category.name}`}
                          onClick={() => startEdit(category)}
                          size='icon'
                          type='button'
                          variant='ghost'
                        >
                          <Pencil aria-hidden className='h-4 w-4' />
                        </Button>
                      </Tooltip>
                      <Tooltip label={t("common.delete")}>
                        <Button
                          aria-label={`${t("common.delete")} ${category.name}`}
                          onClick={() => void deleteCategory(category.id)}
                          size='icon'
                          type='button'
                          variant='ghost'
                        >
                          <Trash2 aria-hidden className='h-4 w-4' />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
