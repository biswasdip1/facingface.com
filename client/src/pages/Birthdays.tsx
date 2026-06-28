import { Gift, CalendarDays, Search } from "lucide-react";
import { Link } from "wouter";

export default function BirthdaysPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-sm border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-50 text-[var(--its-red)] flex items-center justify-center">
            <Gift size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide">Birthdays</h1>
            <p className="text-xs text-muted-foreground">See birthday reminders from your FacingFace friends.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <CalendarDays size={34} className="mx-auto mb-3 text-muted-foreground opacity-70" />
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2">Birthday reminders are ready</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This page is now connected from the home sidebar. When friend birthday reminders are enabled, they will appear here.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/friends" className="rounded-sm border border-border px-4 py-3 hover:border-[var(--its-red)] transition-colors">
              <Search size={16} className="mb-2 text-[var(--its-red)]" />
              <p className="text-sm font-bold">Find friends</p>
              <p className="text-xs text-muted-foreground">Connect with more people to see more birthday reminders.</p>
            </Link>
            <Link href="/profile" className="rounded-sm border border-border px-4 py-3 hover:border-[var(--its-red)] transition-colors">
              <Gift size={16} className="mb-2 text-[var(--its-red)]" />
              <p className="text-sm font-bold">Update your profile</p>
              <p className="text-xs text-muted-foreground">Keep your birthday information up to date.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
