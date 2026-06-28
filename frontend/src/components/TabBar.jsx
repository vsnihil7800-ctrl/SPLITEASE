export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-surface p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
