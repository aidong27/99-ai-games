# Social Assets

These files are brand/share assets for 99 AI Games. They are not gameplay
screenshots and do not represent additional benchmark Entries.

- `og-cover.svg`: source artwork for the Open Graph cover.
- `og-cover.png`: raster Open Graph image used by social platforms.
- `social-card.svg`: wide reusable social card.
- `social-card-square.svg`: square reusable social card.
- `games/<slug>.svg`: generated editable source for each per-game promo card.
- `games/<slug>.png`: 1200 x 630 raster card used by Open Graph and Twitter metadata.
- `games/raster-manifest.json`: SVG source hashes used by CI to detect stale PNG renders.
- `raster-manifest.json`: brand SVG source hashes used to detect stale raster previews.
- `entries/<entry-id>.svg`: generated Finalized Entry card using real evidence.
- `entries/<entry-id>.png`: crawler-compatible raster of that Entry card.
- `entries/raster-manifest.json`: Entry SVG source hashes used to detect stale rasters.

The project Open Graph card derives its Finalized Raw count from
`data/benchmark.json`; it is not maintained by hand. The Legacy collection
remains separately identified as 11 playable experiments.
The card style follows the benchmark's restrained observatory presentation.
Game-specific cards are promotional assets, not gameplay evidence or verified screenshots.
Vertical cover posters are stored separately under `assets/posters/games/` and follow the same evidence boundary.
