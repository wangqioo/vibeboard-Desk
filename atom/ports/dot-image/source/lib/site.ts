/** Canonical origin. Single source of truth for metadata, sitemap, and robots. */
export const siteUrl = "https://blode.co/fx";

export const siteName = "FX";

/**
 * Product first, then a colon, under 60 characters. Not a pipe, not a dash.
 *
 * "Blue noise" leads because that is the term the impressions arrive on:
 * blue-noise.blode.co redirects here, and its Search Console queries were
 * landing on a title that never said the words.
 */
export const siteTitle =
  "FX: blue noise dither, ASCII and LED effects for images";

/**
 * og:site_name is the person, not the product, on every blode.co path. The 33
 * zones are one site; the product name is already in og:title, so this is the
 * only slot in the card that can say who made the thing. Rule 9.
 */
export const ogSiteName = "Matthew Blode";

export const siteDescription =
  "Turn any image or video into blue noise dithering, ASCII art, or an LED dot matrix. Free and fully client-side: nothing ever leaves your browser.";

// Public client-side token, safe to ship. Hardcoded so every zone app shares
// one project without 30 separate Vercel env vars.
export const posthogKey = "phc_yYatHXysbRxjTyfmyCKSUyMSQpgepJPuxegz2HtpfX35";
// Set per Vercel project to our own reverse proxy, so ad blockers and tracker
// lists that block *.posthog.com do not drop analytics. Unset falls back to
// posthog-js's own default ingestion host.
export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

/**
 * Stable JSON-LD node ids, referenced by @id rather than duplicated inline.
 *
 * The Person, Organization and WebSite ids belong to blode.co and are only ever
 * referenced here, never redefined. blode.co/fx is a path on blode.co behind a
 * rewrite, not a site of its own: a `blode.co/fx/#person` publishes a second
 * Matthew Blode on the same domain and splits the entity. Contract:
 * blode-co/apps/web/.claude/knowledge/zone-conventions.md
 */
const host = "https://blode.co";

export const personId = `${host}/#person`;
export const organizationId = `${host}/#organization`;
export const websiteId = `${host}/#website`;

// Zone-local nodes keep the zone in the id.
export const webPageId = `${siteUrl}/#webpage`;
export const breadcrumbId = `${siteUrl}/#breadcrumb`;
