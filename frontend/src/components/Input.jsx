export default function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      )}
      <input
        className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70
          border-hairline focus:border-accent outline-none transition-colors
          ${error ? "border-danger" : ""} ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
