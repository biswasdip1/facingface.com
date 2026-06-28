import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft, Send, MessageSquare, Phone, CheckCircle2,
  Inbox, Eye, Clock, Mail, MessageCircle, BarChart2, CheckCheck,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TOPIC_OPTIONS = [
  "Account Issue",
  "Report Abuse / Harassment",
  "Technical Problem",
  "Billing & Subscription",
  "Privacy Concern",
  "Content Removal Request",
  "Feature Request",
  "Other",
];

// ─── In-App Reply Thread ──────────────────────────────────────────────────────
function ReplyThread({ messageId, refetchList }: { messageId: number; refetchList: () => void }) {
  const { data: replies = [], refetch } = trpc.support.getReplies.useQuery({ messageId });
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const replyMut = trpc.support.reply.useMutation({
    onSuccess: () => { setText(""); refetch(); refetchList(); toast.success("Reply sent"); },
    onError: () => toast.error("Failed to send reply"),
  });
  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        className="text-xs font-semibold text-[#1877f2] flex items-center gap-1 mb-2"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}` : "Reply in-app"}
      </button>
      {open && (
        <div className="space-y-2">
          {replies.map(r => (
            <div key={r.id} className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-sm">
              <span className="font-semibold text-blue-700 dark:text-blue-300">{r.adminName ?? "Admin"}</span>
              <span className="text-muted-foreground ml-2 text-xs">{new Date(r.createdAt * 1000).toLocaleString()}</span>
              <p className="mt-1 text-foreground">{r.content}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a reply to this user…"
              className="min-h-[60px] text-sm resize-none"
            />
            <Button
              size="sm"
              disabled={!text.trim() || replyMut.isPending}
              onClick={() => replyMut.mutate({ messageId, content: text.trim() })}
              className="self-end bg-[#1877f2] hover:bg-[#166fe5] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topic Stats Chart ────────────────────────────────────────────────────────
function TopicStatsChart() {
  const { data: stats = [] } = trpc.support.topicStats.useQuery();
  const max = stats[0]?.count ?? 1;
  if (stats.length === 0) return <div className="text-center text-muted-foreground py-12">No messages yet.</div>;
  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><BarChart2 className="w-4 h-4" /> Message Topics Breakdown</h3>
      {stats.map(({ topic, count }) => (
        <div key={topic} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{topic}</span>
            <span className="font-medium">{count}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-[#1877f2] rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Admin Inbox ──────────────────────────────────────────────────────────────
function AdminInbox() {
  const { data: messages = [], refetch } = trpc.support.list.useQuery({ limit: 100, offset: 0 });
  const markRead = trpc.support.markRead.useMutation({ onSuccess: () => refetch() });
  const resolveMut = trpc.support.resolve.useMutation({ onSuccess: () => { refetch(); toast.success("Resolved"); } });
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("All");
  const selectedMsg = messages.find(m => m.id === selected);

  const applyFilters = (list: typeof messages) => {
    let filtered = list;
    if (topicFilter !== "All") filtered = filtered.filter(m => m.topic === topicFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m =>
        (m.userName ?? "").toLowerCase().includes(q) ||
        (m.userEmail ?? "").toLowerCase().includes(q) ||
        m.topic.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const openMessages = applyFilters(messages.filter(m => (m as { status?: string | null }).status !== "resolved"));
  const resolvedMessages = applyFilters(messages.filter(m => (m as { status?: string | null }).status === "resolved"));
  const unreadCount = messages.filter(m => !m.isRead && (m as { status?: string | null }).status !== "resolved").length;

  const handleEmailReply = (msg: typeof selectedMsg) => {
    if (!msg) return;
    const subject = encodeURIComponent(`Re: [FacingFace Support] ${msg.topic}`);
    const body = encodeURIComponent(
      `Hi ${msg.userName ?? "there"},\n\nThank you for reaching out to FacingFace Support.\n\nRegarding your message: "${msg.topic}"\n\n---\n[Your reply here]\n---\n\nBest regards,\nFacingFace Admin Team`
    );
    window.open(`mailto:${msg.userEmail ?? ""}?subject=${subject}&body=${body}`, "_blank");
  };

  const MessageDetail = ({ msg }: { msg: NonNullable<typeof selectedMsg> }) => (
    <Card className="border-border sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={msg.userAvatar ?? undefined} />
            <AvatarFallback className="bg-[#1877f2] text-white">{(msg.userName ?? "?")[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-base">{msg.userName ?? "Unknown"}</CardTitle>
            <p className="text-xs text-muted-foreground">{msg.userEmail ?? "No email"}</p>
          </div>
          {(msg as { status?: string | null }).status === "resolved" ? (
            <Badge variant="secondary" className="text-xs"><CheckCheck className="w-3 h-3 mr-1" />Resolved</Badge>
          ) : msg.isRead ? (
            <Badge variant="outline" className="text-xs">Read</Badge>
          ) : (
            <Badge className="bg-[#1877f2] text-white text-xs">New</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Topic</p>
          <p className="text-sm font-medium text-foreground">{msg.topic}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Message</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
            <p className="text-sm text-foreground">{msg.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">WhatsApp</p>
            {msg.whatsapp ? (
              <a href={`https://wa.me/${msg.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">{msg.whatsapp}</a>
            ) : <p className="text-sm text-foreground">—</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {msg.userEmail && (
            <Button className="flex-1 bg-[#1877f2] hover:bg-[#166fe5] text-white gap-2" onClick={() => handleEmailReply(msg)}>
              <Mail className="w-4 h-4" /> Reply via Email
            </Button>
          )}
          {(msg as { status?: string | null }).status !== "resolved" && (
            <Button variant="outline" className="flex-1 gap-2" onClick={() => resolveMut.mutate({ id: msg.id })}>
              <CheckCheck className="w-4 h-4" /> Resolve
            </Button>
          )}
        </div>
        {!msg.userEmail && <p className="text-xs text-muted-foreground italic text-center">No email address on file.</p>}
        <ReplyThread messageId={msg.id} refetchList={refetch} />
      </CardContent>
    </Card>
  );

  const MessageList = ({ msgs }: { msgs: typeof messages }) => (
    <div className="space-y-2">
      {msgs.map(msg => (
        <Card
          key={msg.id}
          className={`cursor-pointer transition-all hover:shadow-md border ${
            selected === msg.id ? "border-[#1877f2] bg-blue-50 dark:bg-blue-950/20" : "border-border"
          } ${!msg.isRead && (msg as { status?: string | null }).status !== "resolved" ? "border-l-4 border-l-[#1877f2]" : ""}`}
          onClick={() => { setSelected(msg.id); if (!msg.isRead) markRead.mutate({ id: msg.id }); }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={msg.userAvatar ?? undefined} />
                <AvatarFallback className="bg-[#1877f2] text-white text-xs">{(msg.userName ?? "?")[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold truncate ${!msg.isRead && (msg as { status?: string | null }).status !== "resolved" ? "text-[#1877f2]" : "text-foreground"}`}>
                    {msg.userName ?? "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(msg.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-medium text-foreground/80 truncate mt-0.5">{msg.topic}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
              </div>
              {!msg.isRead && (msg as { status?: string | null }).status !== "resolved" && (
                <div className="w-2 h-2 rounded-full bg-[#1877f2] shrink-0 mt-1" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, topic or message…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1877f2]"
        >
          <option value="All">All Topics</option>
          {TOPIC_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Tabs defaultValue="open">
        <TabsList className="mb-4">
          <TabsTrigger value="open" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Open
            {unreadCount > 0 && <Badge className="bg-red-500 text-white h-5 min-w-5 px-1 text-xs">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4" /> Resolved ({resolvedMessages.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          {openMessages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <CheckCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>All caught up! No open messages.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MessageList msgs={openMessages} />
              <div>{selectedMsg && (openMessages.find(m => m.id === selectedMsg.id)) && <MessageDetail msg={selectedMsg} />}
                {!selectedMsg && <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border border-dashed border-border rounded-xl"><Eye className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">Select a message to read</p></div>}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved">
          {resolvedMessages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground"><p>No resolved messages yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MessageList msgs={resolvedMessages} />
              <div>{selectedMsg && (resolvedMessages.find(m => m.id === selectedMsg.id)) && <MessageDetail msg={selectedMsg} />}
                {!selectedMsg && <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border border-dashed border-border rounded-xl"><Eye className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">Select a message to read</p></div>}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <Card><CardContent className="p-6"><TopicStatsChart /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── User-facing reply thread (shows admin replies) ────────────────────────
function UserReplyThread({ messageId }: { messageId: number }) {
  const { data: replies = [] } = trpc.support.getReplies.useQuery({ messageId });
  if (replies.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <p className="text-xs font-semibold text-[#1877f2] uppercase tracking-wide">Admin Replied</p>
      {replies.map((r: { id: number; adminName: string | null; content: string; createdAt: number }) => (
        <div key={r.id} className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#1877f2]">{r.adminName ?? "Admin"}</span>
            <span className="text-xs text-muted-foreground">{new Date(r.createdAt * 1000).toLocaleString()}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
        </div>
      ))}
    </div>
  );
}

// ─── My Messages (user view) ──────────────────────────────────────────────────
function MyMessages() {
  const { data: messages = [], isLoading } = trpc.support.myMessages.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-muted-foreground">
        <div className="w-8 h-8 border-2 border-[#1877f2]/30 border-t-[#1877f2] rounded-full animate-spin mx-auto mb-3" />
        Loading your messages…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No messages yet</p>
        <p className="text-sm mt-1">Use the "Send Message" tab to contact the admin team.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <h2 className="text-lg font-bold text-foreground mb-4">My Support Messages</h2>
      {messages.map(msg => (
        <Card key={msg.id} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{msg.topic}</span>
                  {msg.isRead ? (
                    <Badge variant="outline" className="text-xs shrink-0 text-green-600 border-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Seen by admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending review
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{msg.message}</p>
                {(msg.phone || msg.whatsapp) && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {msg.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{msg.phone}</span>}
                    {msg.whatsapp && <span className="flex items-center gap-1"><span className="text-green-600 font-bold">WA</span>{msg.whatsapp}</span>}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {new Date(msg.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const utils = trpc.useUtils();

  const submit = trpc.support.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      utils.support.myMessages.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = topic === "Other" ? customTopic.trim() : topic;
    if (!finalTopic) { toast.error("Please select or enter a topic"); return; }
    if (!message.trim()) { toast.error("Please write your message"); return; }
    submit.mutate({
      topic: finalTopic,
      message: message.trim(),
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h2>
        <p className="text-muted-foreground max-w-sm">
          Thank you for reaching out. Our admin team has been notified and will get back to you as soon as possible.
        </p>
        <Button
          className="mt-6 bg-[#1877f2] hover:bg-[#166fe5] text-white"
          onClick={() => { setSubmitted(false); setTopic(""); setMessage(""); }}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Sender info card */}
      <Card className="mb-5 border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.avatar ?? undefined} />
              <AvatarFallback className="bg-[#1877f2] text-white text-sm">
                {(user?.name ?? "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "No email on file"}</p>
            </div>
            <Badge variant="outline" className="ml-auto capitalize text-xs">
              {user?.role ?? "user"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Topic */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Topic <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOPIC_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                  topic === t
                    ? "bg-[#1877f2] text-white border-[#1877f2]"
                    : "bg-background text-foreground border-border hover:border-[#1877f2] hover:text-[#1877f2]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {topic === "Other" && (
            <Input
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              placeholder="Describe your topic…"
              maxLength={200}
              className="mt-2"
            />
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-semibold">
            Message <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your issue or question in detail…"
            rows={6}
            maxLength={5000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/5000</p>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-semibold flex items-center gap-1.5">
              <span className="text-green-600 font-bold text-xs">WA</span> WhatsApp Number
            </Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+1 234 567 8900"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">Include country code for WhatsApp</p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submit.isPending || !topic || !message.trim()}
          className="w-full bg-[#1877f2] hover:bg-[#166fe5] text-white h-11 text-base font-semibold"
        >
          {submit.isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Sending…
            </span>
          ) : (
            <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send Message</span>
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactSupport() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1877f2]" />
            <span className="font-bold text-foreground text-lg">Contact & Support</span>
          </div>
        </div>
      </div>

      {isAdmin ? (
        /* Admin view: Inbox + Send form */
        <Tabs defaultValue="inbox" className="w-full">
          <div className="max-w-5xl mx-auto px-4 pt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="inbox" className="flex items-center gap-2">
                <Inbox className="w-4 h-4" /> Admin Inbox
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Send Message
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="inbox"><AdminInbox /></TabsContent>
          <TabsContent value="form"><ContactForm /></TabsContent>
        </Tabs>
      ) : (
        /* Regular user view: Send form + My Messages */
        <Tabs defaultValue="form" className="w-full">
          <div className="max-w-2xl mx-auto px-4 pt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="form" className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Send Message
              </TabsTrigger>
              <TabsTrigger value="mine" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> My Messages
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="form"><ContactForm /></TabsContent>
          <TabsContent value="mine"><MyMessages /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
