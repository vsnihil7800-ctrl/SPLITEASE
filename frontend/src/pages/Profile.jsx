import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { updateProfileRequest, changePasswordRequest } from "../api/profile";
import Logo from "../components/Logo";
import Button from "../components/Button";
import Input from "../components/Input";
import ThemeToggle from "../components/ThemeToggle";
import NotificationBell from "../components/NotificationBell";

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-display text-base font-semibold text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [name, setName]   = useState(user?.name || "");
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");
  const [saveError, setSaveError] = useState("");

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwMsg, setPwMsg]         = useState("");
  const [pwError, setPwError]     = useState("");

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError(""); setSaveMsg(""); setSaving(true);
    try {
      const res = await updateProfileRequest({ name, upiId });
      setUser(res.data.user);
      localStorage.setItem("splitease_user", JSON.stringify(res.data.user));
      setSaveMsg("Profile updated!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Couldn't update profile.");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(""); setPwMsg("");
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setPwSaving(true);
    try {
      await changePasswordRequest({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err) {
      setPwError(err.response?.data?.message || "Couldn't change password.");
    } finally { setPwSaving(false); }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  // Avatar initials
  const initials = (user?.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
          <Link to="/dashboard" className="text-sm font-medium text-ink-soft hover:text-accent">← Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">

        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white text-xl font-bold select-none">
            {initials}
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-ink">{user?.name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              user?.isEmailVerified ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}>
              {user?.isEmailVerified ? "✓ Email verified" : "Email not verified"}
            </span>
          </div>
        </div>

        {/* Edit profile */}
        <Section title="Edit Profile">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
            <div>
              <Input
                label="UPI ID"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@upi or 9876543210@paytm"
              />
              <p className="mt-1 text-xs text-muted">Used for Pay via UPI buttons in group balance.</p>
            </div>

            <div className="rounded-xl border border-hairline bg-paper px-4 py-3">
              <p className="text-xs text-muted">Email</p>
              <p className="text-sm font-medium text-ink mt-0.5">{user?.email}</p>
              <p className="text-xs text-muted mt-0.5">Email cannot be changed.</p>
            </div>

            {saveError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{saveError}</p>}
            {saveMsg   && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{saveMsg}</p>}

            <Button type="submit" variant="accent" className="w-full justify-center py-2.5" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Section>

        {/* Change password */}
        <Section title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min 6 characters"
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              required
            />

            {pwError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{pwError}</p>}
            {pwMsg   && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{pwMsg}</p>}

            <Button type="submit" variant="accent" className="w-full justify-center py-2.5" disabled={pwSaving}>
              {pwSaving ? "Changing…" : "Change password"}
            </Button>
          </form>
        </Section>

        {/* Stats */}
        <Section title="Account Info">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Member since</span>
              <span className="font-medium text-ink">
                {new Date(user?.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">UPI ID</span>
              <span className="font-medium text-ink ledger-amount">{user?.upiId || "Not set"}</span>
            </div>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Account">
          <Button variant="secondary" className="w-full justify-center py-2.5" onClick={handleLogout}>
            Log out
          </Button>
        </Section>

      </main>
    </div>
  );
}
