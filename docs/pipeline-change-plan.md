# Smart Fill OCR Refactor Plan (evidence-grounded)

Evolve the existing OCR parser layer into a maintainable, bank-aware architecture
**without rebuilding the parts that already ship and work**, and without chasing
accuracy that is capped at the OCR layer rather than the parser layer.

Primary objective: **reduce regression risk** and make future bank support easier.
No AI/LLM dependency. The pipeline stays deterministic and explainable.

> The biggest regression risk in this effort is the migration itself. Every step
> below is gated by the e2e harness (`npx vite-node temp/test-ocr-e2e.ts`) with the
> rule: **no regression vs the last `temp/ocr-accuracy-history.json` run.**

---

## Current state (what already exists — do NOT rebuild)

The `src/lib/ocr/` skeleton this plan used to call for is already in place:

| Module | Status |
|---|---|
| `validate.ts` | ✅ file type / size / dimension checks |
| `normalize.ts` | ✅ evidence-backed rules (ํา→ำ, %→x, =→-, split-number rejoin) |
| `detect-bank.ts` | ✅ OCR-tolerant bank detection from text |
| `confidence.ts` | ✅ `ExtractionMethod` → high/medium/low |
| `parse.ts` | ✅ orchestrator; `parseSlipText(text, hocr?)` signature stable |
| `parsers/generic.ts` + `types.ts` | ✅ `FieldResult<T>` with `method`; amount already scores candidates by decimals/currency |
| `match.ts` | ✅ account matching + transfer detection |

So the module structure, normalization, bank detection, method-based confidence,
and a partial candidate-scoring amount extractor are **done**. The work below is to
*evolve* this layer, not transform from scratch. The normalization and garble rules
in `normalize.ts` / `generic.ts` are hard-won, evidence-backed fixes — preserve them.

---

## Accuracy ceilings (state these; do not chase past them)

A meaningful fraction of remaining failures are **character-level OCR misreads** and
are **unfixable by any parser**. Architecture flags them as low-confidence for user
review; it does not eliminate them.

- **Ref** (~8–10 slips): char misreads (`O→0`, `F→O`, `l→1`), GSB `…B9790` suffix,
  SCB split tokens. Hard ceiling ~18/31. Ref is **informational**, not identity.
- **Account**: mymo slip 5 is a digit misread (`10…` vs `14…`). No parser fixes it.
  Realistic ceiling ~30/31 after adding the 2 missing format patterns.
- **Date**: the `1.9.`→April-vs-June garble is one token mapping to two months;
  not disambiguable without a tie-breaker. Realistic ceiling ~93–95%.

### Targets (with ceilings acknowledged)

| Field | Target | Note |
|---|---|---|
| Amount | 98–100% | already 31/31 |
| Date | ~93–95% | capped by alias-collision case |
| Time | 98%+ | reachable (Goal C) |
| Account | ~30/31 | capped by digit misread |
| Transfer | 95%+ | newly measurable via harness |
| Ref | best-effort | flagged low-confidence, user-editable |

---

## Constraint kept from the prior plan: ONE OCR pass (capped at 2)

In-browser Tesseract is ~1–4s per `recognize()`. Running multiple PSMs × multiple
preprocess variants would make a slip scan take 6–24s — a bad mobile UX. The mymo
amount win came from a *single* global PSM switch (PSM 11), and the bangkok ref
regression came from that same switch. The lesson is **PSM is per-bank** — so pick
*one* PSM per bank, don't run several and merge.

Chicken-and-egg: a strategy is keyed by `bankId`, but `detectBank()` needs OCR text.
Resolution:

1. Pass 1 at the current default PSM 11 → `detectBank(text)`.
2. If the detected bank's preferred PSM ≠ 11, run pass 2 once at that PSM.
3. **Hard cap: 2 passes.** No preprocess-variant fan-out unless a *specific* bank
   failure is proven to need it (none is today).

---

## Workstreams, sequenced lowest-regression-risk first

Each step is independently shippable and gated by the e2e harness.

### Step A — Additive accuracy wins (no contract change) — DONE

Shipped in `parsers/generic.ts`: time now accepts colon + น-anchored colon-less
forms (`1835 น`, `18 35 น`, `18.35 น`) with HH/MM validation (time 30→31); the
G-Wallet account branch tolerates a stray OCR digit/extra spaces
(`**** 4******* 0003`, acct 28→29). SCB-1's garbled receiver (`2๐9๐->๑๓537-7`,
pure digit/Thai-numeral soup with no mask char) was **deferred to Step D** — it
needs a recipient-line-scoped extractor, not a broad generic regex.

- **Time parser (Goal 7).** Extend `extractTime` to accept `1835 น`, `18 35 น`,
  `18.35`, `18:35` → normalize to `18:35`. Fixes paotang. ~5 lines.
- **Two missing account patterns (Goal 6, lite).** Add SCB `xxx-xxx537-7` and
  paotang G-Wallet `**** ******* 0003` to `ACCT_RE` (or as alternations).
  **Do NOT** split the working regex into 6 extractors — that's readability churn
  with regression risk for no accuracy gain. The failures are uncovered formats and
  digit misreads, not a structural problem.

### Step B — Date (Goal 5) — DONE; compact parser dropped

Investigated the 3 date failures against real OCR. The compact-date parser was
**not built** — it would have flipped zero slips and added regression surface.
Findings:

- **make/9** (`12 1.9. 2569`): not an ambiguous garble — a *wrong alias*. Across
  all 12 make slips, June `มิ.ย.` always garbles to `0.9.` and April `เม.ย.`
  garbles to `1.9.`/`w.9.`/`Ww.9.`; the leading digit (`0` vs `1`) disambiguates.
  The table had `"1.9.": 6` referencing a slip not in the dataset. **Fixed with a
  one-line correction `"1.9.": 4`.** Date 28→29.
- **make/4** (`952569`): genuine ceiling — June 11 is unrecoverable (day/month
  chars destroyed, a digit lost). No decomposition yields 11/06.
- **kbank/3** (`11`→`12`): digit misread. Ceiling.

**Goal 5 dropped from scope.** Its premise ("replace the garble alias table") is
flawed: the alias table handles *garbled month tokens* (`w.9.`, `Ww.9.`), while a
compact parser handles *separator-less numeric dates* (`09052569`) — different
problems. No dataset slip has a recoverable separator-less numeric date that fails.
Date is now at its realistic ceiling: **29/31 (94%)**.

### Step C — Ref demotion + dedup (Goal 8) — DONE

- **Ref demotion: already satisfied.** Ref was never transaction identity — it
  flows only into `attachmentNote` and is confidence-scored in `confidence.ts`.
  No code change needed.
- **Dedup: built net-new** (there was no prior duplicate detection to migrate).
  - `src/domain/duplicate.ts` — pure `findDuplicate(draft, existing, windowMinutes=5)`
    keyed on `type + amount(±0.01) + date + account(s)`, with a 5-minute time
    window when both times are present (falls back to amount+date+account when a
    time is missing). Reference numbers are deliberately excluded.
  - `src/domain/duplicate.test.ts` — 11 unit tests (amount tolerance, time window,
    transfer both-accounts, type/date/account mismatches).
  - `TransactionForm`: on first save a match shows a dismissible amber warning and
    the button becomes "Save anyway"; a second submit commits. The ack auto-clears
    when type/amount/date/time/account changes so it can't go stale. i18n added to
    both locales (`form.duplicateWarning`, `form.saveAnyway`).
  - Addresses the collision caveat: same-amount/same-day purchases stay distinct
    when their times differ beyond the window, and the user can always override.

### Step D.1 — SCB receiver capture — DONE

SCB OCR carries **no reliable bank signal** (`SCB`/`ไทยพาณิช` don't survive OCR),
so a dedicated SCB parser would be blocked on detection. Instead added a
**recipient-keyword-scoped digit-tail fallback** to the generic `extractAccounts`:

- `ACCT_TAIL_RE = /\d{3,}[-–]\d(?!\d)/` captures the receiver suffix+check-digit
  (`537-7`) on lines where the masked prefix garbled to Thai numerals
  (`2๐9๐->๑๓537-7`). Deliberately **not** normalizing Thai numerals — doing so
  would merge `๑๓`+`537` into `13537`, which breaks the directional transfer match;
  the ASCII-only `\d{3,}` naturally isolates `537`.
- Only accepted when within 80 chars after a recipient keyword
  (`จาก|ไปยัง|ไปที่|ถึง|ผู้รับ`) and not already inside an ACCT_RE match, so it
  can't fire on dates/amounts. Results kept in document order (sender→receiver).
- Result: acct 29→30, transfer 29→30. Both SCB slips now pass everything except
  ref (demoted). No regressions.

### Step D.2 — Per-bank PSM strategy (Goal 1) — DEFERRED

Re-evaluated after ref demotion. PSM choice only meaningfully affects **ref**
(bangkok's short ref reads correctly under PSM 3 but not PSM 11) — and ref is now
best-effort. The accuracy-relevant fields (amount/date/time/acct/transfer) are all
at their ceilings under the current global PSM 11. Building the 2-pass strategy
(re-dump infra + browser latency + regression risk on bangkok's currently-passing
fields) buys only ~2 best-effort ref slips. **Deferred** until there's a non-ref
field that a per-bank PSM would move.

### Step E — Candidate extraction + resolvers (Goals 3 + 4) — highest churn, last

This rewrites every extractor's return shape and the `ParseResult` contract, so do
it only once A–D have stabilized and the harness is green.

- Extractors return `Candidate[]` (`{ value, source, score }`) instead of a single
  `FieldResult`.
- `src/lib/ocr/resolvers/<field>.resolver.ts` chooses the best candidate and emits
  `{ value, confidence, method }`.
- `confidence.ts` evolves from method→level into evidence-aggregating
  (`{ confidence: number, evidence: string[] }`) per Goal 9, then bucketed to
  high/medium/low for the UI.
- `parseSlipText` public signature stays unchanged; `SlipData.confidence` already
  exists as the carrier.

### Deferred — Debug infrastructure (Goal 11)

Valuable but a sub-project of its own. The current `temp/test-ocr-e2e.ts` +
`ocr-debug/*.txt` + `ocr-accuracy-history.json` already serve maintenance. Build the
in-app bbox/candidate/resolver viewers only after the parser contract (Step E) is
settled — otherwise they're built against a moving API.

### Folded-in, not a workstream — TransactionDraft (Goal 10)

OCR already only prefills a form the user must save (`SlipScanner` → form → save).
This is a type-tightening/rename (`SlipData` → `TransactionDraft`), not new behavior.

---

## Verification (every step)

- `npm run typecheck`, `npm run lint`, `npm test` pass.
- `npx vite-node temp/test-ocr-e2e.ts`; **no regression** vs last history run.
  Floor: amount ≥31, date ≥28, time ≥30, acct ≥28, ref ≥9, transfer ≥29.
- Append the run to `temp/ocr-accuracy-history.json`.
- Manual smoke after Step D: scan a bangkok slip + a make-by-kbank slip; confirm
  form prefills amount/date/account and confidence dots vary per field.

---

## What changed from the original draft, and why

- **Reframed from greenfield to evolution** — ~60% of the proposed tree already
  ships; rebuilding it risks regressing the evidence-backed normalization fixes.
- **Single OCR pass (cap 2), not multi-PSM/multi-variant** — protects scan latency;
  PSM is per-bank, so select one, don't fan out.
- **Ceilings stated up front** — several remaining failures are OCR-level char
  misreads; the success criteria now reflect what architecture can actually move.
- **Goal 6 reduced** to two added patterns instead of a 6-way regex split.
- **Goal 11 deferred** behind the existing test harness.
- **Sequenced by regression risk**, with the candidate/resolver contract rewrite
  (the riskiest change) last and gated by the harness at every step.
