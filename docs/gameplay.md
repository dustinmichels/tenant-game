# Gameplay

## Setup

The faciliator clicks "New Game" then inputs the number of buildings & typical number of people per building.

When they click start, the buildings get generated with tenants inside.

User can click a "gear" icon in each building to adjust the number of tenants (the default is what they input at the start.)

One random person from each building should be the "instigator" and colored a special color. Different color for each building.

The buildings are initially scattered in a random pattern across the canvas.

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

In the building canvas, we see buildings laid out spatially. It should also show an office building in the corner, with on person in it, labeled as "Landlord, Inc."

I want it to be possible to drag and drop buildings to rearrange them. Not all the time. There should be a toggle "Edit position" and when it's on THEN they can rearrange.

### Tally

This is a table. The rows are rounds. For each round it shows:

- Landlord spending: $
- Total organized: #
- Evictions: #
- Buildings organized: #
