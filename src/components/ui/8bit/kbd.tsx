import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 8-bit keyboard hint (8bitcn-ui, MIT). */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd data-slot="kbd" className={cn("kbd px-notch px-notch-sm", className)} {...props} />;
}
