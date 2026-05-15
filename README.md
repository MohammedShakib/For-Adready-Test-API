# AdReady API Test Client

React + TailwindCSS client for:
- `POST /api/external/analyze`
- `POST /api/external/generate`

## Push Split

This repo is being pushed in 3 parts:
1. Part 1: repo foundation and push tracking
2. Part 2: sign-in / auth gate and connection panel
3. Part 3: analyze / generate flow and final polish

Current push: Part 3 only on the `test` branch.

Follows `connectapi-test (1).txt` with combined flow:
1. Analyze image
2. Fill generate fields from analyze result
3. Generate final image

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set in `.env`:
- `VITE_API_BASE_URL`
- `VITE_PROJECT_API_KEY`

## Implemented Contract Rules

- Auth header: `x-project-api-key`
- Analyze rule: `productImage` OR `referenceImage` required
- Generate rule: `productImage` required + `prompt` OR `referenceImage` OR builder fields
- Generate pipeline is server selected (no generate `pipelineName` field in UI)
- Analyze `provider` enum validation: `gemini | openai`
- Generate `aspectRatio` enum validation: `1:1 | 4:5 | 16:9`

## Easy Mode Features from TXT

- `Fill From Analyze` supports:
  - stable top-level analyze keys
  - nested alias keys
  - `suggestedGeneratePayload` (if returned)
- Structured API errors are shown from shape:
  - `{ code, message, field, details }`
- `schemaVersion` is shown when returned in analyze/generate response

## Input Limits Enforced

- Max text lengths:
  - `productName(120)`
  - `mainIngredient(120)`
  - `visualMood(180)`
  - `dynamicElements(240)`
  - `colorPalette(160)`
  - `backgroundStyle(180)`
  - `brandName(120)`
  - `ctaText(80)`
  - `lightingFocus(80)`
  - `extraNotes(500)`
  - `prompt(1200)`

- Image upload validation:
  - MIME: `image/png`, `image/jpeg`, `image/webp`
  - max file size: `10MB`
  - max resolution: `4096x4096`

## Notes

- JSON response is shown as-is.
- If `imageUrl` exists in generate response, image preview is shown.
