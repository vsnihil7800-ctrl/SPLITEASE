export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex overflow-x-auto rounded-xl border border-hairline bg-surface p-1 scrollbar-none gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            active === tab.id
              ? "bg-accent text-white"
              : "text-ink-soft hover:bg-paper-dim hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
