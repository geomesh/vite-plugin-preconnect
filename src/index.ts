import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from "vite";
import { loadEnv } from "vite";

export interface PreconnectOptions {
  /**
   * Static origins to preconnect to.
   *
   * @example ["https://fonts.googleapis.com", "https://cdn.example.com"]
   */
  origins?: string[];

  /**
   * Env var names whose values are URLs. Origins are extracted via `new URL(val).origin`.
   * Uses Vite's `loadEnv()` to read `.env` files at build time.
   *
   * @example ["VITE_CONVEX_URL", "VITE_API_HOST"]
   */
  envUrls?: string[];

  /**
   * Also emit `<link rel="dns-prefetch">` alongside each preconnect.
   * Useful as a fallback for older browsers.
   *
   * @default false
   */
  dnsPrefetch?: boolean;
}

/**
 * Vite plugin that injects `<link rel="preconnect">` (and optionally
 * `<link rel="dns-prefetch">`) tags into the HTML `<head>` at build time.
 *
 * Origins can be provided directly or extracted from environment variables.
 */
export function preconnect(options: PreconnectOptions = {}): Plugin {
  const {
    origins: staticOrigins = [],
    envUrls = [],
    dnsPrefetch = false,
  } = options;

  let config: ResolvedConfig;

  return {
    name: "@geomesh/vite-plugin-preconnect",

    configResolved(resolved) {
      config = resolved;
    },

    transformIndexHtml() {
      const collected = new Set<string>(staticOrigins);

      if (envUrls.length > 0) {
        const env = loadEnv(config.mode, config.root, "");
        for (const key of envUrls) {
          const value = env[key];
          if (!value) continue;
          try {
            collected.add(new URL(value).origin);
          } catch {
            // skip invalid URLs
          }
        }
      }

      const tags: HtmlTagDescriptor[] = [];

      for (const href of collected) {
        tags.push({
          tag: "link",
          attrs: { rel: "preconnect", href },
          injectTo: "head-prepend",
        });

        if (dnsPrefetch) {
          tags.push({
            tag: "link",
            attrs: { rel: "dns-prefetch", href },
            injectTo: "head-prepend",
          });
        }
      }

      return tags;
    },
  };
}
