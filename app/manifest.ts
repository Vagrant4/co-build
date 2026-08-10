import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpaceOnCall Business Space Rental",
    short_name: "SpaceOnCall",
    description: "Search, discuss, book, and manage short-term business workspaces.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f3",
    theme_color: "#111111",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
  };
}
