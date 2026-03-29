import React, { useState, useEffect, useRef } from 'react';
import './PlayerGame.css';

export default function PlayerGame({ myPlayer, roomState, onBuzz, onLeave }) {
  const { buzzedIn, locked, buzzerOpen, scores = { red: 0, blue: 0 } } = roomState;
  const players = roomState.players || [];

  const iMe = myPlayer;
  const buzzedMe = buzzedIn && buzzedIn.id === iMe?.id;
  const canBuzz = buzzerOpen && !locked;

  const teamColor = iMe?.team === 'red' ? 'var(--red)' : 'var(--blue)';
  const teamColorGlow = iMe?.team === 'red' ? 'var(--red-glow)' : 'var(--blue-glow)';
  const teamName = iMe?.team === 'red' ? 'Red' : 'Blue';

  const [ripple, setRipple] = useState(false);
  const rippleTimer = useRef(null);

  useEffect(() => { return () => clearTimeout(rippleTimer.current); }, []);

  const handleBuzz = () => {
    if (!canBuzz) return;
    onBuzz();
    setRipple(true);
    rippleTimer.current = setTimeout(() => setRipple(false), 700);
  };

  const redPlayers = players.filter(p => p.team === 'red');
  const bluePlayers = players.filter(p => p.team === 'blue');

  const statusText = () => {
    if (!buzzerOpen && !locked) return 'Waiting for host to open buzzer…';
    if (canBuzz) return 'Tap to buzz in';
    if (buzzedMe) return 'You got it!';
    return `${buzzedIn?.name} was first`;
  };

  const btnLabel = () => {
    if (!buzzerOpen && !locked) return '⏸';
    if (canBuzz) return 'BUZZ';
    if (buzzedMe) return '✓';
    return '—';
  };

  return (
    <div className="player-game" style={{ '--team-color': teamColor, '--team-glow': teamColorGlow }}>

      <div className="pg-topbar">
        <div className="pg-identity">
          <div className="pg-team-dot" />
          <div>
            <div className="pg-name">{iMe?.name}</div>
            <div className="pg-role">{iMe?.role} · {teamName} Team</div>
          </div>
        </div>
        <button className="pg-leave" onClick={onLeave}>Leave</button>
      </div>

      <div className="pg-scoreboard">
        <div className="pg-score-side">
          <div className="pg-score-label red">Red</div>
          <div className="pg-score-num red">{scores.red}</div>
        </div>
        <div className="pg-score-vs">VS</div>
        <div className="pg-score-side">
          <div className="pg-score-label blue">Blue</div>
          <div className="pg-score-num blue">{scores.blue}</div>
        </div>
      </div>

      <div className="pg-main">
        {locked && (
          <div className={`buzz-banner ${buzzedMe ? 'buzz-me' : 'buzz-other'} scale-in`}>
            {buzzedMe ? (
              <>
                <div className="buzz-banner-icon">⚡</div>
                <div className="buzz-banner-text">
                  <div className="buzz-banner-title">You buzzed in!</div>
                  <div className="buzz-banner-sub">Waiting for host…</div>
                </div>
              </>
            ) : (
              <>
                <div className="buzz-banner-icon buzz-other-icon">🔔</div>
                <div className="buzz-banner-text">
                  <div className="buzz-banner-title">
                    <span style={{ color: buzzedIn?.team === 'red' ? 'var(--red)' : 'var(--blue)' }}>
                      {buzzedIn?.name}
                    </span>{' '}buzzed in
                  </div>
                  <div className="buzz-banner-sub">
                    {buzzedIn?.role} · {buzzedIn?.team === 'red' ? 'Red' : 'Blue'} Team
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="buzzer-wrap">
          {ripple && <div className="buzzer-ripple" />}
          {canBuzz && <div className="buzzer-pulse-ring" />}
          <button
            className={`buzzer-btn ${canBuzz ? 'ready' : locked && buzzedMe ? 'buzzed-me' : !buzzerOpen ? 'closed' : 'buzzed-other'}`}
            onClick={handleBuzz}
            disabled={!canBuzz}
          >
            <span className="buzzer-label">{btnLabel()}</span>
          </button>
        </div>

        <div className="buzzer-status">{statusText()}</div>
      </div>

      <div className="pg-roster">
        <div className="pg-roster-team red">
          {redPlayers.map(p => (
            <div key={p.id} className={`pg-roster-player ${p.id === buzzedIn?.id ? 'buzzed' : ''} ${p.id === iMe?.id ? 'me' : ''}`}>
              <span className="pg-roster-dot red" />
              <span>{p.name}</span>
              {p.id === iMe?.id && <span className="pg-you-tag">you</span>}
            </div>
          ))}
        </div>
        <div className="pg-roster-divider" />
        <div className="pg-roster-team blue">
          {bluePlayers.map(p => (
            <div key={p.id} className={`pg-roster-player ${p.id === buzzedIn?.id ? 'buzzed' : ''} ${p.id === iMe?.id ? 'me' : ''}`}>
              <span className="pg-roster-dot blue" />
              <span>{p.name}</span>
              {p.id === iMe?.id && <span className="pg-you-tag">you</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
