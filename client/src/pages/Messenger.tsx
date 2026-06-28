import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { type ThemeMode, useThemeMode } from "@/contexts/ThemeModeContext";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  Paperclip,
  Phone,
  Pin,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  UserRound,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Picker from "@emoji-mart/react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CallModal from "@/components/CallModal";
import { CreateGroupDialog, GroupThread } from "@/pages/GroupChat";
import { StoryBar } from "@/components/StoryBar";

const DM_FILE_MAX = 3 * 1024 * 1024;
const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const PREF_SOUND_KEY = "facingface-messenger-sounds";
const PREF_DND_KEY = "facingface-messenger-dnd";
const PREF_ACTIVE_STATUS_KEY = "facingface-messenger-active-status";

type ActiveTarget = { kind: "dm"; id: number } | { kind: "group"; id: number } | null;
type IncomingCallInfo = {
  peerId: number;
  peerName: string;
  peerAvatar?: string | null;
  isVideo: boolean;
  offer: RTCSessionDescriptionInit;
};

function getInitials(name?: string | null) {
  const safeName = name?.trim() || "User";
  return safeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Now";
  if (diff < 86400000) return formatTime(d);
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDayDivider(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(a: Date | string, b: Date | string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatPresence(lastSeenAt: Date | string | null | undefined, online: boolean) {
  if (online) return "Active now";
  if (!lastSeenAt) return "Messenger";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < 60000) return "Active just now";
  if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`;
  return `Active ${Math.floor(diff / 86400000)}d ago`;
}

function bytesToLabel(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(message: any) {
  const type = (message?.fileType ?? "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (message?.fileUrl) return "file";
  return "text";
}

function readBooleanPreference(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function getMainFacingFaceUrl(path = "") {
  if (typeof window === "undefined") return path || "/";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const host = window.location.hostname.toLowerCase();
  const baseUrl = host === "chat.facingface.com" ? "https://facingface.com" : window.location.origin;
  return `${baseUrl}${normalizedPath}`;
}

function playMessengerNotificationSound() {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
  gain.connect(ctx.destination);

  [660, 880].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + index * 0.13);
    oscillator.connect(gain);
    oscillator.start(ctx.currentTime + index * 0.13);
    oscillator.stop(ctx.currentTime + index * 0.13 + 0.18);
  });
  window.setTimeout(() => ctx.close().catch(() => {}), 800);
}

function extractLinks(messages: any[]) {
  const linkRegex = /https?:\/\/[^\s]+/g;
  return messages.flatMap((message) => {
    const text = message.text ?? "";
    const matches = text.match(linkRegex) ?? [];
    return matches.map((url: string) => ({ id: `${message.id}-${url}`, url, message }));
  });
}

export default function Messenger() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { themeMode, setThemeMode } = useThemeMode();
  const utils = trpc.useUtils();

  const [active, setActive] = useState<ActiveTarget>(null);
  const [sidebarMode, setSidebarMode] = useState<"inbox" | "groups">("inbox");
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{ peerId: number; peerName: string; peerAvatar?: string | null; isVideo: boolean } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notificationSounds, setNotificationSounds] = useState(() => readBooleanPreference(PREF_SOUND_KEY, true));
  const [doNotDisturb, setDoNotDisturb] = useState(() => readBooleanPreference(PREF_DND_KEY, false));
  const [activeStatusEnabled, setActiveStatusEnabled] = useState(() => readBooleanPreference(PREF_ACTIVE_STATUS_KEY, true));
  
  const socketRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<ActiveTarget>(active);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestConversationMessageIdsRef = useRef<Map<number, number>>(new Map());
  const preferencesReadyRef = useRef(false);

  const { data: conversations = [], isLoading: conversationsLoading } = trpc.dm.conversations.useQuery(undefined, { refetchInterval: 4000 });
  const { data: groups = [], isLoading: groupsLoading } = trpc.groups.list.useQuery(undefined, { refetchInterval: 10000 });
  const { data: groupUnread } = trpc.groups.totalUnread.useQuery(undefined, { refetchInterval: 15000 });
  const activeConvId = active?.kind === "dm" ? active.id : null;
  const activeGroupId = active?.kind === "group" ? active.id : null;

  const { data: messages = [], isLoading: messagesLoading } = trpc.dm.messages.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 2500 }
  );
  const { data: reactions = [] } = trpc.dm.reactions.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 5000 }
  );
  const { data: pinnedMessages = [] } = trpc.dm.pinnedMessages.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId }
  );
  const { data: readState } = trpc.dm.readState.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId, refetchInterval: 5000 }
  );
  const { data: dmMuteData } = trpc.dm.getDmMuteStatus.useQuery(
    { conversationId: activeConvId! },
    { enabled: !!activeConvId }
  );

  const activeConversation = conversations.find((c: any) => c.id === activeConvId);
  const activePeer = activeConversation?.otherUser as any | undefined;
  const activeGroup = groups.find((g: any) => g.id === activeGroupId);
  const peerOnline = !!activePeer?.id && onlineUsers.has(activePeer.id);
  const { data: presenceData } = trpc.dm.getPresence.useQuery(
    { userId: activePeer?.id! },
    { enabled: !!activePeer?.id, refetchInterval: 30000 }
  );
  const isDmMuted = dmMuteData?.mutedUntil ? dmMuteData.mutedUntil > Date.now() : false;
  const myStatusLabel = activeStatusEnabled ? "Active Status: ON" : "Active Status: OFF";

  const sendMutation = trpc.dm.send.useMutation({
    onSuccess: () => {
      if (activeConvId) utils.dm.messages.invalidate({ conversationId: activeConvId });
      utils.dm.conversations.invalidate();
      setMessageText("");
      setShowEmojiPicker(false);
      emitStopTyping();
      requestAnimationFrame(() => {
        if (textAreaRef.current) textAreaRef.current.style.height = "44px";
      });
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
    onError: (e) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  const uploadVoiceMutation = trpc.dm.uploadVoice.useMutation({
    onSuccess: () => {
      if (activeConvId) utils.dm.messages.invalidate({ conversationId: activeConvId });
      utils.dm.conversations.invalidate();
      toast.success("Voice message sent");
    },
    onError: (e) => toast.error(e.message),
  });

  const markReadMutation = trpc.dm.markRead.useMutation();
  const addReactionMutation = trpc.dm.addReaction.useMutation({
    onSuccess: () => activeConvId && utils.dm.reactions.invalidate({ conversationId: activeConvId }),
    onError: (e) => toast.error(e.message),
  });
  const removeReactionMutation = trpc.dm.removeReaction.useMutation({
    onSuccess: () => activeConvId && utils.dm.reactions.invalidate({ conversationId: activeConvId }),
    onError: (e) => toast.error(e.message),
  });
  const pinMutation = trpc.dm.pinMessage.useMutation({
    onSuccess: () => activeConvId && utils.dm.pinnedMessages.invalidate({ conversationId: activeConvId }),
    onError: (e) => toast.error(e.message),
  });
  const muteMutation = trpc.dm.muteDm.useMutation({
    onSuccess: () => activeConvId && utils.dm.getDmMuteStatus.invalidate({ conversationId: activeConvId }),
    onError: (e) => toast.error(e.message),
  });
  const updatePresenceMutation = trpc.dm.updatePresence.useMutation();

  useEffect(() => {
    activeRef.current = active;
    setPeerIsTyping(false);
    isTypingRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!user) return;
    import("socket.io-client").then(({ io }) => {
      const socket = io(window.location.origin, {
        path: "/api/socket.io",
        query: { userId: user.id },
      });
      socketRef.current = socket;
      socket.on("call:offer", ({ from, fromName, fromAvatar, offer, isVideo }: any) => {
        if (notificationSounds && !doNotDisturb) playMessengerNotificationSound();
        setIncomingCall({ peerId: from, peerName: fromName, peerAvatar: fromAvatar ?? null, isVideo, offer });
      });
      socket.on("dm:typing", ({ conversationId }: { from: number; conversationId: number }) => {
        if (activeRef.current?.kind === "dm" && activeRef.current.id === conversationId) setPeerIsTyping(true);
      });
      socket.on("dm:stopTyping", ({ conversationId }: { from: number; conversationId: number }) => {
        if (activeRef.current?.kind === "dm" && activeRef.current.id === conversationId) setPeerIsTyping(false);
      });
      socket.on("dm:online", ({ userId: uid }: { userId: number }) => setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(uid);
        return next;
      }));
      socket.on("dm:offline", ({ userId: uid }: { userId: number }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      });
    }).catch(() => {});
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, notificationSounds, doNotDisturb]);

  useEffect(() => {
    window.localStorage.setItem(PREF_SOUND_KEY, String(notificationSounds));
  }, [notificationSounds]);

  useEffect(() => {
    window.localStorage.setItem(PREF_DND_KEY, String(doNotDisturb));
  }, [doNotDisturb]);

  useEffect(() => {
    window.localStorage.setItem(PREF_ACTIVE_STATUS_KEY, String(activeStatusEnabled));
  }, [activeStatusEnabled]);

  useEffect(() => {
    if (!activeStatusEnabled) return;
    updatePresenceMutation.mutate();
    const interval = setInterval(() => updatePresenceMutation.mutate(), 60000);
    return () => clearInterval(interval);
  }, [activeStatusEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convParam = params.get("conv");
    const groupParam = params.get("group");
    if (convParam) {
      const id = Number(convParam);
      if (!Number.isNaN(id)) setActive({ kind: "dm", id });
    } else if (groupParam) {
      const id = Number(groupParam);
      if (!Number.isNaN(id)) setActive({ kind: "group", id });
    }
  }, []);

  useEffect(() => {
    if (!active && conversations.length > 0 && window.innerWidth >= 768) {
      setActive({ kind: "dm", id: (conversations[0] as any).id });
    }
  }, [active, conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (activeConvId && messages.length > 0) {
      const last = messages[messages.length - 1] as any;
      if (last.senderId !== user?.id) markReadMutation.mutate({ conversationId: activeConvId, lastMessageId: last.id });
    }
  }, [messages, activeConvId]);

  useEffect(() => {
    if (!conversations.length) return;
    let shouldPlay = false;
    for (const conversation of conversations as any[]) {
      const latestId = conversation.lastMessage?.id;
      if (!latestId) continue;
      const previousId = latestConversationMessageIdsRef.current.get(conversation.id);
      if (preferencesReadyRef.current && previousId && latestId !== previousId && conversation.lastMessage?.senderId !== user?.id) {
        shouldPlay = true;
      }
      latestConversationMessageIdsRef.current.set(conversation.id, latestId);
    }
    preferencesReadyRef.current = true;
    if (shouldPlay && notificationSounds && !doNotDisturb) playMessengerNotificationSound();
  }, [conversations, user?.id, notificationSounds, doNotDisturb]);

  const filteredConversations = conversations.filter((conversation: any) => {
    const name = conversation.otherUser?.name ?? "";
    const lastText = conversation.lastMessage?.text ?? "";
    return `${name} ${lastText}`.toLowerCase().includes(query.toLowerCase());
  });

  const filteredGroups = groups.filter((group: any) => {
    return `${group.name ?? ""} ${group.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
  });

  const messageGroups = useMemo(() => {
    const grouped: { date: Date | string; messages: any[] }[] = [];
    for (const message of messages as any[]) {
      const last = grouped[grouped.length - 1];
      if (!last || !isSameDay(last.date, message.createdAt)) grouped.push({ date: message.createdAt, messages: [message] });
      else last.messages.push(message);
    }
    return grouped;
  }, [messages]);

  const mediaCollections = useMemo(() => {
    const list = messages as any[];
    const media = list.filter((m) => ["image", "video"].includes(fileKind(m)));
    const audio = list.filter((m) => fileKind(m) === "audio");
    const files = list.filter((m) => fileKind(m) === "file");
    const links = extractLinks(list);
    return { media, audio, files, links };
  }, [messages]);

  function emitStopTyping() {
    if (!activeConvId || !activePeer?.id || !user) return;
    socketRef.current?.emit("dm:stopTyping", { to: activePeer.id, from: user.id, conversationId: activeConvId });
    isTypingRef.current = false;
  }

  function emitTyping() {
    if (!activeConvId || !activePeer?.id || !user) return;
    if (!isTypingRef.current) {
      socketRef.current?.emit("dm:typing", { to: activePeer.id, from: user.id, conversationId: activeConvId });
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(), 2500);
  }

  function selectDm(id: number) {
    setActive({ kind: "dm", id });
    setSidebarMode("inbox");
    window.history.replaceState(null, "", `/?conv=${id}`);
  }

  function selectGroup(id: number) {
    setActive({ kind: "group", id });
    setSidebarMode("groups");
    window.history.replaceState(null, "", `/?group=${id}`);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessageText(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
    if (e.target.value.trim()) emitTyping();
    else emitStopTyping();
  }

  function handleSend() {
    if (!messageText.trim() || !activeConvId) return;
    sendMutation.mutate({ conversationId: activeConvId, text: messageText.trim() });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    if (file.size > DM_FILE_MAX) {
      toast.error("File must be under 3 MB.");
      e.target.value = "";
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
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function startRecording() {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !activeConvId) return;
    const duration = recordingSeconds;
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    mediaRecorderRef.current = null;
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadVoiceMutation.mutate({ conversationId: activeConvId, audioBase64: base64, durationSeconds: Math.max(1, duration) });
    };
    reader.readAsDataURL(blob);
  }

  function handleReaction(messageId: number, emoji: string) {
    const myReaction = (reactions as any[]).find((reaction) => reaction.messageId === messageId && reaction.userId === user?.id);
    if (myReaction?.emoji === emoji) removeReactionMutation.mutate({ messageId });
    else addReactionMutation.mutate({ messageId, emoji });
    setReactionPickerFor(null);
  }

  function reactionSummary(messageId: number) {
    const grouped: Record<string, number> = {};
    for (const reaction of reactions as any[]) {
      if (reaction.messageId === messageId) grouped[reaction.emoji] = (grouped[reaction.emoji] ?? 0) + 1;
    }
    return grouped;
  }

  function startCall(video: boolean) {
    if (!activePeer?.id) return;
    setOutgoingCall({ peerId: activePeer.id, peerName: activePeer.name ?? "User", peerAvatar: activePeer.avatar ?? null, isVideo: video });
  }

  function renderAttachment(message: any) {
    const kind = fileKind(message);
    if (!message.fileUrl) return null;
    if (kind === "image") {
      return <img src={message.fileUrl} alt={message.fileName ?? "Attachment"} className="mt-2 max-h-72 rounded-2xl object-cover shadow-sm" />;
    }
    if (kind === "video") {
      return <video src={message.fileUrl} controls className="mt-2 max-h-72 rounded-2xl bg-black" />;
    }
    if (kind === "audio") {
      return <audio src={message.fileUrl} controls className="mt-2 max-w-full" />;
    }
    return (
      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 text-sm hover:bg-white/15">
        <FileText className="h-5 w-5" />
        <span className="min-w-0 flex-1 truncate">{message.fileName ?? "File"}</span>
        <Download className="h-4 w-4" />
      </a>
    );
  }

  function renderMessage(message: any) {
    const mine = message.senderId === user?.id;
    const groupedReactions = reactionSummary(message.id);
    const isLastMine = mine && (messages as any[]).filter((m) => m.senderId === user?.id).at(-1)?.id === message.id;
    const peerRead = readState && activeConversation && (
      activeConversation.participant1Id === user?.id
        ? (readState as any).lastReadMessageIdP2
        : (readState as any).lastReadMessageIdP1
    );
    return (
      <div key={message.id} className={cn("group flex gap-2 px-4", mine ? "justify-end" : "justify-start")}>
        {!mine && (
          <Avatar className="mt-1 h-8 w-8 flex-shrink-0">
            <AvatarImage src={activePeer?.avatar ?? undefined} />
            <AvatarFallback>{getInitials(activePeer?.name)}</AvatarFallback>
          </Avatar>
        )}
        <div className={cn("relative max-w-[78%] md:max-w-[68%]", mine && "items-end")}> 
          <div
            className={cn(
              "rounded-[1.35rem] px-4 py-2.5 text-sm shadow-sm",
              mine
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md"
                : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
            )}
          >
            {message.text && <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>}
            {renderAttachment(message)}
          </div>
          <div className={cn("mt-1 flex items-center gap-2 text-[11px] text-slate-400", mine ? "justify-end" : "justify-start")}> 
            <span>{formatTime(message.createdAt)}</span>
            {mine && isLastMine && (peerRead && peerRead >= message.id ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" /> : <Check className="h-3.5 w-3.5" />)}
            <button className="opacity-0 transition group-hover:opacity-100" onClick={() => pinMutation.mutate({ messageId: message.id, conversationId: activeConvId! })} title="Pin message">
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button className="opacity-0 transition group-hover:opacity-100" onClick={() => setReactionPickerFor(reactionPickerFor === message.id ? null : message.id)} title="React">
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
          {Object.keys(groupedReactions).length > 0 && (
            <div className={cn("mt-1 flex gap-1", mine ? "justify-end" : "justify-start")}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button key={emoji} onClick={() => handleReaction(message.id, emoji)} className="rounded-full border bg-white px-2 py-0.5 text-xs shadow-sm">
                  {emoji} {count > 1 ? count : ""}
                </button>
              ))}
            </div>
          )}
          {reactionPickerFor === message.id && (
            <div className={cn("absolute z-20 mt-1 flex rounded-full border bg-white p-1 shadow-xl", mine ? "right-0" : "left-0")}> 
              {QUICK_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => handleReaction(message.id, emoji)} className="rounded-full px-2 py-1 text-lg hover:bg-slate-100">{emoji}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const unreadGroups = groupUnread?.count ?? 0;
  const mainFacingFaceUrl = getMainFacingFaceUrl("/");
  const facingFaceProfileUrl = user?.id ? getMainFacingFaceUrl(`/profile/${user.id}`) : mainFacingFaceUrl;
  const activePeerProfileUrl = activePeer?.id ? getMainFacingFaceUrl(`/profile/${activePeer.id}`) : mainFacingFaceUrl;

  async function handleMessengerSignOut() {
    try {
      await logout();
      toast.success("Signed out of Messenger");
      window.location.href = mainFacingFaceUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  return (
    <div className={cn("h-dvh overflow-hidden bg-[#eef3fb] text-slate-950", themeMode === "lightdark" && "bg-slate-950 text-slate-100")}>
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
      {showPreferences && (
        <PreferencesModal
          user={user}
          activeStatusEnabled={activeStatusEnabled}
          setActiveStatusEnabled={setActiveStatusEnabled}
          notificationSounds={notificationSounds}
          setNotificationSounds={setNotificationSounds}
          doNotDisturb={doNotDisturb}
          setDoNotDisturb={setDoNotDisturb}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          profileUrl={facingFaceProfileUrl}
          homeUrl={mainFacingFaceUrl}
          onSignOut={handleMessengerSignOut}
          onClose={() => setShowPreferences(false)}
        />
      )}

      <div className="flex h-full min-h-0">
        <aside className={cn("flex h-full min-h-0 w-full flex-col border-r border-slate-200 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur md:w-[390px] md:min-w-[360px]", active ? "hidden md:flex" : "flex")}> 
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <a href={mainFacingFaceUrl} className="flex min-w-0 items-center gap-3 no-underline" title="Open FacingFace.com">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#CC2936] text-white shadow-lg shadow-red-500/20">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">FacingFace Chat</h1>
                </div>
              </a>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => setMobileSearchOpen((open) => !open)}
                  className={cn("rounded-full p-2 text-slate-500 hover:bg-slate-100", mobileSearchOpen && "bg-slate-100 text-[#CC2936]")}
                  title="Search chats"
                >
                  <Search className="h-5 w-5" />
                </button>
                <a href={facingFaceProfileUrl} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Open your FacingFace profile">
                  <UserRound className="h-5 w-5" />
                </a>
                <button onClick={() => setShowPreferences(true)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Messenger preferences">
                  <Settings className="h-5 w-5" />
                </button>
                <button onClick={handleMessengerSignOut} className="rounded-full p-2 text-red-500 hover:bg-red-50" title="Sign out of Messenger">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            {mobileSearchOpen && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/30">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats, groups, people"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            )}

            <div className="mt-3 rounded-[1.35rem] border border-slate-100 bg-white px-3 py-2 shadow-sm">
              <StoryBar variant="compact" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-bold">
              <button onClick={() => setSidebarMode("inbox")} className={cn("rounded-xl px-3 py-2 transition", sidebarMode === "inbox" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>Inbox</button>
              <button onClick={() => setSidebarMode("groups")} className={cn("relative rounded-xl px-3 py-2 transition", sidebarMode === "groups" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>Groups {unreadGroups > 0 && <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{unreadGroups}</span>}</button>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {sidebarMode === "inbox" && (
              <div className="space-y-1 p-3">
                {conversationsLoading && <p className="py-8 text-center text-sm text-slate-500">Loading conversations...</p>}
                {!conversationsLoading && filteredConversations.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold">No conversations yet</p>
                    <p className="mt-1 text-xs text-slate-500">Start from your friends list on FacingFace.</p>
                  </div>
                )}
                {filteredConversations.map((conversation: any) => {
                  const other = conversation.otherUser ?? {};
                  const selected = active?.kind === "dm" && active.id === conversation.id;
                  const online = other.id && onlineUsers.has(other.id);
                  return (
                    <button key={conversation.id} onClick={() => selectDm(conversation.id)} className={cn("flex w-full items-center gap-3 rounded-3xl p-3 text-left transition", selected ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-slate-50")}> 
                      <div className="relative">
                        <Avatar className="h-13 w-13">
                          <AvatarImage src={other.avatar ?? undefined} />
                          <AvatarFallback>{getInitials(other.name)}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white", online ? "bg-emerald-500" : "bg-slate-300")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-bold">{other.name ?? "User"} {other.isVerified && <BadgeCheck className="inline h-4 w-4 fill-blue-500 text-white" />}</p>
                          <span className="text-[11px] text-slate-400">{formatDate(conversation.lastMessageAt)}</span>
                        </div>
                        <p className="truncate text-sm text-slate-500">{conversation.lastMessage?.text ?? conversation.lastMessage?.fileName ?? "Tap to open conversation"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {sidebarMode === "groups" && (
              <div className="space-y-2 p-3">
                <div className="px-1 pb-2">
                  <CreateGroupDialog onCreated={(id) => selectGroup(id)} />
                </div>
                {groupsLoading && <p className="py-8 text-center text-sm text-slate-500">Loading groups...</p>}
                {!groupsLoading && filteredGroups.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold">No groups yet</p>
                    <p className="mt-1 text-xs text-slate-500">Create a group for friends, family, or teams.</p>
                  </div>
                )}
                {filteredGroups.map((group: any) => {
                  const selected = active?.kind === "group" && active.id === group.id;
                  return (
                    <button key={group.id} onClick={() => selectGroup(group.id)} className={cn("flex w-full items-center gap-3 rounded-3xl p-3 text-left transition", selected ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-slate-50")}>
                      <Avatar className="h-13 w-13">
                        <AvatarImage src={group.avatar ?? undefined} />
                        <AvatarFallback><Users className="h-5 w-5" /></AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{group.name}</p>
                        <p className="truncate text-sm text-slate-500">{group.description ?? "Group conversation"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {!active && (
            <div className="hidden h-full items-center justify-center p-8 md:flex">
              <div className="max-w-lg rounded-[2rem] border border-white/70 bg-white/80 p-10 text-center shadow-2xl shadow-slate-200 backdrop-blur">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-3xl font-black tracking-tight">Your dedicated Messenger is ready.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Choose a chat to message, call, share media, review audio, and keep conversations organized without leaving FacingFace.</p>
              </div>
            </div>
          )}

          {active?.kind === "group" && activeGroupId && (
            <div className="flex h-full min-h-0 bg-white">
              <GroupThread groupId={activeGroupId} onBack={() => setActive(null)} />
            </div>
          )}

          {active?.kind === "dm" && activeConvId && (
            <div className="flex h-full min-h-0">
              <section className="flex min-w-0 flex-1 flex-col bg-[#f7f9fd]">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button onClick={() => setActive(null)} className="rounded-full p-2 hover:bg-slate-100 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                    <a href={activePeerProfileUrl} className="flex flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/40" title={`Open ${activePeer?.name ?? "this user"}'s profile`}>
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={activePeer?.avatar ?? undefined} />
                        <AvatarFallback>{getInitials(activePeer?.name)}</AvatarFallback>
                      </Avatar>
                    </a>
                    <a href={activePeerProfileUrl} className="min-w-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40" title={`Open ${activePeer?.name ?? "this user"}'s profile`}>
                      <p className="truncate font-black hover:text-blue-600">{activePeer?.name ?? "Conversation"} {activePeer?.isVerified && <BadgeCheck className="inline h-4 w-4 fill-blue-500 text-white" />}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{peerIsTyping ? "Typing..." : formatPresence(presenceData?.lastSeenAt as any, peerOnline)}</p>
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startCall(false)} className="rounded-full p-2.5 text-blue-600 hover:bg-blue-50" title="Voice call"><Phone className="h-5 w-5" /></button>
                    <button onClick={() => startCall(true)} className="rounded-full p-2.5 text-blue-600 hover:bg-blue-50" title="Video call"><Video className="h-5 w-5" /></button>
                    <button onClick={() => setShowDetails((v) => !v)} className="rounded-full p-2.5 text-slate-600 hover:bg-slate-100" title="Conversation details">{showDetails ? <X className="h-5 w-5" /> : <Info className="h-5 w-5" />}</button>
                  </div>
                </header>

                {pinnedMessages.length > 0 && (
                  <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-bold"><Pin className="h-3.5 w-3.5" /> {pinnedMessages.length} pinned message{pinnedMessages.length === 1 ? "" : "s"}</div>
                  </div>
                )}

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-5 py-5">
                    {messagesLoading && <p className="py-10 text-center text-sm text-slate-500">Loading messages...</p>}
                    {!messagesLoading && messages.length === 0 && (
                      <div className="mx-auto mt-12 max-w-sm rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <ShieldCheck className="mx-auto h-10 w-10 text-blue-500" />
                        <h3 className="mt-4 font-black">Start the conversation</h3>
                        <p className="mt-2 text-sm text-slate-500">Messages, media, voice notes, and calls stay connected to your FacingFace account.</p>
                      </div>
                    )}
                    {messageGroups.map((group) => (
                      <div key={String(group.date)} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 shadow-sm">{formatDayDivider(group.date)}</span>
                        </div>
                        {group.messages.map(renderMessage)}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <footer className="border-t border-slate-200 bg-white p-3 md:p-4">
                  {isRecording && (
                    <div className="mb-2 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                      <span>Recording voice message · {recordingSeconds}s</span>
                      <button onClick={stopRecording} className="rounded-full bg-red-600 px-3 py-1 text-xs text-white">Send</button>
                    </div>
                  )}
                  <div className="relative flex items-end gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                    <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="mb-1 rounded-full p-2.5 text-slate-500 hover:bg-slate-100" title="Attach file"><Paperclip className="h-5 w-5" /></button>
                    <button onClick={() => imageInputRef.current?.click()} className="mb-1 rounded-full p-2.5 text-slate-500 hover:bg-slate-100" title="Photo or video"><ImageIcon className="h-5 w-5" /></button>
                    <button onClick={isRecording ? stopRecording : startRecording} className={cn("mb-1 rounded-full p-2.5 hover:bg-slate-100", isRecording ? "text-red-600" : "text-slate-500")} title="Voice message"><Mic className="h-5 w-5" /></button>
                    <div className="relative min-w-0 flex-1 rounded-3xl bg-slate-100 px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/30">
                      <textarea
                        ref={textAreaRef}
                        value={messageText}
                        onChange={handleTextChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={uploading ? "Uploading..." : "Message..."}
                        className="max-h-32 min-h-[28px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-400"
                        rows={1}
                      />
                      {showEmojiPicker && (
                        <div className="absolute bottom-14 right-0 z-30 overflow-hidden rounded-2xl shadow-2xl">
                          <Picker onEmojiSelect={(emoji: any) => setMessageText((value) => value + (emoji.native ?? ""))} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => setShowEmojiPicker((v) => !v)} className="mb-1 rounded-full p-2.5 text-slate-500 hover:bg-slate-100" title="Emoji"><Smile className="h-5 w-5" /></button>
                    <Button onClick={handleSend} disabled={!messageText.trim() || sendMutation.isPending || uploading} className="mb-1 h-11 rounded-full px-4">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </footer>
              </section>

              {showDetails && (
                <aside className="hidden h-full w-[330px] min-w-[310px] flex-col border-l border-slate-200 bg-white xl:flex">
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="p-5">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={activePeer?.avatar ?? undefined} />
                          <AvatarFallback className="text-xl">{getInitials(activePeer?.name)}</AvatarFallback>
                        </Avatar>
                        <h2 className="mt-3 text-xl font-black">{activePeer?.name ?? "Conversation"}</h2>
                        <p className="text-sm text-slate-500">{formatPresence(presenceData?.lastSeenAt as any, peerOnline)}</p>
                        <div className="mt-4 grid w-full grid-cols-3 gap-2">
                          <button onClick={() => startCall(false)} className="rounded-2xl bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"><Phone className="mx-auto h-5 w-5" /><span className="mt-1 block text-[11px] font-bold">Voice</span></button>
                          <button onClick={() => startCall(true)} className="rounded-2xl bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"><Video className="mx-auto h-5 w-5" /><span className="mt-1 block text-[11px] font-bold">Video</span></button>
                          <button onClick={() => muteMutation.mutate({ conversationId: activeConvId, mutedUntil: isDmMuted ? null : Date.now() + 8 * 60 * 60 * 1000 })} className="rounded-2xl bg-slate-50 p-3 text-slate-600 hover:bg-slate-100">{isDmMuted ? <BellOff className="mx-auto h-5 w-5" /> : <Bell className="mx-auto h-5 w-5" />}<span className="mt-1 block text-[11px] font-bold">{isDmMuted ? "Muted" : "Mute"}</span></button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <Collection title="Photos & videos" icon={<ImageIcon className="h-4 w-4" />} count={mediaCollections.media.length}>
                          <div className="grid grid-cols-3 gap-2">
                            {mediaCollections.media.slice(0, 9).map((item: any) => (
                              <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                                {fileKind(item) === "image" ? <img src={item.fileUrl} alt={item.fileName ?? "Media"} className="h-full w-full object-cover" /> : <video src={item.fileUrl} className="h-full w-full object-cover" />}
                              </a>
                            ))}
                            {mediaCollections.media.length === 0 && <EmptyCollection text="Shared photos and videos will appear here." />}
                          </div>
                        </Collection>

                        <Collection title="Audio" icon={<Headphones className="h-4 w-4" />} count={mediaCollections.audio.length}>
                          <div className="space-y-2">
                            {mediaCollections.audio.slice(0, 5).map((item: any) => (
                              <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
                                <Headphones className="h-4 w-4 text-blue-600" /><span className="min-w-0 flex-1 truncate">{item.fileName ?? "Audio"}</span>
                              </a>
                            ))}
                            {mediaCollections.audio.length === 0 && <EmptyCollection text="Voice notes and audio files will appear here." />}
                          </div>
                        </Collection>

                        <Collection title="Files" icon={<FileText className="h-4 w-4" />} count={mediaCollections.files.length}>
                          <div className="space-y-2">
                            {mediaCollections.files.slice(0, 5).map((item: any) => (
                              <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
                                <FileText className="h-4 w-4 text-slate-600" /><span className="min-w-0 flex-1 truncate">{item.fileName ?? "File"}</span><span className="text-xs text-slate-400">{bytesToLabel(item.fileSize)}</span>
                              </a>
                            ))}
                            {mediaCollections.files.length === 0 && <EmptyCollection text="Documents and downloads will appear here." />}
                          </div>
                        </Collection>

                        <Collection title="Links" icon={<LinkIcon className="h-4 w-4" />} count={mediaCollections.links.length}>
                          <div className="space-y-2">
                            {mediaCollections.links.slice(0, 5).map((item: any) => (
                              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
                                <LinkIcon className="h-4 w-4 text-blue-600" /><span className="min-w-0 flex-1 truncate">{item.url}</span>
                              </a>
                            ))}
                            {mediaCollections.links.length === 0 && <EmptyCollection text="Shared links will appear here." />}
                          </div>
                        </Collection>
                      </div>
                    </div>
                  </ScrollArea>
                </aside>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


function PreferencesModal({
  user,
  activeStatusEnabled,
  setActiveStatusEnabled,
  notificationSounds,
  setNotificationSounds,
  doNotDisturb,
  setDoNotDisturb,
  themeMode,
  setThemeMode,
  profileUrl,
  homeUrl,
  onSignOut,
  onClose,
}: {
  user: any;
  activeStatusEnabled: boolean;
  setActiveStatusEnabled: (value: boolean) => void;
  notificationSounds: boolean;
  setNotificationSounds: (value: boolean) => void;
  doNotDisturb: boolean;
  setDoNotDisturb: (value: boolean) => void;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  profileUrl: string;
  homeUrl: string;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/35 px-3 py-4 backdrop-blur-sm md:items-center">
      <div className="max-h-[92dvh] w-full max-w-[690px] overflow-hidden rounded-[1.7rem] bg-white text-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="w-11" />
          <h2 className="text-2xl font-black tracking-tight">Preferences</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Close preferences">
            <X className="h-7 w-7" />
          </button>
        </div>

        <ScrollArea className="max-h-[calc(92dvh-76px)]">
          <div className="px-5 pb-5">
            <section className="border-b border-slate-200 py-4">
              <h3 className="text-2xl font-black">Account</h3>
              <div className="mt-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.avatar ?? undefined} />
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{user?.name ?? "FacingFace User"}</p>
                  <p className="text-sm text-slate-500">Manage your account or return to FacingFace.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <a href={profileUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
                  <UserRound className="h-4 w-4" />
                  FacingFace Profile
                </a>
                <a href={homeUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">
                  <LinkIcon className="h-4 w-4" />
                  FacingFace Home
                </a>
                <button onClick={onSignOut} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-100">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </section>

            <PreferenceRow
              icon={<MessageCircle className="h-7 w-7" />}
              title={`Active Status: ${activeStatusEnabled ? "ON" : "OFF"}`}
              description={activeStatusEnabled ? "Friends can see when you are active on this browser." : "Passive mode is on. This browser will not refresh your active status."}
              action={<Toggle checked={activeStatusEnabled} onChange={setActiveStatusEnabled} />}
            />

            <section className="border-y border-slate-200 py-4">
              <h3 className="text-2xl font-black">Notifications</h3>
              <PreferenceRow
                icon={notificationSounds ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
                title="Notification sounds"
                description="Use sounds to notify you about incoming messages, calls, video chats, and in-app alerts."
                action={<Toggle checked={notificationSounds} onChange={(value) => { setNotificationSounds(value); if (value) playMessengerNotificationSound(); }} />}
                compact
              />
              <PreferenceRow
                icon={<BellOff className="h-7 w-7" />}
                title="Do Not Disturb"
                description="Mute Messenger notification sounds until you turn this off."
                action={<Toggle checked={doNotDisturb} onChange={setDoNotDisturb} />}
                compact
              />
            </section>

            <section className="border-b border-slate-200 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-5">
                  <Moon className="mt-1 h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black">Theme</h3>
                    <p className="mt-1 max-w-[410px] text-sm leading-5 text-slate-500">Choose the Chat appearance that is most comfortable for you.</p>
                  </div>
                </div>
                <ThemeModeSelector selected={themeMode} onSelect={setThemeMode} />
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function PreferenceRow({ icon, title, description, action, compact = false }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-5 py-4", compact && "py-3")}>
      <div className="shrink-0 text-slate-950">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-0.5 max-w-[440px] text-sm leading-5 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("relative h-9 w-16 shrink-0 rounded-full transition", checked ? "bg-blue-600" : "bg-slate-400")}
      aria-pressed={checked}
    >
      <span className={cn("absolute top-1 h-7 w-7 rounded-full bg-white shadow transition", checked ? "left-8" : "left-1")} />
    </button>
  );
}

const MESSENGER_THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; title: string; background: string; foreground: string }> = [
  { mode: "white", label: "W", title: "White", background: "#ffffff", foreground: "#111827" },
  { mode: "lightblue", label: "LB", title: "Light Blue", background: "#eaf4ff", foreground: "#1d4ed8" },
  { mode: "beige", label: "Be", title: "Beige", background: "#f6ead8", foreground: "#8a4f1d" },
  { mode: "lightdark", label: "LD", title: "Light Dark", background: "#374151", foreground: "#ffffff" },
];

function ThemeModeSelector({ selected, onSelect }: { selected: ThemeMode; onSelect: (value: ThemeMode) => void }) {
  return (
    <div className="w-full rounded-2xl bg-[#f8eddc] px-4 py-3 shadow-sm ring-1 ring-slate-200 sm:w-auto sm:min-w-[220px]">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Theme</p>
      <div className="flex flex-wrap items-center gap-2">
        {MESSENGER_THEME_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => onSelect(option.mode)}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center rounded-sm border-2 px-3 text-xs font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              selected === option.mode ? "border-[#CC2936] ring-2 ring-[#CC2936]/20" : "border-white/80"
            )}
            style={{ backgroundColor: option.background, color: option.foreground }}
            title={option.title}
            aria-pressed={selected === option.mode}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Collection({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black">{icon}<span>{title}</span></div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyCollection({ text }: { text: string }) {
  return <p className="col-span-full rounded-2xl bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">{text}</p>;
}
