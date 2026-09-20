# Site imagery and the image pipeline

**Status:** implemented in this repo (2026-09-20) · **Port to:** `create-blogfactory` template

Two separate things landed together, because they turned out to be the same
problem: the site had no imagery of its own, and the imagery it did have —
post covers from Notion — was broken in production.

---

## 1. Post covers were expiring an hour after every deploy

`getPostCoverUrl()` returned Notion's file URL straight from `fileToUrl()`. Notion
serves uploaded files from S3 behind a presigned link carrying
`X-Amz-Expires=3600`. So every cover image and every Open Graph preview 404'd one
hour after the build. Confirmed against production before the fix:

```bash
curl -s https://themodernstoic.co | grep -oE 'src="https://prod-files-secure[^"]+' | head -1
curl -o /dev/null -w '%{http_code}' "<that url>"   # 403
```

### Fix

`scripts/sync-notion-covers.mjs` runs before `astro build` (chained in the `build`
script — **not** as a `prebuild` hook, because pnpm does not run pre/post scripts
by default). It queries the posts database, downloads each cover into
`src/assets/covers/<slug>.<ext>`, and deletes files for posts that were
unpublished or renamed.

From there the covers are ordinary local assets: `src/lib/covers.ts` picks them
up with `import.meta.glob`, so `astro:assets` gives them real dimensions,
responsive `srcset`, and modern formats. The expiry problem disappears because
Notion's URL is never rendered into the page at all.

Notes for the port:

- `src/assets/covers/` is **gitignored**. It is regenerated every build, and a
  committed 1MB PNG per post would bloat history.
- The script never fails the build. A Notion outage leaves whatever is on disk;
  with nothing on disk, posts fall back to artwork (below), so the site still
  renders as designed.
- It needs `NOTION_API_KEY` and `NOTION_BLOG_POSTS_DATABASE_ID`, which the
  content collections already require. With neither set it skips silently, so a
  fresh scaffold still builds.

---

## 2. Public-domain artwork

Six CC0 works from the **Cleveland Museum of Art Open Access** collection live in
`src/assets/artwork/`, catalogued in `src/config/artwork.ts` (title, artist,
date, collection, source URL, licence, and alt text).

Why this source: the Cleveland API needs no key, exposes a `cc0=1` filter, and
its Greek and Roman holdings are genuinely on-topic for Stoicism rather than
generic stock. The Met's Open Access API covers similar ground but rate-limited
aggressively during this work.

```bash
curl "https://openaccess-api.clevelandart.org/api/artworks/?q=roman+portrait+bust&cc0=1&has_image=1&limit=30"
```

Placement: homepage hero, blog archive header, newsletter page, 404, non-policy
site pages, and as the cover fallback for posts that have none. Policy pages
(`privacy-policy`, `cookie-policy`, …) stay deliberately plain — see
`PLAIN_PAGE_SLUGS` in `src/pages/[slug].astro`.

CC0 requires no attribution. `Artwork.astro` prints a credit line anyway, linking
the museum's catalogue record — a site that cites its sources should cite its
pictures too. Sources were downsized to 2000px on the long edge (2.9MB total for
all six).

Adding artwork: check the licence, drop the file in `src/assets/artwork/`, record
its catalogue data in `artwork.ts`. Do not add anything whose licence you have
not verified.

---

## 3. Lighthouse

Scores after the work (Lighthouse 12, local build served with brotli and a
stand-in for Netlify's Image CDN):

| Page | Mobile | Desktop | A11y | Best practices | SEO |
|---|---|---|---|---|---|
| Home | 96 | 100 | 100 | 100 | 100 |
| Essay | 94 | 100 | 100 | 100 | 100 |
| Newsletter | 99 | 97 | 100 | 100 | 100 |
| About | 92 | 100 | 100 | 100 | 100 |

CLS is 0 everywhere. What moved the numbers, roughly in order:

**Defer the analytics tags.** Worth ~25 mobile points on its own — see
[analytics-ga4-gtm-fix.md](./analytics-ga4-gtm-fix.md).

**Use `widths`, not `densities`.** A `srcset` of `x` descriptors makes the
browser ignore `sizes` entirely, so a 390px-wide phone was downloading the 2400px
desktop hero. Switching to `w` descriptors cut hero LCP from 6.2s to 2.2s. This
is the single easiest mistake to reintroduce.

**Crop on the server, not with CSS.** `object-cover` inside an `aspect-[21/9]`
box still downloads the full height of the source. Passing `width`/`height`/`fit`
to `<Image>` halved the hero (90KB → 50KB) and trims every square Notion cover
shown in a 3:2 card.

**Subset the fonts.** `@fontsource-variable/fraunces` ships a 118KB latin file
covering four axes; the site only varies weight, and `fraunces/wght.css` is 36KB.
Inter and Source Serif moved to their `latin-*` entry points. The two faces that
render above the fold are preloaded from `BaseLayout.astro`.

**Fix the markup details.** The bronze `--accent-soft` at 12px on the paper
background is 2.83:1 — it is for rules and dividers, never text, exactly as
`brand.config.ts` says. A `<div>` inside `<dl>` may wrap only `<dt>`/`<dd>`; the
numeral span on the newsletter page made the group invalid.

Also fixed along the way: `defaultOgImage` pointed at `/og-image.png` and
`theme.logoUrl` at `/logo.svg`, neither of which existed. The 2000px logo was
being served at 36px tall on every page; `Logo.astro` now renders it through
`<Image>`.

### Measuring this locally

`astro preview` does not work with the Netlify adapter, and `<Image>` emits
`/.netlify/images?...` URLs that only resolve on Netlify — so a naive local run
measures broken images and uncompressed bytes. Either run Lighthouse against a
Netlify deploy preview, or serve `dist/` behind a shim that answers
`/.netlify/images` with sharp and compresses text responses. Without the
compression the mobile score reads ~6 points low.

### Known remaining items

- The Vue islands (`CookieConsent`, `NewsletterForm`) are what is left of mobile
  TBT. Converting the cookie banner to vanilla JS would drop the Vue runtime from
  pages that have no form.
- `@astro-notion/loader` warns that its schema is defined as a function, which a
  future major version will stop supporting.
