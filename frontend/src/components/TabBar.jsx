export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-surface p-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            active === tab.id
              ? "bg-accent text-ink"
              : "text-ink-soft hover:bg-paper-dim hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
