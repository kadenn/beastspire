import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRoom, getRoom, findRoomByPlayer } from './room.js';
import { CARDS, CLASSES } from './cards.js';
import { RELICS } from './relics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('/healthz', (_, res) => res.send('ok'));
// card/relic databases are static — serve once so the client never hardcodes rules text
app.get('/api/db', (_, res) => res.json({ cards: CARDS, classes: CLASSES, relics: RELICS }));
app.get(/^\/(?!api|ws).*/, (_, res) => res.sendFile(path.join(clientDist, 'index.html')));

wss.on('connection', (ws) => {
  let room = null;
  let playerId = null;

  const reply = (obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
  const fail = (msg) => reply({ type: 'error', message: msg });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return fail('Bad JSON.'); }

    try {
      switch (msg.type) {
        case 'create': {
          room = createRoom(String(msg.name || 'Host').slice(0, 20));
          playerId = room.hostId;
          room.attach(playerId, ws);
          reply({ type: 'joined', token: playerId, code: room.code });
          room.broadcastLobby();
          break;
        }
        case 'join': {
          const r = getRoom(msg.code);
          if (!r) return fail('No room with that code.');
          const res = r.join(String(msg.name || 'Beast').slice(0, 20));
          if (res.error) return fail(res.error);
          room = r;
          playerId = res.seat.id;
          room.attach(playerId, ws);
          reply({ type: 'joined', token: playerId, code: room.code });
          room.broadcastLobby();
          break;
        }
        case 'reconnect': {
          const r = findRoomByPlayer(msg.token);
          if (!r) return fail('Session expired.');
          room = r;
          playerId = msg.token;
          room.attach(playerId, ws);
          reply({ type: 'joined', token: playerId, code: room.code });
          if (room.game) room.sendState(playerId);
          else room.broadcastLobby();
          break;
        }
        default: {
          if (!room || !playerId) return fail('Join a room first.');
          if (room.phase === 'lobby') {
            const res = room.configure(playerId, msg);
            if (res.error) return fail(res.error);
            if (room.phase === 'lobby') room.broadcastLobby();
          } else {
            const res = room.handleIntent(playerId, msg);
            if (res && res.error) return fail(res.error);
          }
        }
      }
    } catch (e) {
      console.error('ws error', e);
      fail('Server error.');
    }
  });

  ws.on('close', () => {
    if (room && playerId) room.detach(playerId);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Beastspire listening on :${PORT}`));
