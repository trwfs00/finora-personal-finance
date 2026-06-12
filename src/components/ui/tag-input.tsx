import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"
import { Input } from "./field"

// ── NoteInput ─────────────────────────────────────────────────────────────────
// Textarea with horizontally-scrollable suggestion chips below it.
// Chips appear only when suggestions are provided (i.e. a category is selected).

interface NoteInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  suggestions: string[] // pre-filtered by category; empty = no chips shown
  placeholder?: string
}

export function NoteInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: NoteInputProps) {
  const chips = suggestions.filter(
    s => !value || s.toLowerCase().includes(value.toLowerCase()),
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(
      Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth,
    )
  }

  useEffect(() => {
    checkScroll()
  }, [suggestions, value])

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: dir === "right" ? 160 : -160,
      behavior: "smooth",
    })
  }

  return (
    <div className='rounded-lg border border-line bg-bg transition-colors hover:border-muted focus-within:border-primary'>
      <textarea
        id={id}
        className='min-h-20 w-full resize-y bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0'
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {chips.length > 0 && (
        <div className='relative border-t border-line'>
          {/* Horizontally scrollable chip row */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className='flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            {chips.map(note => (
              <button
                key={note}
                className={cn(
                  "shrink-0 max-w-[180px] truncate rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  value === note
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-ink hover:bg-primary hover:text-white",
                )}
                onMouseDown={e => {
                  e.preventDefault()
                  onChange(note)
                }}
                type='button'
              >
                {note}
              </button>
            ))}
          </div>

          {/* Left fade + chevron */}
          {canScrollLeft && (
            <>
              <div className='pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg to-transparent rounded-bl-lg' />
              <button
                type='button'
                onClick={() => scroll("left")}
                className='absolute left-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg text-muted shadow-sm transition-colors hover:text-ink'
              >
                <ChevronLeft aria-hidden className='h-3.5 w-3.5' />
              </button>
            </>
          )}

          {/* Right fade + chevron */}
          {canScrollRight && (
            <>
              <div className='pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent rounded-br-lg' />
              <button
                type='button'
                onClick={() => scroll("right")}
                className='absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg text-muted shadow-sm transition-colors hover:text-ink'
              >
                <ChevronRight aria-hidden className='h-3.5 w-3.5' />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── TagInput ──────────────────────────────────────────────────────────────────

interface TagInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
}

export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: TagInputProps) {
  const [open, setOpen] = useState(false)

  // Derive the partial tag the user is currently typing (text after the last comma)
  const lastComma = value.lastIndexOf(",")
  const partial = (
    lastComma >= 0 ? value.slice(lastComma + 1) : value
  ).trimStart()
  const prefix = lastComma >= 0 ? value.slice(0, lastComma + 1) + " " : ""

  const selected = new Set(
    value
      .split(",")
      .map(t => t.trim())
      .filter(Boolean),
  )

  const filtered =
    partial.length > 0
      ? suggestions
          .filter(
            s =>
              s.toLowerCase().includes(partial.toLowerCase()) &&
              !selected.has(s),
          )
          .slice(0, 6)
      : []

  function select(tag: string) {
    onChange(prefix + tag + ", ")
  }

  return (
    <div className='relative'>
      <Input
        id={id}
        onBlur={() => setOpen(false)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        value={value}
      />
      {open && filtered.length > 0 && (
        <ul
          className='absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-line bg-bg shadow-lg'
          role='listbox'
        >
          {filtered.map(tag => (
            <li key={tag} role='option' aria-selected={false}>
              <button
                className='w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2'
                onMouseDown={e => {
                  e.preventDefault() // keep input focused
                  select(tag)
                }}
                type='button'
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
