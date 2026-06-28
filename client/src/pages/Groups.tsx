import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Plus, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "All",
  "Technology",
  "Sports",
  "Music",
  "Art & Culture",
  "Business",
  "Education",
  "Health & Wellness",
  "Food & Drink",
  "Travel",
  "Gaming",
  "Science",
  "Politics",
  "Community",
  "Other",
];

export default function Groups() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    handle: "",
    name: "",
    description: "",
    category: "",
  });

  const { data: groups = [], isLoading } = trpc.publicGroups.list.useQuery({
    search: debouncedSearch || undefined,
    limit: 24,
    offset: 0,
  });

  const createGroup = trpc.publicGroups.create.useMutation({
    onSuccess: (data) => {
      toast.success("Group created!");
      setCreateOpen(false);
      navigate(`/g/${data.handle}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredGroups = selectedCategory === "All"
    ? groups
    : groups.filter((g) => g.category === selectedCategory);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._groupSearchTimer);
    (window as any)._groupSearchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const handleCreate = () => {
    if (!user) { toast.error("Please log in to create a group."); return; }
    if (!form.handle || !form.name) { toast.error("Handle and name are required."); return; }
    createGroup.mutate(form);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Build your Public Group</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover communities and connect with people who share your interests.
          </p>
        </div>
        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a Public Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Group Name *</Label>
                  <Input
                    placeholder="e.g. Photography Lovers"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Handle (URL) *</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">/g/</span>
                    <Input
                      placeholder="photography-lovers"
                      value={form.handle}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, and hyphens only.</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What is this group about?"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">All groups are public — anyone can find and join them.</span>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createGroup.isPending}
                >
                  {createGroup.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search groups by name, description, or category..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Groups grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No groups found. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGroups.map((group) => (
            <Link key={group.id} href={`/g/${group.handle}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                {/* Cover photo */}
                <div className="h-28 bg-gradient-to-br from-primary/30 to-primary/10 relative overflow-hidden">
                  {group.coverPhoto ? (
                    <img src={group.coverPhoto} alt={group.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Users className="w-10 h-10 text-primary/40" />
                    </div>
                  )}
                  {group.category && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                      {group.category}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{group.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3" />
                    <span>Public Group</span>
                    <span className="mx-1">·</span>
                    <Users className="w-3 h-3" />
                    <span>{group.memberCount.toLocaleString()} member{group.memberCount !== 1 ? "s" : ""}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
