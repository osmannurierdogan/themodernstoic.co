/**
 * Downloads each published post's Notion cover image into `src/assets/covers/`
 * so Astro can process it as a local asset.
 *
 * Why this exists: Notion serves uploaded files from S3 behind a presigned URL
 * that expires one hour after it is issued. Rendering that URL straight into
 * the page means every cover image and every Open Graph preview 404s an hour
 * after the deploy. Pulling the bytes down at build time makes covers permanent
 * and lets `astro:assets` emit responsive AVIF/WebP for them.
 *
 * Runs as `prebuild`, before `astro build` resolves the asset glob.
 *
 * Failure is non-fatal: a Notion outage leaves the previously downloaded covers
 * in place rather than breaking the deploy.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from 'vite';

const COVERS_DIR = path.resolve('src/assets/covers');
const NOTION_VERSION = '2022-06-28';
const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

const { NOTION_API_KEY, NOTION_BLOG_POSTS_DATABASE_ID } = loadEnv(
  process.env.NODE_ENV ?? 'production',
  process.cwd(),
  '',
);

function log(message) {
  process.stdout.write(`[sync-notion-covers] ${message}\n`);
}

/** Notion's `rich_text` and `title` properties are arrays of spans. */
function readPlainText(property) {
  if (!property) return '';
  const spans = property.rich_text ?? property.title ?? [];
  return spans.map((span) => span.plain_text ?? '').join('').trim();
}

function readFileUrl(property) {
  const file = property?.files?.[0];
  if (!file) return undefined;
  return file.file?.url ?? file.external?.url;
}

/** Keeps a Notion slug from escaping `src/assets/covers/`. */
function toSafeName(slug) {
  return slug.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^[-.]+/, '');
}

async function queryPublishedPosts() {
  const posts = [];
  let cursor;

  do {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_BLOG_POSTS_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: 'Status', select: { equals: 'Published' } },
          start_cursor: cursor,
          page_size: 100,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Notion query failed: ${response.status} ${await response.text()}`,
      );
    }

    const page = await response.json();
    posts.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  return posts;
}

/**
 * Writes `bytes` only when they differ from what is already on disk, so an
 * unchanged cover does not show up as a modified file in every build.
 */
async function writeIfChanged(filePath, bytes) {
  const existing = await readFile(filePath).catch(() => undefined);
  if (existing && createHash('sha256').update(existing).digest('hex') ===
      createHash('sha256').update(bytes).digest('hex')) {
    return false;
  }
  await writeFile(filePath, bytes);
  return true;
}

async function main() {
  if (!NOTION_API_KEY || !NOTION_BLOG_POSTS_DATABASE_ID) {
    log('NOTION_API_KEY / NOTION_BLOG_POSTS_DATABASE_ID not set — skipping.');
    return;
  }

  await mkdir(COVERS_DIR, { recursive: true });

  const posts = await queryPublishedPosts();
  log(`${posts.length} published post(s) found.`);

  const written = new Set();

  for (const post of posts) {
    const slug = readPlainText(post.properties.Slug) || post.id;
    const sourceUrl = readFileUrl(post.properties.CoverImage);

    if (!sourceUrl) {
      log(`"${slug}" has no CoverImage — the site falls back to artwork.`);
      continue;
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      log(`"${slug}" cover download failed (${response.status}) — keeping any existing file.`);
      continue;
    }

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0];
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
    if (!extension) {
      log(`"${slug}" cover has unsupported type "${contentType}" — skipped.`);
      continue;
    }

    const fileName = `${toSafeName(slug)}${extension}`;
    const bytes = Buffer.from(await response.arrayBuffer());
    const changed = await writeIfChanged(path.join(COVERS_DIR, fileName), bytes);
    written.add(fileName);

    log(`${changed ? 'updated' : 'unchanged'} ${fileName} (${Math.round(bytes.length / 1024)} KB)`);
  }

  // Covers for posts that were unpublished or renamed would otherwise linger
  // in the bundle forever.
  const onDisk = await readdir(COVERS_DIR).catch(() => []);
  for (const fileName of onDisk) {
    if (fileName.startsWith('.') || written.has(fileName)) continue;
    await unlink(path.join(COVERS_DIR, fileName));
    log(`removed stale ${fileName}`);
  }
}

main().catch((error) => {
  // A build that ships slightly stale covers beats a build that does not ship.
  log(`failed: ${error instanceof Error ? error.message : String(error)}`);
  log('continuing with the covers already on disk.');
});
