// Copies MapLibre's web worker into public/maplibre/ so the browser can load it.
// MapLibre 6 starts its worker from a URL next to its own script; the Next.js bundler does not emit
// that file, so we serve it ourselves and point MapLibre at it with setWorkerUrl (see FireMap.tsx).
// Runs before `npm run dev` and `npm run build`. The copies are gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl", "dist");
const target = join(root, "public", "maplibre");

mkdirSync(target, { recursive: true });
// The worker imports the shared chunk by relative path, so both files must sit together.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(source, file), join(target, file));
}
console.log("Copied the MapLibre worker to public/maplibre/");
