import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

import { getFallbackArtwork, type Artwork } from '@/config/artwork';
import { getCoverImage } from '@/lib/covers';

export type PostEntry = CollectionEntry<'posts'>;

export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => {
    const dateA = a.data.properties.PublishDate?.start.getTime() ?? 0;
    const dateB = b.data.properties.PublishDate?.start.getTime() ?? 0;
    return dateB - dateA;
  });
}

export function getPostSlug(post: PostEntry): string {
  return post.data.properties.Slug || post.id;
}

export interface PostImage {
  src: ImageMetadata;
  alt: string;
  /**
   * Set only when the post has no cover of its own and is borrowing artwork,
   * so the page can print the museum credit that artwork requires.
   */
  artwork?: Artwork;
}

/**
 * The image that represents a post in cards, on its own page, and in link
 * previews.
 *
 * Prefers the cover downloaded from Notion by `scripts/sync-notion-covers.mjs`;
 * falls back to public-domain artwork so a post without a cover still renders
 * as designed. Always returns something, so callers never branch on undefined.
 */
export function getPostImage(post: PostEntry): PostImage {
  const slug = getPostSlug(post);
  const cover = getCoverImage(slug);

  if (cover) {
    return { src: cover, alt: post.data.properties.Title };
  }

  const artwork = getFallbackArtwork(slug);
  return { src: artwork.src, alt: artwork.alt, artwork };
}
