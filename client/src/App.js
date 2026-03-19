import React, { useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, getSocket } from './socket';
import Landing from './screens/Landing';
import HostLobby from './screens/HostLobby';
import JoinSetup from './screens/JoinSetup';
import PlayerGame from './screens/PlayerGame';
import HostGame from './screens/HostGame';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('landing'); // landing | join-setup | host-lobby | player-game | host-game
  const [roomCode, setRoomCode] = useState('');
  const [myPlayer, setMyPlayer] = useState(null); // { name, team, role, id }
  const [roomState, setRoomState] = useState({ players: [], buzzedIn: null, locked: false });
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const clearError = useCallback(() => setError(''), []);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room:update', (state) => setRoomState(state));

    socket.on('room:buzzed', ({ buzzedIn }) => {
      setRoomState(prev => ({ ...prev, buzzedIn, locked: true }));
      // Play buzz sound
      playBuzz(buzzedIn?.team);
    });

    socket.on('room:reset', () => {
      setRoomState(prev => ({ ...prev, buzzedIn: null, locked: false }));
    });

    socket.on('room:closed', () => {
      setScreen('landing');
      setRoomCode('');
      setMyPlayer(null);
      setRoomState({ players: [], buzzedIn: null, locked: false });
      setError('The host ended the session.');
    });

    socket.on('player:kicked', () => {
      setScreen('landing');
      setRoomCode('');
      setMyPlayer(null);
      setRoomState({ players: [], buzzedIn: null, locked: false });
      setError('You were removed from the room.');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:update');
      socket.off('room:buzzed');
      socket.off('room:reset');
      socket.off('room:closed');
      socket.off('player:kicked');
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    const socket = socketRef.current;
    socket.emit('host:create', (res) => {
      if (res.success) {
        setRoomCode(res.roomCode);
        setScreen('host-lobby');
        setError('');
      } else {
        setError('Failed to create room. Try again.');
      }
    });
  }, []);

  const handleJoinRoom = useCallback((code) => {
    const upper = code.toUpperCase().trim();
    if (upper.length !== 4) { setError('Room code must be 4 characters'); return; }
    setRoomCode(upper);
    setScreen('join-setup');
    setError('');
  }, []);

  const handlePlayerJoin = useCallback((name, team, role) => {
    const socket = socketRef.current;
    socket.emit('player:join', { roomCode, name, team, role }, (res) => {
      if (res.success) {
        setMyPlayer(res.player);
        setScreen('player-game');
        setError('');
      } else {
        setError(res.error || 'Could not join. Try again.');
      }
    });
  }, [roomCode]);

  const handleBuzz = useCallback(() => {
    const socket = socketRef.current;
    socket.emit('player:buzz', (res) => {
      if (res && !res.success && res.error) {
        // Already locked — no-op, UI handles it
      }
    });
  }, []);

  const handleReset = useCallback(() => {
    const socket = socketRef.current;
    socket.emit('host:reset', () => {});
  }, []);

  const handleKick = useCallback((playerId) => {
    const socket = socketRef.current;
    socket.emit('host:kick', { playerId }, () => {});
  }, []);

  const handleStartGame = useCallback(() => {
    setScreen('host-game');
  }, []);

  const handleLeave = useCallback(() => {
    const socket = socketRef.current;
    socket.disconnect();
    setTimeout(() => socket.connect(), 100);
    setScreen('landing');
    setRoomCode('');
    setMyPlayer(null);
    setRoomState({ players: [], buzzedIn: null, locked: false });
  }, []);

  const screenProps = {
    roomCode, myPlayer, roomState, error, clearError, connected,
    onCreateRoom: handleCreateRoom,
    onJoinRoom: handleJoinRoom,
    onPlayerJoin: handlePlayerJoin,
    onBuzz: handleBuzz,
    onReset: handleReset,
    onKick: handleKick,
    onStartGame: handleStartGame,
    onLeave: handleLeave,
  };

  return (
    <div className="app">
      {screen === 'landing' && <Landing {...screenProps} />}
      {screen === 'join-setup' && <JoinSetup {...screenProps} />}
      {screen === 'host-lobby' && <HostLobby {...screenProps} />}
      {screen === 'player-game' && <PlayerGame {...screenProps} />}
      {screen === 'host-game' && <HostGame {...screenProps} />}
    </div>
  );
}

function playBuzz(team) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(team === 'red' ? 220 : 330, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(team === 'red' ? 180 : 280, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* silent fail */ }
}
