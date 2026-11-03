# FacingFace Theme System Documentation

## Overview

FacingFace has a comprehensive theme system with 4 built-in themes. This document explains how it works and how to maintain it.

## Available Themes

| Theme | CSS Class | Description |
|-------|-----------|-------------|
| White | `.theme-white` | Pure white background, dark text (default) |
| Light Blue | `.theme-lightblue` | Soft blue tinted background |
| Soft Beige | `.theme-beige` | Warm beige/cream background |
| Light Dark | `.theme-lightdark` | Dark background with light text |

## Theme System Architecture

### 1. **ThemeModeContext** (`client/src/contexts/ThemeModeContext.tsx`)
- Manages the current theme selection
- Stores theme preference in `localStorage` as `facingface-theme`
- Applies theme class to `document.documentElement`
- Provides `useThemeMode()` hook

### 2. **CSS Variables** (`client/src/index.css`)
- Each theme defines CSS custom properties
- Variables include colors, spacing, and styling
- Automatically applied when theme class is added to root element

### 3. **Theme Colors**
Each theme defines these CSS variables:
```css
--background: page background color
--foreground: primary text color
--card: card/component background
--border: border colors
--primary: primary accent color
--secondary: secondary accent color
--muted: muted/disabled colors
--accent: accent color
--destructive: error/danger color
```

## How to Use Themes in Components

### ✅ CORRECT - Using CSS Classes

```tsx
import { useThemeMode } from "@/contexts/ThemeModeContext";

export function MyComponent() {
  const { themeMode, setThemeMode } = useThemeMode();

  return (
    <div className="bg-background text-foreground border border-border">
      <p className="text-muted-foreground">Using theme colors</p>
      <button onClick={() => setThemeMode("lightblue")}>
        Change Theme
      </button>
    </div>
  );
}
```

### ✅ CORRECT - Using Tailwind Classes
```tsx
<div className="bg-card border border-border/40 rounded-lg p-4">
  <h2 className="text-foreground font-bold">Card Title</h2>
  <p className="text-muted-foreground">Card content</p>
</div>
```

### ❌ WRONG - Hardcoded Colors
```tsx
// DON'T DO THIS - breaks theme system
<div className="bg-white text-black border border-gray-200">
  This will NOT respect the current theme!
</div>
```

### ❌ WRONG - Hardcoded Theme-Specific Colors
```tsx
// DON'T DO THIS - breaks when user switches themes
<div className="bg-blue-50 text-blue-700">
  This only works for Light Blue theme!
</div>
```

## Subscription-Tiers Page Fix

### What Was Wrong
The subscription-tiers page was using hardcoded colors:
- Green tier: `bg-green-50`, `text-green-700`
- Golden tier: `bg-yellow-50`, `text-yellow-700`
- Diamond tier: `bg-blue-50`, `text-blue-700`

This meant the page didn't respect theme changes and always looked the same.

### What Was Fixed
1. **Updated `SubscriptionTiers.tsx`** to:
   - Use `bg-background` and `text-foreground` for main layout
   - Use `bg-card` and `border-border` for cards
   - Keep tier-specific gradient colors for visual distinction
   - Add theme selector buttons at the top of the page

2. **Added Theme Selector** with buttons:
   - White
   - Light Blue
   - Soft Beige
   - Light Dark

3. **Maintained Functionality**:
   - Tier cards still have distinct colors (green, golden, blue)
   - Theme selector allows users to change themes
   - Theme preference persists in localStorage
   - All other pages automatically update when theme changes

## How Theme Persistence Works

1. **User selects theme** → `setThemeMode("lightblue")`
2. **Theme saved to localStorage** → `facingface-theme: "lightblue"`
3. **CSS class applied** → `<html class="theme-lightblue">`
4. **CSS variables activate** → All `--background`, `--foreground`, etc. update
5. **Page re-renders** → All components using theme classes update automatically
6. **On page reload** → Theme is restored from localStorage

## Best Practices

### ✅ DO:
- Use `bg-background`, `text-foreground`, `bg-card`, `border-border` for main layout
- Use `text-muted-foreground` for secondary text
- Use `bg-primary` for buttons and accents
- Use `border-border/40` for subtle borders
- Test your component with all 4 themes before committing

### ❌ DON'T:
- Hardcode colors like `bg-white`, `text-black`, `bg-blue-50`
- Use theme-specific colors like `bg-green-50` for main layout
- Assume a specific theme will be active
- Use `isDark` checks instead of theme variables
- Forget to import `useThemeMode` when adding theme selector

## Testing Your Changes

Before committing changes to any page:

1. **Extract the zip file**
2. **Run the development server**
3. **Navigate to your page**
4. **Test with each theme**:
   - Open browser console
   - Run: `document.documentElement.className = "theme-white"`
   - Verify page looks correct
   - Repeat for "theme-lightblue", "theme-beige", "theme-lightdark"
5. **Test theme persistence**:
   - Select a theme
   - Refresh the page
   - Verify theme is still selected

## Adding New Pages

When creating a new page:

1. **Import theme hook** (if adding theme selector):
   ```tsx
   import { useThemeMode } from "@/contexts/ThemeModeContext";
   ```

2. **Use theme classes**:
   ```tsx
   <div className="min-h-screen bg-background text-foreground">
     <div className="bg-card border border-border rounded-lg p-4">
       <h1 className="text-foreground font-bold">Title</h1>
       <p className="text-muted-foreground">Subtitle</p>
     </div>
   </div>
   ```

3. **Test with all themes** before deploying

## Troubleshooting

### Page doesn't respect theme changes
- Check if you're using hardcoded colors
- Verify you're using Tailwind classes like `bg-background`
- Check browser console for CSS errors

### Theme selector doesn't appear
- Verify `useThemeMode` is imported correctly
- Check that `ThemeModeProvider` wraps your app in `App.tsx`
- Verify localStorage is enabled in browser

### Theme doesn't persist after refresh
- Check localStorage in browser DevTools
- Verify `facingface-theme` key is being set
- Check for JavaScript errors in console

### Specific theme looks wrong
- Check `index.css` for theme-specific CSS variables
- Verify all color variables are defined for that theme
- Test in different browsers

## File Locations

| File | Purpose |
|------|---------|
| `client/src/contexts/ThemeModeContext.tsx` | Theme state management |
| `client/src/index.css` | CSS variables for all themes |
| `client/src/pages/SubscriptionTiers.tsx` | Example page with theme selector |
| `client/src/App.tsx` | ThemeModeProvider wrapper |

## CSS Variables Reference

### Light Themes (white, lightblue, beige)
```css
--background: Light color (95-100%)
--foreground: Dark color (10-20%)
--card: Light color (95-100%)
--border: Light gray (75-85%)
--primary: Dark color (20-30%)
--secondary: Very light (85-95%)
--muted: Light gray (85-95%)
--muted-foreground: Medium gray (40-50%)
```

### Dark Theme (lightdark)
```css
--background: Dark color (20-25%)
--foreground: Light color (85-90%)
--card: Dark color (25-30%)
--border: Dark gray (35-40%)
--primary: Light color (85-90%)
--secondary: Dark gray (30-35%)
--muted: Dark gray (30-35%)
--muted-foreground: Medium gray (55-65%)
```

## Why This Matters

The theme system ensures:
1. **Consistency** - All pages look cohesive
2. **Accessibility** - Users can choose themes that work for them
3. **Maintainability** - Changes to colors only need to be made once
4. **Persistence** - User preferences are saved
5. **Flexibility** - Easy to add new themes without changing component code

## Support

If you encounter issues:
1. Check this documentation
2. Review `SubscriptionTiers.tsx` as an example
3. Check browser console for errors
4. Verify all CSS variables are defined in `index.css`
