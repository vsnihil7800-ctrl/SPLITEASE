import { useState } from "react";
import Input from "./Input";
import Button from "./Button";

export default function JoinGroupForm({ onJoin, submitting, error }) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onJoin(code);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Invite code"
        name="inviteCode"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. 7F3K9A"
        maxLength={6}
        className="ledger-amount tracking-widest text-center"
        autoComplete="off"
        required
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
        {submitting ? "Joining…" : "Join group"}
      </Button>
    </form>
  );
}
