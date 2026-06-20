const { feedPlugin } = require("@11ty/eleventy-plugin-rss");

// ── Site config ────────────────────────────────────────────────
// CHANGE THIS to your site root. Use a domain root (custom domain or a
// <user>.github.io repo), NOT a project subpath like /orbitshift-blog —
// subpaths break absolute image URLs in the feed, and importers then drop
// every image. If you must use a subpath, set pathPrefix below + PATH_PREFIX.
const SITE_URL = (
  process.env.SITE_URL || "https://chandrakumarreddy.github.io"
).replace(/\/$/, "");
const SITE_TITLE = "Chandra Kumar Reddy";
const SITE_DESC =
  "Engineering notes on RAG, Postgres, async Python, and building OrbitShift.";

module.exports = function (eleventyConfig) {
  // Don't build repo docs as pages.
  eleventyConfig.ignores.add("README.md");

  // Human-readable date filter (Nunjucks has none built in).
  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  );

  // Estimate reading time from rendered HTML (~200 wpm).
  eleventyConfig.addFilter("readingTime", (html) => {
    const words = String(html || "")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  // Categories for the pill: explicit `categories` frontmatter, else tags minus "posts".
  eleventyConfig.addFilter("pillCategories", (data) => {
    if (data.categories && data.categories.length) return data.categories;
    return (data.tags || []).filter((t) => t !== "posts");
  });

  // Serialize all posts to JSON for the client-side search/filter/pagination UI.
  eleventyConfig.addFilter("postsJson", (posts) =>
    JSON.stringify(
      posts.map((p) => {
        const words = String(p.templateContent || "")
          .replace(/<[^>]+>/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
        const cats =
          p.data.categories && p.data.categories.length
            ? p.data.categories
            : (p.data.tags || []).filter((t) => t !== "posts");
        return {
          title: p.data.title,
          url: p.url,
          description: p.data.description || "",
          date: new Date(p.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            timeZone: "UTC",
          }),
          minutes: Math.max(1, Math.round(words / 200)),
          categories: cats,
          thumb: "/assets/" + p.fileSlug + "/hero.png",
        };
      }),
    ),
  );

  // Copy generated assets to the site root: blog/assets/** -> /assets/**
  eleventyConfig.addPassthroughCopy({ "blog/assets": "assets" });

  // Expose site metadata to templates.
  eleventyConfig.addGlobalData("site", {
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESC,
  });

  // Full-content RSS/Atom feed — this is the integration surface
  // that Substack's importer and IFTTT->Medium both pull from.
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "posts", limit: 0 }, // 0 = all posts
    metadata: {
      language: "en",
      title: SITE_TITLE,
      subtitle: SITE_DESC,
      base: SITE_URL + "/",
      author: { name: "OrbitShift Engineering" },
    },
  });

  // Two rewrites on markdown image refs, BEFORE render:
  //   1. assets/... -> /assets/...  (root-absolute; avoids the per-post
  //      subdirectory doubling the path)
  //   2. .svg -> .png  (importers can't ingest SVG)
  // The feed plugin then turns /assets/... into full https URLs via base.
  eleventyConfig.addPreprocessor("imgRefs", "md", (data, content) =>
    content
      .replace(/(\]\()(?:\.\/)?assets\//gi, "$1/assets/")
      .replace(/(\]\([^)]+?)\.svg(\))/gi, "$1.png$2"),
  );

  // Posts collection, newest first.
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("blog/*.md").sort((a, b) => b.date - a.date),
  );

  return {
    dir: { input: ".", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
