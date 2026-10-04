'use client';
import { useEffect, useRef } from 'react';

export default function Modal({
  onClose, titleId, label, variant = 'dialog', children,
}: {
  onClose: () => void;
  titleId?: string;
  label?: string;
  variant?: 'sheet' | 'dialog';
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (el.open) el.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal modal-${variant}`}
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>{children}</div>
    </dialog>
  );
}
