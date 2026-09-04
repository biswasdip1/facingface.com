import { useRef, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, CalendarX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Format a future ms timestamp into a human-readable reset message. */
function formatResetTime(resetAtMs: number | null | undefined): string {
  if (!resetAtMs) return "Resets in less than 24 hours";
  const diff = resetAtMs - Date.now();
  if (diff <= 0) return "Resetting now";
  const totalMins = Math.ceil(diff / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const timeStr = new Date(resetAtMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (hours > 0) return `Resets in ${hours}h ${mins}m (at ${timeStr})`;
  return `Resets in ${mins}m (at ${timeStr})`;
}

// Robust avatar for the post composer — shows photo or initial letter, resets on URL change
function ComposerAvatar({ src, name, size = 10 }: { src?: string | null; name?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);
  const hasPhoto = !!(src && src.trim() !== "" && !err);
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`;
  return hasPhoto ? (
    <img src={src!} alt={name ?? ""} className={`${cls} object-cover border border-border`} onError={() => setErr(true)} />
  ) : (
    <div className={`${cls} bg-primary flex items-center justify-center`}>
      <span className="text-primary-foreground text-sm font-bold">{(name ?? "U").charAt(0).toUpperCase()}</span>
    </div>
  );
}
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Image, Video, X, Loader2, Link2, BarChart2, Plus, Trash2, Smile, Radio, FileText, Music, Film } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import imageCompression from "browser-image-compression";
import LiveBroadcast from "./LiveBroadcast";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { POST_WORD_LIMIT } from "@shared/const";


const countWords = (value: string): number => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

interface CreatePostProps {
  onSuccess?: () => void;
  pageHandle?: string; // when set, posts to the page instead of the main feed
  pageAvatar?: string | null;
  pageName?: string;
  groupHandle?: string; // when set, posts to the public group
  groupName?: string;
  groupCover?: string | null;
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return match ? match[0] : null;
}

interface PollDraft {
  question: string;
  options: string[];
  expiresInHours?: number;
}

// Background color palette. Only short CSS color values are stored in posts.bgColor
// because the API schema and PostgreSQL column limit this field to 30 characters.
// The preview can still use gradients because it is never sent to the server.
const BG_COLORS = [
  { label: "White", value: "", preview: "#ffffff", text: "#000000" },
  { label: "Red", value: "#E63329", preview: "#E63329", text: "#ffffff" },
  { label: "Black", value: "#111111", preview: "#111111", text: "#ffffff" },
  { label: "Blue", value: "#1a56db", preview: "#1a56db", text: "#ffffff" },
  { label: "Green", value: "#057a55", preview: "#057a55", text: "#ffffff" },
  { label: "Purple", value: "#7e3af2", preview: "#7e3af2", text: "#ffffff" },
  { label: "Amber", value: "#d97706", preview: "#d97706", text: "#ffffff" },
  { label: "Rose", value: "#e11d48", preview: "#e11d48", text: "#ffffff" },
  { label: "Teal", value: "#0d9488", preview: "#0d9488", text: "#ffffff" },
  {
    label: "Artistic Red",
    value: "#dc2626",
    preview: "linear-gradient(135deg, #ff2f2f 0%, #e63329 52%, #7c2d12 100%)",
    text: "#ffffff",
  },
  {
    label: "Soft Grey",
    value: "#e5e7eb",
    preview: "linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 48%, #f8fafc 100%)",
    text: "#374151",
  },
  {
    label: "Royal Blue",
    value: "#1d4ed8",
    preview: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #7c3aed 100%)",
    text: "#ffffff",
  },
];

function buildArtisticTextBackground(background: string): string {
  return `radial-gradient(circle at 14% 20%, rgba(255,255,255,0.22) 0 13%, transparent 14%), radial-gradient(ellipse at 72% 48%, rgba(255,255,255,0.16) 0 30%, transparent 31%), radial-gradient(circle at 88% 82%, rgba(0,0,0,0.12) 0 20%, transparent 21%), ${background}`;
}


// Compression options for photos
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,           // Target ≤1MB per photo
  maxWidthOrHeight: 2048, // Cap at 2048px on longest side
  useWebWorker: true,
  onProgress: undefined as ((progress: number) => void) | undefined,
};

// Media limits
const MAX_PHOTOS = 3;
// Defaults — overridden by DB values fetched at runtime
const DEFAULT_VIDEO_MAX_MB = 10;
const DEFAULT_VIDEO_MAX_SECS = 120;
const DEFAULT_AUDIO_MAX_MB = 5;
const DEFAULT_AUDIO_MAX_SECS = 360;
const DEFAULT_DOC_MAX_MB = 5;
const DEFAULT_PHOTO_MAX_MB = 25;

// Compute dynamic font size based on text length
function getDynamicFontSize(text: string): string {
  const len = text.length;
  if (len === 0) return "0.875rem";
  if (len <= 30) return "2rem";
  if (len <= 80) return "1.25rem";
  if (len <= 150) return "1rem";
  return "0.875rem";
}

function getDynamicLineHeight(text: string): string {
  const len = text.length;
  if (len <= 30) return "1.2";
  if (len <= 80) return "1.35";
  return "1.5";
}

function getDynamicRows(text: string): number {
  const len = text.length;
  if (len <= 30) return 2;
  if (len <= 80) return 3;
  return 4;
}

export default function CreatePost({ onSuccess, pageHandle, pageAvatar, pageName, groupHandle, groupName, groupCover }: CreatePostProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { themeMode } = useThemeMode();
  const emojiTheme = themeMode === "lightdark" ? "dark" : "light";

  // ── Media limits from DB (with sensible defaults while loading) ──────────────
  const { data: mediaLimitsRaw } = trpc.admin.getMediaLimits.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // getMediaLimits returns Record<string, number> directly
  const limitsMap: Record<string, number> = mediaLimitsRaw ?? {};
  const PHOTO_MAX_MB = limitsMap["photo_max_mb"] ?? DEFAULT_PHOTO_MAX_MB;
  const VIDEO_MAX_MB = limitsMap["video_max_mb"] ?? DEFAULT_VIDEO_MAX_MB;
  const VIDEO_MAX_SECS = limitsMap["video_max_seconds"] ?? DEFAULT_VIDEO_MAX_SECS;
  const AUDIO_MAX_MB = limitsMap["audio_max_mb"] ?? DEFAULT_AUDIO_MAX_MB;
  const AUDIO_MAX_SECS = limitsMap["audio_max_seconds"] ?? DEFAULT_AUDIO_MAX_SECS;
  const DOC_MAX_MB = limitsMap["doc_max_mb"] ?? DEFAULT_DOC_MAX_MB;
  const MAX_VIDEO_SIZE = VIDEO_MAX_MB * 1024 * 1024;
  const MAX_VIDEO_DURATION = VIDEO_MAX_SECS;
  const MAX_AUDIO_SIZE = AUDIO_MAX_MB * 1024 * 1024;
  const MAX_AUDIO_DURATION = AUDIO_MAX_SECS;
  const MAX_DOC_SIZE = DOC_MAX_MB * 1024 * 1024;
  const [modalOpen, setModalOpen] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);

  // Text — with localStorage draft autosave
  const DRAFT_KEY = `post_draft_${pageHandle ?? groupHandle ?? "home"}`;
  const DRAFT_PHOTOS_KEY = `post_draft_photos_${pageHandle ?? groupHandle ?? "home"}`;
  const DRAFT_CAPTIONS_KEY = `post_draft_captions_${pageHandle ?? groupHandle ?? "home"}`;

  // Helper: read persisted photo data URLs from localStorage
  const loadDraftPhotos = (): { dataUrls: string[]; captions: string[] } => {
    try {
      const raw = localStorage.getItem(DRAFT_PHOTOS_KEY);
      const caps = localStorage.getItem(DRAFT_CAPTIONS_KEY);
      return {
        dataUrls: raw ? (JSON.parse(raw) as string[]) : [],
        captions: caps ? (JSON.parse(caps) as string[]) : ["", "", ""],
      };
    } catch { return { dataUrls: [], captions: ["", "", ""] }; }
  };

  const [text, setText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ""; } catch { return ""; }
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Background color
  const [bgColor, setBgColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Photos — up to 3 (restored from draft if available)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(() => {
    const { dataUrls } = loadDraftPhotos();
    return dataUrls; // data: URLs work as previews directly
  });
  const [photoCaptions, setPhotoCaptions] = useState<string[]>(() => {
    const { captions } = loadDraftPhotos();
    return captions.length >= 3 ? captions : ["", "", ""];
  });
  const [photoAltTexts, setPhotoAltTexts] = useState<string[]>([""  , "", ""]);
  const [photoHashtagInput, setPhotoHashtagInput] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  // Video — single
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadPhotoIndex, setUploadPhotoIndex] = useState(0); // 1-based current photo being uploaded

  // Audio
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const uploadAudio = trpc.media.uploadAudio.useMutation();

  // Link preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const uploadDoc = trpc.media.uploadDoc.useMutation();

  // Poll
  const [showPoll, setShowPoll] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<number | null>(null);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [liveEventTopic, setLiveEventTopic] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createLiveMutation = (trpc as any).live.create.useMutation();
  const [poll, setPoll] = useState<PollDraft>({ question: "", options: ["", ""] });

  // Daily quota
  const { data: quota, refetch: refetchQuota } = trpc.posts.myDailyQuota.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  // Page and Public Group posts remain isolated in their own timelines, but use
  // the same safe URL preview service as standard Feed posts.
  const isContextPost = Boolean(pageHandle || groupHandle);
  const { data: previewData, isFetching: previewLoading } = trpc.linkPreview.fetch.useQuery(
    { url: previewUrl! },
    { enabled: !!previewUrl && !previewDismissed && !showPoll }
  );
  const preview = previewData?.preview;

  const hasMedia = photoFiles.length > 0 || !!videoFile;

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const handlePostEmojiSelect = (emoji: { native: string }) => {
    const ta = textareaRef.current;
    if (!ta) { setText((p) => p + emoji.native); setShowEmojiPicker(false); return; }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji.native + text.slice(end);
    setText(newText);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.native.length;
      ta.setSelectionRange(pos, pos);
    });
  };


  const detectUrl = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const found = extractFirstUrl(value);
      if (found !== previewUrl) {
        setPreviewUrl(found);
        setPreviewDismissed(false);
      }
    }, 600);
  }, [previewUrl]);

  useEffect(() => { detectUrl(text); }, [text, detectUrl]);

  const uploadMedia = trpc.media.upload.useMutation();
  const generateAltText = trpc.media.generateAltText.useMutation();
  // Save to Reel / Story
  const [saveAsReel, setSaveAsReel] = useState(false);
  const [saveAsStory, setSaveAsStory] = useState(false);
  const uploadReelMutation = trpc.reels.upload.useMutation();
  const uploadStoryMedia = trpc.stories.uploadMedia.useMutation();
  const createStoryMutation = trpc.stories.create.useMutation();
  // Video seek poster
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [seekSeconds, setSeekSeconds] = useState<number>(1);
  const [customPosterUrl, setCustomPosterUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [seekPosterPending, setSeekPosterPending] = useState(false);
  const seekPoster = trpc.media.seekPoster.useMutation();

  // Autosave draft to localStorage whenever text or photos change
  useEffect(() => {
    try {
      if (text.trim()) {
        localStorage.setItem(DRAFT_KEY, text);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore */ }
  }, [text, DRAFT_KEY]);

  // Autosave photo previews (data: URLs) and captions
  useEffect(() => {
    try {
      // Only persist data: URL previews (not blob: URLs which expire on refresh)
      const dataUrlPreviews = photoPreviews.filter((p) => p.startsWith("data:"));
      if (dataUrlPreviews.length > 0) {
        localStorage.setItem(DRAFT_PHOTOS_KEY, JSON.stringify(dataUrlPreviews));
        localStorage.setItem(DRAFT_CAPTIONS_KEY, JSON.stringify(photoCaptions));
      } else {
        localStorage.removeItem(DRAFT_PHOTOS_KEY);
        localStorage.removeItem(DRAFT_CAPTIONS_KEY);
      }
    } catch { /* ignore — storage quota */ }
  }, [photoPreviews, photoCaptions, DRAFT_PHOTOS_KEY, DRAFT_CAPTIONS_KEY]);

  const resetForm = () => {
    setText("");
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_PHOTOS_KEY);
      localStorage.removeItem(DRAFT_CAPTIONS_KEY);
    } catch { /* ignore */ }
    setPhotoFiles([]);
    setPhotoPreviews([]);    setPhotoCaptions(["" , "", ""]);
    setPhotoAltTexts(["" , "", ""]);
    setPhotoHashtagInput("");
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setSeekSeconds(1);
    setCustomPosterUrl(null);
    setUploadedVideoUrl(null);
    setSaveAsReel(false);
    setSaveAsStory(false);
    setPreviewUrl(null);
    setPreviewDismissed(false);
    setShowPoll(false);
    setPoll({ question: "", options: ["", ""] });
    setBgColor("");
    setAudioFile(null);
    setDocFile(null);
    setScheduledAt(undefined);
    setModalOpen(false);
  };

  // Intercept modal close — show discard confirmation if there is unsaved content
  const handleModalOpenChange = (open: boolean) => {
    if (!open && (text.trim() || photoFiles.length > 0 || !!videoFile || !!audioFile || !!docFile)) {
      setShowDiscardDialog(true);
    } else {
      setModalOpen(open);
    }
  };

  const createPost = trpc.posts.create.useMutation({
    onSuccess: (_, vars) => {
      resetForm();
      utils.posts.feed.invalidate();
      refetchQuota();
      onSuccess?.();
      if (vars.scheduledAt) {
        toast.success(`Post scheduled for ${format(vars.scheduledAt, "MMM d, yyyy 'at' h:mm a")}.`);
      } else {
        toast.success("Post published.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createGroupPost = (trpc as any).publicGroups.createPost.useMutation({
    onSuccess: () => {
      resetForm();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (utils as any).publicGroups.getPosts.invalidate({ handle: groupHandle });
      onSuccess?.();
      toast.success("Post published.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPagePost = (trpc as any).pages.createPost.useMutation({
    onSuccess: () => {
      resetForm();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (utils as any).pages.getPosts.invalidate({ handle: pageHandle });
      onSuccess?.();
      toast.success("Post published.");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  // Handle photo selection (up to 3) with client-side compression
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photoFiles.length;
    if (remaining <= 0) { toast.error(`You can only add up to ${MAX_PHOTOS} photos.`); return; }
    const toAdd = files.slice(0, remaining);
    for (const file of toAdd) {
      if (!file.type.startsWith("image/")) { toast.error("Only image files are supported for photos."); return; }
      if (file.size > PHOTO_MAX_MB * 1024 * 1024) { toast.error(`${file.name} is too large. Max ${PHOTO_MAX_MB} MB per photo.`); return; }
    }
    // Compress each photo client-side before storing
    const compressedFiles: File[] = [];
    const newPreviews: string[] = []; // data: URLs for persistence + display
    for (const file of toAdd) {
      try {
        const originalMB = file.size / (1024 * 1024);
        // Only compress if over 1MB — skip tiny files to avoid quality loss
        const compressed = originalMB > 1
          ? await imageCompression(file, COMPRESSION_OPTIONS)
          : file;
        compressedFiles.push(compressed);
        // Use data: URL so the preview survives a page refresh (blob: URLs expire)
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });
        newPreviews.push(dataUrl);
      } catch {
        // Fallback to original if compression fails
        compressedFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }
    setPhotoFiles((prev) => [...prev, ...compressedFiles]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    setVideoFile(null);
    setVideoPreview(null);
    setShowPoll(false);
    setBgColor("");
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
    setPhotoCaptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      while (next.length < 3) next.push("");
      return next;
    });
  };

  // Handle video selection (max 2 min / 10 MB)
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Only video files are supported."); return; }
    if (file.size > MAX_VIDEO_SIZE) { toast.error("Video must be under 10 MB."); return; }
    const objUrl = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.src = objUrl;
    let tooLong = false;
    await new Promise<void>((resolve) => {
      videoEl.onloadedmetadata = () => {
        URL.revokeObjectURL(objUrl);
        if (videoEl.duration > MAX_VIDEO_DURATION) {
          toast.error("Video must be 2 minutes or shorter.");
          tooLong = true;
        } else {
          setVideoDuration(Math.floor(videoEl.duration));
          setSeekSeconds(Math.min(1, Math.floor(videoEl.duration)));
        }
        resolve();
      };
      videoEl.onerror = () => resolve();
    });
    if (tooLong) { e.target.value = ""; return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setShowPoll(false);
    setBgColor("");
    e.target.value = "";
  };

  // Handle audio selection (max 6 min / 5 MB)
  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) { toast.error("Only audio files are supported."); return; }
    if (file.size > MAX_AUDIO_SIZE) { toast.error("Audio must be under 5 MB."); return; }
    // Check duration via AudioContext
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();
      if (decoded.duration > MAX_AUDIO_DURATION) {
        toast.error("Audio must be 6 minutes or shorter.");
        e.target.value = "";
        return;
      }
    } catch {
      // If we can't decode, allow it — server will validate size
    }
    setAudioFile(file);
    e.target.value = "";
  };

  const togglePoll = () => {
    if (!showPoll) {
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setVideoFile(null);
      setVideoPreview(null);
    }
    setShowPoll((v) => !v);
  };

  const addPollOption = () => {
    if (poll.options.length >= 6) return;
    setPoll((p) => ({ ...p, options: [...p.options, ""] }));
  };

  const removePollOption = (idx: number) => {
    if (poll.options.length <= 2) return;
    setPoll((p) => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };

  const updatePollOption = (idx: number, value: string) => {
    setPoll((p) => {
      const opts = [...p.options];
      opts[idx] = value;
      return { ...p, options: opts };
    });
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_SIZE) { toast.error("Document must be under 5 MB."); e.target.value = ""; return; }
    setDocFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && photoFiles.length === 0 && !videoFile && !showPoll && !docFile && !audioFile) {
      toast.error("Please add some text, media, a poll, a document, or audio.");
      return;
    }
    if (showPoll) {
      if (!poll.question.trim()) { toast.error("Poll question is required."); return; }
      const validOptions = poll.options.filter((o) => o.trim());
      if (validOptions.length < 2) { toast.error("At least 2 poll options are required."); return; }
    }

    let mediaUrl: string | undefined;
    let photo2Url: string | undefined;
    let photo3Url: string | undefined;
    let mediaType: "image" | "video" | undefined;
    let photo1AltText: string | undefined;
    let photo2AltText: string | undefined;
    let photo3AltText: string | undefined;

    // Upload photos (via tRPC mutation)
    if (photoFiles.length > 0) {
      setUploading(true);
      setUploadProgress(0);
      setUploadPhotoIndex(1);
      try {
        const uploads: Array<{ url: string; key: string }> = [];
        for (let i = 0; i < photoFiles.length; i++) {
          setUploadPhotoIndex(i + 1);
          const f = photoFiles[i]!;
          const base64 = await fileToBase64(f);
          const result = await uploadMedia.mutateAsync({ filename: f.name, contentType: f.type, base64, mediaType: "image" });
          uploads.push(result);
          setUploadProgress(Math.round(((i + 1) / photoFiles.length) * 100));
        }
        mediaUrl = uploads[0]?.url;
        photo2Url = uploads[1]?.url;
        photo3Url = uploads[2]?.url;
        mediaType = "image";
        // Auto-generate alt text for each uploaded photo (best-effort, non-blocking)
        const altResults = await Promise.allSettled(
          uploads.map((u) => generateAltText.mutateAsync({ imageUrl: u.url }))
        );
        photo1AltText = altResults[0]?.status === "fulfilled" ? altResults[0].value.altText : undefined;
        photo2AltText = altResults[1]?.status === "fulfilled" ? altResults[1].value.altText : undefined;
        photo3AltText = altResults[2]?.status === "fulfilled" ? altResults[2].value.altText : undefined;
        // Pre-fill the editable alt-text fields with the generated values
        setPhotoAltTexts([photo1AltText ?? "", photo2AltText ?? "", photo3AltText ?? ""]);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Photo upload failed.");
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      setUploading(false);
      setUploadProgress(0);
    }

    // Upload video (via tRPC mutation)
    if (videoFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const base64 = await fileToBase64(videoFile);
        const result = await uploadMedia.mutateAsync({ filename: videoFile.name, contentType: videoFile.type, base64, mediaType: "video", duration: videoDuration || undefined });
        mediaUrl = result.url;
        mediaType = "video";
        setUploadedVideoUrl(result.url);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Video upload failed.");
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      setUploading(false);
      setUploadProgress(0);
    }

    // Upload document
    let docUrl: string | undefined;
    let docName: string | undefined;
    let docSize: number | undefined;
    let docType: string | undefined;
    if (docFile) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(docFile);
        const result = await uploadDoc.mutateAsync({ filename: docFile.name, contentType: docFile.type, base64 });
        docUrl = result.url;
        docName = result.filename;
        docSize = result.size;
        docType = result.contentType;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Document upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Upload audio
    let audioUrl: string | undefined;
    let audioName: string | undefined;
    let audioDuration: number | undefined;
    if (audioFile) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(audioFile);
        const result = await uploadAudio.mutateAsync({ filename: audioFile.name, contentType: audioFile.type, base64 });
        audioUrl = result.url;
        audioName = result.filename;
        audioDuration = result.duration ?? undefined;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Audio upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Append photo hashtags to text if photos are selected
    const hashtagSuffix = (photoFiles.length > 0 || photoPreviews.length > 0) && photoHashtagInput.trim()
      ? "\n" + photoHashtagInput.trim().split(/\s+/).filter(Boolean).map((t) => `#${t.replace(/^#+/, "")}`).join(" ")
      : "";
    const finalText = (text.trim() + hashtagSuffix).trim() || undefined;
    if (finalText && countWords(finalText) > POST_WORD_LIMIT) {
      toast.error(`Post text must be ${POST_WORD_LIMIT} words or fewer.`);
      return;
    }

    const postPayload = {
      text: finalText,
      mediaUrl,
      mediaType,
      photo2Url,
      photo3Url,
      photo1Caption: photoCaptions[0]?.trim() || undefined,
      photo2Caption: photoCaptions[1]?.trim() || undefined,
      photo3Caption: photoCaptions[2]?.trim() || undefined,
      photo1Alt: photoAltTexts[0]?.trim() || photo1AltText || undefined,
      photo2Alt: photoAltTexts[1]?.trim() || photo2AltText || undefined,
      photo3Alt: photoAltTexts[2]?.trim() || photo3AltText || undefined,
      poll: showPoll ? {
        question: poll.question.trim(),
        options: poll.options.filter((o) => o.trim()),
        expiresInHours: poll.expiresInHours,
      } : undefined,
      docUrl,
      docName,
      docSize,
      docType,
      bgColor: bgColor || undefined,
      audioUrl,
      audioName,
      audioDuration,
      videoPosterUrl: customPosterUrl || undefined,
    };

    const fullPayload = { ...postPayload, scheduledAt: scheduledAt ?? undefined };

    // Save as Reel (video only)
    if (saveAsReel && videoFile && mediaUrl) {
      try {
        const base64 = await fileToBase64(videoFile);
        let thumbnailBase64: string | undefined;
        try {
          const videoEl = document.querySelector('video') as HTMLVideoElement | null;
          if (videoEl) {
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth || 480;
            canvas.height = videoEl.videoHeight || 854;
            const ctx2d = canvas.getContext('2d');
            if (ctx2d) { ctx2d.drawImage(videoEl, 0, 0, canvas.width, canvas.height); thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; }
          }
        } catch { /* ignore thumbnail capture errors */ }
        await uploadReelMutation.mutateAsync({ videoBase64: base64, thumbnailBase64, caption: text.trim() || undefined, duration: videoDuration || 0 });
        toast.success('Saved as Reel!');
        utils.reels.feed.invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save as Reel.');
      }
    }

    // Save as Story (video or first photo)
    if (saveAsStory && (videoFile || photoFiles[0]) && (mediaUrl || photoPreviews[0])) {
      try {
        const file = videoFile ?? photoFiles[0]!;
        const base64 = await fileToBase64(file);
        const { url: storyUrl, storageKey } = await uploadStoryMedia.mutateAsync({ base64, mimeType: file.type, fileName: file.name });
        await createStoryMutation.mutateAsync({ mediaUrl: storyUrl, storageKey, mediaType: file.type.startsWith('video') ? 'video' : 'photo', caption: text.trim() || undefined, duration: 5000 });
        toast.success('Saved as Story!');
        utils.stories.feed.invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save as Story.');
      }
    }

    if (groupHandle) {
      createGroupPost.mutate({ handle: groupHandle, content: fullPayload.text, ...fullPayload });
    } else if (pageHandle) {
      createPagePost.mutate({ handle: pageHandle, ...fullPayload });
    } else {
      createPost.mutate(fullPayload);
    }
  };

  const isLoading = uploading || createPost.isPending || createPagePost.isPending || createGroupPost.isPending;


  const showPreviewCard = !previewDismissed && !showPoll && previewUrl && (previewLoading || preview);

  // Dynamic text styles
  const fontSize = getDynamicFontSize(text);
  const lineHeight = getDynamicLineHeight(text);
  const rows = getDynamicRows(text);
  const wordCount = countWords(text);
  const isOverWordLimit = wordCount > POST_WORD_LIMIT;

  // Selected bg color info
  const selectedBg = BG_COLORS.find((c) => c.value === bgColor) ?? BG_COLORS[0];
  const hasBgColor = !!bgColor;

  // Whether the current text came from a persisted draft (i.e. it was there before the user typed anything new)
  const [hasSavedDraft, setHasSavedDraft] = useState(() => {
    try {
      const hasText = !!(localStorage.getItem(`post_draft_${pageHandle ?? groupHandle ?? "home"}`));
      const hasPhotos = !!(localStorage.getItem(`post_draft_photos_${pageHandle ?? groupHandle ?? "home"}`));
      return hasText || hasPhotos;
    } catch { return false; }
  });

  // Keep hasSavedDraft in sync: clear it once the user opens the modal
  const openModal = (afterOpen?: () => void) => {
    const hadDraft = hasSavedDraft;
    setHasSavedDraft(false);
    setModalOpen(true);
    if (hadDraft) {
      const hasPhotos = photoPreviews.length > 0;
      const msg = hasPhotos
        ? "Draft restored — your unsaved text and photos are back."
        : "Draft restored — your unsaved text is back.";
      setTimeout(() => toast(msg, { duration: 3000 }), 200);
    }
    if (afterOpen) afterOpen();
  };

  // Quick-action chips for the collapsed card
  // Handle Live button click — show confirmation dialog
  const handleLiveClick = () => {
    setLiveEventTopic("");
    setShowLiveConfirm(true);
  };

  // Handle confirming live stream
  const handleConfirmLive = async () => {
    setShowLiveConfirm(false);
    try {
      const { streamId } = await createLiveMutation.mutateAsync({ title: liveEventTopic.trim() || undefined });
      setLiveStreamId(streamId);
      setLiveEventTopic("");
      refetchQuota();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start live stream");
    }
  };

  const quickActions = [
    { icon: <Image size={18} className="text-blue-500" />, label: "Photo", onClick: () => openModal(() => setTimeout(() => photoRef.current?.click(), 200)) },
    { icon: <Video size={18} className="text-green-500" />, label: "Video", onClick: () => openModal(() => setTimeout(() => videoRef.current?.click(), 200)) },
    { icon: <Music size={18} className="text-orange-500" />, label: "Audio", onClick: () => openModal(() => setTimeout(() => audioRef.current?.click(), 200)) },
    { icon: <BarChart2 size={18} className="text-purple-500" />, label: "Poll", onClick: () => openModal(() => setTimeout(() => setShowPoll(true), 200)) },
    { icon: <Radio size={18} className="text-red-500" />, label: "Live", onClick: handleLiveClick },
  ];

  return (
    <>
      {/* ── LinkedIn-style collapsed trigger card ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-4 pt-4 pb-3">
        {/* Avatar + rounded input row */}
        <div className="flex items-center gap-3 mb-3">
          <a
            href={user ? `/profile/${user.id}` : "/"}
            className="flex-shrink-0 no-underline"
            title={`View ${user?.name ?? "your"} profile`}
          >
            <ComposerAvatar src={pageHandle ? pageAvatar : user?.avatar} name={pageHandle ? (pageName ?? pageHandle) : user?.name} />
          </a>
          <button
            type="button"
            onClick={() => openModal()}
            className="flex-1 text-left px-4 py-2.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm text-muted-foreground font-medium cursor-text flex items-center justify-between gap-2"
          >
            <span>{pageHandle ? `Post to ${pageName ?? pageHandle}…` : groupHandle ? `Post to ${groupName ?? groupHandle}…` : `Start a post, ${user?.name?.split(" ")[0] ?? "share something"}…`}</span>
            {hasSavedDraft && (
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)] border border-[var(--its-red)] px-1.5 py-0.5 rounded-full leading-none">
                Draft
              </span>
            )}
          </button>
        </div>

        {/* Quick-action chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {quickActions.map(({ icon, label, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Full post modal ── */}
      {/* Discard draft confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDiscardDialog(false);
                resetForm();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Create a post</DialogTitle>
          <form onSubmit={handleSubmit}>

          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <ComposerAvatar src={pageHandle ? pageAvatar : user?.avatar} name={pageHandle ? (pageName ?? pageHandle) : user?.name} />
              <div>
                <p className="text-sm font-bold text-foreground leading-none">{pageHandle ? (pageName ?? pageHandle) : (user?.name ?? "You")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{pageHandle ? `Posting to ${pageName ?? pageHandle}` : "Posting to everyone"}</p>
              </div>
            </div>
          </div>

          {/* Modal body */}
          <div className="px-5 py-4">

      {/* Live Broadcast View */}
      {liveStreamId && (
        <div className="mb-4">
          <LiveBroadcast
            streamId={liveStreamId}
            hostId={user!.id}
            onEnded={() => {
              setLiveStreamId(null);
              onSuccess?.();
            }}
          />
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">You are live — stream ends automatically after 3 minutes.</p>
        </div>
      )}

      {/* Text area — hidden when poll mode is active */}
      <div className={`relative mb-4${showPoll ? " hidden" : ""}`}>
        <div
          className="relative transition-all duration-200"
          style={{
            background: hasBgColor ? buildArtisticTextBackground(bgColor) : "transparent",
            padding: hasBgColor ? "2.75rem 2rem" : "0",
            minHeight: hasBgColor ? "170px" : undefined,
            display: hasBgColor ? "flex" : undefined,
            alignItems: hasBgColor ? "center" : undefined,
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={showPoll ? "Add a caption for your poll (optional)…" : "What's on your mind?"}
            rows={rows}
            className="w-full border-0 border-b px-0 py-2 pr-8 focus:outline-none resize-none transition-all duration-200 bg-transparent"
            style={{
              fontSize,
              lineHeight,
              fontWeight: text.length <= 80 ? "700" : "400",
              color: hasBgColor ? selectedBg.text : "var(--foreground)",
              borderBottomColor: hasBgColor ? `${selectedBg.text}44` : "var(--border)",
            }}
            onKeyDown={(e) => { if (e.key === "Escape") setShowEmojiPicker(false); }}
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`absolute right-0 bottom-2 transition-colors ${showEmojiPicker ? "text-[var(--its-red)]" : "opacity-50 hover:opacity-100"}`}
            style={{ color: hasBgColor ? selectedBg.text : undefined }}
            title="Add emoji"
          >
            <Smile size={16} />
          </button>
        </div>

        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute right-0 top-full mt-1 z-50 shadow-xl"
            style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))" }}
          >
            <Picker
              data={data}
              onEmojiSelect={handlePostEmojiSelect}
              theme={emojiTheme}
              set="native"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={2}
              perLine={8}
            />
          </div>
        )}
      </div>


      {/* Background color picker */}
      {showColorPicker && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Background:</span>
          {BG_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              title={color.label}
              onClick={() => setBgColor(color.value)}
              className="w-6 h-6 flex-shrink-0 transition-transform hover:scale-110"
              style={{
                background: color.preview,
                border: bgColor === color.value ? "2px solid var(--its-red)" : "2px solid var(--border)",
                borderRadius: 0,
                outline: bgColor === color.value ? "1px solid var(--its-red)" : "none",
                outlineOffset: "1px",
              }}
            />
          ))}
        </div>
      )}

      {/* Poll builder */}
      {showPoll && (
        <div className="mb-4 border border-border p-4 bg-secondary">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-[var(--its-red)]" />
            <span className="text-xs font-bold tracking-widest uppercase text-foreground">Poll</span>
          </div>
          <input
            type="text"
            value={poll.question}
            onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
            placeholder="Ask a question…"
            maxLength={300}
            className="w-full border-0 border-b-2 border-foreground bg-transparent px-0 py-1.5 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none mb-4"
          />
          <div className="flex flex-col gap-2 mb-3">
            {poll.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-border flex-shrink-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                </div>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updatePollOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={200}
                  className="flex-1 border-0 border-b border-border bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
                {poll.options.length > 2 && (
                  <button type="button" onClick={() => removePollOption(idx)} className="text-muted-foreground hover:text-[var(--its-red)] transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {poll.options.length < 6 && (
            <button type="button" onClick={addPollOption} className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-3">
              <Plus size={12} />
              Add option
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Expires in</span>
            <select
              value={poll.expiresInHours ?? ""}
              onChange={(e) => setPoll((p) => ({ ...p, expiresInHours: e.target.value ? Number(e.target.value) : undefined }))}
              className="text-xs border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:border-foreground"
              style={{ borderRadius: 0 }}
            >
              <option value="">No expiry</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">1 day</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
            </select>
          </div>
        </div>
      )}

      {/* Link preview card */}
      {showPreviewCard && (
        <div className="relative mb-4 border border-border overflow-hidden">
          {previewLoading && !preview ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <span>Fetching link preview…</span>
            </div>
          ) : preview ? (
            <a href={preview.url} target="_blank" rel="noopener noreferrer" className="flex gap-0 hover:bg-secondary transition-colors no-underline" onClick={(e) => e.stopPropagation()}>
              {preview.image && (
                <div className="w-28 flex-shrink-0 bg-secondary">
                  <img src={preview.image} alt={preview.title ?? ""} className="w-full h-full object-cover" style={{ minHeight: "80px", maxHeight: "120px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <div className="flex-1 p-3 min-w-0">
                {preview.siteName && (
                  <div className="flex items-center gap-1 mb-1">
                    <Link2 size={10} className="text-[var(--its-red)] flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--its-red)] truncate">{preview.siteName}</span>
                  </div>
                )}
                {preview.title && <p className="text-sm font-bold text-foreground leading-tight mb-1 line-clamp-2">{preview.title}</p>}
                {preview.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{preview.description}</p>}
              </div>
            </a>
          ) : null}
          <button type="button" onClick={() => setPreviewDismissed(true)} className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground p-0.5 hover:bg-[var(--its-red)] transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Photo grid preview — progressive: only show selected photos, then an "Add another" row */}
      {photoPreviews.length > 0 && (
        <div className="mb-4">
          {/* Selected photos only */}
          <div className={`grid gap-1.5 ${
            photoPreviews.length === 1 ? "grid-cols-1" :
            photoPreviews.length === 2 ? "grid-cols-2" :
            "grid-cols-3"
          }`}>
            {photoPreviews.map((src, idx) => (
              <div key={idx} className="relative border border-border overflow-hidden rounded-sm" style={{ aspectRatio: "1" }}>
                <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded-full hover:bg-[var(--its-red)] transition-colors"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Per-photo caption inputs */}
          <div className={`mt-1.5 grid gap-1 ${
            photoPreviews.length === 1 ? "grid-cols-1" :
            photoPreviews.length === 2 ? "grid-cols-2" :
            "grid-cols-3"
          }`}>
            {photoPreviews.map((_, idx) => (
              <input
                key={idx}
                type="text"
                value={photoCaptions[idx] ?? ""}
                onChange={(e) => setPhotoCaptions((prev) => { const next = [...prev]; next[idx] = e.target.value; return next; })}
                placeholder={`Caption ${idx + 1} (optional)`}
                maxLength={300}
                className="w-full border-0 border-b border-border bg-transparent px-0 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            ))}
          </div>

          {/* Per-photo alt-text inputs (pre-filled by AI, editable by user) */}
          <div className={`mt-1 grid gap-1 ${
            photoPreviews.length === 1 ? "grid-cols-1" :
            photoPreviews.length === 2 ? "grid-cols-2" :
            "grid-cols-3"
          }`}>
            {photoPreviews.map((_, idx) => (
              <input
                key={idx}
                type="text"
                value={photoAltTexts[idx] ?? ""}
                onChange={(e) => setPhotoAltTexts((prev) => { const next = [...prev]; next[idx] = e.target.value; return next; })}
                placeholder={`Alt text ${idx + 1} (accessibility)`}
                maxLength={500}
                className="w-full border-0 border-b border-border bg-transparent px-0 py-1 text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors italic"
              />
            ))}
          </div>
          {/* Hashtag input for photo posts */}
          <div className="mt-2">
            <div className="flex items-center gap-1.5 border-b border-border pb-1">
              <span className="text-[var(--its-red)] font-bold text-sm select-none">#</span>
              <input
                type="text"
                value={photoHashtagInput}
                onChange={(e) => setPhotoHashtagInput(e.target.value)}
                placeholder="Add hashtags (e.g. travel food sunset)"
                maxLength={200}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {photoHashtagInput.trim() && (
              <div className="flex flex-wrap gap-1 mt-1">
                {photoHashtagInput.trim().split(/\s+/).filter(Boolean).map((tag, i) => (
                  <span key={i} className="text-[10px] font-semibold text-[var(--its-red)] bg-[var(--its-red)]/10 px-1.5 py-0.5 rounded-full">
                    #{tag.replace(/^#+/, "")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progressive "Add another photo" — only visible when fewer than 3 selected */}
          {photoPreviews.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => { if (photoRef.current) photoRef.current.click(); }}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded"
            >
              <Plus size={14} />
              Add another photo
              <span className="text-[10px] font-normal opacity-60">({photoPreviews.length}/{MAX_PHOTOS})</span>
            </button>
          )}
        </div>
      )}

      {/* Video preview + seek poster picker */}
      {videoPreview && (
        <div className="relative mb-4 border border-border">
          <video src={videoPreview} className="w-full max-h-64" controls />
          <button
            type="button"
            onClick={() => { setVideoFile(null); setVideoPreview(null); setVideoDuration(0); setSeekSeconds(1); setCustomPosterUrl(null); setUploadedVideoUrl(null); }}
            className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 hover:bg-[var(--its-red)] transition-colors"
            aria-label="Remove video"
          >
            <X size={14} />
          </button>
          {/* Seek poster picker — shown once video is selected */}
          {videoDuration > 0 && (
            <div className="border-t border-border bg-secondary px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Film size={12} className="text-[var(--its-red)] flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Choose thumbnail frame</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{seekSeconds}s / {videoDuration}s</span>
              </div>
              <Slider
                min={0}
                max={videoDuration}
                step={1}
                value={[seekSeconds]}
                onValueChange={([v]) => { setSeekSeconds(v); setCustomPosterUrl(null); }}
                className="mb-2"
                aria-label="Seek to frame"
              />
              {customPosterUrl ? (
                <div className="flex items-center gap-2">
                  <img src={customPosterUrl} alt="Custom poster" className="w-16 h-10 object-cover border border-border flex-shrink-0" />
                  <span className="text-[10px] text-green-600 font-bold">Thumbnail set at {seekSeconds}s</span>
                  <button
                    type="button"
                    onClick={() => setCustomPosterUrl(null)}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear custom thumbnail"
                  >Clear</button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={seekPosterPending || !uploadedVideoUrl}
                  onClick={async () => {
                    if (!uploadedVideoUrl) { toast.info("Upload the video first by submitting the post — poster will be set automatically."); return; }
                    setSeekPosterPending(true);
                    try {
                      const { posterUrl } = await seekPoster.mutateAsync({ videoUrl: uploadedVideoUrl, seekSeconds });
                      setCustomPosterUrl(posterUrl);
                      toast.success("Thumbnail set!");
                    } catch {
                      toast.error("Could not extract frame.");
                    } finally {
                      setSeekPosterPending(false);
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
                >
                  {seekPosterPending ? <Loader2 size={10} className="animate-spin" /> : <Film size={10} />}
                  {uploadedVideoUrl ? "Set thumbnail at this frame" : "Upload video to set thumbnail"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audio preview */}
      {audioFile && (
        <div className="relative mb-4 flex items-center gap-3 border border-border p-3 bg-secondary">
          <Music size={24} className="text-[var(--its-red)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-wide text-foreground truncate">{audioFile.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(audioFile.size / 1024).toFixed(0)} KB — audio (max 6 min / 5 MB)</p>
          </div>
          <button type="button" onClick={() => setAudioFile(null)} className="bg-primary text-primary-foreground p-1 hover:bg-[var(--its-red)] transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Document preview */}
      {docFile && (
        <div className="relative mb-4 flex items-center gap-3 border border-border p-3 bg-secondary">
          <FileText size={28} className="text-[var(--its-red)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-wide text-foreground truncate">{docFile.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(docFile.size / 1024).toFixed(0)} KB — {docFile.type || "document"} (max 5 MB)</p>
          </div>
          <button type="button" onClick={() => setDocFile(null)} className="bg-primary text-primary-foreground p-1 hover:bg-[var(--its-red)] transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Save as Reel / Story options — shown when video or photo is attached */}
      {(videoFile || photoFiles.length > 0) && (
        <div className="flex items-center gap-4 px-1 pb-2 pt-1 flex-wrap border-t border-border mt-1">
          {videoFile && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={saveAsReel}
                onCheckedChange={(v) => setSaveAsReel(!!v)}
                id="save-as-reel"
                className="border-[var(--its-red)] data-[state=checked]:bg-[var(--its-red)] data-[state=checked]:border-[var(--its-red)]"
              />
              <span className="text-xs font-semibold text-foreground">Also save as Reel</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={saveAsStory}
              onCheckedChange={(v) => setSaveAsStory(!!v)}
              id="save-as-story"
              className="border-[var(--its-red)] data-[state=checked]:bg-[var(--its-red)] data-[state=checked]:border-[var(--its-red)]"
            />
            <span className="text-xs font-semibold text-foreground">Also save as Story</span>
          </label>
        </div>
      )}
      {/* Actions row — Photo | Video | Audio | Poll | Live | Doc | Color */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Photo (up to 3) */}
          {(() => {
            const remaining = quota?.photo ?? 2;
            const exhausted = remaining <= 0;
            const disabled = showPoll || photoFiles.length >= MAX_PHOTOS || !!videoFile || exhausted;
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={() => { if (photoRef.current) photoRef.current.click(); }}
                title={exhausted ? `Daily photo limit reached. ${formatResetTime(quota?.resetAt?.photo)}` : `${remaining} photo post(s) remaining today`}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  photoFiles.length > 0
                    ? "border-[var(--its-red)] bg-[var(--its-red)] text-white"
                    : exhausted
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : showPoll || !!videoFile
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
                style={{ borderRadius: 0 }}
              >
                <Image size={13} />
                <span className="hidden sm:inline">
                  Photo{photoFiles.length > 0 ? ` (${photoFiles.length}/${MAX_PHOTOS})` : ""}
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/2</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/2</span>}
                </span>
              </button>
            );
          })()}

          {/* Video */}
          {(() => {
            const remaining = quota?.video ?? 1;
            const exhausted = remaining <= 0;
            const disabled = showPoll || photoFiles.length > 0 || exhausted;
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={() => { if (videoRef.current) videoRef.current.click(); }}
                title={exhausted ? `Daily video limit reached. ${formatResetTime(quota?.resetAt?.video)}` : `${remaining} video(s) remaining today`}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  videoFile
                    ? "border-[var(--its-red)] bg-[var(--its-red)] text-white"
                    : exhausted
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : showPoll || photoFiles.length > 0
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
                style={{ borderRadius: 0 }}
              >
                <Video size={13} />
                <span className="hidden sm:inline">
                  Video
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/2</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/2</span>}
                </span>
              </button>
            );
          })()}

          {/* Audio */}
          {(() => {
            const remaining = quota?.audio ?? 1;
            const exhausted = remaining <= 0;
            const disabled = !!audioFile || exhausted;
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={() => { if (audioRef.current) audioRef.current.click(); }}
                title={exhausted ? `Daily audio limit reached. ${formatResetTime(quota?.resetAt?.audio)}` : `${remaining} audio post(s) remaining today`}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  audioFile
                    ? "border-[var(--its-red)] bg-[var(--its-red)] text-white"
                    : exhausted
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-[var(--its-red)] hover:border-[var(--its-red)]"
                }`}
                style={{ borderRadius: 0 }}
              >
                <Music size={13} />
                <span className="hidden sm:inline">
                  Audio
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/12</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/12</span>}
                </span>
              </button>
            );
          })()}

          {/* Poll */}
          {(() => {
            const remaining = quota?.poll ?? 2;
            const exhausted = remaining <= 0;
            const disabled = hasMedia || (exhausted && !showPoll);
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={togglePoll}
                title={exhausted ? `Daily poll limit reached. ${formatResetTime(quota?.resetAt?.poll)}` : `${remaining} poll(s) remaining today`}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  showPoll
                    ? "border-foreground bg-primary text-primary-foreground"
                    : disabled
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
                style={{ borderRadius: 0 }}
              >
                <BarChart2 size={13} />
                <span className="hidden sm:inline">
                  Poll
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/2</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/2</span>}
                </span>
              </button>
            );
          })()}

          {/* Live - DISABLED */}
          {false && (() => {
            const remaining = quota?.live ?? 3;
            const exhausted = remaining <= 0;
            const disabled = hasMedia || showPoll || !!liveStreamId || exhausted;
            return (
              <button
                type="button"
                disabled={disabled}
                title={exhausted ? `Daily live stream limit reached. ${formatResetTime(quota?.resetAt?.live)}` : `${remaining} live stream(s) remaining today`}
                onClick={async () => {
                  try {
                    const { streamId } = await createLiveMutation.mutateAsync({ title: text.trim() || undefined });
                    setLiveStreamId(streamId);
                    refetchQuota();
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Failed to start live stream");
                  }
                }}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  liveStreamId
                    ? "border-[var(--its-red)] bg-[var(--its-red)] text-white"
                    : exhausted
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : hasMedia || showPoll
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-[var(--its-red)] hover:border-[var(--its-red)]"
                }`}
                style={{ borderRadius: 0 }}
              >
                <Radio size={13} />
                <span className="hidden sm:inline">
                  Live
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/3</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/3</span>}
                </span>
              </button>
            );
          })()}

          {/* Doc */}
          {(() => {
            const remaining = quota?.doc ?? 1;
            const exhausted = remaining <= 0;
            const disabled = hasMedia || showPoll || !!liveStreamId || !!docFile || exhausted;
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={() => { if (docRef.current) docRef.current.click(); }}
                title={exhausted ? `Daily document limit reached. ${formatResetTime(quota?.resetAt?.doc)}` : `${remaining} document(s) remaining today`}
                className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  docFile
                    ? "border-[var(--its-red)] bg-[var(--its-red)] text-white"
                    : exhausted
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : hasMedia || showPoll || liveStreamId
                    ? "border-border text-muted-foreground opacity-30 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-[var(--its-red)] hover:border-[var(--its-red)]"
                }`}
                style={{ borderRadius: 0 }}
              >
                <FileText size={13} />
                <span className="hidden sm:inline">
                  Doc
                  {!exhausted && quota != null && <span className="ml-1 opacity-60">{remaining}/2</span>}
                  {exhausted && <span className="ml-1 text-red-400">0/2</span>}
                </span>
              </button>
            );
          })()}

          {/* Color picker toggle — only for text-only posts */}
          {!hasMedia && !showPoll && !liveStreamId && (
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              title="Post background color"
              className={`flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                showColorPicker || hasBgColor
                  ? "border-[var(--its-red)] text-[var(--its-red)]"
                  : "border-border text-muted-foreground hover:text-[var(--its-red)] hover:border-[var(--its-red)]"
              }`}
              style={{ borderRadius: 0 }}
            >
              <span
                className="w-3 h-3 flex-shrink-0 border border-current"
                style={{ background: hasBgColor ? bgColor : "transparent" }}
              />
              <span className="hidden sm:inline">Color</span>
            </button>
          )}

          {/* Hidden file inputs */}
          <input ref={photoRef} type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoChange} />
          <input ref={videoRef} type="file" className="hidden" accept="video/*" onChange={handleVideoChange} />
          <input ref={audioRef} type="file" className="hidden" accept="audio/*" onChange={handleAudioChange} />
          <input ref={docRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleDocChange} />
        </div>

        {/* Media limit hints */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-5 pb-2 pt-0">
          <span className="text-[10px] text-muted-foreground/60">
            🖼️ Photo ≤ {PHOTO_MAX_MB} MB
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            🎬 Video ≤ {VIDEO_MAX_MB} MB · {Math.floor(VIDEO_MAX_SECS / 60)}m{VIDEO_MAX_SECS % 60 > 0 ? `${VIDEO_MAX_SECS % 60}s` : ""}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            🎵 Audio ≤ {AUDIO_MAX_MB} MB · {Math.floor(AUDIO_MAX_SECS / 60)}m{AUDIO_MAX_SECS % 60 > 0 ? `${AUDIO_MAX_SECS % 60}s` : ""}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            📎 Doc ≤ {DOC_MAX_MB} MB
          </span>
        </div>
      </div>{/* end actions row */}

        {/* Word counter */}
        {text.length > 0 && (
          <div className="flex justify-end px-5 pt-1">
            <span className={`text-xs font-mono tabular-nums ${
              isOverWordLimit ? "text-red-500 font-bold" :
              wordCount > POST_WORD_LIMIT * 0.9 ? "text-yellow-500" :
              "text-muted-foreground"
            }`}>
              {wordCount} / {POST_WORD_LIMIT} words
            </span>
          </div>
        )}

        {/* Scheduled badge */}
        {scheduledAt && (
          <div className="flex items-center gap-2 px-5 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--its-red)] border border-[var(--its-red)] px-2.5 py-1 rounded-full">
              <CalendarIcon size={11} />
              Scheduled for {format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}
            </span>
            <button
              type="button"
              onClick={() => setScheduledAt(undefined)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Remove schedule"
            >
              <CalendarX size={13} />
            </button>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="px-5 pb-2">
            {photoFiles.length > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Uploading photo {uploadPhotoIndex} of {photoFiles.length}…
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{uploadProgress}%</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--its-red)] transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress > 0 ? uploadProgress : 5}%` }}
                />
              </div>
              {photoFiles.length === 0 && (
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{uploadProgress}%</span>
              )}
            </div>
          </div>
        )}

        {/* Publish button row */}
        <div className="flex items-center justify-between px-5 pb-5 pt-2">
          {/* Schedule button */}
          <Popover open={schedulePopoverOpen} onOpenChange={setSchedulePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Schedule post"
                className={`flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors px-2.5 py-2 border ${
                  scheduledAt
                    ? "border-[var(--its-red)] text-[var(--its-red)]"
                    : "border-border text-muted-foreground hover:text-[var(--its-red)] hover:border-[var(--its-red)]"
                }`}
                style={{ borderRadius: 0 }}
              >
                <CalendarIcon size={13} />
                <span className="hidden sm:inline">Schedule</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-3">
                <Calendar
                  mode="single"
                  selected={scheduledAt}
                  onSelect={(d) => {
                    if (!d) { setScheduledAt(undefined); return; }
                    const base = scheduledAt ? new Date(scheduledAt) : new Date();
                    d.setHours(base.getHours(), base.getMinutes());
                    setScheduledAt(d);
                  }}
                  disabled={(d) => d < new Date()}
                />
                <div className="border-t pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Clock size={13} />
                    Time
                  </label>
                  <Input
                    type="time"
                    value={scheduledAt ? format(scheduledAt, "HH:mm") : ""}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":");
                      const base = scheduledAt ? new Date(scheduledAt) : new Date();
                      base.setHours(parseInt(h ?? "0"), parseInt(m ?? "0"));
                      setScheduledAt(new Date(base));
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                {scheduledAt && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-muted-foreground">{format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}</span>
                    <button
                      type="button"
                      onClick={() => { setScheduledAt(undefined); setSchedulePopoverOpen(false); }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="submit"
            disabled={isLoading || isOverWordLimit || (!text.trim() && photoFiles.length === 0 && !videoFile && !showPoll && !docFile && !audioFile)}
            className="px-6 py-2 rounded-full bg-[var(--its-red)] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {uploading ? "Uploading..." : createPost.isPending ? "Publishing..." : scheduledAt ? "Schedule" : "Post"}
          </button>
        </div>

          </div>{/* end modal body */}
          </form>
        </DialogContent>
      </Dialog>

      {/* Live Stream Confirmation Dialog */}
      <AlertDialog open={showLiveConfirm} onOpenChange={setShowLiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Radio size={20} className="text-red-500" />
              Go Live?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to start a live stream. It will be visible to all your followers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Event Topic (Optional)
              </label>
              <Input
                placeholder="e.g., Product Launch, Q&A Session, Live Performance..."
                value={liveEventTopic}
                onChange={(e) => setLiveEventTopic(e.target.value)}
                maxLength={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {liveEventTopic.length}/100 characters
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLive}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Radio size={16} className="mr-2" />
              Go Live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((reader.result as string).split(",")[1] ?? ""); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
