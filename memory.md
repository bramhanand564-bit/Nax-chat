# NAX WORLD — PROJECT MEMORY
Version: 1.0
Status: FOUNDATION / PLANNING
Repository: bramhanand564-bit/Nax-chat
Primary target: Mobile-first, full 3D game
Development constraint: User currently has no PC/computer; workflow must be GitHub/mobile-friendly.

---

## 0. SOURCE OF TRUTH

This file is the project's persistent memory and planning record.

Rules:
1. Read this file before making major project changes.
2. Update it after major architectural, feature, bug-fix, or decision changes.
3. Never delete historical decisions without recording why they changed.
4. Mark completed work as LOCKED when it has been tested and should not be casually modified.
5. Keep unresolved items in the PENDING/BLOCKED sections.
6. Do not claim a feature is working until it has been tested.
7. Keep implementation facts separate from ideas.
8. If a future change conflicts with a locked decision, record the conflict before changing it.

---

## 1. PRODUCT VISION

NAX World is an original persistent virtual-world game inspired by the broad idea of a shared virtual universe.

It is NOT a direct copy of Ready Player One, OASIS, copyrighted characters, names, maps, assets, music, or other protected content.

Core vision:
- Persistent online 3D world
- Mobile-first
- Full 3D, never 2.5D
- Player avatars
- Social interaction
- Exploration
- Vehicles
- Mini-games
- Quests
- Economy
- Creator tools
- AI-powered experiences
- NAX Store integration
- Future expansion to PC/VR without redesigning the core architecture

---

## 2. NON-NEGOTIABLE DECISIONS

LOCKED:
- Mobile-first development
- Full 3D world
- No 2.5D substitute
- GitHub is the central project/workflow location
- User currently has no PC/computer
- Architecture must support development and testing from mobile where practical
- Modular architecture
- NAX World should be expandable rather than a single hard-coded demo
- Original IP/design only
- Performance must be considered from the beginning

NOT LOCKED YET:
- Final 3D engine
- Final backend
- Final hosting
- Final database
- Final art pipeline
- Final multiplayer protocol
- Final monetization model

---

## 3. DEVELOPMENT CONSTRAINT

Current device/workflow:
- No PC/computer available
- Work must be managed through GitHub and mobile-friendly tools
- Heavy local 3D compilation/building may require cloud services later
- Do not assume desktop-only tooling is available

Engineering response:
- Keep source code modular
- Prefer cloud/GitHub Actions for builds when appropriate
- Keep assets optimized
- Keep build instructions documented
- Separate source, assets, configuration, and generated build files
- Never commit huge generated binaries unnecessarily
- Record any external service dependency in this file

---

## 4. MEMORY POLICY — WHAT TO RECORD

RECORD:
- Major architecture decisions
- Technology/engine decisions
- Repository structure changes
- New systems/modules
- Important APIs
- Database schema decisions
- Multiplayer/network decisions
- Security decisions
- Performance targets
- Mobile compatibility decisions
- Completed features
- Verified bugs and fixes
- Known limitations
- Build/deployment process
- Important commands
- Environment requirements (never secrets)
- Asset pipeline rules
- Version milestones
- Breaking changes
- Locked components
- Test results
- Why a major decision was changed
- Dependencies and integration relationships

DO NOT RECORD:
- Passwords
- API keys
- Firebase private credentials
- Access tokens
- GitHub tokens
- Private secrets
- Personal sensitive information
- Temporary chat noise
- Unverified assumptions as facts
- Duplicate information that belongs in source code/config
- Huge copied source files
- Generated build output
- Temporary debugging logs unless they document a reproducible bug

SECURITY RULE:
Never put secrets in memory.md. Use environment variables/secrets management and document only the variable NAME and purpose.

---

## 5. STATUS LEGEND

PLANNED = idea approved for future work
IN PROGRESS = actively being implemented
TESTING = implemented but not verified
WORKING = tested successfully
LOCKED = tested and protected from unnecessary changes
BLOCKED = cannot proceed because a dependency/problem remains
DEPRECATED = replaced by another approach

Never use WORKING or LOCKED without evidence of testing.

---

## 6. MASTER SYSTEM MAP

NAX WORLD
|
+-- Account / NAX ID
+-- Player
|   +-- Avatar
|   +-- Inventory
|   +-- Progression
|   +-- Achievements
|
+-- World
|   +-- Zones
|   +-- Buildings
|   +-- NPCs
|   +-- Environment
|   +-- Weather
|   +-- Day/Night
|
+-- Movement
|   +-- Walk
|   +-- Run
|   +-- Sprint
|   +-- Jump
|   +-- Climb
|   +-- Swim
|
+-- Vehicles
|
+-- Social
|   +-- Friends
|   +-- Chat
|   +-- Voice
|   +-- Party
|   +-- Guild
|
+-- Games
|   +-- Racing
|   +-- Arena
|   +-- Ludo
|   +-- Arcade
|   +-- Future Games
|
+-- Quests
+-- Combat
+-- Economy
+-- Creator Studio
+-- AI
+-- NAX Store
+-- Events
+-- Multiplayer
+-- Security
+-- Analytics

---

## 7. MOBILE-FIRST REQUIREMENTS

Initial target:
- Android phones
- Touch-first controls
- Landscape gameplay
- Responsive menus
- Virtual joystick
- Swipe camera
- Tap interaction
- Mobile HUD
- 30 FPS baseline target
- 60 FPS target on capable devices
- Low/medium/high graphics profiles
- Battery-aware settings
- Low-memory behavior
- Asset streaming/loading strategy
- Network reconnect
- Graceful loading/error states

Never sacrifice full 3D to solve a performance problem. Optimize the 3D implementation instead.

---

## 8. FIRST PLAYABLE MILESTONE

The first playable build should contain ONLY the minimum vertical slice:

1. Start screen
2. Player identity
3. One 3D environment
4. One fully 3D avatar
5. Third-person camera
6. Touch movement
7. Camera swipe
8. Jump
9. Basic interaction
10. Basic save/load
11. Simple HUD
12. Mobile performance test

Only after this is stable should the project expand.

---

## 9. PHASE ROADMAP

### Phase 1 — Foundation
- Repository structure
- Engine decision
- Build pipeline
- Mobile test build
- Basic 3D scene
- Camera
- Player controller

### Phase 2 — Player
- Account
- NAX ID
- Avatar
- Animation
- Inventory
- Save state

### Phase 3 — World
- First city/zone
- Buildings
- NPC framework
- Interactive objects
- Day/night foundation
- Environment system

### Phase 4 — Multiplayer
- Authentication
- Presence
- Player synchronization
- Rooms/instances
- Reconnect
- Server authority

### Phase 5 — Social
- Friends
- Chat
- Party
- Voice
- Emotes
- Guild

### Phase 6 — Gameplay
- Quests
- Combat
- Racing
- Mini-games
- Rewards
- Progression

### Phase 7 — Economy
- Currency
- Inventory
- Shops
- Trading
- Marketplace architecture

### Phase 8 — Creator
- World builder
- Object placement
- NPC setup
- Quest builder
- Mini-game creation
- Publish/test/version system

### Phase 9 — AI
- AI assistant
- AI NPCs
- AI quests
- AI creator assistance
- AI testing tools

### Phase 10 — NAX Store
- Games
- Worlds
- Mini-apps
- Creator content
- Items
- Ratings/reviews
- Publishing

### Phase 11 — Scale
- Optimization
- CDN/assets
- Monitoring
- Anti-cheat
- Moderation
- Scalable multiplayer infrastructure

---

## 10. REPOSITORY RULES

Recommended structure:

/docs
  /architecture
  /game-design
  /systems
  /testing

/src
  /player
  /world
  /ui
  /network
  /social
  /games
  /quests
  /economy
  /creator
  /ai

/assets
  /models
  /textures
  /animations
  /audio
  /ui

/config
/scripts
/tests

memory.md
README.md

Actual engine-specific folders may differ after the engine is selected.

---

## 11. FILE OWNERSHIP RULE

Every major system should have:
- One clear implementation location
- One clear configuration location
- Tests where practical
- Documentation for non-obvious behavior

Do not duplicate the same business logic in multiple files.

Before creating a new file:
1. Search existing files.
2. Check whether the feature already exists.
3. Extend existing architecture when appropriate.
4. Create a new module only when it has a clear responsibility.

---

## 12. LOCK POLICY

When a feature is:
- implemented,
- tested,
- integrated,
- and confirmed stable,

mark it LOCKED here.

Locked code should not be rewritten casually.

Any modification to a LOCKED system must document:
- reason
- affected files
- expected behavior
- test plan
- rollback plan if relevant

---

## 13. TESTING RULES

Every milestone should have:
- Build/test status
- Device tested
- What was tested
- What failed
- Known limitations

Example:

Feature: Mobile movement
Status: TESTING
Device: Android
Tested: joystick, sprint, jump
Failed: none known
Next: long-session performance test

Do not write "working" merely because code exists.

---

## 14. PERFORMANCE TARGETS

Initial targets:
- Smooth touch input
- Stable 30 FPS baseline
- 60 FPS on capable devices
- Fast scene loading
- Controlled memory usage
- No unnecessary background processing
- Minimal network traffic
- Asset compression
- Level-of-detail strategy
- Object pooling where useful
- Streaming for large worlds

Exact numerical budgets will be established after the first real mobile prototype is measured.

---

## 15. NETWORKING PRINCIPLES

Important gameplay state should be server-authoritative.

Client should NOT be trusted for:
- Currency
- Inventory ownership
- Competitive scores
- Damage results
- Reward grants
- Match results
- Important progression

Plan for:
- Reconnection
- Latency
- Packet loss
- Duplicate events
- Server validation
- Rate limiting

---

## 16. SECURITY

Never store:
- secrets in Git
- API keys in source
- private credentials in memory.md

Plan:
- Authentication
- Authorization
- Server validation
- Rate limits
- Anti-cheat
- Reports
- Blocks
- Moderation
- Audit logs for important economy/admin actions

---

## 17. CHANGE LOG

### 2026-10-01
- NAX World concept established
- Mobile-first requirement LOCKED
- Full 3D requirement LOCKED
- PC/computer unavailable constraint recorded
- GitHub-centered workflow established
- Persistent project memory requirement established
- Memory rules established
- First playable vertical slice defined
- Modular architecture requirement established
- Original-IP requirement established

---

## 18. CURRENT STATUS

Overall: PLANNED / FOUNDATION

WORKING:
- GitHub repository write access verified

IN PROGRESS:
- NAX World architecture planning

BLOCKED:
- Final engine selection
- Final build pipeline
- Final multiplayer backend

NEXT DECISION:
Select the 3D engine and cloud/mobile build strategy that can realistically be operated from a phone while keeping the project fully 3D.

---

## 19. NEXT ACTIONS

1. Inspect repository before adding game files.
2. Decide whether NAX World stays in this repository or gets its own dedicated repository.
3. Select mobile-capable full-3D engine.
4. Define exact folder structure.
5. Create first 3D vertical slice.
6. Establish GitHub-based build/test workflow.
7. Test on Android.
8. Record results here.
9. Lock stable foundation.
10. Expand one system at a time.

---

## 20. GOLDEN RULE

BUILD SMALL → TEST → RECORD → LOCK → EXPAND.

Never build hundreds of untested systems at once.

The goal is not just to make a large amount of code. The goal is to create a working, maintainable, expandable NAX World.
