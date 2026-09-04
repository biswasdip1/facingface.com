import { format } from "date-fns";
import { CalendarDays, Gift, Heart, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(value: string | null | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "?";
}

function BirthdayCard({ birthday, today }: { birthday: { user: { id: number; name: string | null; avatar: string | null }; daysUntil: number; nextBirthdayAt: Date }; today?: boolean }) {
  const date = new Date(birthday.nextBirthdayAt);
  return (
    <Link href={`/profile/${birthday.user.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-[var(--its-red)]/60 hover:bg-muted/20">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11"><AvatarImage src={birthday.user.avatar ?? undefined} /><AvatarFallback>{initials(birthday.user.name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{birthday.user.name ?? "Friend"}</p><p className="mt-0.5 text-xs text-muted-foreground">{today ? "Birthday today" : format(date, "d MMMM")}</p></div>
        <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${today ? "bg-[var(--its-red)] text-white" : "bg-muted text-muted-foreground"}`}>{today ? "Today" : `${birthday.daysUntil} day${birthday.daysUntil === 1 ? "" : "s"}`}</div>
      </div>
    </Link>
  );
}

export default function BirthdaysPage() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.events.birthdays.useQuery();
  const today = data?.today ?? [];
  const upcoming = data?.upcoming ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-7">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[var(--its-red)]"><Gift size={20} /></div><div><h1 className="text-lg font-black uppercase tracking-wide text-foreground">Birthdays</h1><p className="text-xs text-muted-foreground">Birthday reminders from your accepted FacingFace friends.</p></div></header>
        <div className="space-y-6 p-5">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-100"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><p><strong>Privacy protected.</strong> Birthdays use only day and month. FacingFace does not ask for, store, or show a birth year here.</p></div>
          {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading birthdays…</p> : <>
            {today.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground"><Heart size={16} className="fill-[var(--its-red)] text-[var(--its-red)]" />Celebrating today</h2><div className="grid gap-3 sm:grid-cols-2">{today.map((birthday) => <BirthdayCard key={birthday.user.id} birthday={birthday} today />)}</div></section>}
            {upcoming.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground"><CalendarDays size={16} className="text-[var(--its-red)]" />Upcoming birthdays</h2><div className="grid gap-3 sm:grid-cols-2">{upcoming.map((birthday) => <BirthdayCard key={birthday.user.id} birthday={birthday} />)}</div></section>}
            {today.length === 0 && upcoming.length === 0 && <div className="rounded-lg border border-dashed border-border bg-muted/20 px-5 py-10 text-center"><Gift size={34} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-black uppercase tracking-wide text-foreground">No birthday reminders yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">When accepted friends add their day and month, their next birthday will appear here. Birth years are never used.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link href="/friends" className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"><Users size={14} />Find friends</Link><Link href={`/profile/${user?.id ?? ""}`} className="inline-flex items-center gap-2 rounded-md bg-[var(--its-red)] px-3 py-2 text-xs font-bold text-white hover:opacity-90"><Gift size={14} />Add your birthday</Link></div></div>}
          </>}
        </div>
      </section>
    </div>
  );
}
