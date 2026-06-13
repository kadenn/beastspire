# Beastspire — Steam Launch Roadmap

_From playable prototype to a complete, sellable Steam game._
_Last updated: 2026-06-13_

---

## 0. Where we are today (honest baseline)

**What works:**
- Server-authoritative engine: simultaneous secret-commit combat, 45 cards across
  3 archetypes, 11 relics, FFA + 2v2, Forest's Wrath escalation.
- Bots are first-class players through the same API → PvE already functions.
- Real-time multiplayer over WebSockets, 30s reconnect → bot takeover.
- New battle scene: painted battler sprites in a moonlit forest arena, attack/
  hurt/cast/death poses, damage pops, screen shake, looping music + 12 SFX.
- Deployed live (fly.io, single machine) + private GitHub repo.

**What it is NOT yet:** a product. It's a tech-complete prototype with no run
structure, no progression, no accounts, no onboarding, placeholder-tier content
breadth, asset-pack art (licensing + identity risk), and infra that holds ~1
machine of players. A Steam buyer who refunds within 2 hours would refund this.

**The single most important strategic decision is in §1. Everything else depends on it.**

---

## 1. Product strategy — what are we actually selling?

Pure-PvP deckbuilders are commercially brutal on Steam: they live or die on a
matchmaking population that a new title doesn't have (cold-start problem), and
the proven sellers (Monster Train, Inscryption, Across the
Obelisk) are **single-player roguelikes first**.

**Recommendation: hybrid, single-player-led.**

- **Core sellable product = a single-player roguelike "Ascent"** — a run-based
  campaign vs. AI beasts and bosses, reusing the existing engine and bot AI.
  This is what justifies the price and survives a dead lobby.
- **Marquee feature = the multiplayer arena** (the current game) as a headline
  mode — great for trailers, streamers, and word-of-mouth, but never the only
  thing keeping the game alive.
- Co-op (2 players vs. AI) is a natural third pillar that reuses teams mode.

This reframes the roadmap: most "new content" below is the single-player run
structure the prototype currently lacks.

> Decision needed from you: **confirm hybrid vs. pure-PvP.** The rest of this
> document assumes hybrid. If pure-PvP, delete §4 and triple §5 (matchmaking,
> population, ranked seasons) — and accept much higher launch risk.

---

## 2. Legal & licensing — **BLOCKING, do first**

You cannot sell a game on assets you haven't verified for commercial
redistribution. This gates everything; treat it as a hard prerequisite.

- [ ] **Audit every asset pack's license** (the rpgbattlers monsters, Inventory
      Sounds, Tales of the Far East music, any future packs). Confirm each
      explicitly permits: commercial use, inclusion in a **sold** product, and
      redistribution inside a compiled game. Keep a `CREDITS.md` + the license
      PDFs in-repo.
- [ ] **Asset-flip risk:** even with valid licenses, shared marketplace art reads
      as "asset flip" to Steam buyers and tanks reviews. Plan to **commission or
      create a unique visual identity** for the final 1.0 (battlers, card frames,
      logo, key art). The current sprites are fine for Early Access / demo, not
      ideal for a premium 1.0.
- [ ] Pick & apply a **code license** (repo currently has none → all rights
      reserved by default; fine for closed source, but decide intentionally).
- [ ] Draft **Privacy Policy + EULA** (required once you have accounts/online play
      and collect any data, incl. Steam IDs / IP for matchmaking).
- [ ] **Business setup:** Steamworks needs a company/individual entity, banking,
      and tax forms (W-8/W-9). Steam Direct fee is $100 per app.
- [ ] If you keep usernames/chat: **content moderation / reporting** obligations.

---

## 3. Content depth (makes it feel like a real game)

Current breadth is prototype-scale. Target ranges for a credible deckbuilder:

| Content | Now | EA target | 1.0 target |
|---|---|---|---|
| Cards | 45 | ~120 | 180–220 |
| Relics | 11 | ~40 | 70–90 |
| Classes/beasts | 3 | 4 | 5–6 |
| Enemies (PvE) | 0 | ~25 | 40–50 |
| Bosses | 0 (Wrath only) | 6 | 12–15 |
| Status/keyword effects | ~9 | ~15 | 20+ |

- [ ] Per-class **card pools deep enough to support 2–3 viable archetypes each**
      (the genre bar: every class is a different game).
- [ ] **Curses / negative cards / card removal & upgrade** economy.
- [ ] **Relic tiers** (common/boss/shop/event) with build-defining rares.
- [ ] **Enemy roster with distinct AI patterns + intents** (telegraphed moves),
      elites, and **multi-phase bosses**. The bot AI is a starting point but PvE
      enemies want scripted, readable, beatable-but-threatening behavior.
- [ ] **Balance pass methodology:** keep the headless sim harness (already used
      for 40-game bot runs) and grow it into automated win-rate/telemetry testing
      per card/relic/archetype.

---

## 4. Single-player roguelike structure (the new core)

This is the biggest build and the thing that makes it sellable.

- [ ] **Run/map structure** — node-based path (combat / elite / shop / event /
      rest / treasure / boss). Seeded RNG for daily/shareable runs.
- [ ] **Persistent run state** — save/resume mid-run (crash-safe), one run at a
      time, abandon/retry.
- [ ] **Shops** (spend gold on cards/relics/removal), **rest sites** (heal/upgrade),
      **random events** with choices and consequences.
- [ ] **Meta-progression** — unlock cards/relics/classes over runs; cosmetic and
      mastery unlocks (not pay-to-win).
- [ ] **Ascension / difficulty ladder** (a 20-tier endgame ladder = hundreds of hours
      of retention from the same content).
- [ ] **Daily Challenge + seeded runs + run history/stats** (huge for streamers &
      community virality).
- [ ] **Scoring & post-run summary screen.**

---

## 5. Multiplayer, accounts & online infra

The prototype is in-memory, single-machine, anonymous. Production needs:

- [ ] **Persistent accounts** — Steam identity (Steamworks auth) as primary;
      optional standalone for the web build. Profiles, stats, unlocks server-side.
- [ ] **Database** — replace in-memory rooms with Postgres/Redis: accounts, runs,
      unlocks, match history, leaderboards. (Memory: current fly.io app is pinned
      single-machine _because_ rooms are in-memory — this is the constraint to break.)
- [ ] **Horizontal scale** — move room state to Redis so you can run >1 machine;
      add a matchmaking service and a lobby/room directory.
- [ ] **Matchmaking** — quick-match, ranked (MMR/Elo), private lobbies (already
      have room codes), spectate. Handle the **cold-start population** problem
      (bot backfill, cross-region pools, time-gated queues).
- [ ] **Ranked seasons + leaderboards** (global, friends, daily).
- [ ] **Reconnection hardening** — current 30s grace is good; add server restart
      resilience (rooms survive a deploy), idempotent intents, version checks.
- [ ] **Anti-cheat / authority** — engine is already server-authoritative (good).
      Add rate-limiting, input validation hardening, replay/audit logs, and
      protection against AFK/queue-dodging/grief.
- [ ] **Telemetry & analytics** (funnel, retention, balance data) + **crash/error
      reporting** (Sentry) + structured server logging.

---

## 6. Art, animation & audio (the "polished" bar)

- [ ] **Unique visual identity** (see §2 asset-flip note): final battlers, card
      frames per rarity/type, relic icons, status icons, logo, UI skin, key art.
- [ ] **Card art** — currently generated SVG icons; 1.0 wants distinct art per card.
- [ ] **Battler animations** — idle/attack/hurt/cast/death per beast (sprite sheets
      or skeletal). Current CSS poses are a strong stopgap.
- [ ] **VFX pass** — projectiles, impact bursts, burn/poison/block particles,
      screen flashes per damage type, "juice" (anticipation, follow-through).
- [ ] **Full audio** — per-archetype music, boss themes, UI sounds, ambient forest
      bed, voice/grunt one-shots per beast, victory/defeat stings. Mix + ducking.
- [ ] **Audio settings** — master/music/SFX sliders (current single mute toggle
      is the seed).

---

## 7. UX, onboarding & accessibility (refund-prevention)

The first 10 minutes decide reviews and the 2-hour refund window.

- [ ] **Tutorial / guided first run** — teach commit-resolution (it's non-obvious
      vs. turn-based deckbuilders), targeting, statuses.
- [ ] **Tooltips everywhere** — keyword glossary, card/relic detail on hover,
      "what does this do" for every effect.
- [ ] **Intent telegraphing** in PvE (what will the enemy do this round).
- [ ] **Settings menu** — resolution/fullscreen, key rebinding, audio, language,
      colorblind modes, reduced-motion (partially done), text size, damage-number
      toggles.
- [ ] **Localization** — at minimum EN; high-ROI adds: Simplified Chinese (huge
      for deckbuilders), then DE/FR/ES/RU/JP/PT-BR/Turkish. Externalize all
      strings now to avoid a painful retrofit.
- [ ] **Controller support** (Steam Deck verification is a meaningful sales lever
      for this genre).
- [ ] **Performance** — 60fps on low-end + Steam Deck; the SVG/DOM render is fine
      now but profile with many particles/4 battlers.

---

## 8. Platform & packaging (web → Steam app)

Currently a web app served by the Node server. Steam needs a desktop binary.

- [ ] **Wrap the client** in Electron or Tauri (Tauri = far smaller/faster) to
      ship a Windows/Mac/Linux executable. Keep the web build for marketing/demo.
- [ ] **Steamworks SDK integration** — auth, **achievements**, **Steam Cloud
      saves**, rich presence, friends invite, stats/leaderboards, (optional)
      Trading Cards.
- [ ] **Offline single-player** must work without the server (bundle the engine
      client-side for SP, keep server authority for MP). This is an architecture
      change worth planning early.
- [ ] **Build pipeline** — CI builds per-platform, code signing (Win/Mac
      notarization), auto-update channel, versioning.
- [ ] **Steam depots & branches** (default / beta / demo).

---

## 9. Steam store presence & marketing

- [ ] **Store page early** — name, capsule art (multiple sizes), screenshots,
      **trailer** (the MP arena is your hook), short+long description, tags,
      system requirements. Page up months before launch to **accrue wishlists**
      (wishlists → launch-day visibility algorithm).
- [ ] **Playable demo** — the current prototype is nearly demo-ready; a polished
      vertical slice is the best wishlist driver.
- [ ] **Steam Next Fest** participation (demo + livestream) — the single biggest
      free visibility event for indies.
- [ ] **Community** — Discord, devlog/Steam news, Reddit (r/roguelikes,
      r/deckbuilders), TikTok/short-form clips of big combat moments.
- [ ] **Influencer/press** outreach with keys pre-launch.
- [ ] **Pricing & EA decision** — Early Access is well-suited here (lets you grow
      content with players and fund development); price comps: $15–25 for the genre.

---

## 10. Production & QA

- [ ] **Automated tests** — unit tests on the engine (effects, edge cases:
      mutual KO, thorns vs. block, immediate draw/energy), sim harness for
      balance, integration tests on the WS protocol.
- [ ] **Playtesting cadence** — closed alpha → demo → EA → 1.0, with balance
      telemetry driving patches.
- [ ] **Bug triage / live-ops** — patch process, hotfix path, server deploy
      without dropping live matches (rooms-survive-deploy from §5).
- [ ] **Save migration** — versioned save format so updates don't brick runs.
- [ ] **Support** — bug report channel, refund-reason monitoring, review responses.

---

## 11. Phased plan (suggested milestones)

**Phase A — Foundations & legality (unblocks everything)**
- §2 licensing audit + business/Steam setup
- §1 strategy lock-in
- §5 DB + accounts + break the single-machine constraint
- §8 desktop wrapper spike (Tauri) + offline SP engine architecture

**Phase B — The core single-player game**
- §4 run/map structure, shops, events, rest, meta-progression
- §3 content to EA targets; enemy/boss roster + intents
- §7 tutorial, tooltips, settings, string externalization

**Phase C — Demo & wishlist engine**
- §6 first real art/identity pass (at least demo-quality)
- §9 store page live, trailer, polished demo, Next Fest
- §10 closed playtest + balance telemetry

**Phase D — Early Access launch**
- §5 matchmaking + ranked for the MP arena
- §3 content + balance; §6 ongoing art; §7 localization (EN+zh-Hans)
- §8 Steam achievements/cloud/leaderboards wired

**Phase E — Road to 1.0**
- §3 content to 1.0 targets; ascension ladder; daily challenge
- §6 full unique-art replacement; §7 more languages + controller/Deck verified
- Marketing push, 1.0 launch, post-launch content cadence

---

## 12. Top risks

1. **Asset licensing / asset-flip perception** — could block launch or sink
   reviews. Mitigate early (§2, §6).
2. **PvP cold-start** — empty lobbies kill MP-only games. Mitigated by the
   single-player-led strategy (§1).
3. **Scope** — this is a multi-person, multi-month effort. Sequencing (§11) and
   an Early Access model (§9) are how a small team ships it without drowning.
4. **Architecture debt** — in-memory single-machine + no accounts + web-only must
   be addressed before content work compounds on top of it (§5, §8).
5. **Balance at scale** — more cards = exponential interactions; lean on the sim
   harness + telemetry (§3, §10).

---

_This roadmap turns the current prototype into a product. The fastest credible
path to revenue is: lock strategy (§1) → clear legal (§2) → build the
single-player run (§4) on hardened infra (§5) → ship a great demo (§9) → Early
Access → grow to 1.0._
