import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Minus, Phone, Search, Send, Smile, Video, X } from "lucide-react";
import CallModal from "@/components/CallModal";

type Peer = {
  id: number;
  name: string;
  avatar?: string | null;
};

type ChatWindowState = {
  conversationId: number;
  peer: Peer;
  minimized: boolean;
};

type OpenChatDetail = {
  conversationId: number;
  peer?: Peer;
};

type OutgoingCall = Peer & {
  isVideo: boolean;
};

function initials(name?: string | null) {
  const words = (name ?? "?").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
}

function shortTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function FloatingConversation({
  conversationId,
  peer,
  minimized,
  offset,
  onMinimize,
  onRestore,
  onClose,
  onStartCall,
}: {
  conversationId: number;
  peer: Peer;
  minimized: boolean;
  offset: number;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onStartCall: (isVideo: boolean) => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { data: messages = [], isLoading } = trpc.dm.messages.useQuery(
    { conversationId },
    { enabled: !minimized, refetchInterval: 3000 }
  );
  const markReadMutation = trpc.dm.markRead.useMutation();
  const sendMutation = trpc.dm.send.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.dm.messages.invalidate({ conversationId });
      utils.dm.conversations.invalidate();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  useEffect(() => {
    if (minimized || messages.length === 0) return;
    const last = messages[messages.length - 1] as any;
    if (last?.senderId !== user?.id) {
      markReadMutation.mutate({ conversationId, lastMessageId: last.id });
      utils.dm.conversations.invalidate();
    }
  }, [conversationId, messages, minimized, user?.id]);

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, minimized]);

  const send = () => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate({ conversationId, text });
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={onRestore}
        className="fixed bottom-3 z-[70] flex h-12 w-52 items-center gap-2 rounded-full border border-border bg-card px-3 text-left shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ right: `${16 + offset * 212}px` }}
        aria-label={`Restore chat with ${peer.name}`}
      >
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={peer.avatar ?? undefined} />
          <AvatarFallback className="text-xs font-bold">{initials(peer.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{peer.name}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => { event.stopPropagation(); onClose(); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onClose(); } }}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Close chat with ${peer.name}`}
        >
          <X className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <section
      className="fixed bottom-0 z-[70] flex h-[min(520px,calc(100vh-100px))] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl"
      style={{ right: `${16 + offset * 376}px` }}
      aria-label={`Chat with ${peer.name}`}
    >
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={peer.avatar ?? undefined} />
          <AvatarFallback className="text-xs font-bold">{initials(peer.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{peer.name}</p>
          <p className="text-xs text-muted-foreground">Direct message</p>
        </div>
        <button type="button" onClick={() => onStartCall(false)} className="rounded-full p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700" aria-label={`Voice call ${peer.name}`} title="Voice call">
          <Phone className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onStartCall(true)} className="rounded-full p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700" aria-label={`Video call ${peer.name}`} title="Video call">
          <Video className="h-4 w-4" />
        </button>
        <button type="button" onClick={onMinimize} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={`Minimize chat with ${peer.name}`}>
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={`Close chat with ${peer.name}`}>
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src={peer.avatar ?? undefined} />
              <AvatarFallback className="text-lg font-bold">{initials(peer.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{peer.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Say hello and start a private chat.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((message: any) => {
              const mine = message.senderId === user?.id;
              if (message.deletedAt) {
                return <p key={message.id} className={`text-xs italic text-muted-foreground ${mine ? "text-right" : "text-left"}`}>Message deleted</p>;
              }
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"}`}>
                    {message.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>}
                    {message.fileUrl && message.fileType?.startsWith("image/") && (
                      <img src={message.fileUrl} alt={message.fileName ?? "Shared image"} className="mt-1 max-h-44 max-w-full rounded-xl object-cover" />
                    )}
                    {message.fileUrl && !message.fileType?.startsWith("image/") && (
                      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block max-w-[220px] truncate text-xs underline">{message.fileName ?? "Open attachment"}</a>
                    )}
                    <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{shortTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => { event.preventDefault(); send(); }}
        className="flex items-end gap-2 border-t border-border bg-card px-3 py-2.5"
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={`Message ${peer.name.split(" ")[0]}…`}
          className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/50"
          aria-label={`Message ${peer.name}`}
        />
        <button type="button" onClick={() => setDraft((value) => `${value}${value ? " " : ""}😊`)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Add emoji">
          <Smile className="h-5 w-5" />
        </button>
        <button type="submit" disabled={!draft.trim() || sendMutation.isPending} className="rounded-full bg-primary p-2.5 text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-45" aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}

export default function FloatingChatManager() {
  const { user } = useAuth();
  const [trayOpen, setTrayOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [windows, setWindows] = useState<ChatWindowState[]>([]);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const utils = trpc.useUtils();
  const { data: conversations = [] } = trpc.dm.conversations.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 4000,
  });

  const recentConversations = useMemo(
    () => conversations.filter((conversation: any) => conversation.otherUser?.id).slice(0, 30),
    [conversations]
  );
  const visibleConversations = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    return recentConversations.filter((conversation: any) => {
      const name = String(conversation.otherUser?.name ?? "").toLowerCase();
      const matchesSearch = !query || name.includes(query);
      const matchesUnread = !unreadOnly || (conversation.unreadCount ?? 0) > 0;
      return matchesSearch && matchesUnread;
    });
  }, [chatSearch, recentConversations, unreadOnly]);
  const totalUnread = useMemo(
    () => conversations.reduce((total: number, conversation: any) => total + (conversation.unreadCount ?? 0), 0),
    [conversations]
  );

  const openConversation = (detail: OpenChatDetail) => {
    if (!Number.isInteger(detail.conversationId) || detail.conversationId <= 0) return;
    const conversation: any = conversations.find((item: any) => item.id === detail.conversationId);
    const otherUser = detail.peer ?? (conversation?.otherUser ? {
      id: conversation.otherUser.id,
      name: conversation.otherUser.name ?? "Conversation",
      avatar: conversation.otherUser.avatar ?? null,
    } : undefined);
    if (!otherUser?.id || !otherUser.name) return;

    setWindows((current) => {
      const existing = current.find((window) => window.conversationId === detail.conversationId);
      if (existing) {
        return current.map((window) => window.conversationId === detail.conversationId ? { ...window, minimized: false } : window);
      }
      return [...current.filter((window) => !window.minimized).slice(-1), { conversationId: detail.conversationId, peer: otherUser, minimized: false }];
    });
    setTrayOpen(false);
  };

  useEffect(() => {
    const handleOpen = (event: Event) => openConversation((event as CustomEvent<OpenChatDetail>).detail ?? { conversationId: 0 });
    window.addEventListener("facingface:open-dm", handleOpen);
    return () => window.removeEventListener("facingface:open-dm", handleOpen);
  }, [conversations]);

  useEffect(() => {
    const toggleTray = () => setTrayOpen((open) => !open);
    const openTray = () => setTrayOpen(true);
    window.addEventListener("facingface:toggle-chat-tray", toggleTray);
    window.addEventListener("facingface:open-chat-tray", openTray);
    return () => {
      window.removeEventListener("facingface:toggle-chat-tray", toggleTray);
      window.removeEventListener("facingface:open-chat-tray", openTray);
    };
  }, []);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const conversationId = (event as CustomEvent<{ conversationId?: number }>).detail?.conversationId;
      if (!Number.isInteger(conversationId) || !conversationId || conversationId <= 0) return;
      utils.dm.conversations.invalidate();
      utils.dm.messages.invalidate({ conversationId });
    };
    window.addEventListener("facingface:dm-refresh", handleRefresh);
    return () => window.removeEventListener("facingface:dm-refresh", handleRefresh);
  }, [utils]);

  if (!user || window.location.pathname.startsWith("/messages")) return null;

  return (
    <div className="hidden md:block">
      {outgoingCall && (
        <CallModal
          peerId={outgoingCall.id}
          peerName={outgoingCall.name}
          peerAvatar={outgoingCall.avatar ?? null}
          isVideo={outgoingCall.isVideo}
          onClose={() => setOutgoingCall(null)}
        />
      )}
      {trayOpen && (
        <aside className="fixed right-4 top-[4.75rem] z-[65] flex h-[min(680px,calc(100dvh-5.75rem))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" aria-label="Recent chats">
          <div className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">Chats</p>
                  <p className="text-xs text-muted-foreground">Recent direct messages</p>
                </div>
              </div>
              <button type="button" onClick={() => setTrayOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close chats">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-full bg-muted px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring/40">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search Messenger" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search chats" />
              {chatSearch && <button type="button" onClick={() => setChatSearch("")} className="rounded-full p-0.5 text-muted-foreground hover:bg-background" aria-label="Clear chat search"><X className="h-3.5 w-3.5" /></button>}
            </label>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={() => setUnreadOnly(false)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${!unreadOnly ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>All</button>
              <button type="button" onClick={() => setUnreadOnly(true)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${unreadOnly ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>Unread{totalUnread > 0 ? ` (${totalUnread})` : ""}</button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {recentConversations.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No direct conversations yet. Open a friend’s profile and select Message.</p>
            ) : visibleConversations.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No chats match this view.</p>
            ) : visibleConversations.map((conversation: any) => {
              const peer: Peer = {
                id: conversation.otherUser.id,
                name: conversation.otherUser.name ?? "Conversation",
                avatar: conversation.otherUser.avatar ?? null,
              };
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openConversation({ conversationId: conversation.id, peer })}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted"
                  aria-label={`Open chat with ${peer.name}`}
                >
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarImage src={peer.avatar ?? undefined} />
                    <AvatarFallback className="text-xs font-bold">{initials(peer.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{peer.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{conversation.lastMessageText || (conversation.lastMessageFileName ? "Sent an attachment" : "Start a conversation")}</span>
                  </span>
                  {(conversation.unreadCount ?? 0) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-2">
            <button type="button" onClick={() => { setTrayOpen(false); window.location.assign("/messages"); }} className="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-muted">Open full Messenger</button>
          </div>
        </aside>
      )}

      {windows.map((window, index) => (
        <FloatingConversation
          key={window.conversationId}
          {...window}
          offset={index}
          onMinimize={() => setWindows((current) => current.map((item) => item.conversationId === window.conversationId ? { ...item, minimized: true } : item))}
          onRestore={() => setWindows((current) => current.map((item) => item.conversationId === window.conversationId ? { ...item, minimized: false } : item))}
          onClose={() => setWindows((current) => current.filter((item) => item.conversationId !== window.conversationId))}
          onStartCall={(isVideo) => setOutgoingCall({ ...window.peer, isVideo })}
        />
      ))}

      <button
        type="button"
        onClick={() => setTrayOpen((open) => !open)}
        className="fixed bottom-4 right-4 z-[64] flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Open recent chats"
        title="Chats"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{totalUnread > 9 ? "9+" : totalUnread}</span>}
      </button>
    </div>
  );
}
