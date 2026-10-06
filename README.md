# tenant-game

This is a visual aid for a tenant union organizing game. It is designed for the facilitator to use during workshops and meetings, with minimal, streamlined controls suitable for projector or screen presentation.

It lives entirely in the browser and browser storage (`localStorage`). No backend, no database.

## Visual Aesthetic & Technology

- **Framework**: Vue 3 + TypeScript + Vite + Pinia
- **Styling & Visual Engine**: [Rough.js](https://roughjs.com/) for hand-drawn, tactile zine/organizing aesthetics (sketched building facades, windows, streetscapes, and cartoon silhouettes)
- **Zero-Backend Persistence**: State automatically persists across page refreshes via `localStorage`

## Game Flow

### 1. Setup

When starting or hitting **New Game**, the facilitator is presented with two setup questions:

1. _"How many buildings are there?"_ `<Number box>`
2. _"Typically, how many people per building?"_ `<Number box>`

### 2. Neighborhood Visualization

When the facilitator submits:

- The game renders $X$ buildings evenly spaced along a hand-drawn neighborhood street with sidewalk curb, pavement joints, and asphalt stripes.
- Each building features architectural details: rooftop parapets, water towers, entrance stoops, and apartment windows.
- Inside each window, residents are drawn as hand-drawn grey cartoon silhouettes (various stances, waving neighbors, organizers with clipboards/flyers, beanies, and hair buns).

### 3. Facilitator HUD

- Sticky top bar with key metrics: building count, people per building, and total neighborhood tenants.
- Streamlined actions:
  - **Fullscreen**: Expands view for workshop projectors or shared screens.
  - **Edit**: Adjust counts without wiping the neighborhood.
  - **New Game**: Reset state and return to setup.

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
