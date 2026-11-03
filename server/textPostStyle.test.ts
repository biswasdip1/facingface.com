import { describe, expect, it } from "vitest";
import {
  TEXT_POST_BACKGROUNDS,
  getTextPostBackground,
  getTextPostSize,
  getTextPostTextColor,
} from "../client/src/lib/textPostStyle";

const LEGACY_VALUES = [
  "",
  "#E63329",
  "#111111",
  "#1a56db",
  "#057a55",
  "#7e3af2",
  "#d97706",
  "#e11d48",
  "#0d9488",
  "#dc2626",
  "#e5e7eb",
  "#1d4ed8",
];

// WCAG relative luminance and contrast, calculated rather than inferred from names.
function luminance(hex: string): number {
  const value = hex.slice(1);
  const full =
    value.length === 3
      ? value
          .split("")
          .map(channel => channel + channel)
          .join("")
      : value;
  if (!/^[\da-f]{6}$/i.test(full)) {
    throw new Error(`Contrast requires an opaque RGB hex colour: ${hex}`);
  }
  const [r, g, b] = [0, 2, 4].map(index => {
    const channel = parseInt(full.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe("text-post palette compatibility", () => {
  it("preserves every exact legacy stored value, including the empty default", () => {
    const values: readonly string[] = TEXT_POST_BACKGROUNDS.map(
      item => item.value
    );
    for (const legacy of LEGACY_VALUES) expect(values).toContain(legacy);
  });

  it("uses unique, case-insensitively distinct stored values of at most 30 characters", () => {
    const values = TEXT_POST_BACKGROUNDS.map(item => item.value);
    expect(new Set(values).size).toBe(values.length);
    expect(new Set(values.map(value => value.toLowerCase())).size).toBe(
      values.length
    );
    for (const value of values) {
      expect(value.length).toBeLessThanOrEqual(30);
      expect(value).toMatch(/^(?:|#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8})$/i);
    }
  });

  it.each(TEXT_POST_BACKGROUNDS)(
    "shares the $label preview with rendered posts",
    item => {
      expect(getTextPostBackground(item.value)).toBe(item.preview);
    }
  );

  it.each(TEXT_POST_BACKGROUNDS)("resolves $label case-insensitively", item => {
    for (const value of [item.value.toLowerCase(), item.value.toUpperCase()]) {
      expect(getTextPostBackground(value)).toBe(item.preview);
      expect(getTextPostTextColor(value)).toBe(
        getTextPostTextColor(item.value)
      );
    }
  });

  it("retains shared gradients for the existing artistic, grey, and royal styles", () => {
    for (const value of ["#dc2626", "#e5e7eb", "#1d4ed8"]) {
      const item = TEXT_POST_BACKGROUNDS.find(entry => entry.value === value);
      expect(item).toBeDefined();
      expect(item!.preview).toMatch(/^linear-gradient\(/);
      expect(getTextPostBackground(value)).toBe(item!.preview);
    }
  });

  it.each(TEXT_POST_BACKGROUNDS)(
    "adds no decorative radial overlay to $label",
    item => {
      const background = getTextPostBackground(item.value);
      expect(background).not.toMatch(/radial-gradient|url\(/i);
      if (!item.preview.startsWith("linear-gradient(")) {
        expect(background).toMatch(/^#[\da-f]{6}$/i);
        expect(background.toLowerCase()).toBe(
          (item.value || "#ffffff").toLowerCase()
        );
      }
    }
  );
});

describe("safe legacy backgrounds and foregrounds", () => {
  it.each(["#aBc", "#a1B2c3", "#12345678", "#ABCDEF80", "#fff", "#ffffff"])(
    "preserves valid unknown legacy hex %s exactly",
    value => {
      expect(getTextPostBackground(value)).toBe(value);
    }
  );

  it.each([
    "red",
    "transparent",
    "#12",
    "#abcd",
    "#12345",
    "#1234567",
    "#123456789",
    "#gggggg",
    " #abcdef",
    "#abcdef ",
    "#abcdef\n",
    "rgb(255, 255, 255)",
    "var(--background)",
    "linear-gradient(red, blue)",
    "radial-gradient(white, red)",
    'url("https://example.com/tracker.png")',
    "URL(javascript:alert(1))",
    "#ffffff; background-image: url(https://example.com/track)",
  ])("falls back safely for malformed or CSS background %j", value => {
    expect(getTextPostBackground(value)).toBe("#334155");
    expect(getTextPostTextColor(value)).toBe("#ffffff");
  });

  it.each([
    "",
    "#e5e7eb",
    "#E5E7EB",
    "#f8fafc",
    "#F8FAFC",
    "#fff",
    "#ffffff",
    "#fef3c7",
  ])("uses dark text on default, grey, or pale background %j", value => {
    const foreground = getTextPostTextColor(value);
    expect(foreground).toBe("#243247");
    const background = value === "" ? "#ffffff" : value;
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  it.each(["#000", "#123456", "#334155"])(
    "uses readable white text on dark legacy %s",
    value => {
      expect(getTextPostTextColor(value)).toBe("#ffffff");
      expect(
        contrast(getTextPostTextColor(value), value)
      ).toBeGreaterThanOrEqual(3);
    }
  );
});

describe("numeric large-bold-text contrast", () => {
  it("checks the contrast calculation against the known black/white ratio", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 10);
    expect(contrast("#fff", "#ffffff")).toBeCloseTo(1, 10);
  });

  it.each(
    TEXT_POST_BACKGROUNDS.filter(
      item => item.value && !item.preview.startsWith("linear-gradient(")
    )
  )("$label ($value) has at least 3:1 white-text contrast as a solid", item => {
    expect(getTextPostTextColor(item.value)).toBe("#ffffff");
    const ratio = contrast("#ffffff", item.preview);
    expect(
      ratio,
      `${item.value}: white contrast ${ratio.toFixed(6)}:1`
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(
    TEXT_POST_BACKGROUNDS.filter(item =>
      item.preview.startsWith("linear-gradient(")
    )
  )(
    "$label ($value) conservatively has at least 3:1 contrast at every gradient stop",
    item => {
      const foreground = getTextPostTextColor(item.value);
      expect(["#ffffff", "#243247"]).toContain(foreground);
      const stops = item.preview.match(/#[\da-f]{6}\b/gi) ?? [];
      expect(stops.length).toBeGreaterThanOrEqual(2);
      // Check all explicit stops, not an average colour that could hide a bad endpoint.
      for (const stop of stops) {
        const ratio = contrast(foreground, stop);
        expect(
          ratio,
          `${item.value}, stop ${stop}: ${foreground} contrast ${ratio.toFixed(6)}:1`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  );
});

describe("text-post size without content mutation", () => {
  it.each([
    ["", "short"],
    [" \n\t ", "short"],
    ["a".repeat(40), "short"],
    ["a".repeat(41), "medium"],
    ["a".repeat(140), "medium"],
    ["a".repeat(141), "long"],
    ["क".repeat(40), "short"],
    ["क".repeat(41), "medium"],
    ["क".repeat(140), "medium"],
    ["क".repeat(141), "long"],
    ["🙂".repeat(40), "short"],
    ["🙂".repeat(41), "medium"],
    ["🙂".repeat(140), "medium"],
    ["🙂".repeat(141), "long"],
    ["क".repeat(39) + "🙂", "short"],
    ["क".repeat(40) + "🙂", "medium"],
    ["क".repeat(139) + "🙂", "medium"],
    ["क".repeat(140) + "🙂", "long"],
    [" \n\t" + "🙂".repeat(40) + "\t\n ", "short"],
    ["\u00a0" + "क".repeat(140) + "\u00a0", "medium"],
    ["a".repeat(20) + " " + "b".repeat(20), "medium"],
    ["a".repeat(70) + "\n" + "b".repeat(70), "long"],
  ] as const)(
    "classifies %j as %s at the 40/140 code-point thresholds",
    (text, expected) => {
      const original = text;
      expect(getTextPostSize(text)).toBe(expected);
      expect(text).toBe(original);
    }
  );

  it("handles mixed Nepali combining marks, emoji, and whitespace deterministically", () => {
    const text = " \tनेपाली भाषा राम्रो छ 🙂👩🏽‍💻\n ";
    const original = text;
    expect(Array.from(text.trim()).length).toBeLessThanOrEqual(40);
    expect(getTextPostSize(text)).toBe("short");
    expect(getTextPostSize(text)).toBe("short");
    expect(text).toBe(original);
  });

  it("leaves palette metadata unchanged across repeated style and size calls", () => {
    const originalPalette = JSON.stringify(TEXT_POST_BACKGROUNDS);
    for (const { value } of TEXT_POST_BACKGROUNDS) {
      getTextPostBackground(value);
      getTextPostBackground(value.toUpperCase());
      getTextPostTextColor(value);
      getTextPostSize(" \nनेपाली 🙂 \t");
    }
    expect(JSON.stringify(TEXT_POST_BACKGROUNDS)).toBe(originalPalette);
  });
});
