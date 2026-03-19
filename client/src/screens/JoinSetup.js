import React, { useState } from 'react';
import { ErrorBanner } from '../components/UI';
import './JoinSetup.css';

const ROLES = ['Captain', 'Person 1', 'Person 2', 'Person 3'];

export default function JoinSetup({ roomCode, onPlayerJoin, onLeave, error, clearError, roomState }) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState(null);
  const [role, setRole] = useState(null);

  const takenSlots = new Set(
    (roomState.players || []).map(p => `${p.team}:${p.role}`)
  );

  const isSlotTaken = (t, r) => takenSlots.has(`${t}:${r}`);

  const canJoin = name.trim().length >= 1 && team && role;

  const handleSubmit = () => {
    if (!canJoin) return;
    onPlayerJoin(name.trim(), team, role);
  };

  return (
    <div className="join-setup">
      <ErrorBanner message={error} onClear={clearError} />

      <div className="join-setup-content fade-in">
        <div className="join-setup-header">
          <div className="join-room-badge">Room <span>{roomCode}</span></div>
          <h1>Set up your player</h1>
        </div>

        {/* Name */}
        <div className="setup-section">
          <label className="setup-label">Your name</label>
          <input
            className="setup-name-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            maxLength={20}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        {/* Team */}
        <div className="setup-section">
          <label className="setup-label">Choose your team</label>
          <div className="team-picker">
            <button
              className={`team-btn team-red ${team === 'red' ? 'selected' : ''}`}
              onClick={() => { setTeam('red'); setRole(null); }}
            >
              <span className="team-dot red" />
              Red Team
            </button>
            <button
              className={`team-btn team-blue ${team === 'blue' ? 'selected' : ''}`}
              onClick={() => { setTeam('blue'); setRole(null); }}
            >
              <span className="team-dot blue" />
              Blue Team
            </button>
          </div>
        </div>

        {/* Role */}
        <div className="setup-section">
          <label className="setup-label">Choose your role</label>
          <div className="role-picker">
            {ROLES.map(r => {
              const taken = team ? isSlotTaken(team, r) : false;
              return (
                <button
                  key={r}
                  className={`role-btn ${role === r ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                  disabled={taken || !team}
                  onClick={() => !taken && setRole(r)}
                >
                  {r}
                  {taken && <span className="taken-label">Taken</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="setup-actions">
          <button className="btn-join" disabled={!canJoin} onClick={handleSubmit}>
            Join Game →
          </button>
          <button className="btn-back-small" onClick={onLeave}>← Back</button>
        </div>
      </div>
    </div>
  );
}
