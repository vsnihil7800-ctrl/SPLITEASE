export default function Logo({ size = "md" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={`font-display font-bold ${sizes[size]} text-ink inline-flex items-baseline gap-1.5`}>
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-accent translate-y-[-1px]"
        aria-hidden="true"
      />
      SplitEase
      <span className="text-accent">Stay</span>
    </span>
  );
}
