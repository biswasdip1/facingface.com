import { Link } from "wouter";

export default function NativePurchasesUnavailable() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-16 flex items-center justify-center">
      <section className="max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-bold">FacingFace mobile is free</h1>
        <p className="text-sm leading-relaxed">You can use social posts, messages and foreground calls without buying a digital plan in this app. Digital-subscription purchases and checkout are not offered in this mobile release.</p>
        <Link href="/" className="inline-block rounded-lg bg-primary text-primary-foreground px-4 py-3 font-semibold">Return to FacingFace</Link>
      </section>
    </main>
  );
}
