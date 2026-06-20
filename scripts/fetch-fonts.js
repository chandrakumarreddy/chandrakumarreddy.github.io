// Self-host the Google Fonts the site uses, so there's no third-party
// origin at runtime (faster first paint, no FOUT flicker, works offline).
//
// This is NOT part of the per-build pipeline — run it occasionally (when you
// change which fonts/weights the site uses) and COMMIT the result:
//
//   npm run fonts
//
// It fetches the Google Fonts CSS (woff2), downloads every referenced file
// into fonts/, and rewrites the CSS to point at local /fonts/* URLs. The
// build then just serves and preloads them (see .eleventy.js + base.njk).
const fs = require("fs");
const path = require("path");
const https = require("https");

// Keep this in sync with the families/weights the design system uses.
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap";

// A modern UA is required for Google to serve woff2 (older UAs get ttf).
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Subsets to ship at all. Google serves dozens (cyrillic, greek, math, …);
// an English engineering blog only needs Latin. Others are skipped entirely.
const KEEP_SUBSETS = new Set(["latin", "latin-ext"]);

// Which files to <link rel=preload>. Preload is eager and competes with other
// resources, so only the faces that paint above the fold: the Latin body
// weight (400) and bold display weight (700) of the primary family. Everything
// else loads on demand; the metrics-matched fallback hides their swap.
const PRELOAD = (m) =>
  m.subset === "latin" &&
  m.family === "Google Sans Flex" &&
  [400, 700].includes(m.weight);

const FONTS_DIR = path.join(__dirname, "..", "fonts");

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA, ...headers } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return fetch(r.headers.location, headers).then(resolve, reject);
        if (r.statusCode !== 200)
          return reject(new Error(`${url} -> HTTP ${r.statusCode}`));
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

(async () => {
  const css = (await fetch(CSS_URL)).toString("utf8");

  // Google emits, per @font-face, a leading `/* subset */` comment. Split on
  // it so we can tag each block with its subset name.
  const parts = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1); // [subset, block, subset, block, ...]
  const blocks = [];
  for (let i = 0; i < parts.length; i += 2)
    blocks.push({ subset: parts[i].trim(), body: parts[i + 1] });

  // Start clean so dropped weights/subsets don't linger as orphans.
  fs.rmSync(FONTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  const manifest = [];
  const out = [];
  let downloaded = 0;

  for (const { subset, body } of blocks) {
    if (!KEEP_SUBSETS.has(subset)) continue;
    const family = (body.match(/font-family:\s*['"]([^'"]+)['"]/) || [])[1];
    const weight = (body.match(/font-weight:\s*(\d+)/) || [])[1] || "400";
    const src = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!family || !src) continue;

    const file = `${slug(family)}-${weight}-${subset}.woff2`;
    const buf = await fetch(src[1]);
    fs.writeFileSync(path.join(FONTS_DIR, file), buf);
    downloaded++;
    console.log(`  ${file}  (${(buf.length / 1024).toFixed(1)} KB)`);

    // Rewrite the block's src to the local path; keep unicode-range etc.
    const localBody = body
      .replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(/fonts/${file})`)
      .trim();
    out.push(`/* ${subset} */\n${localBody}`);

    manifest.push({ family, weight: Number(weight), subset, file });
  }

  fs.writeFileSync(
    path.join(FONTS_DIR, "fonts.css"),
    out.join("\n\n") + "\n",
    "utf8",
  );
  const preload = manifest.filter(PRELOAD);
  fs.writeFileSync(
    path.join(FONTS_DIR, "manifest.json"),
    JSON.stringify(preload, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `\nSelf-hosted ${downloaded} font file(s) into fonts/.` +
      ` Preload manifest: ${preload.length} file(s).`,
  );
})().catch((e) => {
  console.error("fetch-fonts failed:", e.message);
  process.exit(1);
});
