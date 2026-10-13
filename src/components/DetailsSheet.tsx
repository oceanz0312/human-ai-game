"use client";

import { useEffect, useId, useRef } from "react";

interface DetailsSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function DetailsSheet({ open, title, onClose, children }: DetailsSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="details-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="details-sheet one-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="details-sheet-head">
          <h2 className="details-sheet-title" id={titleId}>
            {title}
          </h2>
          <button ref={closeRef} type="button" className="close-action" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="details-sheet-body">{children}</div>
      </div>
    </div>
  );
}
