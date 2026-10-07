# Gameplay

## Setup

The faciliator clicks "New Game" then inputs the number of buildings & typical number of people per building.

When they click start, the buildings get generated with tenants inside.

User can click a "pencil" icon in each building to adjust the number of tenants (the default is what they input at the start.)

One random person from each building should be the "instigator" and colored a special color. Different color for each building.

Buildings are initially placed left-to-right, then top-to-bottom. The layout chooses the row/column count that fits the largest comfortable buildings across the canvas, keeps gutters between them, and centers incomplete rows for a less rigid arrangement. Sparse games grow only to a modest size cap so their buildings retain generous gutters; dense games shrink to remain readable.

## Gameplay

There are rounds. Start at round 1.

Each round has phases:

- Phase 1: Landlord
- Phase 2: Tenant
- Phase 3: The Market.

Visually show which round and stage we are on. User has a font arrow to go forward (and back, in case of mistake.) The arrow keys also work.

As the game goes on, it's possible for individual people:

1. To join the tenant union. User can click on a person and see a menu of actions. One is "Join union." If this is clicked, they turn the same color as their building instigator.

2. To get evicted. If a person is evicted, they get a light cross over there avatar.

## The Board

Along the top header we see current round, current phase, and some action buttons (like New Game.)

The main board is split into two parts: a tally section on the left (20%) and a building canvas on the right (80%.)

### Building cavnas

In the building canvas, we see buildings laid out spatially. The optional office building in the corner, labeled "Landlord, Inc.", is hidden by default; the "Show landlord" control starts disabled and can be turned on to show it.

I want it to be possible to drag and drop buildings to rearrange them. Not all the time. There should be a toggle "Edit position" and when it's on THEN they can rearrange.

### Tally

This is a table. The rows are rounds. For each round it shows:

- Landlord spending: $
- In union (change): # (e.g. +2)
- Evictions (change): # (e.g. +2)
