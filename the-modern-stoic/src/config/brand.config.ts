export interface BrandConfig {
  brandName: string;
  logo: string;
  tagline: string;
  domain: string;
  storeUrl: string;
  language: "en" | "tr";

  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      /** Cards and raised surfaces — sits lighter than `background`. */
      surface: string;
      /** Quiet section bands (footer, callouts). */
      panel: string;
      /** Inverted band background for high-contrast moments. */
      ink: string;
      border: string;
      borderStrong: string;
      /** Meta text, excerpts. Must clear 4.5:1 on `surface`. */
      mutedText: string;
      /** Decorative bronze — rules and dividers only, never text. */
      accentSoft: string;
    };
    fonts: {
      heading: string;
      body: string;
      /** Long-form article body. */
      serifBody: string;
    };
    logoUrl: string;
    faviconUrl: string;
  };

  analytics: {
    ga4Id: string;
    metaPixelId: string;
    metaConversionApiToken?: string;
    gtmId: string;
  };

  notion: {
    blogPostsDatabaseId: string;
    sitePagesDatabaseId: string;
    apiKeyEnvVar: string;
  };

  newsletter: {
    beehiivPublicationId: string;
    embedFormId: string;
  };

  social: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  seo: {
    defaultOgImage: string;
    twitterHandle?: string;
  };
}

/**
 * Single source of truth for brand-specific values. To spin up another
 * brand, run `npx create-blogfactory` again, or edit these values directly.
 */
export const brandConfig: BrandConfig = {
  brandName: "The Modern Stoic",
  logo: "/logo.png",
  tagline: "Ancient Wisdom for Modern Era",
  domain: "themodernstoic.co",
  storeUrl: "https://store.themodernstoic.co",
  language: "en",

  theme: {
    colors: {
      primary: "#1A1815",
      secondary: "#6B6558",
      accent: "#866438",
      background: "#F7F5EF",
      text: "#1A1815",
      surface: "#FFFDF8",
      panel: "#EFEBE0",
      ink: "#1F1D19",
      border: "#E0DACC",
      borderStrong: "#C9C0AC",
      mutedText: "#6B6558",
      accentSoft: "#B08D57"
    },
    fonts: {
      heading: "Fraunces Variable",
      body: "Inter",
      serifBody: "Source Serif 4"
    },
    logoUrl: "/logo.png",
    faviconUrl: "/favicon.svg"
  },

  analytics: {
    ga4Id: import.meta.env.PUBLIC_GA4_ID ?? "",
    metaPixelId: import.meta.env.PUBLIC_META_PIXEL_ID ?? "",
    metaConversionApiToken: import.meta.env.META_CONVERSION_API_TOKEN,
    gtmId: import.meta.env.PUBLIC_GTM_ID ?? ""
  },

  notion: {
    blogPostsDatabaseId: import.meta.env.NOTION_BLOG_POSTS_DATABASE_ID ?? "",
    sitePagesDatabaseId: import.meta.env.NOTION_SITE_PAGES_DATABASE_ID ?? "",
    apiKeyEnvVar: "NOTION_API_KEY"
  },

  newsletter: {
    beehiivPublicationId: import.meta.env.PUBLIC_BEEHIIV_PUBLICATION_ID ?? "",
    embedFormId: import.meta.env.PUBLIC_BEEHIIV_EMBED_FORM_ID ?? ""
  },

  social: {},

  seo: {
    defaultOgImage: "/og-image.jpg"
  }
};

