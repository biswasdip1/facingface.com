import { CalendarDays, Plus, Search } from "lucide-react";
import { Link } from "wouter";

export default function EventsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-sm border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide">Events</h1>
            <p className="text-xs text-muted-foreground">Discover and manage FacingFace community events.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-sm border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <CalendarDays size={34} className="mx-auto mb-3 text-muted-foreground opacity-70" />
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2">Events page is connected</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This page is now reachable from the home sidebar. Full event creation and discovery tools can be added here next.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/search" className="rounded-sm border border-border px-4 py-3 hover:border-[var(--its-red)] transition-colors">
              <Search size={16} className="mb-2 text-[var(--its-red)]" />
              <p className="text-sm font-bold">Search FacingFace</p>
              <p className="text-xs text-muted-foreground">Find public posts, people, groups, and pages.</p>
            </Link>
            <Link href="/" className="rounded-sm border border-border px-4 py-3 hover:border-[var(--its-red)] transition-colors">
              <Plus size={16} className="mb-2 text-[var(--its-red)]" />
              <p className="text-sm font-bold">Back to feed</p>
              <p className="text-xs text-muted-foreground">Return to your home feed and community updates.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
