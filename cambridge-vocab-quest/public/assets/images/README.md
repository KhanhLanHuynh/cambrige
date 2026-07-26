# Word illustrations

Place Cambridge-aligned word images here (PNG/SVG/WebP).

## Per-word assets

- Path: `words/{wordId}.webp` (served as `/assets/images/words/{wordId}.webp`)
- Example: `words/starters-armchair.webp` → `/assets/images/words/starters-armchair.webp`
- Size: ~512×512 WebP (contain, transparent padding)
- Shown in the quiz word hero **only after a correct answer**. If missing, the rocket icon remains.

## Fetching open-license images

The script downloads from **Openverse** (primary) and **Wikipedia pageimages** (fallback). Only open / reusable licenses are requested. Attribution is stored on each word as `imageCredit` and in `scripts/.image-attribution.json`. Words with no match are listed in `scripts/.image-missing.json`.

```bash
# All levels (resume-safe)
npm run vocab:images

# One level / small batch / re-fetch
node scripts/generate-word-images.mjs --level=Starters
node scripts/generate-word-images.mjs --limit=20
node scripts/generate-word-images.mjs --force
```

Review attributions before shipping images in production. Abstract words may remain without art; the UI falls back to the rocket.
