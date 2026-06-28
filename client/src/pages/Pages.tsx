import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Plus, Globe, MapPin, Users, Building2 } from "lucide-react";

export default function Pages() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    handle: "",
    name: "",
    description: "",
    category: "",
    website: "",
    location: "",
  });

  const { data: pages, isLoading } = trpc.pages.list.useQuery(
    { search: search || undefined, limit: 24 }
  );

  const createMutation = trpc.pages.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Page created! Your page is live at /p/${data.handle}`);
      setCreateOpen(false);
      setForm({ handle: "", name: "", description: "", category: "", website: "", location: "" });
      navigate(`/p/${data.handle}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create page");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.handle || !form.name) return;
    createMutation.mutate(form);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Build your page</h1>
            <p className="text-sm text-muted-foreground">Discover organisations, brands and communities</p>
          </div>
        </div>
        {user && (
          <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Create Page
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pages Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !pages || pages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No pages found yet</p>
          {user && (
            <p className="text-sm mt-1">
              Be the first —{" "}
              <button onClick={() => setCreateOpen(true)} className="text-red-600 hover:underline">
                create a page
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Link key={page.id} href={`/p/${page.handle}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group">
                {/* Cover */}
                <div className="h-24 bg-gradient-to-br from-red-500 to-red-700 relative overflow-hidden">
                  {page.coverPhoto && (
                    <img src={page.coverPhoto} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <CardContent className="pt-0 pb-4 px-4">
                  {/* Logo */}
                  <div className="-mt-6 mb-2">
                    <Avatar className="w-12 h-12 border-2 border-background shadow">
                      <AvatarImage src={page.logo ?? undefined} />
                      <AvatarFallback className="bg-red-600 text-white text-lg font-bold">
                        {page.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-red-600 transition-colors line-clamp-1">
                    {page.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">@{page.handle}</p>
                  {page.category && (
                    <Badge variant="secondary" className="text-xs mb-2">{page.category}</Badge>
                  )}
                  {page.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{page.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {page.followerCount ?? 0} followers
                    </span>
                    {page.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {page.location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Page Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" />
              Create a Page
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="page-name">Page name *</Label>
                <Input
                  id="page-name"
                  placeholder="My Organisation"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page-handle">
                  Handle * <span className="text-muted-foreground text-xs">(facingface.com/p/…)</span>
                </Label>
                <Input
                  id="page-handle"
                  placeholder="my-org"
                  value={form.handle}
                  onChange={(e) => setForm(f => ({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page-desc">Description</Label>
              <Textarea
                id="page-desc"
                placeholder="Tell people what your page is about…"
                rows={3}
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="page-cat">Category</Label>
                <Input
                  id="page-cat"
                  placeholder="e.g. Business, Sports, Music"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page-loc">Location</Label>
                <Input
                  id="page-loc"
                  placeholder="e.g. London, UK"
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page-web">
                <Globe className="w-3 h-3 inline mr-1" />
                Website
              </Label>
              <Input
                id="page-web"
                placeholder="https://yourwebsite.com"
                value={form.website}
                onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={createMutation.isPending || !form.handle || !form.name}
              >
                {createMutation.isPending ? "Creating…" : "Create Page"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
