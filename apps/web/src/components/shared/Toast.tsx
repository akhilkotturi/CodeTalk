interface ToastProps {
  message: string;
  variant?: "error" | "info";
  onDismiss: () => void;
}

const VARIANT_CLASSES: Record<NonNullable<ToastProps["variant"]>, string> = {
  error: "toast-error",
  info: "toast-info",
};

export function Toast({ message, variant = "info", onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`toast ${VARIANT_CLASSES[variant]}`}
    >
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-button">
        Dismiss
      </button>
    </div>
  );
}
