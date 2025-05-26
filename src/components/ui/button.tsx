import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outline" | "default";
}

export function Button({ children, variant = "default", className = "", ...props }: ButtonProps) {
  const base =
    "px-4 py-2 rounded-md font-semibold focus:outline-none transition-colors";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-blue-600 text-blue-600 bg-white hover:bg-blue-50",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

