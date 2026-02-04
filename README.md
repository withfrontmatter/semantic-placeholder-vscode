# Placeholder SVG (Frontmatter)

Generate **deterministic SVG image placeholders** as `data:image/svg+xml` URIs.

Built for layout and integration work.

---

## What this extension does

This extension inserts **simple SVG placeholders** with:
- a neutral gray rectangle
- the exact dimensions written in the center

The output is a **data-uri**, ready to paste directly into:
- `<img src="">`
- Markdown
- YAML / frontmatter
- HTML / Astro / templates

No assets. No files. No configuration.

---

## Commands

### Parametric
- **Placeholder SVG: Insert…**  
  Enter dimensions like `1200x600` or `1200 600`

- **Placeholder SVG: Insert with Ratio…**  
  Choose a ratio (`1:1`, `4:3`, `4:5`, `16:9`).

  - For **1:1**, enter a single value (square).
  - For other ratios:
    - choose orientation (landscape / portrait)
    - enter width *or* height — the other value is calculated automatically.

### Presets
- **Hero** → `1440 × 720`
- **Card** → `400 × 300`
- **Avatar** → `128 × 128`

---

## Features

- Deterministic output (no randomness)
- Remembers last used dimensions and ratio
- Local generation only
- No network access
- No configuration
- Replaces selection or inserts at cursor

---

## Why SVG placeholders?

SVG placeholders:
- preserve the **real aspect ratio**
- reveal layout and cropping issues early
- avoid managing temporary image assets

This is a **layout tool**, not an image generator.

---

## Security note

This extension generates **static SVG placeholders only**.

- No scripts
- No event handlers
- No external resources
- No user-provided SVG
- Only `<svg>`, `<rect>`, and `<text>` elements

Safe to embed as a data-uri.

---

## License

MIT
