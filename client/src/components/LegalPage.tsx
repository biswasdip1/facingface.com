import { Link } from "wouter";

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Help", href: "/help" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Advertising", href: "/advertising" },
  { label: "Cookies", href: "/cookies" },
];

export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b px-4 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-[var(--its-red)] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black tracking-tight">FF</span>
          </div>
          <span className="font-bold text-foreground text-sm hidden sm:inline">FacingFace</span>
        </Link>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8">FacingFace.com · Last updated April 2026</p>
        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 px-4 py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-3">
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="hover:underline text-muted-foreground">
              {label}
            </Link>
          ))}
        </div>
        <p>FacingFace.com · <a href="mailto:direct.letter@gmail.com" className="hover:underline">direct.letter@gmail.com</a></p>
        <p className="mt-1">© 2026 FacingFace.com. All rights reserved.</p>
      </footer>
    </div>
  );
}
