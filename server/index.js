const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// rooms: { [roomCode]: { host: socketId, players: { [socketId]: player }, buzzedIn: player | null, locked: bool, scores: { red: number, blue: number } } }
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
    scores: room.scores
  };
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // HOST: create a room
  socket.on('host:create', (callback) => {
    let code;
    do { code = generateRoomCode(); } while (rooms[code]);

    rooms[code] = {
      host: socket.id,
      players: {},
      buzzedIn: null,
      locked: false,
      scores: { red: 0, blue: 0 }
    };

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = 'host';

    console.log(`Room created: ${code}`);
    callback({ success: true, roomCode: code });
  });

  // PLAYER: join a room
  socket.on('player:join', ({ roomCode, name, team, role }, callback) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];

    if (!room) return callback({ success: false, error: 'Room not found' });

    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 8) return callback({ success: false, error: 'Room is full (8 players max)' });

    // Check if name already taken
    const nameTaken = Object.values(room.players).some(p => p.name.toLowerCase() === name.toLowerCase());
    if (nameTaken) return callback({ success: false, error: 'Name already taken in this room' });

    // Check if role already taken on that team
    const roleTaken = Object.values(room.players).some(p => p.team === team && p.role === role);
    if (roleTaken) return callback({ success: false, error: `${role} on ${team} team is already taken` });

    const player = { id: socket.id, name, team, role };
    room.players[socket.id] = player;

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = 'player';

    // Notify host and all players of updated state
    io.to(code).emit('room:update', getRoomState(room));

    console.log(`${name} joined room ${code} as ${team} ${role}`);
    callback({ success: true, roomCode: code, player });
  });

  // PLAYER: buzz in
  socket.on('player:buzz', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return callback && callback({ success: false });

    const player = room.players[socket.id];
    if (!player) return callback && callback({ success: false, error: 'Not a player' });

    if (room.locked) return callback && callback({ success: false, error: 'Already locked' });

    // Lock the room
    room.locked = true;
    room.buzzedIn = { ...player, time: Date.now() };

    io.to(code).emit('room:buzzed', { buzzedIn: room.buzzedIn });
    io.to(code).emit('room:update', getRoomState(room));

    console.log(`${player.name} buzzed in room ${code}`);
    callback && callback({ success: true });
  });

  // HOST: reset buzzer
  socket.on('host:reset', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return callback && callback({ success: false });
    if (room.host !== socket.id) return callback && callback({ success: false, error: 'Not the host' });

    room.locked = false;
    room.buzzedIn = null;

    io.to(code).emit('room:reset');
    io.to(code).emit('room:update', getRoomState(room));

    console.log(`Room ${code} reset`);
    callback && callback({ success: true });
  });

  // HOST: award points
  // type: 'tossup' (+4 to buzzed team), 'blurp' (-4 to buzzed team), 'bonus' (+10 to buzzed team)
  socket.on('host:score', ({ type }, callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return callback && callback({ success: false });
    if (room.host !== socket.id) return callback && callback({ success: false, error: 'Not the host' });
    if (!room.buzzedIn) return callback && callback({ success: false, error: 'Nobody buzzed in' });

    const team = room.buzzedIn.team;
    const delta = type === 'tossup' ? 4 : type === 'blurp' ? -4 : type === 'bonus' ? 10 : 0;
    if (delta === 0) return callback && callback({ success: false, error: 'Unknown score type' });

    room.scores[team] = (room.scores[team] || 0) + delta;

    // Reset buzzer after scoring
    room.locked = false;
    room.buzzedIn = null;

    io.to(code).emit('room:reset');
    io.to(code).emit('room:update', getRoomState(room));

    console.log(`Room ${code}: ${team} ${delta > 0 ? '+' : ''}${delta} (${type})`);
    callback && callback({ success: true, scores: room.scores });
  });

  // HOST: reset scores
  socket.on('host:resetScores', (callback) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.scores = { red: 0, blue: 0 };
    io.to(code).emit('room:update', getRoomState(room));
    callback && callback({ success: true });
  });

  // HOST: kick player
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

  // Disconnect
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];

    if (socket.data.role === 'host') {
      // Host left — notify everyone and destroy room
      io.to(code).emit('room:closed', { reason: 'Host disconnected' });
      delete rooms[code];
      console.log(`Room ${code} closed (host left)`);
    } else {
      // Player left
      const player = room.players[socket.id];
      delete room.players[socket.id];

      // If the buzzer was this player, reset
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
