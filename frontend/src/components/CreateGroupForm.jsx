import { useState } from "react";
import Input from "./Input";
import Button from "./Button";

const GROUP_TYPES = ["Stay", "Trip", "Sports Team", "General"];

export default function CreateGroupForm({ onCreate, submitting, error }) {
  const [form, setForm] = useState({ name: "", description: "", groupType: "General" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Group name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="e.g. Flat 4B"
        required
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Type</span>
        <select
          name="groupType"
          value={form.groupType}
          onChange={handleChange}
          className="w-full rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-accent"
        >
          {GROUP_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="Description (optional)"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="What's this group for?"
      />

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button
        type="submit"
        variant="accent"
        className="w-full justify-center py-2.5"
        disabled={submitting}
      >
        {submitting ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
