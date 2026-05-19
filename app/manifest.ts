import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Apex",
    short_name: "My Apex",
    description: "Your peak performance, decoded.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F4F1",
    theme_color: "#534AB7",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    categories: ["health", "fitness", "sports"],
  };
}
