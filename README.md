# Beastspire

A roguelike-style multiplayer deckbuilding arena in the browser. 2–4 seats per match,
each filled by a human (shareable room code) or a server-side bot. Live at
**https://beastspire.fly.dev**

## How it plays
- **Turn model:** simultaneous secret commits. Everyone queues plays, locks in, and the round
  resolves together: skills/powers first, then attacks interleaved round-robin. Deaths only
  check at end of round, so mutual KOs are possible.
- **Loop:** combat → draft (pick 1 of 3 cards, relic every other draft) → combat, with
  escalating "Forest's Wrath" ambient damage from round 9 so matches always end.
- **Modes:** free-for-all or 2v2 teams (teammates untargetable by attacks; some skills target allies).
- **Content:** 45 cards across 3 archetypes — Ember Fox (aggro/burn), Iron Tortoise
  (block/scaling), Fang Viper (poison/attrition) — plus 11 rule-bending relics.
- **Bots** are first-class players: they produce the same intents through the same engine API
  as humans (`server/src/bot.js`), and they take over any seat whose human stays disconnected
  past the 30s reconnect window.

## Architecture
- `server/` — Node + Express + ws. Fully authoritative: all rules in `src/engine.js`,
  lobby/seats/timers/reconnect in `src/room.js`, card/relic data in `src/cards.js` /
  `src/relics.js`. Clients only send intents and render state; per-player views hide hands
  and queued plays.
- `client/` — Vite + React. All art is generated SVG (`src/art.jsx`). Event-driven resolution
  playback (card flights, damage pops, block pulses, screen shake) in `src/Game.jsx`.
- Rooms live in memory → deploy as a single machine (`fly.toml` pins one always-on machine).

## Run locally
```sh
cd server && npm install && npm start          # serves API/WS on :8080
cd client && npm install && npm run dev        # Vite dev server, proxies /ws + /api
```
Or build the client (`npm run build`) and the server serves `client/dist` itself.

## Deploy
```sh
flyctl deploy --ha=false
```
