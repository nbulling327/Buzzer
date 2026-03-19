import React, { useState } from 'react';
import { Logo, ErrorBanner, ConnectionDot } from '../components/UI';
import './Landing.css';

export default function Landing({ onCreateRoom, onJoinRoom, error, clearError, connected }) {
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'join'

  const handleJoin = () => {
    if (code.trim().length > 0) onJoinRoom(code);
  };

  return (
    <div className="landing">
      <ErrorBanner message={error} onClear={clearError} />

      <div className="landing-content fade-in">
        <div className="landing-header">
          <Logo />
          <p className="landing-sub">Science Bowl buzzer system</p>
        </div>

        {mode === null && (
          <div className="landing-actions scale-in">
            <button className="btn-primary btn-host" onClick={onCreateRoom}>
              <span className="btn-icon">⚡</span>
              Host a Game
            </button>
            <button className="btn-secondary" onClick={() => setMode('join')}>
              Join a Game
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="join-form scale-in">
            <p className="join-label">Enter room code</p>
            <div className="code-input-row">
              <input
                className="code-input"
                type="text"
                placeholder="XXXX"
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
              />
              <button className="btn-primary btn-go" onClick={handleJoin} disabled={code.trim().length === 0}>
                Go →
              </button>
            </div>
            <button className="btn-back" onClick={() => { setMode(null); setCode(''); clearError(); }}>
              ← Back
            </button>
          </div>
        )}

        <div className="landing-footer">
          <ConnectionDot connected={connected} />
          <span>{connected ? 'Connected to server' : 'Connecting…'}</span>
        </div>
      </div>

      <div className="landing-bg-decoration" />
    </div>
  );
}
