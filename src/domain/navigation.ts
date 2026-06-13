export const MOBILE_NAV_ITEM_IDS = [
  "overview",
  "transactions",
  "accounts",
  "budgets",
  "analytics",
  "recurring",
  "goals",
  "debts",
  "calendar",
  "settings",
] as const

export type MobileNavItemId = (typeof MOBILE_NAV_ITEM_IDS)[number]

export const DEFAULT_MOBILE_NAV_ITEMS: MobileNavItemId[] = [
  "overview",
  "transactions",
  "accounts",
  "analytics",
]

const mobileNavItemSet = new Set<string>(MOBILE_NAV_ITEM_IDS)

export function normalizeMobileNavItems(value: unknown): MobileNavItemId[] {
  const picked = Array.isArray(value)
    ? value.filter(
        (item): item is MobileNavItemId =>
          typeof item === "string" && mobileNavItemSet.has(item),
      )
    : []
  const unique = Array.from(new Set(picked)).slice(0, 4)
  const filled = [...unique]

  for (const fallback of DEFAULT_MOBILE_NAV_ITEMS) {
    if (filled.length >= 4) break
    if (!filled.includes(fallback)) filled.push(fallback)
  }

  return filled
}
