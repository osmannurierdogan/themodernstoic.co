import type { ImageMetadata } from 'astro';

import aPhilosopher from '@/assets/artwork/a-philosopher.jpg';
import headOfABeardedMan from '@/assets/artwork/head-of-a-bearded-man.jpg';
import portraitHeadAntonine from '@/assets/artwork/portrait-head-antonine.jpg';
import romanSarcophagus from '@/assets/artwork/roman-sarcophagus.jpg';
import ruinsInARockyLandscape from '@/assets/artwork/ruins-in-a-rocky-landscape.jpg';
import ruinsOfAnAncientCity from '@/assets/artwork/ruins-of-an-ancient-city.jpg';

export interface Artwork {
  /** Imported asset — gives `<Image>` real dimensions, so no layout shift. */
  src: ImageMetadata;
  /** Describes the picture for screen readers. Never repeats the caption. */
  alt: string;
  title: string;
  /** Empty for anonymous antiquities; the caption falls back to `culture`. */
  artist?: string;
  date: string;
  culture?: string;
  /** Museum, so the caption can credit a collection rather than a bare link. */
  collection: string;
  /** Object page, for readers who want the full catalogue record. */
  sourceUrl: string;
  /** Every artwork here is public domain; kept explicit so it stays that way. */
  license: 'CC0';
}

/**
 * Public-domain artwork used across the site.
 *
 * All six are CC0 from the Cleveland Museum of Art Open Access collection, so
 * they carry no attribution requirement — the captions credit them anyway,
 * because a philosophy site that cites its sources should cite its pictures too.
 *
 * Adding one: download from an open-access collection, drop it in
 * `src/assets/artwork/`, and record its catalogue data here. Do not add
 * anything whose licence you have not checked.
 */
export const artwork = {
  ruinsOfAnAncientCity: {
    src: ruinsOfAnAncientCity,
    alt: 'A ruined classical temple in silhouette above a vast ancient city at dusk, with two small figures on the road below.',
    title: 'Ruins of an Ancient City',
    artist: 'John Martin',
    date: 'c. 1810–20',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1981.13',
    license: 'CC0',
  },
  aPhilosopher: {
    src: aPhilosopher,
    alt: 'Marble bust of a bearded philosopher on a dark stone pedestal, gaze fixed slightly downward.',
    title: 'A Philosopher',
    artist: 'Pierre Puget',
    date: '1662',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1969.121',
    license: 'CC0',
  },
  portraitHeadAntonine: {
    src: portraitHeadAntonine,
    alt: 'Weathered Roman marble head of a bearded man with tightly curled hair, carved in the reign of Marcus Aurelius.',
    title: 'Portrait Head of a Noble or Official',
    date: '175–200 CE',
    culture: 'Roman, Antonine period',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1952.260',
    license: 'CC0',
  },
  headOfABeardedMan: {
    src: headOfABeardedMan,
    alt: 'Roman marble portrait of a bearded man, the nose and cheek worn away by time.',
    title: 'Head of a Bearded Man',
    date: 'c. 125 CE',
    culture: 'Roman',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1924.535',
    license: 'CC0',
  },
  ruinsInARockyLandscape: {
    src: ruinsInARockyLandscape,
    alt: 'Travellers resting beside a round ruined temple in a dark rocky landscape at golden hour.',
    title: 'Ruins in a Rocky Landscape',
    artist: 'Salvator Rosa',
    date: 'c. 1640',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1958.472',
    license: 'CC0',
  },
  romanSarcophagus: {
    src: romanSarcophagus,
    alt: 'Long Roman marble sarcophagus relief crowded with carved figures in high relief.',
    title: 'Sarcophagus',
    date: 'c. 100–125 CE',
    culture: 'Roman',
    collection: 'Cleveland Museum of Art',
    sourceUrl: 'https://clevelandart.org/art/1928.856',
    license: 'CC0',
  },
} as const satisfies Record<string, Artwork>;

export type ArtworkKey = keyof typeof artwork;

/**
 * Artwork used for posts that have no cover image in Notion, so a coverless
 * essay still reads as designed rather than as a gap.
 *
 * The pick is derived from the slug rather than random, so a given essay keeps
 * the same picture across rebuilds — a cover that reshuffles on every deploy
 * looks like a bug to returning readers.
 */
const FALLBACK_KEYS = [
  'portraitHeadAntonine',
  'aPhilosopher',
  'headOfABeardedMan',
  'ruinsInARockyLandscape',
] as const satisfies readonly ArtworkKey[];

export function getFallbackArtwork(slug: string): Artwork {
  let hash = 0;
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return artwork[FALLBACK_KEYS[hash % FALLBACK_KEYS.length]];
}

/** "John Martin, 1810–20" / "Roman, 175–200 CE" — whichever the record supports. */
export function formatArtworkCredit(item: Artwork): string {
  return [item.artist ?? item.culture, item.date].filter(Boolean).join(', ');
}
