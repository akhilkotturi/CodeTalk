import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-700",
  secondary: "bg-transparent text-neutral-900 border border-neutral-300 hover:bg-neutral-100",
  danger: "bg-red-700 text-white hover:bg-red-600",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
