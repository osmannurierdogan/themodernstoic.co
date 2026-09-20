# Theme: brand tokens only half-applied, leaving shadcn's gray defaults visible

**Status:** fixed in this repo (2026-09-20) · **Port to:** `create-blogfactory` template
**Files:** `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `src/config/brand.config.ts`,
`src/components/{Header,Footer,PostCard,NewsletterForm}.astro|vue`, `src/pages/**`

## Symptom

A site configured with a warm brand palette renders a warm background framed by **cold gray
borders, gray muted text and gray form controls**. The accent color defined in
`brand.config.ts` appears nowhere on screen. The result reads as unfinished regardless of
which palette the brand picks.

## Root cause

The template runs two color systems at once and only partially reconciles them.

`global.css` defines shadcn's full neutral-gray token set in `:root`:

```css
:root {
    --background: oklch(1 0 0);
    --border: oklch(0.922 0 0);
    --muted-foreground: oklch(0.556 0 0);
    /* …~25 tokens total */
}
```

`BaseLayout.astro` then injects an inline `<style>` that overrides **six** of them:

```astro
const brandStyles = `:root {
  --primary: ${colors.primary};
  --primary-foreground: ${colors.background};
  --secondary: ${colors.secondary};
  --accent: ${colors.accent};
  --background: ${colors.background};
  --foreground: ${colors.text};
  …
}`;
```

Everything not in that list — `--border`, `--input`, `--ring`, `--muted`, `--muted-foreground`,
`--card`, `--popover` — keeps its gray default. Those tokens are exactly the ones that draw
hairlines, form fields and secondary text, so the gray is spread across every surface of the
page while the brand color is confined to a handful of large fills.

`brand.config.ts` also only exposes five colors (`primary`, `secondary`, `accent`,
`background`, `text`), so there is **no way to configure the missing tokens** even if
`BaseLayout` wanted to emit them. The config shape is the real constraint; the layout is
downstream of it.

## Fix

Three coupled changes. The first two are the actual fix; the third is what makes it visible.

### 1. Widen the config surface (`brand.config.ts`)

Extend `BrandConfig["theme"]["colors"]` additively. Existing keys keep their names so nothing
downstream breaks:

```ts
colors: {
  primary: string; secondary: string; accent: string; background: string; text: string;
  surface: string;      // cards / raised surfaces
  panel: string;        // quiet section bands (footer, callouts)
  ink: string;          // inverted band background
  border: string;
  borderStrong: string; // hover / active borders
  mutedText: string;    // meta, excerpts
  accentSoft: string;   // decorative only — rules, dividers, never text
}
```

And `fonts` from `{ heading, body }` to `{ heading, body, serifBody }`.

### 2. Emit *every* token (`BaseLayout.astro`)

Replace the six-token block with one that assigns the complete shadcn set from config. The
rule for the template: **`brandStyles` must cover every token `global.css` declares in
`:root`.** Any token left out silently falls back to gray.

```diff
+  --surface: ${colors.surface};
+  --panel: ${colors.panel};
+  --ink: ${colors.ink};
+  --brand-accent: ${colors.accent};
+  --brand-accent-soft: ${colors.accentSoft};
+  --muted: ${colors.panel};
+  --muted-foreground: ${colors.mutedText};
+  --card: ${colors.surface};
+  --popover: ${colors.surface};
+  --border: ${colors.border};
+  --border-strong: ${colors.borderStrong};
+  --input: ${colors.border};
+  --ring: ${colors.accent};
```

> **Do not put the brand accent on `--accent`.** See [Gotchas](#gotchas).

Also make the `:root` fallbacks in `global.css` warm rather than shadcn-neutral. They should
never be reached — `BaseLayout` overrides all of them — but if a page renders without the
layout, or during the flash before the inline style applies, the fallback should be a
plausible paper tone, not white with gray borders.

### 3. Give the tokens somewhere to show up

Fixing the tokens alone changes very little, because no component referenced `accent`,
`surface` or `border-strong` in the first place. The components have to consume them. That
work is described in [What to port](#what-to-port).

## What to port

The template serves multiple brands, so the changes split cleanly into **structural** (port
as-is) and **presentational** (port the mechanism, not the values).

### Port as-is — every brand needs these

| Change | Where | Why it is generic |
|---|---|---|
| Full token contract | `BaseLayout.astro`, `brand.config.ts` | The bug above. Affects every brand. |
| Type scale in `@theme` | `global.css` | Template had no scale at all — headings were ad-hoc `text-lg`/`text-xl`/`text-3xl` and body was uniformly `text-sm`. |
| `:focus-visible` ring | `global.css` | There was **no focus style anywhere on the site**. Accessibility defect, not a style preference. |
| `PostCard.astro` | new component | Home and `/blog` had duplicated, already-diverging card markup, and neither handled a missing `CoverImage` — rows went ragged. |
| `.prose-brand` | `global.css` | `prose prose-neutral` ignores brand config entirely, so article bodies were gray-on-white inside a themed site. |
| `<img width="50%">` fix | `Header.astro` | Invalid — `width` on `<img>` takes pixels, not percentages. |
| Mobile nav | `Header.astro` | Header nav simply overflowed below `md`. CSS-only `<details>`, no JS island. |
| `flex min-h-screen flex-col` on `body` | `BaseLayout.astro` | Lets the footer sit at the bottom on short pages. |

### Adapt, don't copy — brand-specific

- **Palette values.** "Aged paper and ink" is The Modern Stoic's direction. The template
  should ship a neutral default and treat these as one example.
- **Font choices.** Fraunces + Inter + Source Serif 4. The *mechanism* (three font roles:
  heading / UI / long-form body) is worth porting; the families are not.
- **Copy and page composition.** Hero wording, the newsletter promises list on
  `/newsletter`, section eyebrow labels.

### Token contract reference

The values this repo landed on, as a worked example of the shape:

| Token | Value | Role |
|---|---|---|
| `background` | `#F7F5EF` | paper |
| `surface` | `#FFFDF8` | cards — **lighter than the page**, so they lift |
| `panel` | `#EFEBE0` | footer, quiet bands |
| `ink` | `#1F1D19` | inverted newsletter band |
| `text` | `#1A1815` | body |
| `mutedText` | `#6B6558` | meta, excerpts |
| `border` | `#E0DACC` | hairlines |
| `borderStrong` | `#C9C0AC` | hover borders |
| `accent` | `#866438` | links, hover, active nav, focus ring |
| `accentSoft` | `#B08D57` | rules and dividers **only** |

Note the inversion worth keeping as template guidance: cards are *lighter* than the
background, not darker. It reads as depth without needing shadows.

## Type scale

Defined once in `@theme inline` so it is reachable as ordinary utilities (`text-display`,
`text-h1`, `text-meta`):

```css
--text-meta: 0.75rem;     /* line-height 1.4,  letter-spacing 0.14em */
--text-body: 1.0625rem;   /* 1.7  — UI */
--text-article: 1.1875rem;/* 1.8  — long-form */
--text-h3: 1.375rem;      /* 1.3  */
--text-h2: 1.875rem;      /* 1.2  */
--text-h1: 2.5rem;        /* 1.12, tracking -0.018em */
--text-display: 3.25rem;  /* 1.05, tracking -0.02em  */
```

Plus rhythm and measure tokens: `--spacing-section` (6rem / 8rem at `lg`),
`--container-grid: 72rem`, `--container-article: 44rem`.

The old `max-w-4xl` (56rem) was applied to every page including the three-column grids,
which is too narrow for them, and too wide for comfortable article reading. Splitting the
measure by purpose is the fix.

### The `eyebrow` utility

Small, uppercase, widely letterspaced text — used on tags, dates, section headers, footer
group labels and nav. This single utility carries most of the editorial character and is
worth shipping in the template:

```css
@utility eyebrow {
  @apply font-sans text-meta font-medium uppercase text-muted-foreground;
}
```

## Gotchas

These cost real debugging time. Port the workarounds, not just the outcome.

**1. `--accent` is already taken by shadcn.**
In shadcn's token vocabulary `--accent` means *"subtle hover surface"* — it backs ghost
button hover, menu item highlight and similar. The template assigned the brand accent color
to it, which gives every ghost button a saturated brand-colored background. Keep `--accent`
as a quiet surface (`panel` works) and put the brand color on a separate `--brand-accent`,
exposed through `@theme` as `--color-brand`. Utilities then read `text-brand`,
`border-brand-soft`.

**2. Tailwind v4 cannot `@apply` a `@layer components` class.**
Defining `.eyebrow` inside `@layer components` and then using `@apply eyebrow` elsewhere
fails the build with `Cannot apply unknown utility class 'eyebrow'`. Declare it with
`@utility` instead — top level, outside any `@layer`.

**3. Check accent contrast against every surface it lands on, not just the background.**
The original `#b08d57` on `#faf9f6` is **2.94:1** — it fails WCAG AA for text by a wide
margin, which is part of why it was never used for anything. The first replacement,
`#8C6B3F`, measured **4.49:1**, missing the 4.5 threshold by 0.01. The shipped `#866438`
clears it on background (4.95), surface (5.31) *and* panel (4.53) — panel matters because
footer links use the brand color on that tone.

Template guidance: any color used for text needs checking against `background`, `surface`
**and** `panel`. A quick check:

```bash
node -e '
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const ratio=(a,b)=>{const [x,y]=[L(a),L(b)].sort((p,q)=>q-p);
  return ((x+0.05)/(y+0.05)).toFixed(2)};
console.log(ratio("#866438","#F7F5EF"));'
```

**4. Variable fonts need the `@fontsource-variable/*` package.**
`@fontsource/fraunces` ships static weights only. Fraunces' `opsz` optical-sizing axis —
the main reason to use it — requires `@fontsource-variable/fraunces`. Fraunces also ships
playful `SOFT` and `WONK` axes that are on by default; zero them
(`font-variation-settings: "SOFT" 0, "WONK" 0`) unless the brand actually wants them.

**5. `prose-neutral` hides in more places than you expect.**
After converting `blog/[slug].astro`, a grep turned up `src/pages/[slug].astro` (the Notion
content pages — About, Privacy, Cookie Policy) still on the stock theme. Grep before
declaring the conversion done:

```bash
grep -rn "prose-neutral\|max-w-4xl\|fontsource/fraunces" src/
```

## Verification

1. `pnpm build && pnpm check` — must be 0 errors.
2. **Confirm the root defect is gone.** No gray may survive in the emitted CSS:
   ```bash
   grep -o '\-\-border:[^;]*;' dist/index.html          # expect the warm hex
   grep -o 'oklch([0-9.]* 0 0)' dist/_astro/*.css       # expect no matches (charts aside)
   ```
3. Force the ragged-grid case — a post with no `CoverImage` must keep its row aligned via
   the monogram fallback.
4. Tab through header, cards, pagination and the newsletter form; every stop shows a ring.
5. Contrast-check accent and muted text against background, surface and panel.
6. Submit a real email — `NewsletterForm.vue`'s `handleSubmit`, Beehiiv fetch and
   `gtag`/`fbq` calls must be untouched by the restyle. Only the template block and a new
   `tone?: 'paper' | 'ink'` prop changed.
7. Check 375 / 768 / 1440 for horizontal scroll and 1 → 2 → 3 column degradation.

## Unrelated issue noticed while diffing

`the-modern-stoic/dist/` is currently **staged in git** (`git status` shows ~100 added files
under `dist/`). This is the same class of problem as the earlier Netlify publish-directory
failure and should not be committed — add `dist/` to `.gitignore` in the template and
`git rm -r --cached dist/` here.
