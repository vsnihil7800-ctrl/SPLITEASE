import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getMyGroupsRequest, createGroupRequest, joinGroupRequest } from "../api/groups";
import { getGroupBalancesRequest } from "../api/settlements";
import Logo from "../components/Logo";
import Button from "../components/Button";
import Modal from "../components/Modal";
import GroupCard from "../components/GroupCard";
import CreateGroupForm from "../components/CreateGroupForm";
import JoinGroupForm from "../components/JoinGroupForm";
import ThemeToggle from "../components/ThemeToggle";
import NotificationBell from "../components/NotificationBell";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [netBalances, setNetBalances] = useState({}); // groupId -> myNet

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      setLoadError("");
      try {
        const res = await getMyGroupsRequest();
        const fetchedGroups = res.data.groups;
        setGroups(fetchedGroups);

        // Fetch balances for all groups in parallel (best-effort — failures silently ignored)
        const balanceResults = await Promise.allSettled(
          fetchedGroups.map((g) => getGroupBalancesRequest(g._id))
        );
        const nets = {};
        balanceResults.forEach((result, i) => {
          if (result.status === "fulfilled") {
            const myEntry = result.value.data.netBalances?.find(
              (b) => b.user.id === user?.id
            );
            nets[fetchedGroups[i]._id] = myEntry?.net ?? 0;
          }
        });
        setNetBalances(nets);
      } catch (err) {
        setLoadError(err.response?.data?.message || "Couldn't load your groups.");
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [user]);

  // Re-fetches the group list after a create/join action succeeds.
  // (Kept separate from the mount effect above so the lint rule doesn't
  // see setState called directly inside an effect body.)
  const refreshGroups = async () => {
    try {
      const res = await getMyGroupsRequest();
      const fetchedGroups = res.data.groups;
      setGroups(fetchedGroups);
      const balanceResults = await Promise.allSettled(
        fetchedGroups.map((g) => getGroupBalancesRequest(g._id))
      );
      const nets = {};
      balanceResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const myEntry = result.value.data.netBalances?.find(
            (b) => b.user.id === user?.id
          );
          nets[fetchedGroups[i]._id] = myEntry?.net ?? 0;
        }
      });
      setNetBalances(nets);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load your groups.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCreateGroup = async (form) => {
    setFormError("");
    setFormSubmitting(true);
    try {
      await createGroupRequest(form);
      setShowCreate(false);
      await refreshGroups();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't create the group.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleJoinGroup = async (code) => {
    setFormError("");
    setFormSubmitting(true);
    try {
      await joinGroupRequest(code);
      setShowJoin(false);
      await refreshGroups();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't join that group.");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
          <span className="text-sm text-ink-soft">Hi, {user?.name?.split(" ")[0]}</span>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Your groups</h1>
            <p className="mt-1 text-sm text-muted">
              Your net balance across all groups.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFormError("");
                setShowJoin(true);
              }}
            >
              Join with code
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setFormError("");
                setShowCreate(true);
              }}
            >
              + New group
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {loadingGroups && (
            <p className="text-sm text-muted">Loading your groups…</p>
          )}

          {!loadingGroups && loadError && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {loadError}
            </p>
          )}

          {!loadingGroups && !loadError && groups.length === 0 && (
            <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-10 text-center">
              <h2 className="font-display text-base font-semibold text-ink">
                No groups yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                Create a group for your flat, trip, or team — or join one with an
                invite code from a friend.
              </p>
            </div>
          )}

          {!loadingGroups && !loadError && groups.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <GroupCard key={group._id} group={group} myNet={netBalances[group._id]} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a group">
        <CreateGroupForm
          onCreate={handleCreateGroup}
          submitting={formSubmitting}
          error={formError}
        />
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a group">
        <JoinGroupForm
          onJoin={handleJoinGroup}
          submitting={formSubmitting}
          error={formError}
        />
      </Modal>
    </div>
  );
}
