import React from 'react';
import { RoomCodeDisplay, PlayerTag, ErrorBanner, ConnectionDot } from '../components/UI';
import './HostLobby.css';

export default function HostLobby({ roomCode, roomState, onStartGame, onKick, onLeave, error, clearError, connected }) {
  const players = roomState.players || [];
  const canStart = players.length >= 1;

  return (
    <div className="host-lobby">
      <ErrorBanner message={error} onClear={clearError} />

      <div className="host-lobby-content fade-in">
        <div className="host-lobby-header">
          <div className="host-badge">HOST</div>
          <h1>Waiting for players</h1>
          <div className="player-count">{players.length} / 8 players joined</div>
        </div>

        <RoomCodeDisplay code={roomCode} />

        <div className="share-hint">
          Share this code with players — they'll enter it to join
        </div>

        <div className="players-section">
          <div className="players-section-header">
            <span className="section-label">Players</span>
            <ConnectionDot connected={connected} />
          </div>

          {players.length === 0 ? (
            <div className="waiting-hint">
              <div className="waiting-anim" />
              <span>Waiting for players to join…</span>
            </div>
          ) : (
            <div className="players-list">
              {players.map(p => (
                <PlayerTag key={p.id} player={p} showKick onKick={onKick} />
              ))}
            </div>
          )}
        </div>

        <div className="host-actions">
          <button
            className="btn-start"
            disabled={!canStart}
            onClick={onStartGame}
          >
            Start Game →
          </button>
          <button className="btn-leave" onClick={onLeave}>
            ✕ End Session
          </button>
        </div>
      </div>
    </div>
  );
}
