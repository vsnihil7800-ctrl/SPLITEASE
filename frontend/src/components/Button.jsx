export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-ink text-paper hover:bg-ink-soft",
    accent: "bg-accent text-ink hover:brightness-95",
    secondary: "bg-paper-dim text-ink hover:bg-hairline/60 border border-hairline",
    ghost: "text-ink-soft hover:bg-paper-dim",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
