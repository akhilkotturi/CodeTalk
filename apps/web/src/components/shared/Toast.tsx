interface ToastProps {
  message: string;
  variant?: "error" | "info";
  onDismiss: () => void;
}

const VARIANT_CLASSES: Record<NonNullable<ToastProps["variant"]>, string> = {
  error: "bg-red-50 text-red-800 border-red-200",
  info: "bg-neutral-50 text-neutral-800 border-neutral-200",
};

export function Toast({ message, variant = "info", onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-4 rounded border px-4 py-2 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-xs underline">
        Dismiss
      </button>
    </div>
  );
}
