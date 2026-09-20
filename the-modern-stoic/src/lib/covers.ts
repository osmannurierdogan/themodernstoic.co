import type { ImageMetadata } from 'astro';

/**
 * Post cover images, downloaded from Notion by `scripts/sync-notion-covers.mjs`
 * before the build and imported here as local assets.
 *
 * Importing them (rather than pointing `<img>` at Notion's S3 URL) is what makes
 * covers survive past the one-hour expiry on Notion's presigned links, and it
 * lets `astro:assets` emit responsive AVIF/WebP with real dimensions attached.
 */
const coverModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/covers/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true },
);

const coversBySlug = new Map<string, ImageMetadata>(
  Object.entries(coverModules).map(([filePath, module]) => [
    // "/src/assets/covers/what-is-stoicism.jpg" -> "what-is-stoicism"
    filePath.split('/').pop()!.replace(/\.[^.]+$/, ''),
    module.default,
  ]),
);

/** The sync script sanitises slugs into filenames; match that here. */
function toSafeName(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^[-.]+/, '');
}

export function getCoverImage(slug: string): ImageMetadata | undefined {
  return coversBySlug.get(toSafeName(slug));
}
