import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Paperclip, Send, ArrowLeft, MessageCircle, Download,
  Phone, Video, CheckCheck, Check, BadgeCheck, Search, Smile, Image as ImageIcon, X, ChevronUp, ChevronDown, Trash2,
  Mic, MicOff, Share2, Pin, PinOff, Gift, Users, Bell, BellOff
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CallModal from "@/components/CallModal";
import Picker from "@emoji-mart/react";
import { StoryBar } from "@/components/StoryBar";
import { GroupThread, CreateGroupDialog } from "@/pages/GroupChat";

interface IncomingCallInfo {
  peerId: number;
  peerName: string;
  peerAvatar?: string | null;
  isVideo: boolean;
  offer: RTCSessionDescriptionInit;
}

const DM_FILE_MAX = 3 * 1024 * 1024; // 3 MB
const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 86400000) return formatTime(d);
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDayDivider(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(a: Date | string, b: Date | string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"dms" | "groups">("dms");
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // ── Message search (in-conversation) ─────────────────────────────────────
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchMatchIndex, setMsgSearchMatchIndex] = useState(0);
  const msgSearchRef = useRef<HTMLInputElement>(null);

  // ── Call state ────────────────────────────────────────────────────────────
  const [outgoingCall, setOutgoingCall] = useState<{
    peerId: number;
    peerName: string;
    peerAvatar?: string | null;
    isVideo: boolean;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const socketRef = useRef<any>(null);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Reaction state ────────────────────────────────────────────────────────
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // ── Online presence ───────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // ── Message deletion ──────────────────────────────────────────────────────
  const [contextMenuMsgId, setContextMenuMsgId] = useState<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // ── Message forwarding ────────────────────────────────────────────────────
  const [forwardMsgId, setForwardMsgId] = useState<number | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  // ── Voice recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Pinned messages ──────────────────────────────────────────────────────
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [pinMsgId, setPinMsgId] = useState<number | null>(null);

  // ── GIF picker ────────────────────────────────────────────────────────────
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const gifPickerRef = useRef<HTMLDivElement>(null);

  // Connect Socket.IO and listen for incoming calls + typing
  useEffect(() => {
    if (!user) return;
    import("socket.io-client")
      .then(({ io }) => {
        const socket = io(window.location.origin, {
          path: "/api/socket.io",
          query: { userId: user.id },
        });
        socketRef.current = socket;
        socket.on(
          "call:offer",
          ({ from, fromName, fromAvatar, offer, isVideo }: {
            from: number;
            fromName: string;
            fromAvatar?: string;
            offer: RTCSessionDescriptionInit;
            isVideo: boolean;
          }) => {
            setIncomingCall({
              peerId: from,
              peerName: fromName,
              peerAvatar: fromAvatar ?? null,
              isVideo,
              offer,
            });
          }
        );

        // Typing indicator events
        socket.on("dm:typing", ({ from, conversationId }: { from: number; conversationId: number }) => {
          if (conversationId === activeConvIdRef.current) {
            setPeerIsTyping(true);
          }
        });
        socket.on("dm:stopTyping", ({ from, conversationId }: { from: number; conversationId: number }) => {
          if (conversationId === activeConvIdRef.current) {
            setPeerIsTyping(false);
          }
        });

        // Presence events
        socket.on("dm:online", ({ userId: uid }: { userId: number }) => {
          setOnlineUsers((prev) => new Set(Array.from(prev).concat(uid)));
        });
        socket.on("dm:offline", ({ userId: uid }: { userId: number }) => {
          setOnlineUsers((prev) => { const s = new Set(Array.from(prev)); s.delete(uid); return s; });
        });
      })
      .catch(() => {});
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Keep a ref to activeConvId so socket listeners can read it without stale closure
  const activeConvIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
    // Reset typing indicator when switching conversations
    setPeerIsTyping(false);
  }, [activeConvId]);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPickerFor(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuMsgId(null);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) {
        setShowGifPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPickerFor, contextMenuMsgId]);

  // Update own presence on mount and periodically
  const updatePresenceMutation = trpc.dm.updatePresence.useMutation();
  useEffect(() => {
    updatePresenceMutation.mutate();
    const interval = setInterval(() => updatePresenceMutation.mutate(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle ?conv=ID&msg=TEXT URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convParam = params.get("conv");
    const msgParam = params.get("msg");
    if (convParam) {
      const convId = parseInt(convParam, 10);
      if (!isNaN(convId)) setActiveConvId(convId);
    }
    if (msgParam) setText(decodeURIComponent(msgParam));
  }, [location]);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: conversations = [], isLoading: convsLoading } = trpc.dm.conversations.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: groups = [], isLoading: groupsLoading } = trpc.groups.list.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: groupUnreadData } = trpc.groups.totalUnread.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const totalGroupUnread = groupUnreadData?.count ?? 0;

  const { data: msgs = [], isLoading: msgsLoading } = trpc.dm.messages.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 3000 }
  );

  // ── Reactions ─────────────────────────────────────────────────────────────
  const { data: reactions = [] } = trpc.dm.reactions.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 5000 }
  );

   const deleteMessageMutation = trpc.dm.deleteMessage.useMutation({
    onSuccess: () => {
      utils.dm.messages.invalidate({ conversationId: activeConvId! });
      setContextMenuMsgId(null);
      toast.success("Message deleted");
    },
    onError: (e) => toast.error(e.message),
  });
  const forwardMutation = trpc.dm.forward.useMutation({
    onSuccess: () => {
      setForwardMsgId(null);
      setForwardSearch("");
      toast.success("Message forwarded!");
    },
    onError: (e) => toast.error(e.message),
  });
  const uploadVoiceMutation = trpc.dm.uploadVoice.useMutation({
    onSuccess: () => {
      utils.dm.messages.invalidate({ conversationId: activeConvId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const pinMessageMutation = trpc.dm.pinMessage.useMutation({
    onSuccess: () => {
      utils.dm.pinnedMessages.invalidate({ conversationId: activeConvId! });
      setContextMenuMsgId(null);
      toast.success("Message pinned");
    },
    onError: (e) => toast.error(e.message),
  });

  const unpinMessageMutation = trpc.dm.unpinMessage.useMutation({
    onSuccess: () => {
      utils.dm.pinnedMessages.invalidate({ conversationId: activeConvId! });
      setContextMenuMsgId(null);
      toast.success("Message unpinned");
    },
    onError: (e) => toast.error(e.message),
  });

  // Pinned messages query
  const { data: pinnedMessages = [] } = trpc.dm.pinnedMessages.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId }
  );

  // Read state query
  const { data: readState } = trpc.dm.readState.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 5000 }
  );

  const markReadMutation = trpc.dm.markRead.useMutation();

  // ── DM Mute ───────────────────────────────────────────────────────────────
  const { data: dmMuteData } = trpc.dm.getDmMuteStatus.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId }
  );
  const isDmMuted = dmMuteData?.mutedUntil ? dmMuteData.mutedUntil > Date.now() : false;
  const muteDmMutation = trpc.dm.muteDm.useMutation({
    onSuccess: () => {
      utils.dm.getDmMuteStatus.invalidate({ conversationId: activeConvId! });
      toast.success(isDmMuted ? "Notifications unmuted" : "Notifications muted for 8 hours");
    },
    onError: (e) => toast.error(e.message),
  });

  // Mark messages as read when they load
  useEffect(() => {
    if (!activeConvId || msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.senderId !== user?.id) {
      markReadMutation.mutate({ conversationId: activeConvId, lastMessageId: lastMsg.id });
    }
  }, [msgs, activeConvId]);

  // GIF search function
  async function searchGifs(query: string) {
    setGifLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifResults((json.data ?? []).map((g: any) => ({
        id: g.id,
        url: g.images.original.url,
        preview: g.images.fixed_height_small.url,
      })));
    } catch {
      toast.error("Could not load GIFs");
    } finally {
      setGifLoading(false);
    }
  }

  // Load trending GIFs when picker opens
  useEffect(() => {
    if (showGifPicker && gifResults.length === 0) {
      searchGifs("");
    }
  }, [showGifPicker]);

  function sendGif(gifUrl: string) {
    if (!activeConvId) return;
    sendMutation.mutate({
      conversationId: activeConvId,
      fileUrl: gifUrl,
      fileName: "GIF",
      fileType: "image/gif",
      fileSize: 0,
    });
    setShowGifPicker(false);
    setGifSearch("");
    setGifResults([]);
  }
  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Fetch peer's last seen
  const peerId = (activeConv?.otherUser as any)?.id as number | undefined;
  const { data: presenceData } = trpc.dm.getPresence.useQuery(
    { userId: peerId! },
    { enabled: !!peerId, refetchInterval: 30000 }
  );

  function formatPresence(lastSeenAt: Date | null | undefined, isOnline: boolean) {
    if (isOnline) return "Active now";
    if (!lastSeenAt) return "";
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    if (diff < 60000) return "Active just now";
    if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`;
    return `Active ${Math.floor(diff / 86400000)}d ago`;
  }

  const addReactionMutation = trpc.dm.addReaction.useMutation({
    onSuccess: () => utils.dm.reactions.invalidate({ conversationId: activeConvId! }),
    onError: (e) => toast.error(e.message),
  });

  const removeReactionMutation = trpc.dm.removeReaction.useMutation({
    onSuccess: () => utils.dm.reactions.invalidate({ conversationId: activeConvId! }),
    onError: (e) => toast.error(e.message),
  });

  function getReactionsForMessage(msgId: number) {
    const msgReactions = reactions.filter((r) => r.messageId === msgId);
    // Group by emoji
    const grouped: Record<string, { count: number; myReaction: boolean }> = {};
    for (const r of msgReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, myReaction: false };
      grouped[r.emoji].count++;
      if (r.userId === user?.id) grouped[r.emoji].myReaction = true;
    }
    return grouped;
  }

  function handleReaction(msgId: number, emoji: string) {
    const myReaction = reactions.find((r) => r.messageId === msgId && r.userId === user?.id);
    if (myReaction?.emoji === emoji) {
      removeReactionMutation.mutate({ messageId: msgId });
    } else {
      addReactionMutation.mutate({ messageId: msgId, emoji });
    }
    setHoveredMsgId(null);
    setShowEmojiPickerFor(null);
  }

  // ── Send / upload ─────────────────────────────────────────────────────────
  const sendMutation = trpc.dm.send.useMutation({
    onSuccess: () => {
      utils.dm.messages.invalidate({ conversationId: activeConvId! });
      utils.dm.conversations.invalidate();
      setText("");
      setTimeout(() => inputRef.current?.focus(), 50);
      // Stop typing indicator on send
      emitStopTyping();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.dm.uploadFile.useMutation({
    onSuccess: (data, vars) => {
      sendMutation.mutate({
        conversationId: activeConvId!,
        fileUrl: data.url,
        fileName: vars.fileName,
        fileSize: vars.fileSize,
        fileType: vars.fileType,
      });
    },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── Typing indicator emission ─────────────────────────────────────────────
  function emitStopTyping() {
    if (!activeConvId || !user) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv?.otherUser) return;
    const toUserId = (conv.otherUser as any).id;
    socketRef.current?.emit("dm:stopTyping", { to: toUserId, from: user.id, conversationId: activeConvId });
    isTypingRef.current = false;
  }

  function emitTyping() {
    if (!activeConvId || !user) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv?.otherUser) return;
    const toUserId = (conv.otherUser as any).id;
    if (!isTypingRef.current) {
      socketRef.current?.emit("dm:typing", { to: toUserId, from: user.id, conversationId: activeConvId });
      isTypingRef.current = true;
    }
    // Reset the stop-typing debounce
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 2500);
  }

  // Auto-resize textarea + emit typing
  function handleTextInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    if (e.target.value.trim()) {
      emitTyping();
    } else {
      emitStopTyping();
    }
  }
  // ── Voice recording helpers ─────────────────────────────────────────────
  async function startRecording() {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied.");
    }
  }
  async function stopRecording() {
    if (!mediaRecorderRef.current || !activeConvId) return;
    const mr = mediaRecorderRef.current;
    const duration = recordingSeconds;
    mr.stop();
    mr.stream.getTracks().forEach((t) => t.stop());
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    mediaRecorderRef.current = null;
    await new Promise<void>((resolve) => { mr.onstop = () => resolve(); });
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      uploadVoiceMutation.mutate({ conversationId: activeConvId, audioBase64: b64, durationSeconds: Math.max(1, duration) });
    };
    reader.readAsDataURL(blob);
  }
  function cancelRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  }
  function startVoiceCall() {
    if (!activeConv?.otherUser) return;
    setOutgoingCall({
      peerId: (activeConv.otherUser as any).id,
      peerName: (activeConv.otherUser as any).name ?? "Unknown",
      peerAvatar: (activeConv.otherUser as any).avatar ?? null,
      isVideo: false,
    });
  }

  function startVideoCall() {
    if (!activeConv?.otherUser) return;
    setOutgoingCall({
      peerId: (activeConv.otherUser as any).id,
      peerName: (activeConv.otherUser as any).name ?? "Unknown",
      peerAvatar: (activeConv.otherUser as any).avatar ?? null,
      isVideo: true,
    });
  }

  async function handleSend() {
    if (!text.trim() || !activeConvId) return;
    sendMutation.mutate({ conversationId: activeConvId, text: text.trim() });
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, imageOnly = false) {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    if (file.size > DM_FILE_MAX) {
      toast.error("File must be under 3 MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        conversationId: activeConvId,
        fileBase64: base64,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Filter conversations by search
  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = (c.otherUser as any)?.name ?? "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── In-conversation message search ────────────────────────────────────────
  const msgSearchTerm = msgSearchQuery.trim().toLowerCase();
  const matchingMsgIds: number[] = msgSearchTerm
    ? msgs.filter((m) => m.text?.toLowerCase().includes(msgSearchTerm)).map((m) => m.id)
    : [];
  const totalMatches = matchingMsgIds.length;

  // Clamp match index
  const safeMatchIndex = totalMatches > 0 ? Math.min(msgSearchMatchIndex, totalMatches - 1) : 0;

  // Scroll to current match
  const matchRefs = useRef<Record<number, HTMLDivElement | null>>({});
  useEffect(() => {
    if (totalMatches > 0 && matchingMsgIds[safeMatchIndex] !== undefined) {
      const el = matchRefs.current[matchingMsgIds[safeMatchIndex]];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [safeMatchIndex, totalMatches, msgSearchTerm]);

  // Reset match index when search term changes
  useEffect(() => {
    setMsgSearchMatchIndex(0);
  }, [msgSearchQuery]);

  // Group messages by date for dividers
  function buildMessageGroups(msgList: typeof msgs) {
    const groups: { date: Date | string; messages: typeof msgs }[] = [];
    for (const msg of msgList) {
      const last = groups[groups.length - 1];
      if (!last || !isSameDay(last.date, msg.createdAt)) {
        groups.push({ date: msg.createdAt, messages: [msg] });
      } else {
        last.messages.push(msg);
      }
    }
    return groups;
  }

  const messageGroups = buildMessageGroups(msgs);
  const myMsgs = msgs.filter((m) => m.senderId === user?.id);
  const lastMyMsgId = myMsgs.length > 0 ? myMsgs[myMsgs.length - 1].id : null;

  return (
    <>
      {outgoingCall && (
        <CallModal
          peerId={outgoingCall.peerId}
          peerName={outgoingCall.peerName}
          peerAvatar={outgoingCall.peerAvatar}
          isVideo={outgoingCall.isVideo}
          socketRef={socketRef}
          onClose={() => setOutgoingCall(null)}
        />
      )}
      {incomingCall && (
        <CallModal
          peerId={incomingCall.peerId}
          peerName={incomingCall.peerName}
          peerAvatar={incomingCall.peerAvatar}
          isVideo={incomingCall.isVideo}
          incomingOffer={incomingCall.offer}
          socketRef={socketRef}
          onClose={() => setIncomingCall(null)}
        />
      )}

      {/* ── Full-height chat layout ── */}
      <div
        className="flex overflow-hidden"
        style={{
          height: "calc(100dvh - 4rem)",
          minHeight: 0,
          background: "var(--its-bg)",
        }}
      >
        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <div
          className={cn(
            "flex flex-col border-r min-h-0 overflow-hidden",
            "w-full md:w-[340px] md:min-w-[280px] md:max-w-[340px]",
            activeConvId ? "hidden md:flex" : "flex"
          )}
          style={{ borderColor: "var(--its-border)", background: "var(--its-bg)" }}
        >
          {/* Sidebar header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--its-border)" }}
          >
            <h2 className="text-xl font-bold" style={{ color: "var(--its-text-primary)" }}>
              Chats
            </h2>
            <div className="flex items-center gap-1">
              {sidebarTab === "groups" && (
                <CreateGroupDialog onCreated={(id) => { setActiveGroupId(id); }} />
              )}
              {sidebarTab === "dms" && (
                <button
                  onClick={() => setShowSearch((v) => !v)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                  title="Search conversations"
                >
                  <Search className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                </button>
              )}
            </div>
          </div>
          {/* Stories tray */}
          <div className="border-b px-2 py-3 flex-shrink-0 overflow-hidden" style={{ borderColor: "var(--its-border)" }}>
            <StoryBar />
          </div>
          {/* DMs / Groups tabs */}
          <div className="border-b px-3 py-2 flex-shrink-0" style={{ borderColor: "var(--its-border)" }}>
            <div className="grid grid-cols-2 gap-2 rounded-2xl p-1" style={{ background: "var(--its-surface)" }}>
              <button
                className={cn(
                  "min-h-[44px] rounded-xl px-2 text-sm font-semibold leading-tight transition-all flex items-center justify-center text-center",
                  sidebarTab === "dms"
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={sidebarTab === "dms" ? { background: "var(--its-bg)", color: "var(--its-primary)" } : undefined}
                onClick={() => { setSidebarTab("dms"); setActiveGroupId(null); }}
              >
                Direct Messages
              </button>
              <button
                className={cn(
                  "min-h-[44px] rounded-xl px-2 text-sm font-semibold leading-tight transition-all flex items-center justify-center text-center",
                  sidebarTab === "groups"
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={sidebarTab === "groups" ? { background: "var(--its-bg)", color: "var(--its-primary)" } : undefined}
                onClick={() => { setSidebarTab("groups"); setActiveConvId(null); }}
              >
                <span className="relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                  Groups
                  {totalGroupUnread > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {totalGroupUnread > 99 ? "99+" : totalGroupUnread}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--its-border)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="w-full pl-8 pr-8 py-2 text-sm rounded-full bg-muted/60 border-0 outline-none"
                  style={{ color: "var(--its-text-primary)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DMs tab */}
          {sidebarTab === "dms" && (
          <ScrollArea className="flex-1 min-h-0">
            {convsLoading && (
              <div className="flex flex-col gap-3 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!convsLoading && filteredConvs.length === 0 && (
              <div className="p-8 text-center" style={{ color: "var(--its-text-muted)" }}>
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1 opacity-70">Visit a friend's profile to start a chat.</p>
              </div>
            )}
            {filteredConvs.map((conv) => {
              const other = conv.otherUser as any;
              const isActive = conv.id === activeConvId;
              const unread = (conv as any).unreadCount ?? 0;
              const lastText = (conv as any).lastMessageText as string | null;
              const lastSenderId = (conv as any).lastMessageSenderId as number | null;
              const previewText = lastText
                ? (lastSenderId === user?.id ? `You: ${lastText}` : lastText)
                : "Start a conversation";

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left relative",
                    isActive
                      ? "bg-primary/10"
                      : "hover:bg-muted/40"
                  )}
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 sm:w-12 sm:h-12">
                      <AvatarImage src={other?.avatar ?? undefined} />
                      <AvatarFallback className="text-sm font-semibold">
                        {getInitials(other?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(other?.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "font-semibold truncate text-sm flex items-center gap-1",
                          unread > 0 ? "font-bold" : ""
                        )}
                        style={{ color: "var(--its-text-primary)" }}
                      >
                        {other?.name ?? "Unknown"}
                        {other?.isVerified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                      </p>
                      <span
                        className="text-[11px] flex-shrink-0"
                        style={{ color: unread > 0 ? "var(--its-primary)" : "var(--its-text-muted)" }}
                      >
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p
                        className={cn(
                          "text-xs truncate",
                          unread > 0 ? "font-semibold" : "opacity-60"
                        )}
                        style={{ color: unread > 0 ? "var(--its-text-primary)" : "var(--its-text-muted)" }}
                      >
                        {previewText}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
          )}
          {/* Groups tab */}
          {sidebarTab === "groups" && (
            <ScrollArea className="flex-1 min-h-0">
              {groupsLoading && (
                <div className="flex flex-col gap-3 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="h-2.5 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!groupsLoading && groups.length === 0 && (
                <div className="p-8 text-center" style={{ color: "var(--its-text-muted)" }}>
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No groups yet</p>
                  <p className="text-xs mt-1 opacity-70">Create a group to start chatting.</p>
                </div>
              )}
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left relative",
                    activeGroupId === g.id ? "bg-primary/10" : "hover:bg-muted/40"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {g.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm" style={{ color: "var(--its-text-primary)" }}>{g.name}</p>
                    {g.description && (
                      <p className="text-xs truncate opacity-60" style={{ color: "var(--its-text-muted)" }}>{g.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          )}
        </div>

        {/* ══ CHAT THREAD ══════════════════════════════════════════════════════ */}
        {/* Group thread panel */}
        {sidebarTab === "groups" && activeGroupId !== null && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <GroupThread groupId={activeGroupId} onBack={() => setActiveGroupId(null)} />
          </div>
        )}
        {/* DM thread panel */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            (!activeConvId || sidebarTab === "groups") ? "hidden md:flex" : "flex",
            sidebarTab === "groups" ? "hidden" : ""
          )}
          style={{ background: "var(--its-bg)" }}
        >
          {!activeConvId ? (
            /* Empty state */
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4"
              style={{ color: "var(--its-text-muted)" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--its-border)" }}
              >
                <MessageCircle className="w-10 h-10 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base" style={{ color: "var(--its-text-primary)" }}>
                  Your Messages
                </p>
                <p className="text-sm mt-1 opacity-70">
                  Select a conversation or visit a friend's profile to start chatting.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Thread Header ── */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 border-b shadow-sm flex-shrink-0"
                style={{ borderColor: "var(--its-border)", background: "var(--its-bg)" }}
              >
                {/* Back button (mobile) */}
                <button
                  className="md:hidden p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setActiveConvId(null);
                    setShowMsgSearch(false);
                    setMsgSearchQuery("");
                  }}
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: "var(--its-text-primary)" }} />
                </button>

                {/* Avatar + name */}
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => {
                    if ((activeConv?.otherUser as any)?.id) {
                      navigate(`/profile/${(activeConv?.otherUser as any).id}`);
                    }
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={(activeConv?.otherUser as any)?.avatar ?? undefined} />
                      <AvatarFallback className="text-sm font-semibold">
                        {getInitials((activeConv?.otherUser as any)?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-bold text-sm truncate flex items-center gap-1 hover:underline"
                      style={{ color: "var(--its-text-primary)" }}
                    >
                      {(activeConv?.otherUser as any)?.name ?? "Unknown"}
                      {(activeConv?.otherUser as any)?.isVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] flex items-center gap-1" style={{ color: peerId && onlineUsers.has(peerId) ? "#22c55e" : "var(--its-text-muted)" }}>
                      {peerId && onlineUsers.has(peerId) && (
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                      )}
                      {formatPresence(presenceData?.lastSeenAt, !!(peerId && onlineUsers.has(peerId))) || "Tap to view profile"}
                    </p>
                  </div>
                </button>

                {/* Action buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  {/* Mute toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", isDmMuted && "bg-muted/60")}
                    title={isDmMuted ? "Unmute notifications" : "Mute notifications"}
                    onClick={() => muteDmMutation.mutate({
                      conversationId: activeConvId!,
                      mutedUntil: isDmMuted ? null : Date.now() + 8 * 3600000,
                    })}
                  >
                    {isDmMuted ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4" />}
                  </Button>
                  {/* Pinned messages toggle */}
                  {pinnedMessages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("rounded-full w-9 h-9 relative", showPinnedPanel && "bg-primary/10")}
                      title="Pinned messages"
                      onClick={() => setShowPinnedPanel((v) => !v)}
                    >
                      <Pin className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                        {pinnedMessages.length}
                      </span>
                    </Button>
                  )}
                  {/* Message search toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", showMsgSearch && "bg-primary/10")}
                    title="Search messages"
                    onClick={() => {
                      setShowMsgSearch((v) => !v);
                      setMsgSearchQuery("");
                      setTimeout(() => msgSearchRef.current?.focus(), 100);
                    }}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-9 h-9"
                    title="Voice call"
                    onClick={startVoiceCall}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-9 h-9"
                    title="Video call"
                    onClick={startVideoCall}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ── Message Search Bar ── */}
              {showMsgSearch && (
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
                  style={{ borderColor: "var(--its-border)", background: "var(--its-card)" }}
                >
                  <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--its-text-muted)" }} />
                  <input
                    ref={msgSearchRef}
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    placeholder="Search in conversation..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm"
                    style={{ color: "var(--its-text-primary)" }}
                  />
                  {msgSearchTerm && (
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--its-text-muted)" }}>
                      {totalMatches > 0 ? `${safeMatchIndex + 1} / ${totalMatches}` : "No results"}
                    </span>
                  )}
                  {totalMatches > 1 && (
                    <>
                      <button
                        className="p-1 rounded hover:bg-muted/50"
                        onClick={() => setMsgSearchMatchIndex((i) => (i - 1 + totalMatches) % totalMatches)}
                        title="Previous match"
                      >
                        <ChevronUp className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-muted/50"
                        onClick={() => setMsgSearchMatchIndex((i) => (i + 1) % totalMatches)}
                        title="Next match"
                      >
                        <ChevronDown className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                      </button>
                    </>
                  )}
                  {msgSearchQuery && (
                    <button
                      className="p-1 rounded hover:bg-muted/50"
                      onClick={() => { setMsgSearchQuery(""); }}
                    >
                      <X className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                    </button>
                  )}
                  <button
                    className="p-1 rounded hover:bg-muted/50"
                    onClick={() => { setShowMsgSearch(false); setMsgSearchQuery(""); }}
                  >
                    <X className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                  </button>
                </div>
              )}

              {/* ── Pinned Messages Panel ── */}
              {showPinnedPanel && pinnedMessages.length > 0 && (
                <div
                  className="border-b flex-shrink-0 max-h-40 overflow-y-auto"
                  style={{ borderColor: "var(--its-border)", background: "var(--its-card)" }}
                >
                  <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: "var(--its-border)" }}>
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--its-text-muted)" }}>
                      <Pin className="w-3 h-3" />
                      {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? "s" : ""}
                    </span>
                    <button onClick={() => setShowPinnedPanel(false)} className="p-0.5 rounded hover:bg-muted/50">
                      <X className="w-3.5 h-3.5" style={{ color: "var(--its-text-muted)" }} />
                    </button>
                  </div>
                  {pinnedMessages.map((pm: any) => (
                    <div key={pm.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                      <Pin className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-50" style={{ color: "var(--its-primary)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: "var(--its-text-primary)" }}>
                          {pm.text || (pm.fileType?.startsWith("image/") ? "📷 Image" : pm.fileType?.startsWith("audio/") ? "🎤 Voice message" : "📎 File")}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--its-text-muted)" }}>
                          {formatTime(pm.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => unpinMessageMutation.mutate({ messageId: pm.id, conversationId: activeConvId! })}
                        className="p-0.5 rounded hover:bg-muted/50 flex-shrink-0"
                        title="Unpin"
                      >
                        <PinOff className="w-3.5 h-3.5" style={{ color: "var(--its-text-muted)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Messages Area ── */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ minHeight: 0 }}>
                {msgsLoading && (
                  <div className="flex flex-col gap-3 py-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn("flex items-end gap-2 animate-pulse", i % 2 === 0 ? "flex-row-reverse" : "")}
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
                        <div
                          className={cn("h-9 rounded-2xl bg-muted", i % 2 === 0 ? "w-40" : "w-52")}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {messageGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px" style={{ background: "var(--its-border)" }} />
                      <span
                        className="text-[11px] font-medium px-2"
                        style={{ color: "var(--its-text-muted)" }}
                      >
                        {formatDayDivider(group.date)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--its-border)" }} />
                    </div>

                    {/* Messages in this day */}
                    <div className="space-y-1">
                      {group.messages.map((msg, mi) => {
                        const isMine = msg.senderId === user?.id;
                        const isLastMine = isMine && msg.id === lastMyMsgId;
                        const prevMsg = group.messages[mi - 1];
                        const nextMsg = group.messages[mi + 1];
                        const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                        const otherAvatar = (activeConv?.otherUser as any)?.avatar;
                        const otherName = (activeConv?.otherUser as any)?.name ?? "?";
                        const msgReactions = getReactionsForMessage(msg.id);
                        const hasReactions = Object.keys(msgReactions).length > 0;
                        const isHovered = hoveredMsgId === msg.id;
                        const isCurrentMatch = msgSearchTerm && matchingMsgIds[safeMatchIndex] === msg.id;
                        const isAnyMatch = msgSearchTerm && matchingMsgIds.includes(msg.id);

                        // Soft-deleted messages show placeholder
                        if (msg.deletedAt) {
                          return (
                            <div key={msg.id} className={cn("flex items-end gap-2", isMine ? "flex-row-reverse" : "flex-row", isFirstInGroup ? "mt-3" : "mt-0.5")}>
                              {!isMine && <div className="w-7 flex-shrink-0" />}
                              <div className="px-3 py-2 rounded-2xl text-xs italic opacity-50" style={{ background: "var(--its-card)", border: "1px solid var(--its-border)", color: "var(--its-text-muted)" }}>
                                Message deleted
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            ref={(el) => { matchRefs.current[msg.id] = el; }}
                            className={cn(
                              "flex items-end gap-2 group relative",
                              isMine ? "flex-row-reverse" : "flex-row",
                              isFirstInGroup ? "mt-3" : "mt-0.5",
                              isCurrentMatch ? "ring-2 ring-yellow-400 rounded-2xl" : ""
                            )}
                            onMouseEnter={() => setHoveredMsgId(msg.id)}
                            onMouseLeave={() => {
                              if (showEmojiPickerFor !== msg.id) setHoveredMsgId(null);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault(); setContextMenuMsgId(msg.id);
                            }}
                          >
                            {/* Other user avatar (only on last message in group) */}
                            {!isMine && (
                              <div className="w-7 flex-shrink-0 self-end mb-1">
                                {isLastInGroup ? (
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={otherAvatar ?? undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(otherName)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null}
                              </div>
                            )}

                            <div
                              className={cn(
                                "flex flex-col max-w-[72%] sm:max-w-[60%]",
                                isMine ? "items-end" : "items-start"
                              )}
                            >
                              {/* Bubble */}
                              <div
                                className={cn(
                                  "px-3 py-2 text-sm shadow-sm relative",
                                  isMine
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground",
                                  isMine
                                    ? cn(
                                        "rounded-2xl",
                                        isFirstInGroup ? "rounded-tr-md" : "",
                                        isLastInGroup ? "rounded-br-md" : ""
                                      )
                                    : cn(
                                        "rounded-2xl",
                                        isFirstInGroup ? "rounded-tl-md" : "",
                                        isLastInGroup ? "rounded-bl-md" : ""
                                      ),
                                  isAnyMatch ? "ring-1 ring-yellow-400" : ""
                                )}
                                style={
                                  !isMine
                                    ? { background: "var(--its-card)", border: "1px solid var(--its-border)" }
                                    : {}
                                }
                              >
                                {msg.text && (
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                                    {msgSearchTerm ? highlightText(msg.text, msgSearchQuery.trim()) : msg.text}
                                  </p>
                                )}
                                {msg.fileUrl && (
                                  <div className="mt-1">
                                    {msg.fileType?.startsWith("image/") ? (
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName ?? "image"}
                                        className="max-w-full rounded-xl max-h-56 object-cover cursor-pointer"
                                        onClick={() => window.open(msg.fileUrl!, "_blank")}
                                      />
                                    ) : msg.fileType?.startsWith("audio/") ? (
                                      <div className="flex items-center gap-2 py-1">
                                        <Mic className="w-4 h-4 flex-shrink-0 opacity-70" />
                                        <audio
                                          controls
                                          src={msg.fileUrl}
                                          className="h-8 max-w-[200px]"
                                          style={{ accentColor: "var(--its-primary)" }}
                                        />
                                        {msg.fileName && (
                                          <span className="text-xs opacity-60 truncate max-w-[80px]">{msg.fileName}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <a
                                        href={msg.fileUrl}
                                        download={msg.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 text-xs underline opacity-90 py-1"
                                      >
                                        <Download className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{msg.fileName ?? "Download file"}</span>
                                        {msg.fileSize && (
                                          <span className="opacity-60 flex-shrink-0">
                                            ({(msg.fileSize / 1024).toFixed(0)} KB)
                                          </span>
                                        )}
                                      </a>
                                    )}
                                  </div>
                                )}
                                {/* Timestamp inside bubble on last in group */}
                                {isLastInGroup && (
                                  <p
                                    className={cn(
                                      "text-[10px] mt-1 leading-none",
                                      isMine ? "text-right opacity-70" : "opacity-50"
                                    )}
                                  >
                                    {formatTime(msg.createdAt)}
                                  </p>
                                )}
                              </div>

                              {/* Reaction counts below bubble */}
                              {hasReactions && (
                                <div className={cn("flex flex-wrap gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
                                  {Object.entries(msgReactions).map(([emoji, { count, myReaction }]) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={cn(
                                        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                                        myReaction
                                          ? "bg-primary/20 border-primary/40 text-primary"
                                          : "bg-muted/60 border-transparent hover:bg-muted"
                                      )}
                                      title={myReaction ? "Remove reaction" : "Add reaction"}
                                    >
                                      <span>{emoji}</span>
                                      {count > 1 && <span className="font-medium">{count}</span>}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Read receipt — only on last sent message */}
                              {isLastMine && (() => {
                                // Determine which P1/P2 slot is the peer
                                const peerReadId = readState
                                  ? (readState.participant1Id === user?.id
                                    ? readState.lastReadMessageIdP2
                                    : readState.lastReadMessageIdP1)
                                  : null;
                                const isSeen = peerReadId != null && msg.id <= peerReadId;
                                const seenAt: Date | null = null; // updatedAt not tracked per-slot yet
                                return (
                                  <div className="flex items-center gap-1 mt-0.5 px-1">
                                    {isSeen ? (
                                      <>
                                        <CheckCheck className="w-3 h-3 text-blue-500" />
                                        <span className="text-[10px] text-blue-500 font-medium">
                                          Seen{seenAt ? ` · ${formatTime(seenAt)}` : ""}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">Sent</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* ── Quick reaction bar (on hover) ── */}
                            {isHovered && (
                              <div
                                className={cn(
                                  "absolute bottom-full mb-1 z-20 flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border",
                                  isMine ? "right-8" : "left-8"
                                )}
                                style={{ background: "var(--its-card)", borderColor: "var(--its-border)" }}
                                onMouseEnter={() => setHoveredMsgId(msg.id)}
                                onMouseLeave={() => {
                                  if (showEmojiPickerFor !== msg.id) setHoveredMsgId(null);
                                }}
                              >
                                {QUICK_EMOJIS.map((emoji) => {
                                  const myReaction = reactions.find((r) => r.messageId === msg.id && r.userId === user?.id);
                                  const isSelected = myReaction?.emoji === emoji;
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={cn(
                                        "text-base w-7 h-7 flex items-center justify-center rounded-full transition-transform hover:scale-125",
                                        isSelected ? "bg-primary/20" : "hover:bg-muted/60"
                                      )}
                                      title={emoji}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                                {/* Full emoji picker trigger */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiPickerFor((v) => v === msg.id ? null : msg.id);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors"
                                  title="More reactions"
                                >
                                  <Smile className="w-4 h-4" style={{ color: "var(--its-text-muted)" }} />
                                </button>
                              </div>
                            )}

                            {/* Full emoji picker */}
                            {showEmojiPickerFor === msg.id && (
                              <div
                                ref={emojiPickerRef}
                                className={cn(
                                  "absolute bottom-full mb-12 z-30",
                                  isMine ? "right-0" : "left-0"
                                )}
                              >
                                <Picker
                                  onEmojiSelect={(e: any) => handleReaction(msg.id, e.native)}
                                  theme="auto"
                                  previewPosition="none"
                                  skinTonePosition="none"
                                />
                              </div>
                            )}

                            {/* Context menu (delete + forward) */}
                            {contextMenuMsgId === msg.id && (
                              <div
                                ref={contextMenuRef}
                                className={cn(
                                  "absolute bottom-full mb-1 z-40 rounded-xl shadow-xl border overflow-hidden",
                                  isMine ? "right-8" : "left-8"
                                )}
                                style={{ background: "var(--its-card)", borderColor: "var(--its-border)", minWidth: "160px" }}
                              >
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  style={{ color: "var(--its-text-primary)" }}
                                  onClick={() => { setForwardMsgId(msg.id); setContextMenuMsgId(null); }}
                                >
                                  <Share2 className="w-4 h-4" />
                                  Forward
                                </button>
                                {(() => {
                                  const isPinned = pinnedMessages.some((pm: any) => pm.id === msg.id);
                                  return isPinned ? (
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      style={{ color: "var(--its-text-primary)" }}
                                      onClick={() => unpinMessageMutation.mutate({ messageId: msg.id, conversationId: activeConvId! })}
                                    >
                                      <PinOff className="w-4 h-4" />
                                      Unpin
                                    </button>
                                  ) : (
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      style={{ color: "var(--its-text-primary)" }}
                                      onClick={() => pinMessageMutation.mutate({ messageId: msg.id, conversationId: activeConvId! })}
                                    >
                                      <Pin className="w-4 h-4" />
                                      Pin message
                                    </button>
                                  );
                                })()}
                                {isMine && (
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    onClick={() => deleteMessageMutation.mutate({ messageId: msg.id })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Unsend message
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {!msgsLoading && msgs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={(activeConv?.otherUser as any)?.avatar ?? undefined} />
                      <AvatarFallback className="text-xl font-bold">
                        {getInitials((activeConv?.otherUser as any)?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="font-bold text-base" style={{ color: "var(--its-text-primary)" }}>
                        {(activeConv?.otherUser as any)?.name ?? "Unknown"}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--its-text-muted)" }}>
                        Say hello! 👋
                      </p>
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {peerIsTyping && (
                  <div className="flex items-end gap-2 mt-2">
                    <div className="w-7 flex-shrink-0 self-end mb-1">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={(activeConv?.otherUser as any)?.avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials((activeConv?.otherUser as any)?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl rounded-bl-md text-sm shadow-sm flex items-center gap-1"
                      style={{ background: "var(--its-card)", border: "1px solid var(--its-border)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* ── Input Bar ── */}
              <div
                className="flex items-end gap-2 px-3 py-2.5 border-t flex-shrink-0"
                style={{ borderColor: "var(--its-border)", background: "var(--its-bg)" }}
              >
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="*/*"
                  onChange={(e) => handleFileChange(e)}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, true)}
                />

                {/* Attach image */}
                <button
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0 mb-0.5"
                  title="Send image"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || sendMutation.isPending}
                >
                  <ImageIcon className="w-5 h-5" style={{ color: "var(--its-primary)" }} />
                </button>

                {/* Attach file */}
                <button
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0 mb-0.5"
                  title="Attach file (max 3 MB)"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sendMutation.isPending}
                >
                  <Paperclip className="w-5 h-5" style={{ color: "var(--its-primary)" }} />
                </button>
                {/* GIF picker */}
                <div className="relative flex-shrink-0">
                  <button
                    className={cn("p-2 rounded-full hover:bg-muted/50 transition-colors mb-0.5", showGifPicker && "bg-primary/10")}
                    title="Send GIF"
                    onClick={() => setShowGifPicker((v) => !v)}
                    disabled={uploading || sendMutation.isPending}
                  >
                    <Gift className="w-5 h-5" style={{ color: "var(--its-primary)" }} />
                  </button>
                  {showGifPicker && (
                    <div
                      ref={gifPickerRef}
                      className="absolute bottom-full mb-2 left-0 z-40 rounded-2xl shadow-2xl border overflow-hidden"
                      style={{ background: "var(--its-card)", borderColor: "var(--its-border)", width: "300px" }}
                    >
                      <div className="p-2 border-b" style={{ borderColor: "var(--its-border)" }}>
                        <input
                          autoFocus
                          value={gifSearch}
                          onChange={(e) => {
                            setGifSearch(e.target.value);
                            const v = e.target.value;
                            const t = setTimeout(() => searchGifs(v), 400);
                            return () => clearTimeout(t);
                          }}
                          placeholder="Search GIFs..."
                          className="w-full px-3 py-1.5 text-sm rounded-lg border-0 outline-none"
                          style={{ background: "var(--its-bg)", color: "var(--its-text-primary)" }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1 p-2 max-h-48 overflow-y-auto">
                        {gifLoading && (
                          <div className="col-span-3 flex items-center justify-center py-6">
                            <span className="text-xs" style={{ color: "var(--its-text-muted)" }}>Loading...</span>
                          </div>
                        )}
                        {!gifLoading && gifResults.map((gif) => (
                          <button
                            key={gif.id}
                            onClick={() => sendGif(gif.url)}
                            className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity aspect-video"
                          >
                            <img src={gif.preview} alt="gif" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                        {!gifLoading && gifResults.length === 0 && (
                          <div className="col-span-3 text-center py-4 text-xs" style={{ color: "var(--its-text-muted)" }}>No GIFs found</div>
                        )}
                      </div>
                      <div className="px-2 pb-1 text-[10px] text-right" style={{ color: "var(--its-text-muted)" }}>Powered by GIPHY</div>
                    </div>
                  )}
                </div>
                {/* Text input */}
                <div
                  className="flex-1 flex items-end rounded-2xl px-3 py-2 border"
                  style={{
                    background: "var(--its-card)",
                    borderColor: "var(--its-border)",
                    minHeight: "40px",
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={handleTextInput}
                    placeholder="Aa"
                    rows={1}
                    className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-relaxed"
                    style={{
                      color: "var(--its-text-primary)",
                      maxHeight: "120px",
                      overflowY: "auto",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sendMutation.isPending || uploading}
                  />
                </div>

                {/* Mic / Send button */}
                {isRecording ? (
                  <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                    <span className="text-xs font-mono text-red-500 animate-pulse">{recordingSeconds}s</span>
                    <button
                      className="p-2.5 rounded-full bg-green-500 text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
                      onClick={stopRecording}
                      title="Send voice message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2.5 rounded-full bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-500 transition-all"
                      onClick={cancelRecording}
                      title="Cancel recording"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : text.trim() ? (
                  <button
                    className="p-2.5 rounded-full flex-shrink-0 mb-0.5 bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    onClick={handleSend}
                    disabled={sendMutation.isPending || uploading}
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    className="p-2.5 rounded-full flex-shrink-0 mb-0.5 bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    onClick={startRecording}
                    title="Record voice message"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Forward Modal ──────────────────────────────────────────────────── */}
      {forwardMsgId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setForwardMsgId(null); setForwardSearch(""); }}
        >
          <div
            className="rounded-2xl shadow-2xl border w-full max-w-sm mx-4 overflow-hidden"
            style={{ background: "var(--its-card)", borderColor: "var(--its-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <h3 className="font-bold text-base mb-3" style={{ color: "var(--its-text-primary)" }}>Forward to...</h3>
              <input
                type="text"
                placeholder="Search conversations..."
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: "var(--its-bg)", borderColor: "var(--its-border)", color: "var(--its-text-primary)" }}
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {conversations
                .filter((c) => {
                  const name = (c.otherUser as any)?.name ?? "";
                  return name.toLowerCase().includes(forwardSearch.toLowerCase());
                })
                .map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    onClick={() => forwardMutation.mutate({ messageId: forwardMsgId, toConversationId: c.id })}
                    disabled={forwardMutation.isPending}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={(c.otherUser as any)?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {getInitials((c.otherUser as any)?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: "var(--its-text-primary)" }}>
                      {(c.otherUser as any)?.name ?? "Unknown"}
                    </span>
                  </button>
                ))}
            </div>
            <div className="px-5 pb-4 pt-2">
              <button
                className="w-full py-2 rounded-lg text-sm font-medium border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ borderColor: "var(--its-border)", color: "var(--its-text-secondary)" }}
                onClick={() => { setForwardMsgId(null); setForwardSearch(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
