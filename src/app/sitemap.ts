import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/maskiner`, changeFrequency: "daily", priority: 0.7 },
    {
      url: `${siteUrl}/maskiner/elbil`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: `${siteUrl}/produktion`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${siteUrl}/historik`, changeFrequency: "daily", priority: 0.7 },
  ];
}
