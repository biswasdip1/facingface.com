import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CalendarDays, CalendarPlus, Check, Clock3, ImagePlus, MapPin, Send, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function dateTimeInputValue(date: Date) {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function defaultStartValue() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return dateTimeInputValue(date);
}

function initials(value: string | null | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "?";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function AttendanceSummary({ summary }: { summary: { invited: number; going: number; maybe: number; declined: number } | undefined }) {
  const value = summary ?? { invited: 0, going: 0, maybe: 0, declined: 0 };
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><strong className="text-foreground">{value.going}</strong> going</span>
      <span><strong className="text-foreground">{value.maybe}</strong> maybe</span>
      <span><strong className="text-foreground">{value.invited}</strong> awaiting reply</span>
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStartValue);
  const [endsAt, setEndsAt] = useState("");
  const [inviteeIds, setInviteeIds] = useState<number[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [invitePanelEventId, setInvitePanelEventId] = useState<number | null>(null);
  const [additionalInviteeIds, setAdditionalInviteeIds] = useState<number[]>([]);

  const { data: eventData, isLoading } = trpc.events.getMy.useQuery();
  const { data: friendsData } = trpc.events.invitableFriends.useQuery();
  const friends = friendsData?.friends ?? [];
  const events = eventData?.events ?? [];
  const attendance = eventData?.attendance ?? {};

  const invitations = useMemo(
    () => events.filter((event) => event.organizerId !== user?.id && event.invitation?.status === "invited"),
    [events, user?.id],
  );
  const hosted = useMemo(() => events.filter((event) => event.organizerId === user?.id), [events, user?.id]);
  const attending = useMemo(
    () => events.filter((event) => event.organizerId !== user?.id && event.invitation?.status !== "invited"),
    [events, user?.id],
  );

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt(defaultStartValue());
    setEndsAt("");
    setInviteeIds([]);
    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    setShowCreate(false);
  };

  const uploadMedia = trpc.media.upload.useMutation();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.getMy.invalidate();
      resetCreateForm();
      toast.success("Event created and invitations sent.");
    },
    onError: (error) => toast.error(error.message),
  });
  const respond = trpc.events.respond.useMutation({
    onSuccess: () => {
      utils.events.getMy.invalidate();
      toast.success("Your RSVP has been saved.");
    },
    onError: (error) => toast.error(error.message),
  });
  const cancelEvent = trpc.events.cancel.useMutation({
    onSuccess: () => {
      utils.events.getMy.invalidate();
      toast.success("Event cancelled.");
    },
    onError: (error) => toast.error(error.message),
  });
  const sendAdditionalInvites = trpc.events.invite.useMutation({
    onSuccess: () => {
      utils.events.getMy.invalidate();
      setInvitePanelEventId(null);
      setAdditionalInviteeIds([]);
      toast.success("Event invitations sent.");
    },
    onError: (error) => toast.error(error.message),
  });

  const togglePerson = (personId: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter((current) => current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]);
  };

  const chooseBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image for the Event banner.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Event banner images must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      setBannerPreview(await readFileAsDataUrl(file));
      setBannerFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The banner image could not be read.");
      event.target.value = "";
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || bannerUploading || createEvent.isPending) return;
    try {
      let bannerUrl: string | null = null;
      if (bannerFile && bannerPreview) {
        setBannerUploading(true);
        const base64 = bannerPreview.includes(",") ? bannerPreview.split(",", 2)[1] : bannerPreview;
        const upload = await uploadMedia.mutateAsync({ filename: bannerFile.name, contentType: bannerFile.type, base64, mediaType: "image" });
        bannerUrl = upload.url;
      }
      createEvent.mutate({
        title: title.trim(),
        description: description.trim() || null,
        bannerUrl,
        location: location.trim() || null,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        inviteeIds,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Event banner could not be uploaded.");
    } finally {
      setBannerUploading(false);
    }
  };

  const renderEvent = (event: typeof events[number]) => {
    const isHost = event.organizerId === user?.id;
    const response = event.invitation?.status ?? null;
    const invitePanelOpen = invitePanelEventId === event.id;
    return (
      <article key={event.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {event.bannerUrl && <div className="border-b border-border bg-muted/30"><img src={event.bannerUrl} alt={`${event.title} event banner`} className="h-44 w-full object-cover sm:h-56" loading="lazy" onError={(image) => { image.currentTarget.parentElement?.remove(); }} /></div>}
        <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--its-red)]">{isHost ? "You are hosting" : response === "invited" ? "Invitation" : "Your event"}</p>
            <h2 className="mt-1 text-lg font-black leading-tight text-foreground break-words">{event.title}</h2>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><CalendarDays size={19} /></div>
        </div>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Clock3 size={15} className="shrink-0 text-[var(--its-red)]" />{format(new Date(event.startsAt), "EEEE, d MMMM yyyy 'at' h:mm a")}{event.endsAt ? ` – ${format(new Date(event.endsAt), "h:mm a")}` : ""}</p>
          {event.location && <p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-[var(--its-red)]" />{event.location}</p>}
        </div>
        {event.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{event.description}</p>}
        <div className="mt-4 border-t border-border pt-3"><AttendanceSummary summary={attendance[event.id]} /></div>

        {isHost ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setInvitePanelEventId(invitePanelOpen ? null : event.id); setAdditionalInviteeIds([]); }}><UserPlus size={14} className="mr-1.5" />Invite friends</Button>
            <Button type="button" variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => { if (window.confirm("Cancel this event for everyone invited?")) cancelEvent.mutate({ eventId: event.id }); }} disabled={cancelEvent.isPending}><X size={14} className="mr-1.5" />Cancel event</Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["going", "maybe", "declined"] as const).map((status) => (
              <Button key={status} type="button" variant={response === status ? "default" : "outline"} size="sm" className="capitalize" disabled={respond.isPending} onClick={() => respond.mutate({ eventId: event.id, status })}>{status === "declined" ? "Can't go" : status}</Button>
            ))}
          </div>
        )}

        {invitePanelOpen && (
          <div className="mt-4 rounded-lg border border-border bg-muted/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-bold text-foreground">Invite accepted friends</p><button type="button" onClick={() => setInvitePanelEventId(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close invitations"><X size={16} /></button></div>
            {friends.length === 0 ? <p className="text-xs text-muted-foreground">You need accepted friends before you can send invitations.</p> : <div className="grid max-h-44 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">{friends.map((friend) => <label key={friend.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background"><input type="checkbox" checked={additionalInviteeIds.includes(friend.id)} onChange={() => togglePerson(friend.id, setAdditionalInviteeIds)} /><Avatar className="h-6 w-6"><AvatarImage src={friend.avatar ?? undefined} /><AvatarFallback>{initials(friend.name)}</AvatarFallback></Avatar><span className="truncate">{friend.name ?? "Friend"}</span></label>)}</div>}
            <div className="mt-3 flex justify-end"><Button type="button" size="sm" disabled={additionalInviteeIds.length === 0 || sendAdditionalInvites.isPending} onClick={() => sendAdditionalInvites.mutate({ eventId: event.id, inviteeIds: additionalInviteeIds })}><Send size={14} className="mr-1.5" />Send invitation</Button></div>
          </div>
        )}
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-7">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><CalendarDays size={20} /></div><div><h1 className="text-lg font-black uppercase tracking-wide text-foreground">Events</h1><p className="text-xs text-muted-foreground">Create a private event and invite accepted friends.</p></div></div>
          <Button type="button" onClick={() => setShowCreate((open) => !open)}><CalendarPlus size={16} className="mr-2" />Create event</Button>
        </header>

        {showCreate && <form onSubmit={submitCreate} className="space-y-4 border-b border-border bg-muted/20 p-5">
          <div><label className="mb-1 block text-xs font-bold text-foreground">Event name</label><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required placeholder="For example: Family dinner" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-[var(--its-red)]/35" /></div>
          <div><label className="mb-1 block text-xs font-bold text-foreground">Details <span className="font-normal text-muted-foreground">(optional)</span></label><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Tell your invited friends about the event." className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-[var(--its-red)]/35" /></div>
          <div><div className="mb-2 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold text-foreground"><ImagePlus size={15} className="text-[var(--its-red)]" />Event banner <span className="font-normal text-muted-foreground">(optional)</span></label>{bannerPreview && <button type="button" onClick={clearBanner} className="text-xs font-bold text-[var(--its-red)] hover:underline">Remove</button>}</div>{bannerPreview ? <div className="overflow-hidden rounded-lg border border-border bg-muted/30"><img src={bannerPreview} alt="Event banner preview" className="h-40 w-full object-cover" /><p className="px-3 py-2 text-[11px] text-muted-foreground">This banner will be visible only to you and invited friends.</p></div> : <button type="button" onClick={() => bannerInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-7 text-sm font-semibold text-muted-foreground transition-colors hover:border-[var(--its-red)] hover:text-[var(--its-red)]"><ImagePlus size={18} />Upload an Event banner</button>}<input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={chooseBanner} /><p className="mt-1.5 text-[11px] text-muted-foreground">Image only, up to 10 MB.</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-bold text-foreground">Start</label><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></div><div><label className="mb-1 block text-xs font-bold text-foreground">End <span className="font-normal text-muted-foreground">(optional)</span></label><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></div></div>
          <div><label className="mb-1 block text-xs font-bold text-foreground">Location <span className="font-normal text-muted-foreground">(optional)</span></label><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={255} placeholder="Add a venue, town, or online link" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></div>
          <div><div className="mb-2 flex items-center gap-2"><Users size={15} className="text-[var(--its-red)]" /><label className="text-xs font-bold text-foreground">Invite accepted friends</label><span className="text-xs text-muted-foreground">({inviteeIds.length} selected)</span></div>{friends.length === 0 ? <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">You need accepted friends before you can send invitations.</p> : <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border border-border bg-background p-2 sm:grid-cols-2">{friends.map((friend) => <label key={friend.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={inviteeIds.includes(friend.id)} onChange={() => togglePerson(friend.id, setInviteeIds)} /><Avatar className="h-7 w-7"><AvatarImage src={friend.avatar ?? undefined} /><AvatarFallback>{initials(friend.name)}</AvatarFallback></Avatar><span className="truncate">{friend.name ?? "Friend"}</span></label>)}</div>}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={resetCreateForm} disabled={createEvent.isPending || bannerUploading}>Cancel</Button><Button type="submit" disabled={createEvent.isPending || bannerUploading}>{bannerUploading ? "Uploading banner…" : createEvent.isPending ? "Creating…" : "Create and invite"}</Button></div>
        </form>}

        <div className="space-y-6 p-5">
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading your events…</p> : <>
            {invitations.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground"><UserPlus size={16} className="text-[var(--its-red)]" />Your invitations</h2><div className="space-y-3">{invitations.map(renderEvent)}</div></section>}
            {attending.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground"><Check size={16} className="text-green-600" />Events you replied to</h2><div className="space-y-3">{attending.map(renderEvent)}</div></section>}
            {hosted.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground"><CalendarDays size={16} className="text-blue-600" />Events you host</h2><div className="space-y-3">{hosted.map(renderEvent)}</div></section>}
            {events.length === 0 && <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-10 text-center"><CalendarDays size={34} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-black uppercase tracking-wide text-foreground">No upcoming events</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Create an event, choose accepted friends to invite, and they can reply Going, Maybe, or Can't go.</p><Button type="button" className="mt-4" onClick={() => setShowCreate(true)}><CalendarPlus size={16} className="mr-2" />Create an event</Button></div>}
          </>}
        </div>
        <footer className="border-t border-border bg-muted/15 px-5 py-3 text-xs text-muted-foreground">Events are private to the host and invited accepted friends. <Link href="/friends" className="font-semibold text-[var(--its-red)] hover:underline">Manage friends</Link></footer>
      </section>
    </div>
  );
}
