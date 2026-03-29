const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getRoomState(room) {
  return {
    players: Object.values(room.players),
    buzzedIn: room.buzzedIn,
    locked: room.locked,
    buzzerOpen: room.buzzerOpen,
    scores: room.scores
  };
}

app.get('/health', (req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('host:create', (callback) => {
    let code;
    do { code = generateRoomCode(); } while (rooms[code]);
    rooms[code] = {
      host: socket.id,
      players: {},
      buzzedIn: null,
      locked: false,
      buzzerOpen: false,
      scores: { red: 0, blue: 0 }
    };
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = 'host';
    console.log(`Room created: ${code}`);
    callback({ success: true, roomCode: code });
  });

  socket.on('player:join', ({ roomCode, name, team, role }, callback) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];
    if (!room) return callback({ success: false, error: 'Room not found' });
    if (Object.keys(room.players).length >= 8) return callback({ success: false, error: 'Room is full (8 players max)' });
    if (Object.values(room.players).some(p => p.name.toLowerCase() === name.toLowerCase()))
      return callback({ success: false, error: 'Name already taken in this room' });
    if (Object.values(room.players).some(p => p.team === team && p.role === role))
      return callback({ success: false, error: `${role} on ${team} team is already taken` });

    const player = { id: socket.id, name, team, role };
    room.players[socket.id] = player;
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = 'player';
    io.to(code).emit('room:update', getRoomState(room));
    console.log(`${name} joined room ${code} as ${team} ${role}`);
    callback({ success: true, roomCode: code, player });
  });

  // HOST: open the buzzer (players can now buzz)
  socket.on('host:openBuzzer', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.buzzerOpen = true;
    room.locked = false;
    room.buzzedIn = null;
    io.to(code).emit('room:update', getRoomState(room));
    callback && callback({ success: true });
  });

  socket.on('player:buzz', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return callback && callback({ success: false });
    const player = room.players[socket.id];
    if (!player) return callback && callback({ success: false, error: 'Not a player' });
    if (!room.buzzerOpen) return callback && callback({ success: false, error: 'Buzzer not open' });
    if (room.locked) return callback && callback({ success: false, error: 'Already locked' });

    room.locked = true;
    room.buzzedIn = { ...player, time: Date.now() };
    io.to(code).emit('room:buzzed', { buzzedIn: room.buzzedIn });
    io.to(code).emit('room:update', getRoomState(room));
    console.log(`${player.name} buzzed in room ${code}`);
    callback && callback({ success: true });
  });

  socket.on('host:reset', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return callback && callback({ success: false });
    room.locked = false;
    room.buzzedIn = null;
    room.buzzerOpen = false;
    io.to(code).emit('room:reset');
    io.to(code).emit('room:update', getRoomState(room));
    console.log(`Room ${code} reset`);
    callback && callback({ success: true });
  });

  socket.on('host:score', ({ type, team }, callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return callback && callback({ success: false });

    const scoreTeam = team || (room.buzzedIn ? room.buzzedIn.team : null);
    if (!scoreTeam) return callback && callback({ success: false, error: 'No team specified' });

    const delta = type === 'tossup' ? 4 : type === 'blurp' ? -4 : type === 'bonus' ? 10 : 0;
    if (delta === 0) return callback && callback({ success: false, error: 'Unknown score type' });

    room.scores[scoreTeam] = (room.scores[scoreTeam] || 0) + delta;

    // Only reset buzzer for tossup/blurp, not bonus (bonus keeps buzzer state for flow)
    if (type !== 'bonus') {
      room.locked = false;
      room.buzzedIn = null;
      room.buzzerOpen = false;
      io.to(code).emit('room:reset');
    }

    io.to(code).emit('room:update', getRoomState(room));
    console.log(`Room ${code}: ${scoreTeam} ${delta > 0 ? '+' : ''}${delta} (${type})`);
    callback && callback({ success: true, scores: room.scores });
  });

  socket.on('host:resetScores', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.scores = { red: 0, blue: 0 };
    io.to(code).emit('room:update', getRoomState(room));
    callback && callback({ success: true });
  });

  socket.on('host:kick', ({ playerId }, callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    const player = room.players[playerId];
    if (player) {
      delete room.players[playerId];
      io.to(playerId).emit('player:kicked');
      io.to(code).emit('room:update', getRoomState(room));
    }
    callback && callback({ success: true });
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    if (socket.data.role === 'host') {
      io.to(code).emit('room:closed', { reason: 'Host disconnected' });
      delete rooms[code];
      console.log(`Room ${code} closed (host left)`);
    } else {
      const player = room.players[socket.id];
      delete room.players[socket.id];
      if (room.buzzedIn && room.buzzedIn.id === socket.id) {
        room.buzzedIn = null;
        room.locked = false;
      }
      io.to(code).emit('room:update', getRoomState(room));
      if (player) console.log(`${player.name} left room ${code}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Buzzer server running on port ${PORT}`));
