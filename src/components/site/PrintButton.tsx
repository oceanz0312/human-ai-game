"use client";

export function PrintButton({ label = "Print puzzles" }: { label?: string }) {
  return (
    <button type="button" className="quick-play print-button" data-testid="print-button" onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
