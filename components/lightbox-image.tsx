"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type LightboxImageProps = {
  src: string;
  alt: string;
  thumbClassName?: string;
  fullClassName?: string;
};

export function LightboxImage({
  src,
  alt,
  thumbClassName = "",
  fullClassName = ""
}: LightboxImageProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block">
        <img src={src} alt={alt} className={thumbClassName} />
      </button>
      {mounted && open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 sm:p-6"
              onClick={() => setOpen(false)}
            >
              <div
                className="flex max-h-[90dvh] max-w-full items-center justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={src}
                  alt={alt}
                  className={
                    fullClassName ||
                    "max-h-[90dvh] max-w-[min(100vw-2rem,96rem)] w-auto rounded-2xl object-contain shadow-2xl"
                  }
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
