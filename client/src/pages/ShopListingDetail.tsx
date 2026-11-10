import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import {
  ArrowLeft, MapPin, Mail, Phone, Eye, ChevronLeft, ChevronRight,
  CheckCircle2, Pencil, Trash2, Loader2, ShoppingBag, User, MessageCircle,
} from "lucide-react";

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  for_parts: "For Parts",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  like_new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  good: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  fair: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  for_parts: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function ShopListingDetail() {
  const { id } = useParams<{ id: string }>();
  const listingId = parseInt(id ?? "0", 10);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { data: listing, isLoading, error } = trpc.shop.getListing.useQuery(
    { id: listingId },
    { enabled: !!listingId }
  );

  const { data: seller } = trpc.users.getProfile.useQuery(
    { userId: listing?.sellerId ?? 0 },
    { enabled: !!listing?.sellerId }
  );

  const markAsSold = trpc.shop.markAsSold.useMutation({
    onSuccess: () => { toast.success("Marked as sold!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteListing = trpc.shop.deleteListing.useMutation({
    onSuccess: () => { toast.success("Listing deleted."); navigate("/shop"); },
    onError: (e) => toast.error(e.message),
  });

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (listing?.lat && listing?.lng) {
      const lat = parseFloat(String(listing.lat));
      const lng = parseFloat(String(listing.lng));
      if (!isNaN(lat) && !isNaN(lng)) {
        new google.maps.marker.AdvancedMarkerElement({ map, position: { lat, lng } });
      }
    }
  };

  const formatPrice = (price: string, currency: string) => {
    const num = parseFloat(price);
    if (isNaN(num) || num === 0) return "Free";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
    } catch {
      return `${currency} ${num.toFixed(0)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium text-muted-foreground">Listing not found</p>
        <Button className="mt-4" onClick={() => navigate("/shop")}>Back to Shop</Button>
      </div>
    );
  }

  const mediaUrls = (listing.mediaUrls as string[] | null) ?? [];
  const isSeller = user?.id === listing.sellerId;
  const hasMap = listing.lat && listing.lng;
  const lat = hasMap ? parseFloat(String(listing.lat)) : null;
  const lng = hasMap ? parseFloat(String(listing.lng)) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/shop")} className="mb-4 gap-1">
        <ArrowLeft className="w-4 h-4" />Back to Shop
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Media gallery */}
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted border">
            {mediaUrls.length > 0 ? (
              mediaUrls[photoIdx]?.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={mediaUrls[photoIdx]} controls className="w-full h-full object-contain" />
              ) : (
                <img src={mediaUrls[photoIdx]} alt={listing.title} className="w-full h-full object-contain" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <span className="text-white font-bold text-2xl tracking-widest">SOLD</span>
              </div>
            )}
            {mediaUrls.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                  disabled={photoIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => Math.min(mediaUrls.length - 1, i + 1))}
                  disabled={photoIdx === mediaUrls.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {mediaUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
                      aria-label={`Photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {mediaUrls.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {mediaUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-primary" : "border-transparent"}`}
                  aria-label={`Thumbnail ${i + 1}`}
                >
                  {url.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Title & price */}
          <div>
            <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
            <p className="text-3xl font-bold text-primary mt-1">
              {formatPrice(String(listing.price), listing.currency)}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${CONDITION_COLORS[listing.condition] ?? ""}`}>
              {CONDITION_LABELS[listing.condition] ?? listing.condition}
            </span>
            <Badge variant="outline" className="text-xs capitalize">{listing.category}</Badge>
            {listing.status === "sold" && <Badge variant="destructive">Sold</Badge>}
            {listing.status === "draft" && <Badge variant="secondary">Draft</Badge>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{listing.viewCount} views</span>
            <span>·</span>
            <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground mb-1">Description</h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Location */}
          {listing.location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{listing.location}</span>
            </div>
          )}

          {/* Seller */}
          {seller && (
            <button
              onClick={() => navigate(`/profile/${seller.user.id}`)}
              className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left"
              aria-label={`View ${seller.user.name ?? "seller"}'s profile`}
            >
              {seller.user.avatar ? (
                <img src={seller.user.avatar} alt={seller.user.name ?? ""} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{seller.user.name ?? "Unknown Seller"}</p>
                <p className="text-xs text-muted-foreground">View profile</p>
              </div>
            </button>
          )}

          {/* Message Seller */}
          {!isSeller && seller && user && (
            <MessageSellerButton sellerId={seller.user.id} sellerName={seller.user.name ?? "Seller"} listingTitle={listing.title} />
          )}
          {/* Contact */}
          {!isSeller && (listing.contactEmail || listing.contactPhone) && (
            <div>
              {!showContact ? (
                <Button className="w-full gap-2" onClick={() => setShowContact(true)}>
                  <Phone className="w-4 h-4" />Show Contact Info
                </Button>
              ) : (
                <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
                  <p className="text-sm font-medium mb-2">Contact the seller</p>
                  {listing.contactEmail && (
                    <a href={`mailto:${listing.contactEmail}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="w-4 h-4" />{listing.contactEmail}
                    </a>
                  )}
                  {listing.contactPhone && (
                    <a href={`tel:${listing.contactPhone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="w-4 h-4" />{listing.contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seller actions */}
          {isSeller && (
            <div className="flex gap-2 pt-2">
              {listing.status === "active" && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => markAsSold.mutate({ id: listing.id })}
                  disabled={markAsSold.isPending}
                >
                  {markAsSold.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Mark as Sold
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => navigate(`/shop/edit/${listing.id}`)} aria-label="Edit listing">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (confirm("Delete this listing?")) deleteListing.mutate({ id: listing.id });
                }}
                disabled={deleteListing.isPending}
                aria-label="Delete listing"
                className="text-destructive hover:text-destructive"
              >
                {deleteListing.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {lat !== null && lng !== null && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" />Location</h2>
          <div className="rounded-xl overflow-hidden border h-56">
            <MapView
              initialCenter={{ lat, lng }}
              initialZoom={14}
              onMapReady={handleMapReady}
            />
          </div>
          {listing.location && <p className="text-sm text-muted-foreground mt-1">{listing.location}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Message Seller Button ──────────────────────────────────────────────────
function MessageSellerButton({
  sellerId,
  sellerName,
  listingTitle,
}: {
  sellerId: number;
  sellerName: string;
  listingTitle: string;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const getOrCreate = trpc.dm.getOrCreate.useMutation({
    onSuccess: (conv) => {
      // Navigate to messages and pre-select this conversation
      navigate(`/messages?conv=${conv.id}&msg=${encodeURIComponent(`Hi, I'm interested in your listing: "${listingTitle}"`)}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      onClick={() => getOrCreate.mutate({ otherUserId: sellerId })}
      disabled={getOrCreate.isPending}
      aria-label={`Message ${sellerName}`}
    >
      {getOrCreate.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      Message {sellerName}
    </Button>
  );
}
