# CLAUDE.md — Delve

## Project Overview

**Delve** is a browser-based, tile-based 3D dungeon crawler with an open overworld. Inspired by Dungeon Master, Eye of the Beholder, Legend of Grimrock, and Might & Magic. Real-time combat with cooldowns, procedural dungeon generation, mana-based spellcasting, party of 4, atmospheric 3D lighting. Playable on iPad/iPhone.

The game opens with a tutorial dungeon, then releases the player into an open world with towns, dungeons, and a campaign arc.

## Tech Stack

- **Engine**: Three.js (WebGL)
- **Language**: JavaScript (ES modules)
- **Build**: Vite + React
- **Storage**: localStorage for save/load (JSON serialization)
- **Target**: Modern browsers, iOS Safari (landscape orientation)

## Quick Start

```bash
npm install
npm run dev
```

## Source Layout

```
src/
  main.jsx        — React entry point
  App.jsx         — Main game component (Three.js scene, movement, input, UI)
  constants.js    — Grid/movement constants, direction vectors
  cells.js        — Cell and item factory functions for dungeon authoring
  dungeon.js      — The dungeon map data (hand-built 16x16 grid)
  grid.js         — Grid utilities: cell access, door checks, room tagging, fog-of-war reveal
  textures.js     — Procedural textures (brick, rough rock, floor) and vault geometry
  items.js        — Item renderer: creates Three.js meshes for torches, runes, doors, etc.
```

## Current Phase

**Phase 1 — Walk the Dungeon.** No combat, no enemies. Atmosphere and exploration only. This phase is substantially complete. The working prototype has:

- 16×16 hand-built dungeon with multiple rooms partitioned by doors
- Smooth grid-based movement with keyboard (WASD/QE) and touch d-pad
- Flickering torchlight with shadows, wall sconces, glowing runes
- Two wall styles: brick and rough rock
- Variable ceiling heights and vaulted (arched) ceilings
- Pits with fall-to-death
- Interactive doors (click/tap to open/close, block movement when closed)
- Room-based minimap fog-of-war (flood fill with doors as boundaries)
- Item system: torches, runes, buttons, push plates, banners, chains, skulls, doors

## Core Design Principles

1. Get to "walking through a scary dungeon with a torch" as fast as possible. Everything else is iteration.
2. The party is robust — battles are deliberate and tactical, not fast twitchy affairs. Characters can take hits.
3. The grid is the universal spatial primitive. Dungeons, overworld, interiors — all grid-based. The renderer adapts to context (ceiling vs. sky, torchlight vs. sunlight).
4. Mana, not memorization. Spells cost mana, regenerate slowly. No Vancian casting, no prayer slots.

-----

## Codebase Concepts

### Cell Data Model

Each cell in the dungeon grid has: `type` (floor/wall/pit/ramp), `floorHeight`, `ceilingHeight`, `wallStyle` (brick/rough), `ceilingStyle` (flat/vaulted), and an `items` array. Cells are created with factory functions in `cells.js`:

- `F()` — floor, `W()` — wall, `RW()` — rough wall, `PIT()` — pit, `RAMP()` — height transition
- Items: `torch("E")`, `door("N")`, `rune("W")`, `button("S")`, `pushplate()`, `banner("N")`, `chain()`, `skull("W")`

### Item System

Items are placed in cell `items` arrays with factories specifying wall attachment and height. The renderer (`items.js`) creates Three.js geometry for each. Doors are the first interactive/stateful item — they track open/closed state, block movement, and support lock types (key, pick, magic, remote) for future use.

### Room-Based Fog-of-War

Rooms are tagged via flood fill at init (`grid.js`). Doors act as boundaries between rooms. Entering a room reveals all cells in it plus surrounding walls on the minimap. Opening a door reveals the room beyond.

### Height System

2.5D: one floor height per XY position, no overlapping floors. Movement between cells with different heights lerps the camera smoothly. Ramp cells tilt the floor plane. The traversal threshold is a tunable constant.

### Key Module Boundaries

- **Grid** (`grid.js`): Pure data and spatial queries. No rendering logic.
- **Renderer** (`App.jsx` scene setup): Reads grid data, builds Three.js scene. Knows nothing about combat or game rules.
- **Textures** (`textures.js`): Procedural textures are placeholders. Real textures will be uploaded later.
- **Items** (`items.js`): Creates Three.js meshes for dungeon items. Extensible registry pattern.
- **Constants** (`constants.js`): Shared values consumed by all modules.

-----

## World and Campaign

### Setting

Original fantasy world (no licensed IP). Tone inspired by Forgotten Realms — high fantasy with dark edges. Detailed lore is deferred; the world reveals itself through play, item descriptions, and NPC dialogue.

### Campaign Structure

**Act 1 — The Sealed Crypt (tutorial dungeon).** Party awakens in a sealed underground crypt. 3–4 floors teach movement, combat, abilities, and the bindpoint system. Ends with a mini-boss guarding the exit to the surface. The player emerges into daylight.

**Act 2 — The Open World.** A grid-based overworld with 4–6 regions, each containing: one town (shops, NPCs, healer/bindpoint, quests), 2–3 dungeons (procedurally generated interiors, hand-placed entrances), outdoor encounters and set-piece battles, and a regional boss dungeon. Regions are thematically distinct: undead marshes, goblin highlands, elemental wastes, ancient forests, volcanic hellscape, etc. The player can explore freely; difficulty signals guide progression but do not gate it.

**Act 3 — The Deep.** Completing regional objectives unlocks a mega-dungeon (10+ procedurally generated floors, mixed themes, escalating difficulty). Hand-crafted boss encounters punctuate the descent. Final boss at the bottom. Victory condition: defeat the final boss and escape.

### Progression Loops

- **Primary**: Character XP and leveling (abilities, stats, HP).
- **Reward**: Gear drops from mobs and treasure rooms.
- **Meta**: Region completion — lighting permanent beacons, unlocking fast-travel shrines, opening shortcuts. The overworld changes as the player progresses. Cleared dungeons stay cleared. Towns react to achievements.

-----

## The Unified Grid System

All spaces — dungeons, overworld, interiors — use the same 2D grid data structure. Each cell stores:

```
{
  wallFlags: { N, S, E, W },   // boolean — wall present on each edge
  floorHeight: number,          // world units — the single height value at cell center
  ceilingHeight: number | null, // null = open sky (outdoors)
  cellType: enum,               // floor, wall, pit, water, tree, rock, building
  lightSources: [],             // point lights in this cell
  contents: [],                 // mobs, items, interactables
  visited: boolean,             // for minimap fog-of-war
  faction: string | null        // which faction owns/occupies this cell's contents
}
```

Note: The current implementation in `cells.js` uses a simpler model (type, floorHeight, ceilingHeight, wallStyle, ceilingStyle, items). The full unified model above is the target for Phase 5 (open world). The current model will be extended incrementally.

### Height-Based Traversal (Universal Rule)

Every cell has one `floorHeight` value (its center height). Movement between adjacent cells lerps smoothly from one height to the next. This single rule governs all terrain:

- **Ramps and gentle slopes**: Small height deltas (≤ threshold) → traversable. The camera lerps along the slope. Works identically for dungeon ramps and outdoor hills.
- **Stairs**: A sequence of cells with stepped height increments. No special "stairs" cell type needed — stairs are just a height pattern.
- **Cliffs and mountains**: Height delta between adjacent cells exceeds the traversal threshold → impassable. No explicit `passable` flag required; impassability emerges from geometry.
- **Pits**: Cells with sharply lower `floorHeight` than surroundings. The delta is too large to traverse safely (or falling in causes damage).
- **Dungeon floors**: Flat dungeon corridors have uniform `floorHeight`. Ramps between dungeon levels use gradual height changes. Cavern rooms use irregular heights within the traversable threshold.

The traversal threshold is a single tunable constant. Raising it makes the party more agile (can climb steeper slopes); lowering it makes terrain more restrictive.

### Outdoor Extensions

- **No ceiling**: `ceilingHeight = null`. Renderer draws skybox instead of ceiling geometry.
- **Terrain mesh**: Renderer builds a continuous mesh by lerping `floorHeight` values between adjacent outdoor cells. Smooth terrain without discrete height steps.
- **Lighting model**: Outdoors uses directional light (sun/moon) + ambient + fog. Dungeons use point lights (torches, sconces) + very low ambient. The system switches based on `ceilingHeight`.
- **Water**: Water cells have a low `floorHeight` and `cellType = water`. Rendered as a reflective plane. Bridges are normal-height cells spanning over water.
- **Impassable features**: Trees, boulders, buildings block movement via wall flags on their edges, not via height. This keeps the height rule clean for terrain while allowing obstacles on flat ground.
- **Skybox**: Fixed daytime sky. Day/night cycle is a stretch goal.

### Factions

Every mob belongs to a faction. Factions determine friend/foe relationships:

- **Hostile factions** attack the party on sight.
- **Hostile factions that are enemies of each other** will fight each other. The party can exploit inter-faction conflicts.
- **Neutral factions** ignore the party unless attacked.
- **Friendly factions** (e.g., town guards) fight hostile mobs but do not attack the party.

Faction relationships are a simple table: for each pair, the relationship is hostile, neutral, or friendly. The combat manager checks this table when resolving target selection.

### Set-Piece Battles

Large encounters with scripted structure:

- Pre-authored cell clusters with scripted mob placements, trigger zones, and reinforcement waves.
- Multi-faction set-pieces: two hostile factions already engaged when the party arrives.
- Same combat system as normal encounters — the difference is mob density, spatial design, and faction dynamics.
- The party is robust, so these feel like sustained engagements, not spike-damage races.

-----

## Phase 1 — Walk the Dungeon (current — substantially complete)

**Goal**: Walk through a torchlit 3D dungeon on a grid. No combat, no enemies. Atmosphere only.

### Done When

You can walk through the dungeon on an iPad, torchlight flickers, shadows move, minimap tracks you. It feels atmospheric.

-----

## Phase 2 — Something Wants to Kill You

**Goal**: One enemy type, real-time combat, basic party with mana.

### Tasks

1. **Party data model**: 4 party members. Each has: name, class archetype, HP (high — party is robust), mana (regenerates slowly), ability scores (STR/DEX/CON/INT/WIS/CHA → modifiers), attack cooldown, defense value, status effects list.
2. **Class archetypes** (5e-inspired stats, original abilities):
   - **Fighter** — high HP, melee, short cooldowns, low mana (war shouts, defensive stances)
   - **Rogue** — medium HP, high damage from flanking, fast cooldowns, low mana (poisons, shadow step)
   - **Cleric** — high HP, heals and buffs cost mana, medium melee damage
   - **Mage** — low HP, high mana pool, ranged/AoE spells, long cooldowns
3. **Mana system**: Mana pool scales with INT or WIS. Regenerates at a slow constant rate (faster out of combat). All spells and abilities cost mana. No memorization, no prayer slots.
4. **Party UI**: Bottom-of-screen bar with 4 portraits, HP bars, mana bars, cooldown indicators, action buttons. Touch-friendly tap targets.
5. **Party formation**: Front row (2) and back row (2). Front row absorbs melee. Back row hit only by ranged/AoE unless front row is down.
6. **Enemy data model**: Grid position, HP, attack damage, cooldown, aggro range, movement speed. State machine: idle → alert → pursuing → attacking → dead.
7. **Combat resolution**: Real-time ticks (~10/sec). Cooldown timers. d20 + modifier vs. defense. Deliberately paced.
8. **First enemy**: Skeleton warrior. One cell. Attacks front-row member.
9. **Damage and death**: 0 HP → unconscious. All down → game over. Enemies at 0 HP → death animation → removed.

### Suggested New Files

- `src/party.js` — Party data model, stats, mana
- `src/combat.js` — Combat manager, cooldowns, resolution
- `src/enemies.js` — Enemy data, AI state machine, pathfinding

### Done When

You walk into a room, a skeleton wakes up, you fight it in real time, and either you or it dies. Combat feels deliberate, not frantic.

-----

## Phase 3 — The Dungeon Builds Itself

**Goal**: Procedural dungeon generation. Each run produces a different layout.

### Tasks

1. **Generator algorithm**: BSP tree room placement + maze corridors.
2. **Room templates**: Tagged by type — empty, combat, treasure, shrine, boss, entrance, exit.
3. **Feature zones**: 15–20% of cells get height variation.
4. **Mob placement**: Per-floor difficulty tier. 1–2 mob families per floor.
5. **Mob families**: Undead, Vermin, Humanoid, Elemental, Demon (all generic fantasy, no licensed creatures).
6. **Boss generation**: Family champion template: 3× HP, unique ability.
7. **Loot tables**: Tied to mob families.
8. **Difficulty scaling**: Floor depth multiplies mob HP, damage, density.

-----

## Phase 4 — RPG Systems

**Goal**: Progression, loot, spells, and the bindpoint/death system.

### Tasks

1. **Experience and leveling**: XP from kills. Level up grants +HP, +mana, +1 ability score, new ability. Cap ~10–15 levels.
2. **Equipment**: Weapon, armor, shield (front-row only), accessory slots.
3. **Inventory UI**: Grid-based per character. Tap-to-select, tap-to-equip (no drag-and-drop on mobile).
4. **Spell/ability system**: Cooldown + mana cost. 4–6 abilities per class unlocked by level.
5. **Bindpoints and death**: Shrines every ~5 rooms. Respawn at last shrine. Cleared rooms stay cleared. Equipment stays on corpses.
6. **Save/load**: JSON → localStorage. Manual save at shrines. Auto-save on floor transition.
7. **Status effects**: Poison, stun, slow, blind, burning.

-----

## Phase 5 — The Open World

**Goal**: Exit the tutorial dungeon into a Might & Magic-style overworld.

### Tasks

1. **Overworld grid**: Large grid (128×128 per region), unified cell model, `ceilingHeight = null`.
2. **Outdoor renderer**: Skybox, directional sun, distance fog.
3. **Terrain features**: Trees, boulders, cliffs, water, bridges.
4. **Region design**: 4–6 regions, hand-authored macro layout, procedural detail fill.
5. **Towns**: Shops, healers, quest givers, bindpoints.
6. **Fast travel**: Beacons unlock fast-travel between regions.
7. **Outdoor encounters**: Mobs patrol the overworld.
8. **Set-piece battles**: Pre-authored encounter zones with trigger cells.
9. **Dungeon entrances**: Overworld cells that transition to procedural dungeon grids.

-----

## Phase 6 — Campaign and Content

**Goal**: The full Act 1–3 campaign arc is playable.

### Tasks

1. **Tutorial dungeon** (Act 1): 3–4 hand-authored floors teaching all mechanics.
2. **Regional dungeons** (Act 2): Procedurally generated, 3–5 floors each, regional bosses.
3. **The Deep** (Act 3): 10+ floor mega-dungeon. Final boss at the bottom.
4. **Quest system**: Fetch/kill quests from NPCs. Quest log UI.
5. **Dialogue system**: Minimal NPC text boxes with response options.
6. **World state tracking**: Cleared dungeons, lit beacons, quest completion persisted in saves.

-----

## Phase 7 — Polish and Ship

**Goal**: Make it feel like a game, not a prototype.

### Tasks

1. **Sound**: Footsteps, combat, spells, ambient. Web Audio API or Howler.js.
2. **Visual polish**: Particles, better textures, billboard sprites for enemies.
3. **UI polish**: Title screen, character creation, death/victory screens.
4. **Touch optimization**: 44×44pt tap targets, 60fps on recent iOS.
5. **Balance pass**: HP, damage, cooldowns, mana, XP, loot rates.
6. **Content expansion**: More mob families, equipment, dungeon themes, environmental hazards.
7. **Win condition**: Defeat final boss, escape the Deep. Post-game endless mode.

### Done When

You'd want to play it on the couch.

-----

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Input Layer                     │
│          (keyboard / touch → commands)            │
├──────────────────────────────────────────────────┤
│                Game State Layer                   │
│  ┌───────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │  Party     │ │  Grid   │ │    Enemies       │  │
│  │  Stats     │ │  Data   │ │    State         │  │
│  │  Inv/Eq    │ │ (unified│ │    AI/Pathing    │  │
│  │  Mana      │ │  model) │ │                  │  │
│  └───────────┘ └─────────┘ └──────────────────┘  │
│  ┌──────────────────┐  ┌───────────────────────┐  │
│  │  Combat Manager  │  │   World Manager       │  │
│  │  (cooldowns,     │  │   (regions, dungeon   │  │
│  │   mana, resolve, │  │    transitions,       │  │
│  │   factions)      │  │    world state)       │  │
│  └──────────────────┘  └───────────────────────┘  │
├──────────────────────────────────────────────────┤
│                 Render Layer                      │
│  Three.js scene ← built from grid data            │
│  Switches context: dungeon (ceiling, torches)     │
│                    outdoor (skybox, sun, fog)      │
│  Camera rig, lighting, shadows, particles         │
├──────────────────────────────────────────────────┤
│                   UI Layer                        │
│  HTML/CSS overlay: party bar (HP + mana bars),    │
│  minimap, inventory, quest log, dialogue, menus   │
└──────────────────────────────────────────────────┘
```

## Art Direction

- **Style**: Billboard sprites for enemies (classic feel, art-feasible). Low-poly geometry for environment.
- **Textures**: Procedural (current) or CC0. Stone, brick, dirt, grass, water, wood, ice, lava as base set. Real textures will replace procedural ones.
- **Skybox**: Simple gradient or painted sky. Day only; day/night cycle is a stretch goal.

## Constraints and Non-Goals

- No multiplayer (architecture doesn't preclude it, but out of scope).
- No Vancian magic / spell memorization / prayer slots. Mana only.
- No licensed IP (no D&D-specific creatures: no beholders, mind flayers, displacer beasts, etc.). All generic fantasy.
- No drag-and-drop UI on mobile — use tap-to-select, tap-to-apply pattern.
- Party is robust by design. Attrition is mana-based across encounters, not HP-spike-based within them.
- 2.5D height: one floor height per XY position, no overlapping floors.