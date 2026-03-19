import React, { useEffect, useRef } from 'react';
import { ConnectionDot } from '../components/UI';
import './HostGame.css';

const ROLE_ORDER = ['Captain', 'Person 1', 'Person 2', 'Person 3'];

export default function HostGame({ roomCode, roomState, onReset, onKick, onLeave, connected }) {
  const { players = [], buzzedIn, locked } = roomState;
  const prevLocked = useRef(false);

  const redPlayers = ROLE_ORDER
    .map(role => players.find(p => p.team === 'red' && p.role === role))
    .filter(Boolean);
  const bluePlayers = ROLE_ORDER
    .map(role => players.find(p => p.team === 'blue' && p.role === role))
    .filter(Boolean);

  useEffect(() => {
    prevLocked.current = locked;
  }, [locked]);

  const buzzColor = buzzedIn?.team === 'red' ? 'var(--red)' : 'var(--blue)';
  const buzzGlow = buzzedIn?.team === 'red' ? 'var(--red-glow)' : 'var(--blue-glow)';

  return (
    <div className="host-game">

      {/* Header bar */}
      <div className="hg-header fade-in">
        <div className="hg-header-left">
          <div className="host-badge-sm">HOST</div>
          <div className="hg-room-code">{roomCode}</div>
          <ConnectionDot connected={connected} />
          <span className="hg-player-count">{players.length} player{players.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="hg-leave" onClick={onLeave}>End Session</button>
      </div>

      {/* Main buzz display */}
      <div className="hg-main fade-in">
        {!locked ? (
          <div className="hg-waiting">
            <div className="hg-waiting-rings">
              <div className="hg-ring hg-ring-1" />
              <div className="hg-ring hg-ring-2" />
              <div className="hg-ring hg-ring-3" />
            </div>
            <div className="hg-waiting-center">
              <div className="hg-waiting-icon">⚡</div>
              <div className="hg-waiting-text">Waiting for buzz…</div>
            </div>
          </div>
        ) : (
          <div
            className="hg-buzzed-display scale-in"
            style={{ '--buzz-color': buzzColor, '--buzz-glow': buzzGlow }}
          >
            <div className="hg-buzz-glow-bg" />
            <div className="hg-buzz-team-tag" style={{ color: buzzColor }}>
              {buzzedIn?.team === 'red' ? '🔴 Red Team' : '🔵 Blue Team'}
            </div>
            <div className="hg-buzz-name">{buzzedIn?.name}</div>
            <div className="hg-buzz-role">{buzzedIn?.role}</div>
          </div>
        )}
      </div>

      {/* Reset button */}
      <div className="hg-reset-area fade-in">
        <button
          className={`hg-reset-btn ${locked ? 'active' : 'idle'}`}
          onClick={onReset}
        >
          {locked ? '↺  Reset for Next Question' : 'Ready for next question'}
        </button>
      </div>

      {/* Team columns */}
      <div className="hg-teams fade-in">
        <TeamColumn
          team="red"
          label="🔴 Red Team"
          players={redPlayers}
          allPlayers={players}
          buzzedIn={buzzedIn}
          onKick={onKick}
        />
        <TeamColumn
          team="blue"
          label="🔵 Blue Team"
          players={bluePlayers}
          allPlayers={players}
          buzzedIn={buzzedIn}
          onKick={onKick}
        />
      </div>
    </div>
  );
}

function TeamColumn({ team, label, players, buzzedIn, onKick }) {
  const color = team === 'red' ? 'var(--red)' : 'var(--blue)';
  const emptySlots = 4 - players.length;

  return (
    <div className="hg-team-col" style={{ '--col-color': color }}>
      <div className="hg-team-label">{label}</div>
      <div className="hg-team-players">
        {players.map(p => {
          const isBuzzed = buzzedIn?.id === p.id;
          return (
            <div
              key={p.id}
              className={`hg-player-row ${isBuzzed ? 'buzzed' : ''} fade-in`}
            >
              <div className="hg-player-dot" />
              <div className="hg-player-info">
                <span className="hg-player-name">{p.name}</span>
                <span className="hg-player-role">{p.role}</span>
              </div>
              {isBuzzed && <div className="hg-buzzed-tag">BUZZED</div>}
              <button
                className="hg-kick-btn"
                onClick={() => onKick(p.id)}
                title="Remove player"
              >✕</button>
            </div>
          );
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="hg-player-row empty">
            <div className="hg-player-dot empty-dot" />
            <span className="hg-empty-label">Open slot</span>
          </div>
        ))}
      </div>
    </div>
  );
}
