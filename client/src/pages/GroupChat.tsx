import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Users, Plus, Video, Phone, UserPlus, LogOut, X, Pin, BellOff, Bell, Camera } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

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
  if (diff < 86400000) return formatTime(d);
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Create Group Dialog ──────────────────────────────────────────────────────

export function CreateGroupDialog({ onCreated }: { onCreated: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ id: number; name: string; avatar: string | null }[]>([]);
  const utils = trpc.useUtils();

  const { data: searchResults = [] } = trpc.users.search.useQuery(
    { query: memberSearch },
    { enabled: memberSearch.length >= 2 }
  );

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: async (data) => {
      // Add selected members
      for (const u of selectedUsers) {
        await addMemberMutation.mutateAsync({ groupId: data.groupId, userId: u.id });
      }
      utils.groups.list.invalidate();
      setOpen(false);
      setName("");
      setDescription("");
      setSelectedUsers([]);
      onCreated(data.groupId);
    },
    onError: (e) => toast.error(e.message),
  });

  const addMemberMutation = trpc.groups.addMember.useMutation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Group, Family Chat..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Add Members</label>
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search people..."
              className="mt-1"
            />
            {searchResults.length > 0 && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left"
                    onClick={() => {
                      if (!selectedUsers.find(s => s.id === u.id)) {
                        setSelectedUsers(prev => [...prev, { id: u.id, name: u.name ?? "User", avatar: u.avatar ?? null }]);
                      }
                      setMemberSearch("");
                    }}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={u.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">{getInitials(u.name ?? "U")}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                    {u.name}
                    <button onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })}
          >
            {createMutation.isPending ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Group Thread ─────────────────────────────────────────────────────────────

export function GroupThread({ groupId, onBack }: { groupId: number; onBack: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const { data: groupData, isLoading } = trpc.groups.getById.useQuery({ groupId }, { refetchInterval: 5000 });
  const { data: msgData, isLoading: msgsLoading } = trpc.groups.getMessages.useQuery(
    { groupId, limit: 60 },
    { enabled: !!groupId, refetchInterval: 3000 }
  );

  const { data: reactionsData = [] } = trpc.groups.reactions.useQuery(
    { groupId },
    { enabled: !!groupId, refetchInterval: 5000 }
  );
  const addReactionMutation = trpc.groups.addReaction.useMutation({
    onSuccess: () => utils.groups.reactions.invalidate({ groupId }),
    onError: (e) => toast.error(e.message),
  });
  const removeReactionMutation = trpc.groups.removeReaction.useMutation({
    onSuccess: () => utils.groups.reactions.invalidate({ groupId }),
    onError: (e) => toast.error(e.message),
  });
  const reactionMap = reactionsData.reduce<Record<number, Record<string, number[]>>>((acc, r) => {
    if (!acc[r.groupMessageId]) acc[r.groupMessageId] = {};
    if (!acc[r.groupMessageId][r.emoji]) acc[r.groupMessageId][r.emoji] = [];
    acc[r.groupMessageId][r.emoji].push(r.userId);
    return acc;
  }, {});
  const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
  const { data: searchResults = [] } = trpc.users.search.useQuery(
    { query: memberSearch },
    { enabled: memberSearch.length >= 2 }
  );

  const sendMutation = trpc.groups.sendMessage.useMutation({
    onSuccess: () => {
      utils.groups.getMessages.invalidate({ groupId });
      setText("");
    },
    onError: (e) => toast.error(e.message),
  });

  const addMemberMutation = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      utils.groups.getById.invalidate({ groupId });
      setMemberSearch("");
      toast.success("Member added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => { utils.groups.getById.invalidate({ groupId }); },
    onError: (e) => toast.error(e.message),
  });

  const leaveMutation = trpc.groups.leave.useMutation({
    onSuccess: () => {
      utils.groups.list.invalidate();
      onBack();
      toast.success("You left the group.");
    },
    onError: (e) => toast.error(e.message),
  });

  const startCallMutation = trpc.calls.createRoom.useMutation({
    onSuccess: (data) => { navigate(`/calls/group/${data.roomId}`); },
    onError: (e) => toast.error(e.message),
  });

  // Pinning
  const [showPinned, setShowPinned] = useState(false);
  const { data: pinnedMsgs = [] } = trpc.groups.pinnedMessages.useQuery({ groupId }, { enabled: !!groupId });
  const pinMutation = trpc.groups.pinMessage.useMutation({
    onSuccess: () => { utils.groups.pinnedMessages.invalidate({ groupId }); toast.success('Message pinned'); },
    onError: (e) => toast.error(e.message),
  });
  const unpinMutation = trpc.groups.unpinMessage.useMutation({
    onSuccess: () => { utils.groups.pinnedMessages.invalidate({ groupId }); toast.success('Message unpinned'); },
    onError: (e) => toast.error(e.message),
  });

  // Mute
  const { data: muteData } = trpc.groups.getMuteStatus.useQuery({ groupId }, { enabled: !!groupId });
  const muteMutation = trpc.groups.muteGroup.useMutation({
    onSuccess: () => { utils.groups.getMuteStatus.invalidate({ groupId }); },
    onError: (e) => toast.error(e.message),
  });
  const uploadGroupAvatarMutation = trpc.groups.uploadAvatar.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.groups.getById.invalidate({ groupId }),
        utils.groups.list.invalidate(),
      ]);
      toast.success("Group logo updated.");
    },
    onError: (e) => toast.error(e.message),
  });
  const isMuted = muteData?.mutedUntil ? muteData.mutedUntil > Date.now() : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgData?.messages]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    sendMutation.mutate({ groupId, content: t });
  };

  const handleGroupLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for the group logo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Group logo must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      uploadGroupAvatarMutation.mutate({ groupId, filename: file.name, contentType: file.type, base64 });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!groupData) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Group not found.</div>;

  const { group, members } = groupData;
  const messages = msgData?.messages ?? [];
  const senders = msgData?.senders ?? {};
  const myRole = members.find(m => m.userId === user?.id)?.role;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b bg-background px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupLogoChange} />
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
              <AvatarImage src={group.avatar ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            {myRole === "admin" && (
              <button
                type="button"
                title="Change group logo"
                aria-label="Change group logo"
                disabled={uploadGroupAvatarMutation.isPending}
                onClick={() => groupAvatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                <Camera className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground">{members.length} members</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {pinnedMsgs.length > 0 && (
              <Button variant="ghost" size="icon" title={`${pinnedMsgs.length} pinned`} onClick={() => setShowPinned(v => !v)} className="relative">
                <Pin className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{pinnedMsgs.length}</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" title={isMuted ? 'Unmute' : 'Mute notifications'} onClick={() => muteMutation.mutate({ groupId, mutedUntil: isMuted ? null : Date.now() + 8 * 3600000 })}>
              {isMuted ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" title="Audio call" className="hidden sm:inline-flex" onClick={() => startCallMutation.mutate({ groupId, type: "audio" })}>
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Video call" className="hidden sm:inline-flex" onClick={() => startCallMutation.mutate({ groupId, type: "video" })}>
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Members" onClick={() => setShowMembers(v => !v)}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Pinned messages panel */}
        {showPinned && pinnedMsgs.length > 0 && (
          <div className="border-b bg-muted/40 px-4 py-2 space-y-1 max-h-40 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned Messages</p>
            {pinnedMsgs.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between gap-2 bg-background rounded px-2 py-1 text-sm">
                <span className="truncate flex-1">{m.content}</span>
                <button onClick={() => unpinMutation.mutate({ messageId: m.id, groupId })} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        {/* Messages */}
        <ScrollArea className="min-h-0 flex-1 px-3 py-3 sm:px-4">
          {msgsLoading && <p className="text-center text-muted-foreground text-sm">Loading messages...</p>}
          {messages.length === 0 && !msgsLoading && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          )}
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              const sender = senders[msg.senderId];
              const msgReactions = reactionMap[msg.id] ?? {};
              const myReaction = reactionsData.find(r => r.groupMessageId === msg.id && r.userId === user?.id);
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2 relative", isMe ? "flex-row-reverse" : "flex-row")}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {!isMe && (
                    <Avatar className="w-7 h-7 mt-1 shrink-0">
                      <AvatarImage src={sender?.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">{getInitials(sender?.name ?? "U")}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("flex max-w-[82%] flex-col gap-0.5 sm:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                    {!isMe && <span className="text-xs text-muted-foreground px-1">{sender?.name}</span>}
                    <div className={cn(
                      "rounded-2xl px-3 py-2 text-sm break-words",
                      isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                    {Object.keys(msgReactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1 mt-0.5">
                        {Object.entries(msgReactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if ((users as number[]).includes(user?.id ?? 0)) {
                                removeReactionMutation.mutate({ groupMessageId: msg.id });
                              } else {
                                addReactionMutation.mutate({ groupMessageId: msg.id, emoji });
                              }
                            }}
                            className={cn(
                              "flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors",
                              (users as number[]).includes(user?.id ?? 0)
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted border-transparent hover:border-muted-foreground/30"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{(users as number[]).length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {hoveredMsgId === msg.id && (
                      <div className={cn(
                        "flex items-center gap-0.5 bg-background border rounded-full shadow-md px-1.5 py-0.5 absolute -top-8 z-10",
                        isMe ? "right-0" : "left-7"
                      )}>
                        {QUICK_EMOJIS.map(e => (
                          <button
                            key={e}
                            onClick={() => {
                              if (myReaction?.emoji === e) {
                                removeReactionMutation.mutate({ groupMessageId: msg.id });
                              } else {
                                addReactionMutation.mutate({ groupMessageId: msg.id, emoji: e });
                              }
                            }}
                            className={cn(
                              "text-base w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                              myReaction?.emoji === e && "bg-primary/10"
                            )}
                          >
                            {e}
                          </button>
                        ))}
                        <button
                          title={msg.pinnedAt ? 'Unpin' : 'Pin message'}
                          onClick={() => msg.pinnedAt ? unpinMutation.mutate({ messageId: msg.id, groupId }) : pinMutation.mutate({ messageId: msg.id, groupId })}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2 border-t bg-background px-3 py-2.5 sm:px-4 sm:py-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message the group..."
            className="min-w-0 flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!text.trim() || sendMutation.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Members sidebar */}
      {showMembers && (
        <>
          <button
            type="button"
            aria-label="Close members panel"
            className="absolute inset-0 z-30 bg-black/25 backdrop-blur-[1px] sm:hidden"
            onClick={() => setShowMembers(false)}
          />
          <div className="absolute inset-y-0 right-0 z-40 flex w-[86vw] max-w-sm flex-col border-l bg-background shadow-2xl sm:relative sm:inset-auto sm:z-auto sm:w-72 sm:max-w-none sm:shadow-none">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Members ({members.length})</span>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowMembers(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted group">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={m.user.avatar ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(m.user.name ?? "U")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{m.user.name}</p>
                    {m.role === "admin" && <Badge variant="secondary" className="text-xs px-1 py-0">Admin</Badge>}
                  </div>
                  {myRole === "admin" && m.userId !== user?.id && (
                    <Button
                      variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeMemberMutation.mutate({ groupId, userId: m.userId })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          {myRole === "admin" && (
            <div className="px-3 py-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add member</p>
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="border rounded max-h-32 overflow-y-auto">
                  {searchResults.filter(u => !members.find(m => m.userId === u.id)).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted text-left"
                      onClick={() => addMemberMutation.mutate({ groupId, userId: u.id })}
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={u.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{getInitials(u.name ?? "U")}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="px-3 py-3 border-t">
            <Button
              variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => leaveMutation.mutate({ groupId })}
            >
              <LogOut className="w-4 h-4 mr-2" /> Leave Group
            </Button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main GroupChat Page ──────────────────────────────────────────────────────

export default function GroupChat() {
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: groups = [], isLoading } = trpc.groups.list.useQuery(undefined, {
    refetchInterval: 10000,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="border rounded-xl overflow-hidden bg-background flex h-[calc(100vh-8rem)]">
        {/* Group list */}
        <div className={cn(
          "w-full sm:w-72 border-r flex flex-col",
          activeGroupId !== null ? "hidden sm:flex" : "flex"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-bold text-sm uppercase tracking-wider">Groups</h2>
            <CreateGroupDialog onCreated={(id) => { utils.groups.list.invalidate(); setActiveGroupId(id); }} />
          </div>
          <ScrollArea className="flex-1">
            {isLoading && <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>}
            {!isLoading && groups.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">No groups yet</p>
                <p className="text-xs">Create one to get started</p>
              </div>
            )}
            <div className="divide-y">
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors",
                    activeGroupId === g.id && "bg-muted"
                  )}
                  onClick={() => setActiveGroupId(g.id)}
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-primary/10 shadow-sm">
                    <AvatarImage src={g.avatar ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white">
                      {getInitials(g.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{g.name}</p>
                    {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Thread or empty state */}
        {activeGroupId !== null ? (
          <GroupThread
            groupId={activeGroupId}
            onBack={() => setActiveGroupId(null)}
          />
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center flex-col gap-3 text-muted-foreground">
            <Users className="w-12 h-12 opacity-20" />
            <p className="font-medium">Select a group to chat</p>
            <p className="text-sm">or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
