# NAX World — Mobile 3D Prototype

This folder is the first playable vertical slice for NAX World.

## What is implemented

- Full 3D scene (not 2.5D)
- Third-person player avatar
- Mobile virtual joystick
- Touch/swipe camera
- Jump and run mode
- Simple 3D city blocks
- Roads, street lights and trees
- NPC placeholders with movement
- Collectible NAX rings
- XP and level progression
- NAX coin counter
- Portal interaction point
- Responsive mobile HUD
- Keyboard fallback for future desktop testing

## How to test from a phone

Open `index.html` through a static web host that serves ES modules (for example GitHub Pages) and load it in a mobile browser. The prototype currently uses Three.js 0.186.1 from jsDelivr.

## Current scope

This is a vertical slice, not the final metaverse. Multiplayer, persistent accounts, real 3D assets, inventory, quests, vehicles, creator tools, AI and NAX Store integration remain future modules.

## Mobile performance principle

The scene uses procedural primitives and no large external 3D asset pack in this first slice. This keeps the initial test lightweight while the mobile performance budget is measured.

## Next milestone

Replace the primitive player/world art with optimized original assets while keeping the input, camera and system interfaces stable.
