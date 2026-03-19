import React from 'react';
import './UI.css';

export function ErrorBanner({ message, onClear }) {
  if (!message) return null;
  return (
    <div className="error-banner fade-in" onClick={onClear}>
      <span>⚠ {message}</span>
      <button className="error-close">✕</button>
    </div>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <span className="logo-buzz">BUZZ</span>
      <span className="logo-in">IN</span>
    </div>
  );
}

export function RoomCodeDisplay({ code }) {
  return (
    <div className="room-code-display">
      <div className="room-code-label">Room Code</div>
      <div className="room-code-value">{code}</div>
    </div>
  );
}

export function PlayerTag({ player, showKick, onKick }) {
  const teamColor = player.team === 'red' ? 'var(--red)' : 'var(--blue)';
  const teamBg = player.team === 'red' ? 'var(--red-dim)' : 'var(--blue-dim)';
  return (
    <div className="player-tag fade-in" style={{ '--team-color': teamColor, '--team-bg': teamBg }}>
      <div className="player-tag-dot" />
      <div className="player-tag-info">
        <span className="player-tag-name">{player.name}</span>
        <span className="player-tag-role">{player.role} · {player.team === 'red' ? 'Red' : 'Blue'}</span>
      </div>
      {showKick && (
        <button className="player-tag-kick" onClick={() => onKick(player.id)} title="Remove player">✕</button>
      )}
    </div>
  );
}

export function TeamGrid({ players }) {
  const red = players.filter(p => p.team === 'red');
  const blue = players.filter(p => p.team === 'blue');

  return (
    <div className="team-grid">
      <div className="team-column team-red">
        <div className="team-header red">🔴 Red Team</div>
        {red.length === 0
          ? <div className="team-empty">No players yet</div>
          : red.map(p => <div key={p.id} className="team-player">{p.name}<span>{p.role}</span></div>)
        }
      </div>
      <div className="team-column team-blue">
        <div className="team-header blue">🔵 Blue Team</div>
        {blue.length === 0
          ? <div className="team-empty">No players yet</div>
          : blue.map(p => <div key={p.id} className="team-player">{p.name}<span>{p.role}</span></div>)
        }
      </div>
    </div>
  );
}

export function ConnectionDot({ connected }) {
  return (
    <div className={`conn-dot ${connected ? 'online' : 'offline'}`} title={connected ? 'Connected' : 'Disconnected'} />
  );
}
