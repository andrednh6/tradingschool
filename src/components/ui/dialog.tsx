import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Modal Dialog root
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* BACKDROP desenfocado */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all"
        onClick={() => onOpenChange?.(false)}
        aria-label="Close backdrop"
      />
      {/* MODAL CARD */}
      <div className="relative bg-white text-black rounded-xl shadow-2xl p-6 w-[90vw] max-w-md mx-auto z-10 animate-fadeIn">
        {children}
        <button
          className="absolute top-2 right-3 text-xl font-bold text-gray-600 hover:text-red-500"
          onClick={() => onOpenChange?.(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** Dialog Content wrapper */
export function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-2 ${className}`}>{children}</div>;
}
export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>;
}
export function DialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold mb-2 ${className}`}>{children}</h2>;
}
