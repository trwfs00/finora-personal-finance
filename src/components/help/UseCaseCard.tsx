import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { GuideUseCase } from "../../domain/guides";

interface UseCaseCardProps {
  useCase: GuideUseCase;
}

export function UseCaseCard({ useCase }: UseCaseCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <h3 className="text-base font-semibold text-ink">{t(useCase.titleKey)}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{t(useCase.descriptionKey)}</p>

      {useCase.recommendedFields && useCase.recommendedFields.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium text-muted">{t("guideUi.recommendedSetup")}</p>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {useCase.recommendedFields.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 border-b border-line px-3 py-2 text-sm last:border-b-0"
              >
                <span className="text-muted">{t(field.labelKey)}</span>
                <span className="font-mono font-medium text-ink">
                  {field.valueKey ? t(field.valueKey) : field.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {useCase.stepsKeys.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium text-muted">{t("guideUi.steps")}</p>
          <ol className="space-y-2">
            {useCase.stepsKeys.map((key, index) => (
              <li key={key} className="flex gap-2.5 text-sm leading-6 text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {useCase.warningKey ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-danger">{t("guideUi.warning")}</p>
            <p className="mt-0.5 text-sm leading-6 text-ink">{t(useCase.warningKey)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
