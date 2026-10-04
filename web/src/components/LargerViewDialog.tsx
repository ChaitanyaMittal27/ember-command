"use client";

import { useRef, useState, type RefObject } from "react";

/** The "Open larger view" buttons. */
export const SECONDARY_BUTTON_CLASS =
  "min-h-10 cursor-pointer rounded-md border border-line-strong px-3 text-[13px] text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";

/**
 * The state behind one larger view: spread `dialogProps` onto LargerViewDialog, and call show()
 * from the click handler of the button that should get focus back.
 */
export function useLargerView() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  const dialogProps = { dialogRef: dialog, open, onClosed: () => setOpen(false) };
  return { show, dialogProps };
}

interface LargerViewDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  onClosed: () => void;
  title: string;
  /** Unique on the page; the dialog is labelled by its title. */
  titleId: string;
  children: React.ReactNode;
}

/**
 * A tab's content shown large, about 90% x 85% of the window. A modal <dialog>: the browser traps
 * focus inside it, closes it on Escape, and returns focus to the button that opened it. The content
 * is only mounted while the dialog is open.
 */
export function LargerViewDialog({ dialogRef, open, onClosed, title, titleId, children }: LargerViewDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClosed}
      className="m-auto h-[85vh] max-h-none w-[90vw] max-w-none rounded-lg border border-line-strong bg-panel p-0 text-ink backdrop:bg-black/60"
    >
      {open && (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-[18px] font-semibold">
              {title}
            </h2>
            <button
              type="button"
              autoFocus
              aria-label="Close larger view"
              title="Close"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-line-strong text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
