import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Tag,
} from "lucide-react";

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sold: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  reserved: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle className="w-3 h-3" />,
  sold: <Tag className="w-3 h-3" />,
  reserved: <Clock className="w-3 h-3" />,
  deleted: <AlertCircle className="w-3 h-3" />,
};

function formatPrice(price: string, currency: string) {
  const num = parseFloat(price);
  if (num === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function timeAgo(date: Date | string | number) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function ShopMyListings() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.shop.getMyListings.useQuery({ limit: 100, offset: 0 }, {
    enabled: !!user,
  });

  const updateStatus = trpc.shop.updateListing.useMutation({
    onSuccess: () => {
      utils.shop.getMyListings.invalidate();
      toast.success("Listing updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteListing = trpc.shop.deleteListing.useMutation({
    onSuccess: () => {
      utils.shop.getMyListings.invalidate();
      toast.success("Listing removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) return null;
  if (!user) {
    navigate("/");
    return null;
  }

  const listings = data ?? [];
  const filtered =
    statusFilter === "all"
      ? listings
      : listings.filter((l) => l.status === statusFilter);

  const counts = {
    all: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    sold: listings.filter((l) => l.status === "sold").length,
    reserved: listings.filter((l) => l.status === "draft").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/shop")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Back to shop"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              My Listings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your items for sale
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/shop/new")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Listing
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["all", "active", "sold", "reserved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}{" "}
            <span className="opacity-70">({counts[s as keyof typeof counts] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold text-muted-foreground">
            {statusFilter === "all" ? "No listings yet" : `No ${statusFilter} listings`}
          </p>
          {statusFilter === "all" && (
            <Button onClick={() => navigate("/shop/new")} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Create your first listing
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => {
            const mediaUrls: string[] = (() => {
              try {
                const raw = listing.mediaUrls;
                if (!raw) return [];
                const str = Array.isArray(raw) ? JSON.stringify(raw) : (raw as unknown as string);
                return JSON.parse(str);
              } catch {
                return [];
              }
            })();
            const thumb = mediaUrls[0];

            return (
              <div
                key={listing.id}
                className="flex gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted cursor-pointer"
                  onClick={() => navigate(`/shop/${listing.id}`)}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => navigate(`/shop/${listing.id}`)}
                      className="font-semibold text-sm hover:underline text-left line-clamp-1"
                    >
                      {listing.title}
                    </button>
                    <Badge
                      className={`text-xs flex items-center gap-1 flex-shrink-0 ${
                        STATUS_COLORS[listing.status ?? "active"]
                      }`}
                    >
                      {STATUS_ICONS[listing.status ?? "active"]}
                      {(listing.status ?? "active").charAt(0).toUpperCase() +
                        (listing.status ?? "active").slice(1)}
                    </Badge>
                  </div>

                  <p className="text-base font-bold text-primary mt-0.5">
                    {formatPrice(listing.price, listing.currency ?? "USD")}
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{listing.category}</span>
                    {listing.condition && (
                      <>
                        <span>·</span>
                        <span>{CONDITION_LABELS[listing.condition] ?? listing.condition}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(listing.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {listing.status === "active" && (
                    <button
                      onClick={() =>
                        deleteListing.mutate({ id: listing.id })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                      aria-label="Mark as sold"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark Sold
                    </button>
                  )}
                  {listing.status === "active" && (
                    <button
                      onClick={() =>
                        updateStatus.mutate({ id: listing.id, status: "draft" })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                      aria-label="Mark as reserved"
                    >
                      <Clock className="w-3 h-3" />
                      Reserve
                    </button>
                  )}
                  {listing.status === "sold" && (
                    <button
                      onClick={() =>
                        updateStatus.mutate({ id: listing.id, status: "active" })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      aria-label="Relist item"
                    >
                      <Edit2 className="w-3 h-3" />
                      Relist
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Remove this listing?")) {
                        deleteListing.mutate({ id: listing.id });
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                    aria-label="Delete listing"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
