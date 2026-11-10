import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import {
  ImagePlus, X, MapPin, Phone, Mail, Tag, DollarSign,
  ArrowLeft, Loader2, ShoppingBag, Video,
} from "lucide-react";

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "vehicles", label: "Vehicles" },
  { value: "property", label: "Property" },
  { value: "fashion", label: "Fashion & Clothing" },
  { value: "home", label: "Home & Garden" },
  { value: "garden", label: "Garden & Outdoor" },
  { value: "sports", label: "Sports & Hobbies" },
  { value: "toys", label: "Toys & Games" },
  { value: "books", label: "Books & Media" },
  { value: "music", label: "Music & Instruments" },
  { value: "art", label: "Art & Collectibles" },
  { value: "food", label: "Food & Drinks" },
  { value: "services", label: "Services" },
  { value: "jobs", label: "Jobs" },
  { value: "other", label: "Other" },
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For Parts / Not Working" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN", "NGN", "KES", "ZAR"];

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_DURATION = 120; // 2 minutes

interface MediaItem {
  url: string;
  type: "image" | "video";
  file?: File;
  uploading?: boolean;
}

export default function ShopCreateListing() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [condition, setCondition] = useState("good");
  const [category, setCategory] = useState("other");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createListing = trpc.shop.createListing.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Listing published!");
      navigate(`/shop/${id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // XHR upload with progress. The server uses tRPC + superjson, so manual
  // batch responses are wrapped as result.data.json; unwrap that envelope before
  // updating the preview. Leaving the envelope in state makes <img src> invalid
  // and also prevents Publish Listing from sending a valid mediaUrls array.
  const uploadWithProgress = useCallback(
    (filename: string, contentType: string, base64: string, mediaType: "image" | "video", duration?: number): Promise<{ url: string; key?: string; posterUrl?: string }> => {
      return new Promise((resolve, reject) => {
        const unwrapUploadResponse = (raw: unknown): { url: string; key?: string; posterUrl?: string } => {
          const first = Array.isArray(raw) ? raw[0] : raw;
          const data = (first as any)?.result?.data;
          const payload = data?.json ?? data;
          if (!payload || typeof payload.url !== "string" || payload.url.trim().length === 0) {
            throw new Error("Upload completed but returned no usable media URL.");
          }
          return payload;
        };

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/trpc/media.upload?batch=1");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () => {
          setUploadProgress(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(unwrapUploadResponse(JSON.parse(xhr.responseText)));
            } catch (err) {
              reject(err instanceof Error ? err : new Error("Upload response parse error"));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        // tRPC batch format: object with string key "0", NOT an array
        xhr.send(JSON.stringify({ "0": { json: { filename, contentType, base64, mediaType, duration } } }));
      });
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - mediaItems.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos/videos allowed.`);
      return;
    }

    const toProcess = files.slice(0, remaining);
    setUploading(true);

    for (const file of toProcess) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) { toast.error(`Unsupported file: ${file.name}`); continue; }
      if (isVideo && file.size > MAX_VIDEO_SIZE) { toast.error("Video too large (max 10 MB)."); continue; }
      if (isImage && file.size > MAX_PHOTO_SIZE) { toast.error("Photo too large (max 10 MB)."); continue; }

      // Check video duration
      let duration: number | undefined;
      if (isVideo) {
        duration = await new Promise<number>((res) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); };
          v.src = URL.createObjectURL(file);
        });
        if (duration > MAX_VIDEO_DURATION) { toast.error("Video too long (max 2 minutes)."); continue; }
      }

      // Add placeholder
      const placeholderUrl = URL.createObjectURL(file);
      const placeholder: MediaItem = { url: placeholderUrl, type: isVideo ? "video" : "image", file, uploading: true };
      setMediaItems((prev) => [...prev, placeholder]);

      try {
        setUploadProgress(0);
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const result = await uploadWithProgress(file.name, file.type, base64, isVideo ? "video" : "image", duration);
        setMediaItems((prev) =>
          prev.map((m) => (m.url === placeholderUrl ? { ...m, url: result.url, uploading: false } : m))
        );
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        setMediaItems((prev) => prev.filter((m) => m.url !== placeholderUrl));
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (idx: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
    setMapReady(true);

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const latVal = e.latLng.lat();
      const lngVal = e.latLng.lng();
      setLat(latVal);
      setLng(lngVal);
      // Place/move marker
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: latVal, lng: lngVal },
      });
      // Reverse geocode
      geocoderRef.current?.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setLocation(results[0].formatted_address);
        }
      });
    });
  };

  const handleLocationSearch = () => {
    if (!location.trim() || !geocoderRef.current || !mapRef.current) return;
    geocoderRef.current.geocode({ address: location }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        const latVal = loc.lat();
        const lngVal = loc.lng();
        setLat(latVal);
        setLng(lngVal);
        mapRef.current!.setCenter({ lat: latVal, lng: lngVal });
        mapRef.current!.setZoom(15);
        if (markerRef.current) markerRef.current.map = null;
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: latVal, lng: lngVal },
        });
      } else {
        toast.error("Location not found. Try a more specific address.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required."); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error("Enter a valid price."); return; }
    if (mediaItems.some((m) => m.uploading)) { toast.error("Please wait for uploads to finish."); return; }

    createListing.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      price: priceNum,
      currency,
      condition: condition as "new" | "like_new" | "good" | "fair" | "for_parts",
      category,
        mediaUrls: mediaItems
          .map((m) => m.url)
          .filter((url): url is string => typeof url === "string" && url.trim().length > 0 && !url.startsWith("blob:")),
      location: location.trim() || undefined,
      lat,
      lng,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      status,
    });
  };

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="text-center py-16 text-muted-foreground">Please sign in to create a listing.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shop")} aria-label="Back to shop">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Create Listing</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos & Videos */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImagePlus className="w-4 h-4" />Photos & Videos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              {mediaItems.map((item, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted border">
                  {item.type === "video" ? (
                    <video src={item.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  {item.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {item.type === "video" && !item.uploading && (
                    <div className="absolute bottom-1 left-1"><Badge variant="secondary" className="text-xs px-1 py-0"><Video className="w-3 h-3" /></Badge></div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    aria-label="Remove media"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {mediaItems.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  aria-label="Add photo or video"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Uploading… {uploadProgress}%</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Up to {MAX_PHOTOS} photos or 1 video · Max 10 MB each · Videos max 2 minutes</p>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" />Item Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you selling?" maxLength={255} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your item — condition, size, brand, reason for selling…" rows={4} maxLength={5000} className="mt-1 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="condition" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" />Price</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1"
                aria-label="Price"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Enter 0 for free items.</p>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" />Location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, neighbourhood, or address"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLocationSearch())}
                aria-label="Location"
              />
              <Button type="button" variant="outline" onClick={handleLocationSearch}>Find</Button>
            </div>
            {lat && lng && (
              <p className="text-xs text-muted-foreground">Pin: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
            )}
            <div className="rounded-lg overflow-hidden border h-52">
              <MapView
                initialCenter={{ lat: lat ?? 40.7128, lng: lng ?? -74.006 }}
                initialZoom={lat ? 14 : 3}
                onMapReady={handleMapReady}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click on the map to pin your exact location, or type an address above.</p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4" />Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="contactEmail" className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="flex items-center gap-1"><Phone className="w-3 h-3" />Phone</Label>
              <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 000 0000" className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">Contact details are hidden until a buyer clicks "Show Contact Info".</p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <Button
            type="submit"
            disabled={createListing.isPending || uploading}
            className="flex-1"
            onClick={() => setStatus("active")}
          >
            {createListing.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</> : "Publish Listing"}
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={createListing.isPending || uploading}
            onClick={() => setStatus("draft")}
          >
            Save as Draft
          </Button>
        </div>
      </form>
    </div>
  );
}
