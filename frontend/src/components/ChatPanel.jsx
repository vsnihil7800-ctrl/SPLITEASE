import { useEffect, useRef, useState, useCallback } from "react";
import { getMessagesByGroupRequest } from "../api/messages";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/useAuth";

const TOKEN_KEY = "splitease_token";

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageBubble({ message, isMe }) {
  const senderName = message.sender?.name || message.senderName || "Unknown";

  if (message.messageType === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-paper-dim px-3 py-1 text-xs text-muted">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-ink-soft"
        aria-hidden="true"
      >
        {initials(senderName)}
      </div>
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {!isMe && (
          <span className="mb-0.5 px-1 text-xs font-medium text-muted">{senderName}</span>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm ${
            isMe
              ? "bg-ink text-paper"
              : "border border-hairline bg-surface text-ink"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        <span className="mt-0.5 px-1 text-xs text-muted">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default function ChatPanel({ groupId }) {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Load history once on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getMessagesByGroupRequest(groupId);
        setMessages(res.data.messages);
      } catch (e) {
        setError(e.response?.data?.message || "Couldn't load chat history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Connect socket, join the group's room, and subscribe to live messages.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("joinGroup", groupId, (ack) => {
        if (!ack?.ok) {
          setError(ack?.message || "Couldn't join the chat room.");
        }
      });
    };

    const handleDisconnect = () => setConnected(false);

    const handleNewMessage = (message) => {
      setMessages((prev) => {
        // Defensive de-dupe: ignore if we already have this message id
        // (can happen if the sender's own ack-driven update races the broadcast).
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("newMessage", handleNewMessage);

    if (socket.connected) handleConnect();

    return () => {
      socket.emit("leaveGroup", groupId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("newMessage", handleNewMessage);
    };
  }, [groupId]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setSendError("Not connected — check your connection and try again.");
      return;
    }

    setSending(true);
    setSendError("");

    socket.emit("sendMessage", { groupId, text }, (ack) => {
      setSending(false);
      if (ack?.ok) {
        setDraft("");
        // The server also broadcasts this back via "newMessage" (including
        // to us), so we don't optimistically append here — avoids duplicates.
      } else {
        setSendError(ack?.message || "Couldn't send message.");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Chat</h2>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            connected ? "text-success" : "text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-success" : "bg-muted"
            }`}
            aria-hidden="true"
          />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="mt-3 flex h-[420px] flex-col rounded-2xl border border-hairline bg-surface">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading && <p className="text-sm text-muted">Loading chat…</p>}

          {!loading && error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted">
                No messages yet. Say hello to the group!
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            messages.map((m) => (
              <MessageBubble
                key={m._id}
                message={m}
                isMe={(m.sender?._id || m.sender) === user?.id}
              />
            ))}
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 border-t border-hairline p-3"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-hairline bg-paper px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink transition-opacity hover:brightness-95 disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
        {sendError && (
          <p className="px-3 pb-2 text-xs text-danger">{sendError}</p>
        )}
      </div>
    </div>
  );
}
