# Placeholder SVG (Frontmatter)

Generate **deterministic SVG image placeholders** as `data:image/svg+xml` URIs.

Built for layout and integration work.

---

![Demo](https://raw.githubusercontent.com/withfrontmatter/semantic-placeholder-vscode/main/assets/demo.gif)

---

## What it does

Inserts **simple SVG placeholders** with:
- a neutral gray rectangle
- the exact dimensions written in the center

The result is a **data-uri**, ready to paste into:
- `<img src="">`
- Markdown
- YAML / frontmatter
- HTML / Astro templates

No assets. No files. No configuration.

---

## Commands

### Insert
- **Placeholder SVG: Insert…**  
  Enter dimensions like `1200x600` or `1200 600`

### Insert with ratio
- **Placeholder SVG: Insert with Ratio…**
  - Ratios: `1:1`, `4:3`, `4:5`, `16:9`
  - For `1:1`, enter a single value (square)
  - For other ratios, choose orientation and base dimension

### Presets
- **Hero** → `1440 × 720`
- **Card** → `400 × 300`
- **Avatar** → `128 × 128`

---

## Why SVG placeholders?

SVG placeholders:
- preserve the **real aspect ratio**
- reveal layout and cropping issues early
- avoid managing temporary image assets

This is a **layout tool**, not an image generator.

---

## Security

- Local generation only
- No scripts
- No event handlers
- No external resources

Safe to embed as a data-uri.

---

## License

MIT
