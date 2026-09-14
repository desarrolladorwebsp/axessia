"use client";

import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  visible: boolean;
  onToggleVisibility: () => void;
  revealLabel?: string;
  hideLabel?: string;
};

export default function PasswordInput({
  visible,
  onToggleVisibility,
  revealLabel = "Mostrar contraseña",
  hideLabel = "Ocultar contraseña",
  id,
  ...inputProps
}: PasswordInputProps) {
  const label = visible ? hideLabel : revealLabel;

  return (
    <span className="password-input">
      <input {...inputProps} id={id} type={visible ? "text" : "password"} />
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={label}
        aria-pressed={visible}
        aria-controls={id}
        title={label}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}
