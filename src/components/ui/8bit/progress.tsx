import { cn } from "@/lib/cn";

/**
 * Segmented 8-bit progress bar (the "retro" variant of 8bitcn-ui's Progress, MIT), without radix.
 * `value` is 0..1. Decorative by default; pass a label to expose it as a progressbar.
 */
export function SegmentedProgress({
  value,
  segments = 12,
  className,
  label,
}: {
  value: number;
  segments?: number;
  className?: string;
  label?: string;
}) {
  const ratio = Math.max(0, Math.min(1, value));
  const lit = Math.ceil(ratio * segments);
  const a11y = label
    ? { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(ratio * 100) }
    : { "aria-hidden": true };
  return (
    <span data-slot="progress" className={cn("px-progress", className)} {...a11y}>
      {Array.from({ length: segments }, (_, index) => (
        <i key={index} className={index < lit ? "on" : undefined} />
      ))}
    </span>
  );
}
