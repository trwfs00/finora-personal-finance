import { useTranslation } from "react-i18next";

import type { PageGuide } from "../../domain/guides";
import { Dialog } from "../ui/dialog";
import { UseCaseCard } from "./UseCaseCard";

interface HelpDialogProps {
  guide: PageGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ guide, open, onOpenChange }: HelpDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      description={t(guide.introKey)}
      onOpenChange={onOpenChange}
      open={open}
      title={t(guide.titleKey)}
    >
      <div className="space-y-3">
        {guide.useCases.map((item) => (
          <UseCaseCard key={item.id} useCase={item} />
        ))}
      </div>
    </Dialog>
  );
}
