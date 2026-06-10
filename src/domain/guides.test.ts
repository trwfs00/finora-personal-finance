import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getPageGuide, PAGE_GUIDES } from "./guides";

describe("guide definitions", () => {
  it("contains MVP page guides", () => {
    expect(getPageGuide("accounts")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("transactions")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("budgets")?.useCases.length).toBeGreaterThan(0);
    expect(getPageGuide("settings")?.useCases.length).toBeGreaterThan(0);
  });

  it("has stable unique use case ids per page", () => {
    for (const guide of PAGE_GUIDES) {
      const ids = guide.useCases.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("includes SPayLater account guidance with correct recommended fields", () => {
    const accounts = getPageGuide("accounts");
    const spaylater = accounts?.useCases.find((item) => item.id === "spaylater");
    expect(spaylater?.recommendedFields?.some((field) => field.value === "-8000")).toBe(true);
    expect(spaylater?.recommendedFields?.some((field) => field.value === "20000")).toBe(true);
  });
});

const en = JSON.parse(
  readFileSync(resolve(__dirname, "../locales/en.json"), "utf8"),
) as Record<string, unknown>;
const th = JSON.parse(
  readFileSync(resolve(__dirname, "../locales/th.json"), "utf8"),
) as Record<string, unknown>;

function hasKey(locale: Record<string, unknown>, key: string): boolean {
  return (
    key.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, locale) !== undefined
  );
}

function collectGuideKeys(): string[] {
  const keys: string[] = [];

  for (const page of PAGE_GUIDES) {
    keys.push(page.titleKey, page.introKey);
    for (const uc of page.useCases) {
      keys.push(uc.titleKey, uc.descriptionKey);
      keys.push(...uc.stepsKeys);
      if (uc.warningKey) keys.push(uc.warningKey);
      for (const field of uc.recommendedFields ?? []) {
        keys.push(field.labelKey);
        if (field.valueKey) keys.push(field.valueKey);
      }
    }
  }

  const guideUiKeys = [
    "guideUi.howToUsePage",
    "guideUi.guideCenter",
    "guideUi.recommendedSetup",
    "guideUi.steps",
    "guideUi.warning",
    "guideUi.openGuide",
    "guideUi.closeGuide",
  ];
  keys.push(...guideUiKeys);

  return [...new Set(keys)];
}

describe("guide translation coverage", () => {
  const keys = collectGuideKeys();

  it("all guide keys exist in en.json", () => {
    const missing = keys.filter((key) => !hasKey(en, key));
    expect(missing).toEqual([]);
  });

  it("all guide keys exist in th.json", () => {
    const missing = keys.filter((key) => !hasKey(th, key));
    expect(missing).toEqual([]);
  });
});
