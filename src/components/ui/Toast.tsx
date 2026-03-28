"use client";

import { useState, useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // フェードイン
    const showTimer = setTimeout(() => setVisible(true), 10);
    // 3秒後にフェードアウト開始
    const hideTimer = setTimeout(() => setVisible(false), 3000);
    // フェードアウト後に削除
    const removeTimer = setTimeout(() => onRemove(toast.id), 3350);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  const colorMap: Record<ToastType, string> = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  };

  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "i",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[220px] max-w-[320px] transition-all duration-300 ${colorMap[toast.type]} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold shrink-0">
        {iconMap[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/70 hover:text-white ml-1 text-base leading-none"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// カスタムフック
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => addToast("success", message), [addToast]);
  const showError = useCallback((message: string) => addToast("error", message), [addToast]);
  const showInfo = useCallback((message: string) => addToast("info", message), [addToast]);

  return { toasts, removeToast, showSuccess, showError, showInfo };
}
