import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { GuidePage } from "../../domain/guides";
import { getPageGuide } from "../../domain/guides";
import { Button } from "../ui/button";
import { HelpDialog } from "./HelpDialog";

export function HelpButton({ page }: { page: GuidePage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const guide = getPageGuide(page);

  if (!guide) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        <HelpCircle aria-hidden className="h-4 w-4" />
        {t("guideUi.howToUsePage")}
      </Button>
      <HelpDialog guide={guide} onOpenChange={setOpen} open={open} />
    </>
  );
}
