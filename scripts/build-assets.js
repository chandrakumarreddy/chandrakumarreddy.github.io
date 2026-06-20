// Rasterizes every SVG under blog/assets/** to a same-named .png at 2x width.
// Browsers handle SVG fine, but Medium's and Substack's importers fetch and
// embed raster images — they choke on SVG. We keep the SVG as source of truth
// and generate PNGs as a build artifact.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSETS_DIR = path.join(__dirname, "..", "blog", "assets");

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) yield full;
  }
}

(async () => {
  let count = 0;
  for (const svgPath of walk(ASSETS_DIR)) {
    const pngPath = svgPath.replace(/\.svg$/i, ".png");
    // Render at 2x density so the PNG stays crisp on retina / when Substack scales it.
    await sharp(svgPath, { density: 200 })
      .resize({ width: 2400, withoutEnlargement: true }) // cap; hero is 1200 logical -> 2400 px
      .png()
      .toFile(pngPath);
    count++;
    console.log(`  rasterized ${path.relative(process.cwd(), svgPath)} -> ${path.basename(pngPath)}`);
  }
  console.log(`SVG->PNG: ${count} file(s) converted.`);
})().catch((e) => { console.error(e); process.exit(1); });
