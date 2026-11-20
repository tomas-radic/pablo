import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pablo",
    short_name: "Pablo",
    description: "Keep track of what you ordered at the pub and check it against the bill.",
    start_url: "/",
    display: "standalone",
    background_color: "#15110e",
    theme_color: "#15110e",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
