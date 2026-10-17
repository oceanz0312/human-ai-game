import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** 8-bit badge (8bitcn-ui, MIT): solid chip with notched pixel ends, colours from tokens. */
export const badgeVariants = cva("badge px-notch px-notch-sm", {
  variants: {
    variant: {
      default: "",
      ok: "badge-ok",
      human: "badge-human",
      ai: "badge-ai",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
