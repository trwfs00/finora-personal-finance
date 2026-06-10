import { BookOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PAGE_GUIDES } from "../../domain/guides";
import type { PageGuide } from "../../domain/guides";
import { HelpDialog } from "./HelpDialog";

export function GuideCenter() {
  const { t } = useTranslation();
  const [activeGuide, setActiveGuide] = useState<PageGuide | null>(null);

  return (
    <>
      <div className="panel p-5">
        <div className="flex items-start gap-3">
          <BookOpen aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-ink">{t("guideUi.guideCenter")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PAGE_GUIDES.map((guide) => (
                <button
                  key={guide.page}
                  className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setActiveGuide(guide)}
                  type="button"
                >
                  <p className="text-sm font-medium text-ink">{t(guide.titleKey)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("guideUi.openGuide")} →
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeGuide ? (
        <HelpDialog
          guide={activeGuide}
          onOpenChange={(open) => !open && setActiveGuide(null)}
          open={true}
        />
      ) : null}
    </>
  );
}
