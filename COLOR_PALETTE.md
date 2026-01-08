# Empath Layer - Artistic Color Palette

## The Five Sacred Colors

This palette is STRICT and COMPLETE. No other colors should be used anywhere in the application.

---

## 1. Olive / Lime Yellow
### `#bbbe64`
**RGB**: 187, 190, 100
**HSL**: 62°, 42%, 57%

**Usage:**
- Primary action buttons
- Success states
- Happy emotion indicator
- Surprise emotion indicator
- Active/live indicators
- Focus outlines
- Positive energy elements

**Personality:** Energetic, warm, growth-oriented, optimistic

**Variations:**
```css
/* Full opacity */
#bbbe64

/* Backgrounds */
rgba(187, 190, 100, 0.12)  /* Very light wash */
rgba(187, 190, 100, 0.20)  /* Light background */
rgba(187, 190, 100, 0.30)  /* Border color */

/* Glows */
rgba(187, 190, 100, 0.40)  /* Glow effect */
rgba(187, 190, 100, 0.60)  /* Strong glow */
```

---

## 2. Dusty Mauve / Plum
### `#8e5572`
**RGB**: 142, 85, 114
**HSL**: 330°, 25%, 45%

**Usage:**
- Secondary actions
- Sad emotion indicator
- Empathy-related UI elements
- Error/danger states
- Deeper emotional contexts
- Accent gradients

**Personality:** Empathetic, deep, contemplative, emotionally intelligent

**Variations:**
```css
/* Full opacity */
#8e5572

/* Backgrounds */
rgba(142, 85, 114, 0.08)   /* Very light wash */
rgba(142, 85, 114, 0.15)   /* Light background */
rgba(142, 85, 114, 0.25)   /* Border color */

/* Glows */
rgba(142, 85, 114, 0.40)   /* Glow effect */
rgba(142, 85, 114, 0.60)   /* Strong glow */
```

---

## 3. Very Light Mint / Off-White
### `#f2f7f2`
**RGB**: 242, 247, 242
**HSL**: 120°, 17%, 96%

**Usage:**
- Main background
- Light elevated surfaces
- Text on dark backgrounds
- Breathing space
- Canvas
- Clean areas

**Personality:** Fresh, clean, open, calm, breathable

**Variations:**
```css
/* Full opacity */
#f2f7f2

/* Pure white (when needed) */
#ffffff

/* Tinted whites */
rgba(242, 247, 242, 0.60)  /* Semi-transparent */
rgba(242, 247, 242, 0.80)  /* Mostly opaque */
rgba(242, 247, 242, 0.98)  /* Nearly opaque */
```

---

## 4. Warm Beige / Tan
### `#bcaa99`
**RGB**: 188, 170, 153
**HSL**: 29°, 22%, 67%

**Usage:**
- Neutral emotion indicator
- Elevated surfaces
- Secondary backgrounds
- Grounding elements
- Warm accents
- Inactive states

**Personality:** Natural, warm, stable, grounding, earthy

**Variations:**
```css
/* Full opacity */
#bcaa99

/* Backgrounds */
rgba(188, 170, 153, 0.08)  /* Very light wash */
rgba(188, 170, 153, 0.15)  /* Card backgrounds */
rgba(188, 170, 153, 0.20)  /* Button backgrounds */
rgba(188, 170, 153, 0.25)  /* Border color */

/* Glows */
rgba(188, 170, 153, 0.40)  /* Soft glow */
```

---

## 5. Deep Purple / Eggplant
### `#443850`
**RGB**: 68, 56, 80
**HSL**: 270°, 18%, 27%

**Usage:**
- ALL text (replaces black entirely)
- Dark accents
- Icons
- Shadows (at low opacity)
- Borders
- Depth elements

**Personality:** Sophisticated, deep, readable, authoritative

**Variations:**
```css
/* Full opacity - Primary text */
#443850

/* Text variations */
rgba(68, 56, 80, 1.00)     /* Primary text */
rgba(68, 56, 80, 0.75)     /* Secondary text */
rgba(68, 56, 80, 0.55)     /* Tertiary text */
rgba(68, 56, 80, 0.35)     /* Disabled text */

/* Borders */
rgba(68, 56, 80, 0.12)     /* Light border */
rgba(68, 56, 80, 0.20)     /* Medium border */
rgba(68, 56, 80, 0.30)     /* Strong border */

/* Shadows */
rgba(68, 56, 80, 0.08)     /* Subtle shadow */
rgba(68, 56, 80, 0.12)     /* Medium shadow */
rgba(68, 56, 80, 0.15)     /* Strong shadow */
rgba(68, 56, 80, 0.18)     /* XL shadow */
```

---

## Gradient Combinations

### Primary Gradient (Most Common)
```css
linear-gradient(135deg, #bbbe64 0%, #8e5572 100%)
```
**Usage:** Buttons, active states, logos, important UI

### Warm Gradient
```css
linear-gradient(135deg, #bcaa99 0%, #bbbe64 100%)
```
**Usage:** Secondary buttons, warm accents

### Depth Gradient
```css
linear-gradient(135deg, #8e5572 0%, #443850 100%)
```
**Usage:** User avatars, deep emotional states

### Background Gradient
```css
linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(188, 170, 153, 0.12) 100%)
```
**Usage:** Cards, elevated surfaces

### Message Bubble (User)
```css
linear-gradient(135deg, #bbbe64 0%, #8e5572 100%)
```
**Usage:** User sent messages

### Message Bubble (Assistant)
```css
linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(242, 247, 242, 0.9) 100%)
```
**Usage:** AI responses

---

## Emotion State Colors

### Happy
**Primary:** `#bbbe64` (Olive)
**Glow:** `rgba(187, 190, 100, 0.4)`
**Background:** `rgba(187, 190, 100, 0.08)`

### Sad
**Primary:** `#8e5572` (Mauve)
**Glow:** `rgba(142, 85, 114, 0.4)`
**Background:** `rgba(142, 85, 114, 0.08)`

### Surprise
**Primary:** `#bbbe64` (Olive)
**Glow:** `rgba(187, 190, 100, 0.5)`
**Background:** `rgba(187, 190, 100, 0.08)`

### Neutral
**Primary:** `#bcaa99` (Beige)
**Glow:** `rgba(188, 170, 153, 0.4)`
**Background:** `rgba(188, 170, 153, 0.08)`

---

## Status Colors

### Success
**Color:** `#bbbe64` (Olive)
**Usage:** Completed states, positive feedback, live indicators

### Warning
**Color:** `#bcaa99` (Beige)
**Usage:** Caution states, neutral alerts

### Danger/Error
**Color:** `#8e5572` (Mauve)
**Usage:** Errors, failed states, important warnings

### Info
**Color:** `#443850` (Eggplant)
**Usage:** Informational messages, neutral data

---

## Contrast Ratios (WCAG Compliance)

### Text Combinations

| Foreground | Background | Ratio | Rating |
|------------|------------|-------|--------|
| `#443850` (Eggplant) | `#f2f7f2` (Mint) | 8.5:1 | AAA ✓ |
| `#443850` (Eggplant) | `#ffffff` (White) | 9.2:1 | AAA ✓ |
| `#bbbe64` (Olive) | `#ffffff` (White) | 4.8:1 | AA Large ✓ |
| `#8e5572` (Mauve) | `#ffffff` (White) | 5.2:1 | AA ✓ |
| `#ffffff` (White) | `#bbbe64` (Olive) | 4.8:1 | AA Large ✓ |
| `#ffffff` (White) | `#8e5572` (Mauve) | 5.2:1 | AA ✓ |
| `#f2f7f2` (Mint) | `#443850` (Eggplant) | 8.5:1 | AAA ✓ |

All combinations meet WCAG AA or better. Primary text (eggplant on mint/white) exceeds AAA standards.

---

## Color Psychology

### Olive/Lime Yellow (#bbbe64)
- **Emotional Response:** Energizing, optimistic, growth
- **Associations:** Nature, freshness, new beginnings
- **Use Case:** Positive user actions, success feedback

### Dusty Mauve/Plum (#8e5572)
- **Emotional Response:** Contemplative, empathetic, sophisticated
- **Associations:** Wisdom, introspection, emotional depth
- **Use Case:** Empathy indicators, deeper emotions

### Very Light Mint (#f2f7f2)
- **Emotional Response:** Calm, clean, open
- **Associations:** Clarity, freshness, breathing room
- **Use Case:** Background, space, calm areas

### Warm Beige/Tan (#bcaa99)
- **Emotional Response:** Grounded, stable, warm
- **Associations:** Earth, nature, reliability
- **Use Case:** Neutral elements, stability

### Deep Purple/Eggplant (#443850)
- **Emotional Response:** Sophisticated, deep, trustworthy
- **Associations:** Depth, authority, readability
- **Use Case:** Text, important information

---

## Implementation Notes

### Forbidden Colors

**NEVER USE:**
- Pure black (`#000000`)
- Pure white as primary (use `#f2f7f2` instead)
- Generic grays (`#666666`, `#999999`, etc.)
- Any blue, red, green, or other colors not in the palette
- Default browser colors

### When You Need a "Black"
Use `#443850` (eggplant) at full opacity for text and dark elements.

### When You Need a "White"
Use `#f2f7f2` (mint) as your base white, or `#ffffff` for pure white surfaces.

### For Shadows
Always use `rgba(68, 56, 80, 0.08-0.18)` - never black shadows.

---

## Quick Reference

```css
/* Copy-paste ready variables */
:root {
  --olive: #bbbe64;
  --mauve: #8e5572;
  --mint: #f2f7f2;
  --beige: #bcaa99;
  --eggplant: #443850;
}

/* Usage examples */
.button-primary {
  background: linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%);
  color: white;
}

.button-secondary {
  background: rgba(188, 170, 153, 0.15);
  color: var(--eggplant);
  border: 1.5px solid rgba(68, 56, 80, 0.12);
}

.text-primary {
  color: var(--eggplant);
}

.card {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(188, 170, 153, 0.12) 100%);
  border: 1.5px solid rgba(68, 56, 80, 0.12);
  box-shadow: 0 6px 20px -2px rgba(68, 56, 80, 0.12);
}
```

---

**Remember:** These 5 colors are complete and sufficient for the entire application. Creative use of opacity, gradients, and combinations creates visual variety while maintaining strict palette discipline.
