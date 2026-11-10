/** Short colour values remain the only values stored in posts.bgColor (max 30).
 * Gradients are presentation only, shared by the editor and published wall posts.
 */
export const TEXT_POST_BACKGROUNDS = [
  { label: "White", value: "", preview: "#ffffff" },
  { label: "Red", value: "#E63329", preview: "#E63329" },
  { label: "Black", value: "#111111", preview: "#111111" },
  { label: "Blue", value: "#1a56db", preview: "#1a56db" },
  { label: "Green", value: "#057a55", preview: "#057a55" },
  { label: "Purple", value: "#7e3af2", preview: "#7e3af2" },
  { label: "Amber", value: "#d97706", preview: "#d97706" },
  { label: "Rose", value: "#e11d48", preview: "#e11d48" },
  { label: "Teal", value: "#0d9488", preview: "#0d9488" },
  {
    label: "Artistic Red",
    value: "#dc2626",
    preview: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
  },
  {
    label: "Soft Grey",
    value: "#e5e7eb",
    preview: "linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)",
  },
  {
    label: "Royal Blue",
    value: "#1d4ed8",
    preview: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #4338ca 100%)",
  },
  { label: "Vivid Violet", value: "#bd00f8", preview: "#bd00f8" },
  {
    label: "Midnight",
    value: "#0f172a",
    preview: "linear-gradient(135deg, #0f172a 0%, #243758 100%)",
  },
  {
    label: "Sunset",
    value: "#be185d",
    preview: "linear-gradient(135deg, #be185d 0%, #9a3412 100%)",
  },
] as const;

export function getTextPostBackground(value: string): string {
  const matched = TEXT_POST_BACKGROUNDS.find(
    item => item.value.toLowerCase() === value.toLowerCase()
  );
  if (matched) return matched.preview;
  // Preserve legitimate legacy custom hex colours, never load remote assets.
  return /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    ? value
    : "#334155";
}

export function getTextPostTextColor(value: string): string {
  const normalized = value.toLowerCase();
  if (!value || normalized === "#e5e7eb" || normalized === "#f8fafc")
    return "#243247";
  // Palette colours are chosen for large bold white lettering; grey is the one
  // intentionally pale style. Other valid legacy hex values get contrast checks.
  if (
    TEXT_POST_BACKGROUNDS.some(item => item.value.toLowerCase() === normalized)
  )
    return "#ffffff";
  let hex = normalized.slice(1);
  if (hex.length === 3)
    hex = hex
      .split("")
      .map(part => part + part)
      .join("");
  if (!/^([\da-f]{6}|[\da-f]{8})$/.test(hex)) return "#ffffff";
  const rgb = [0, 2, 4]
    .map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const darkChannels = [0x24, 0x32, 0x47]
    .map(channel => channel / 255)
    .map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  const darkLuminance =
    darkChannels[0] * 0.2126 +
    darkChannels[1] * 0.7152 +
    darkChannels[2] * 0.0722;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast =
    (Math.max(luminance, darkLuminance) + 0.05) /
    (Math.min(luminance, darkLuminance) + 0.05);
  return darkContrast > whiteContrast ? "#243247" : "#ffffff";
}

export function getTextPostSize(text: string): "short" | "medium" | "long" {
  const length = Array.from(text.trim()).length;
  return length <= 40 ? "short" : length <= 140 ? "medium" : "long";
}
