import React, { useRef, useEffect, useState } from 'react';
import { ConnectionDot } from '../components/UI';
import './HostGame.css';

const ROLE_ORDER = ['Captain', 'Person 1', 'Person 2', 'Person 3'];
const CATEGORIES = ['Biology', 'Chemistry', 'Earth and Space Science', 'Energy', 'Mathematics', 'Physics'];

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const reset = () => {
    startRef.current = Date.now();
    setElapsed(0);
  };

  return { elapsed, reset };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function HostGame({ roomCode, roomState, onReset, onScore, onResetScores, onKick, onLeave, connected }) {
  const { players = [], buzzedIn, locked, scores = { red: 0, blue: 0 } } = roomState;
  const { elapsed, reset: resetTimer } = useTimer();

  // Category selection (before question)
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionOpen, setQuestionOpen] = useState(false);

  // Player assignment modal (after scoring tossup/blurp)
  const [pendingLog, setPendingLog] = useState(null); // { type, team, category }
  const [assigningPlayer, setAssigningPlayer] = useState(false);

  // Question log
  const [log, setLog] = useState([]);

  const redPlayers = ROLE_ORDER.map(role => players.find(p => p.team === 'red' && p.role === role)).filter(Boolean);
  const bluePlayers = ROLE_ORDER.map(role => players.find(p => p.team === 'blue' && p.role === role)).filter(Boolean);

  const buzzColor = buzzedIn?.team === 'red' ? 'var(--red)' : 'var(--blue)';
  const buzzGlow = buzzedIn?.team === 'red' ? 'var(--red-glow)' : 'var(--blue-glow)';

  const openQuestion = () => {
    if (!selectedCategory) return;
    setQuestionOpen(true);
  };

  const handleScore = (type) => {
    const team = buzzedIn?.team;
    const category = selectedCategory;
    onScore(type);
    resetTimer();
    setQuestionOpen(false);
    setSelectedCategory(null);

    if (type === 'bonus') {
      // Bonus: record to team, no player assignment
      setLog(prev => [...prev, {
        q: prev.length + 1,
        category,
        player: null,
        team,
        type: 'Bonus',
        pts: '+10'
      }]);
    } else {
      // Tossup or blurp: need player assignment
      setPendingLog({ type, team, category, buzzedInPlayer: buzzedIn });
      setAssigningPlayer(true);
    }
  };

  const handleReset = () => {
    onReset();
    resetTimer();
    setQuestionOpen(false);
    setSelectedCategory(null);
  };

  const handleAssignPlayer = (player) => {
    if (!pendingLog) return;
    const { type, team, category } = pendingLog;
    setLog(prev => [...prev, {
      q: prev.length + 1,
      category,
      player: player.name,
      team,
      type: type === 'tossup' ? 'Tossup' : 'Blurp (interrupt)',
      pts: type === 'tossup' ? '+4' : '-4'
    }]);
    setPendingLog(null);
    setAssigningPlayer(false);
  };

  const downloadLog = () => {
    if (log.length === 0) return;
    const lines = log.map(e => {
      const playerStr = e.player
        ? `${e.player} (${e.team === 'red' ? 'Red' : 'Blue'})`
        : `${e.team === 'red' ? 'Red' : 'Blue'} Team`;
      return `Q${e.q} | ${e.category} | ${playerStr} | ${e.pts} ${e.type}`;
    });
    const header = `BuzzIn — Science Bowl Question Log\nRoom: ${roomCode}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    const text = header + lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sciencebowl-log-${roomCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="host-game">

      {/* Header */}
      <div className="hg-header fade-in">
        <div className="hg-header-left">
          <div className="host-badge-sm">HOST</div>
          <div className="hg-room-code">{roomCode}</div>
          <ConnectionDot connected={connected} />
          <span className="hg-player-count">{players.length} player{players.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="hg-header-right">
          {log.length > 0 && (
            <button className="hg-download-btn" onClick={downloadLog}>
              ↓ Download Log ({log.length})
            </button>
          )}
          <button className="hg-leave" onClick={onLeave}>End Session</button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="hg-scoreboard fade-in">
        <div className="hg-score-side red">
          <div className="hg-score-label">Red Team</div>
          <div className="hg-score-value red">{scores.red}</div>
        </div>
        <div className="hg-score-divider">
          <div className="hg-timer">{formatTime(elapsed)}</div>
          <button className="hg-reset-scores" onClick={onResetScores}>Reset scores</button>
        </div>
        <div className="hg-score-side blue">
          <div className="hg-score-label">Blue Team</div>
          <div className="hg-score-value blue">{scores.blue}</div>
        </div>
      </div>

      {/* Player assignment modal */}
      {assigningPlayer && pendingLog && (
        <div className="hg-assign-overlay fade-in">
          <div className="hg-assign-modal scale-in">
            <div className="hg-assign-title">
              Who got the {pendingLog.type === 'tossup' ? 'tossup' : 'interrupt'}?
            </div>
            <div className="hg-assign-sub">{pendingLog.category}</div>
            <div className="hg-assign-players">
              {players.map(p => (
                <button
                  key={p.id}
                  className={`hg-assign-btn ${p.team}`}
                  onClick={() => handleAssignPlayer(p)}
                >
                  <span className="hg-assign-dot" style={{ background: p.team === 'red' ? 'var(--red)' : 'var(--blue)' }} />
                  <span className="hg-assign-name">{p.name}</span>
                  <span className="hg-assign-role">{p.role}</span>
                </button>
              ))}
            </div>
            <button className="hg-assign-skip" onClick={() => { setPendingLog(null); setAssigningPlayer(false); }}>
              Skip (don't record player)
            </button>
          </div>
        </div>
      )}

      {/* Category picker — shown before question is open */}
      {!questionOpen && !locked && (
        <div className="hg-category-area fade-in">
          <div className="hg-category-label">Select category for next question</div>
          <div className="hg-category-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`hg-cat-btn ${selectedCategory === cat ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            className={`hg-open-btn ${selectedCategory ? 'active' : 'idle'}`}
            disabled={!selectedCategory}
            onClick={openQuestion}
          >
            {selectedCategory ? `Open buzzer — ${selectedCategory}` : 'Pick a category first'}
          </button>
        </div>
      )}

      {/* Current category badge */}
      {(questionOpen || locked) && selectedCategory && (
        <div className="hg-current-category fade-in">
          <span className="hg-cat-badge">{selectedCategory}</span>
          <span className="hg-q-num">Q{log.length + 1}</span>
        </div>
      )}

      {/* Main buzz display */}
      {(questionOpen || locked) && (
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
            <div className="hg-buzzed-display scale-in" style={{ '--buzz-color': buzzColor, '--buzz-glow': buzzGlow }}>
              <div className="hg-buzz-glow-bg" />
              <div className="hg-buzz-team-tag" style={{ color: buzzColor }}>
                {buzzedIn?.team === 'red' ? '🔴 Red Team' : '🔵 Blue Team'}
              </div>
              <div className="hg-buzz-name">{buzzedIn?.name}</div>
              <div className="hg-buzz-role">{buzzedIn?.role}</div>
            </div>
          )}
        </div>
      )}

      {/* Scoring buttons */}
      {locked ? (
        <div className="hg-score-actions fade-in">
          <div className="hg-score-btns">
            <button className="hg-score-btn tossup" onClick={() => handleScore('tossup')}>
              <span className="hg-score-btn-pts">+4</span>
              <span className="hg-score-btn-label">Tossup</span>
            </button>
            <button className="hg-score-btn blurp" onClick={() => handleScore('blurp')}>
              <span className="hg-score-btn-pts">−4</span>
              <span className="hg-score-btn-label">Blurp</span>
            </button>
            <button className="hg-score-btn bonus" onClick={() => handleScore('bonus')}>
              <span className="hg-score-btn-pts">+10</span>
              <span className="hg-score-btn-label">Bonus</span>
            </button>
          </div>
          <button className="hg-reset-btn active" onClick={handleReset}>
            ↺ Reset (no points)
          </button>
        </div>
      ) : questionOpen ? (
        <div className="hg-reset-area fade-in">
          <button className="hg-reset-btn active" onClick={handleReset}>
            ↺ Reset question
          </button>
        </div>
      ) : null}

      {/* Recent log preview */}
      {log.length > 0 && (
        <div className="hg-log-preview fade-in">
          <div className="hg-log-header">Recent questions</div>
          {log.slice(-3).reverse().map(e => {
            const playerStr = e.player
              ? `${e.player} (${e.team === 'red' ? 'Red' : 'Blue'})`
              : `${e.team === 'red' ? 'Red' : 'Blue'} Team`;
            return (
              <div key={e.q} className="hg-log-row">
                <span className="hg-log-q">Q{e.q}</span>
                <span className="hg-log-cat">{e.category}</span>
                <span className="hg-log-player">{playerStr}</span>
                <span className={`hg-log-pts ${e.pts.startsWith('+') ? 'pos' : 'neg'}`}>{e.pts}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Team columns */}
      <div className="hg-teams fade-in">
        <TeamColumn team="red" label="🔴 Red Team" players={redPlayers} buzzedIn={buzzedIn} onKick={onKick} />
        <TeamColumn team="blue" label="🔵 Blue Team" players={bluePlayers} buzzedIn={buzzedIn} onKick={onKick} />
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
            <div key={p.id} className={`hg-player-row ${isBuzzed ? 'buzzed' : ''} fade-in`}>
              <div className="hg-player-dot" />
              <div className="hg-player-info">
                <span className="hg-player-name">{p.name}</span>
                <span className="hg-player-role">{p.role}</span>
              </div>
              {isBuzzed && <div className="hg-buzzed-tag">BUZZED</div>}
              <button className="hg-kick-btn" onClick={() => onKick(p.id)} title="Remove player">✕</button>
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
