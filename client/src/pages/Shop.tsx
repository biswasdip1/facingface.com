import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShoppingBag, Search, Plus, MapPin, Eye, SlidersHorizontal,
  ChevronLeft, ChevronRight, ClipboardList, Heart, Bookmark,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "electronics", label: "Electronics" },
  { value: "vehicles", label: "Vehicles" },
  { value: "property", label: "Property" },
  { value: "fashion", label: "Fashion" },
  { value: "home", label: "Home & Garden" },
  { value: "garden", label: "Garden & Outdoor" },
  { value: "sports", label: "Sports & Hobbies" },
  { value: "toys", label: "Toys & Games" },
  { value: "books", label: "Books & Media" },
  { value: "music", label: "Music" },
  { value: "art", label: "Art & Collectibles" },
  { value: "food", label: "Food & Drinks" },
  { value: "services", label: "Services" },
  { value: "jobs", label: "Jobs" },
  { value: "other", label: "Other" },
];

const CONDITIONS = [
  { value: "all", label: "Any Condition" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For Parts" },
];

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  like_new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  good: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  fair: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  for_parts: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PAGE_SIZE = 24;

function formatPrice(price: string, currency: string) {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
  } catch {
    return `${currency} ${num.toFixed(0)}`;
  }
}

type ActiveTab = "browse" | "saved";

export default function Shop() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [condition, setCondition] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");
  // Optimistic saved IDs
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const listingsQuery = trpc.shop.getListings.useQuery(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      category: category !== "all" ? category : undefined,
      condition: condition !== "all" ? condition : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    },
    { enabled: !searchQuery && activeTab === "browse" }
  );

  const searchResult = trpc.shop.searchListings.useQuery(
    { query: searchQuery, limit: PAGE_SIZE },
    { enabled: !!searchQuery && activeTab === "browse" }
  );

  const savedQuery = trpc.shop.getSaved.useQuery(
    { limit: 100, offset: 0 },
    { enabled: !!user && activeTab === "saved" }
  );

  // Sync saved IDs when data loads
  const savedData = savedQuery.data;
  useState(() => {
    if (savedData) setSavedIds(new Set(savedData.map((l: { id: number }) => l.id)));
  });

  const saveMutation = trpc.shop.saveListing.useMutation({
    onMutate: ({ listingId }) => {
      setSavedIds((prev) => { const next = new Set(Array.from(prev)); next.add(listingId); return next; });
    },
    onError: (_: unknown, { listingId }: { listingId: number }) => {
      setSavedIds((prev) => { const next = new Set(Array.from(prev)); next.delete(listingId); return next; });
      toast.error("Could not save listing");
    },
    onSuccess: () => utils.shop.getSaved.invalidate(),
  });

  const unsaveMutation = trpc.shop.unsaveListing.useMutation({
    onMutate: ({ listingId }) => {
      setSavedIds((prev) => { const next = new Set(Array.from(prev)); next.delete(listingId); return next; });
    },
    onError: (_: unknown, { listingId }: { listingId: number }) => {
      setSavedIds((prev) => { const next = new Set(Array.from(prev)); next.add(listingId); return next; });
      toast.error("Could not unsave listing");
    },
    onSuccess: () => utils.shop.getSaved.invalidate(),
  });

  const toggleSave = useCallback((e: React.MouseEvent, listingId: number) => {
    e.stopPropagation();
    if (!user) { toast("Sign in to save listings"); return; }
    if (savedIds.has(listingId)) {
      unsaveMutation.mutate({ listingId });
    } else {
      saveMutation.mutate({ listingId });
    }
  }, [user, savedIds, saveMutation, unsaveMutation]);

  const handleSearch = () => { setSearchQuery(searchInput.trim()); setPage(0); };
  const clearSearch = () => { setSearchInput(""); setSearchQuery(""); setPage(0); };

  const listings = searchQuery ? (searchResult.data ?? []) : (listingsQuery.data ?? []);
  const isLoading = searchQuery ? searchResult.isLoading : listingsQuery.isLoading;

  const renderListingCard = (listing: typeof listings[0]) => {
    const thumb = (listing.mediaUrls as string[] | null)?.[0];
    const priceStr = formatPrice(String(listing.price), listing.currency);
    const isSaved = savedIds.has(listing.id);
    return (
      <div
        key={listing.id}
        className="group rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow relative"
      >
        <button
          onClick={() => navigate(`/shop/${listing.id}`)}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          aria-label={`View listing: ${listing.title}`}
        >
          <div className="aspect-square bg-muted relative overflow-hidden">
            {thumb ? (
              <img src={thumb} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
              </div>
            )}
            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg tracking-wide">SOLD</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="font-semibold text-sm line-clamp-2 leading-tight mb-1">{listing.title}</p>
            <p className="text-primary font-bold text-base">{priceStr}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CONDITION_COLORS[listing.condition] ?? ""}`}>
                {listing.condition.replace("_", " ")}
              </span>
              {listing.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5 truncate max-w-[100px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{listing.location.split(",")[0]}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />{listing.viewCount}
            </div>
          </div>
        </button>
        {/* Save / heart button */}
        <button
          onClick={(e) => toggleSave(e, listing.id)}
          className={`absolute top-2 right-2 p-1.5 rounded-full shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isSaved
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500 dark:bg-black/50 dark:hover:bg-black/70"
          }`}
          aria-label={isSaved ? "Remove from saved" : "Save listing"}
          title={isSaved ? "Remove from saved" : "Save listing"}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Sale &amp; Buy Shop</h1>
            <p className="text-sm text-muted-foreground">Buy and sell in your community</p>
          </div>
        </div>
        {user && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/shop/my")} className="hidden sm:flex gap-1">
              <ClipboardList className="w-4 h-4" />My Listings
            </Button>
            <Button size="sm" onClick={() => navigate("/shop/new")} className="gap-1">
              <Plus className="w-4 h-4" />New Listing
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex gap-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "browse" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "saved" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />Saved
          </button>
        </div>
      )}

      {/* Saved tab */}
      {activeTab === "saved" && (
        <>
          {savedQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : (savedQuery.data ?? []).length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No saved listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Tap the heart on any listing to save it here</p>
              <Button className="mt-4" variant="outline" onClick={() => setActiveTab("browse")}>Browse listings</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {(savedQuery.data ?? []).map(renderListingCard)}
            </div>
          )}
        </>
      )}

      {/* Browse tab */}
      {activeTab === "browse" && (
        <>
          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search listings…"
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchInput.trim()}>Search</Button>
            {searchQuery && <Button variant="ghost" onClick={clearSearch}>Clear</Button>}
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-muted/40 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Condition</label>
                <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(0); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Price</label>
                <Input value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(0); }} placeholder="0" type="number" min="0" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Price</label>
                <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(0); }} placeholder="Any" type="number" min="0" className="h-8 text-sm" />
              </div>
            </div>
          )}

          {/* Category chips */}
          {!showFilters && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setCategory(c.value); setPage(0); }}
                  className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">
                {searchQuery ? `No results for "${searchQuery}"` : "No listings yet"}
              </p>
              {user && !searchQuery && (
                <Button className="mt-4 gap-2" onClick={() => navigate("/shop/new")}>
                  <Plus className="w-4 h-4" />Be the first to list something
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(renderListingCard)}
              </div>
              {/* Pagination */}
              {!searchQuery && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                  <Button variant="outline" size="sm" disabled={listings.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
