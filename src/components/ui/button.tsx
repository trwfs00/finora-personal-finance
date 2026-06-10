import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary/90 active:bg-primary/85",
        secondary:
          "border border-line bg-bg text-ink hover:bg-surface-2 active:bg-line/45",
        ghost: "text-muted hover:bg-surface-2 hover:text-ink active:bg-line/45",
        danger:
          "bg-danger text-white hover:bg-danger/90 active:bg-danger/85",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3.5 text-sm",
        lg: "h-11 px-4 text-sm",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
