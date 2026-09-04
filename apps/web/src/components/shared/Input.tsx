import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm text-neutral-600">
        {label}
      </label>
      <input
        id={inputId}
        className={`border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 ${className}`}
        {...props}
      />
    </div>
  );
}
