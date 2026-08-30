import type { MetadataRoute } from "next";

/**
 * Makes the portal installable from Chrome on Android ("Add to Home Screen"),
 * which is the whole of the "app on my phone" half of docs/phone-app-plan.md.
 *
 * Deliberately no service worker: every page is `force-dynamic` against SQLite,
 * so a cached shell would install fine and then render nothing useful offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tracker",
    short_name: "Tracker",
    description: "Personal tracker: brain challenges, tasks, goals, habits.",
    start_url: "/",
    display: "standalone",
    // --bg from the dark palette in globals.css. The app defaults to dark, but
    // ThemeToggle can still switch to light; a light-mode user gets a dark
    // splash and status bar. Accepted — the manifest is static, and theme is a
    // runtime class, so there is nothing here to key off.
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // The glyph sits inside the 80% safe circle, so the same art survives
      // Android's adaptive-icon masking.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
