# Analytics: GA4 tag never renders when GTM is configured

**Status:** fixed in this repo (2026-09-20) · **Port to:** `create-blogfactory` template
**Files:** `src/components/AnalyticsScripts.astro`, `src/config/brand.config.ts`

## Symptom

Google Analytics reports *"Your Google tag wasn't detected on your website."*
Page source contains the GTM snippet but no `https://www.googletagmanager.com/gtag/js?id=G-…`
script, so Google's detector finds nothing and GA4 receives no traffic.

## Root cause

`AnalyticsScripts.astro` gated the GA4 snippet behind `!gtmId`:

```astro
{ga4Id && !gtmId && (
  <>
    <script is:inline src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}></script>
    …
  </>
)}
```

The intent was to avoid double-counting: if you route GA4 through a GTM container,
you don't also want a hardcoded gtag. But the template ships with **both**
`PUBLIC_GA4_ID` and `PUBLIC_GTM_ID` as first-class env vars, and setting `PUBLIC_GTM_ID`
silently disables GA4 — with no warning, and no guarantee that the GTM container
actually contains a GA4 tag.

On themodernstoic.co that guarantee did not hold. Fetching the published container:

```bash
curl -s "https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX" | grep -oE '"(tags|rules)":\[\]'
# "rules":[]
# "tags":[]
```

The container was published but empty — no GA4 Configuration tag. Combined with the
`!gtmId` gate, nothing measured anything.

## Fix

Drop the `!gtmId` condition so GA4 always loads directly when `PUBLIC_GA4_ID` is set:

```diff
-{ga4Id && !gtmId && (
+{ga4Id && (
```

The GTM block above it is unchanged and still renders independently.

## Template guidance to ship alongside the fix

Double-counting is a real risk, so the template should make the choice explicit rather
than silently resolving it. Document these as the two supported configurations:

| Setup | `PUBLIC_GA4_ID` | `PUBLIC_GTM_ID` | GA4 Configuration tag in GTM |
|---|---|---|---|
| **A — direct gtag (default, recommended)** | set | empty | — |
| **B — GA4 via GTM** | empty | set | required |

Setting both now fires GA4 twice. Options for the template, in order of preference:

1. **README + `.env.example` note** stating A and B are mutually exclusive. Lowest effort,
   matches how the rest of the config behaves.
2. **Build-time warning** in `brand.config.ts` or the component frontmatter when both are
   set, e.g. `console.warn('[analytics] PUBLIC_GA4_ID and PUBLIC_GTM_ID both set — GA4 will
   be counted twice unless the GTM container has no GA4 tag.')`.
3. Keep a gate, but invert the default so the *silent* outcome is "tag fires" rather than
   "tag missing" — a missing tag is invisible until someone checks GA4 weeks later.

## Follow-up: the tags were also the site's biggest performance cost

Loaded in the critical path, Google's tags were ~470KB of transfer and ~490ms of
blocking time on an emulated mid-range phone — worth roughly 25 Lighthouse
performance points on their own.

`AnalyticsScripts.astro` now injects every tag from a deferred loader that runs
on `requestIdleCallback` after the `load` event (with a `setTimeout` fallback for
Safari and a 3s timeout, so the tag always fires). Nothing waits for user
interaction, so Google's tag detection and Tag Assistant still see the tag.

Measured on the homepage, mobile preset:

| Configuration | Performance | LCP | TBT |
|---|---|---|---|
| Tags in the critical path | 65 | 6.2s | 480ms |
| Tags deferred to idle | 91–96 | 2.2s | 160–340ms |

The deferred rows vary by several points between runs, so treat the improvement
as "roughly 25 points", not a precise figure.

### Setting both IDs is still waste

With the container empty, `PUBLIC_GTM_ID` costs 114KB of JavaScript that manages
nothing — GA4 is already arriving through the direct `gtag.js`. Requests on the
homepage, mobile:

| Configuration | Google requests | Transfer |
|---|---|---|
| Both IDs set | `gtm.js` + `gtag/js` + `collect` | 287KB |
| `PUBLIC_GTM_ID` unset | `gtag/js` + `collect` | 172KB |

The `collect` beacon is identical in both, with the same `tid` — the empty
container contributed no measurement at all. Score difference between the two
was inside run-to-run noise; the 114KB is the solid number.

(Before the tags were deferred, traces also showed `gtag/js` fetched a second
time with `&cx=c&gtm=…`, pulled in by the container. That duplicate does not
appear in the deferred build.)

## Deployment notes (apply per site, not just the template)

- `import.meta.env.PUBLIC_*` is inlined at **build time**. Adding `PUBLIC_GA4_ID` to Netlify
  env vars after a deploy does nothing until the site is rebuilt.
- Verify from the published HTML, not locally:
  ```bash
  curl -s https://<domain> | grep -oE 'gtag/js\?id=G-[A-Z0-9]+|GTM-[A-Z0-9]+'
  ```
- Consent Mode is initialized with `analytics_storage: 'denied'`
  (`AnalyticsScripts.astro`), and `CookieConsent.vue` upgrades it to `granted` on accept.
  That is correct and should stay. It does **not** affect Google's tag detection — the
  script loads regardless — but it does mean GA4 reports only cookieless pings for
  visitors who decline, so numbers will read lower than raw server logs.
