# tenant-game

This is a visual aid for a tenant union organizing game. It is designed for the facilitator to use during workshops and meetings, with minimal, streamlined controls suitable for projector or screen presentation.

It lives entirely in the browser and browser storage (`localStorage`). No backend, no database.

## Visual Aesthetic & Technology

- **Framework**: Vue 3 + TypeScript + Vite + Pinia
- **Styling & Visual Engine**: [Rough.js](https://roughjs.com/) for hand-drawn, tactile zine/organizing aesthetics (sketched building facades, windows, streetscapes, and cartoon silhouettes)
- **Zero-Backend Persistence**: State automatically persists across page refreshes via `localStorage`

## Development

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Typecheck and production build
bun run build

# Preview build
bun run preview
```
