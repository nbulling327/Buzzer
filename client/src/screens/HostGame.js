import React, { useRef, useEffect, useState } from 'react';
import { ConnectionDot } from '../components/UI';
import './HostGame.css';

const ROLE_ORDER = ['Captain', 'Person 1', 'Person 2', 'Person 3'];
const CATEGORIES = ['Biology', 'Chemistry', 'Earth and Space Science', 'Energy', 'Mathematics', 'Physics'];

function useTimer(running) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);
  const reset = () => { startRef.current = Date.now(); setElapsed(0); };
  return { elapsed, reset };
}

function useGameTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return elapsed;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Flow states: 'category' | 'buzzer' | 'scored_tossup' | 'bonus'
export default function HostGame({ roomCode, roomState, onOpenBuzzer, onReset, onScore, onResetScores, onKick, onLeave, connected }) {
  const { players = [], buzzedIn, locked, buzzerOpen, scores = { red: 0, blue: 0 } } = roomState;

  const [flow, setFlow] = useState('category'); // current step
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [log, setLog] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null); // building log entry for current question

  const { elapsed: qElapsed, reset: resetQTimer } = useTimer(flow === 'buzzer');
  const gameElapsed = useGameTimer();

  const redPlayers = ROLE_ORDER.map(r => players.find(p => p.team === 'red' && p.role === r)).filter(Boolean);
  const bluePlayers = ROLE_ORDER.map(r => players.find(p => p.team === 'blue' && p.role === r)).filter(Boolean);

  const buzzColor = buzzedIn?.team === 'red' ? 'var(--red)' : 'var(--blue)';
  const buzzGlow = buzzedIn?.team === 'red' ? 'var(--red-glow)' : 'var(--blue-glow)';

  // When someone buzzes in, move to scoring state
  useEffect(() => {
    if (locked && buzzedIn && flow === 'buzzer') {
      setFlow('buzzed');
    }
  }, [locked, buzzedIn, flow]);

  const handleOpenQuestion = () => {
    if (!selectedCategory) return;
    const entry = { q: log.length + 1, category: selectedCategory, events: [] };
    setCurrentEntry(entry);
    resetQTimer();
    onOpenBuzzer();
    setFlow('buzzer');
  };

  const handleTossup = () => {
    // Award +4 to buzzer's team, auto-assign to buzzer
    const team = buzzedIn.team;
    const player = buzzedIn.name;
    onScore('tossup', team);
    setCurrentEntry(prev => ({
      ...prev,
      events: [...prev.events, { type: 'Tossup', pts: '+4', player, team }]
    }));
    setFlow('bonus'); // go to bonus step
  };

  const handleBlurp = () => {
    const team = buzzedIn.team;
    const player = buzzedIn.name;
    onScore('blurp', team);
    setCurrentEntry(prev => ({
      ...prev,
      events: [...prev.events, { type: 'Blurp (interrupt)', pts: '-4', player, team }]
    }));
    // After blurp, server resets buzzer — go back to buzzer open state
    onOpenBuzzer();
    setFlow('buzzer');
    resetQTimer();
  };

  const handleBonus = () => {
    // Award +10 to tossup winner's team
    const tossupEvent = currentEntry?.events.find(e => e.type === 'Tossup');
    const team = tossupEvent?.team;
    if (!team) return;
    onScore('bonus', team);
    setCurrentEntry(prev => ({
      ...prev,
      events: [...prev.events, { type: 'Bonus', pts: '+10', player: null, team }]
    }));
    finalizeEntry(true);
  };

  const handleSkipBonus = () => {
    finalizeEntry(true);
  };

  const handleReset = () => {
    finalizeEntry(false);
    onReset();
    resetQTimer();
    setFlow('category');
    setSelectedCategory(null);
  };

  const finalizeEntry = (keepEntry) => {
    if (currentEntry) {
      setLog(prev => [...prev, currentEntry]);
    }
    setCurrentEntry(null);
    if (keepEntry) {
      onReset();
      setFlow('category');
      setSelectedCategory(null);
    }
  };

  const downloadLog = () => {
    if (log.length === 0) return;
    const lines = [];
    log.forEach(entry => {
      if (entry.events.length === 0) {
        lines.push(`Q${entry.q} | ${entry.category} | No points awarded`);
      } else {
        entry.events.forEach((ev, i) => {
          const playerStr = ev.player
            ? `${ev.player} (${ev.team === 'red' ? 'Red' : 'Blue'})`
            : `${ev.team === 'red' ? 'Red' : 'Blue'} Team`;
          const prefix = i === 0 ? `Q${entry.q} | ${entry.category}` : `   ${' '.repeat(String(entry.q).length + entry.category.length + 3)}`;
          lines.push(`Q${entry.q} | ${entry.category} | ${playerStr} | ${ev.pts} ${ev.type}`);
        });
      }
    });
    const header = `BuzzIn — Science Bowl Question Log\nRoom: ${roomCode}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sciencebowl-log-${roomCode}.txt`; a.click();
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
            <button className="hg-download-btn" onClick={downloadLog}>↓ Log ({log.length})</button>
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
          <div className="hg-timer-row">
            <div className="hg-timer-block">
              <div className="hg-timer-label">Game</div>
              <div className="hg-timer">{formatTime(gameElapsed)}</div>
            </div>
            <div className="hg-timer-sep" />
            <div className="hg-timer-block">
              <div className="hg-timer-label">Question</div>
              <div className="hg-timer">{formatTime(qElapsed)}</div>
            </div>
          </div>
          <div className="hg-timer-actions">
            <button className="hg-reset-scores" onClick={onResetScores}>Reset scores</button>
            {(flow === 'buzzer' || flow === 'buzzed') && (
              <button className="hg-reset-qtimer" onClick={resetQTimer}>Reset Q timer</button>
            )}
          </div>
        </div>
        <div className="hg-score-side blue">
          <div className="hg-score-label">Blue Team</div>
          <div className="hg-score-value blue">{scores.blue}</div>
        </div>
      </div>

      {/* FLOW: Category selection */}
      {flow === 'category' && (
        <div className="hg-category-area fade-in">
          <div className="hg-category-label">Select category for Q{log.length + 1}</div>
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
            onClick={handleOpenQuestion}
          >
            {selectedCategory ? `Open buzzer — ${selectedCategory}` : 'Pick a category first'}
          </button>
        </div>
      )}

      {/* Current question badge */}
      {flow !== 'category' && selectedCategory && (
        <div className="hg-current-category fade-in">
          <span className="hg-cat-badge">{selectedCategory}</span>
          <span className="hg-q-num">Q{currentEntry?.q || log.length + 1}</span>
        </div>
      )}

      {/* FLOW: Buzzer open, waiting */}
      {flow === 'buzzer' && (
        <div className="hg-main fade-in">
          <div className="hg-waiting">
            <div className="hg-waiting-rings">
              <div className="hg-ring hg-ring-1" />
              <div className="hg-ring hg-ring-2" />
              <div className="hg-ring hg-ring-3" />
            </div>
            <div className="hg-waiting-center">
              <div className="hg-waiting-icon">⚡</div>
              <div className="hg-waiting-text">Buzzer open — waiting…</div>
            </div>
          </div>
          <div className="hg-reset-area">
            <button className="hg-reset-btn active" onClick={handleReset}>↺ Cancel question</button>
          </div>
        </div>
      )}

      {/* FLOW: Someone buzzed in */}
      {flow === 'buzzed' && buzzedIn && (
        <div className="hg-main fade-in">
          <div className="hg-buzzed-display scale-in" style={{ '--buzz-color': buzzColor, '--buzz-glow': buzzGlow }}>
            <div className="hg-buzz-glow-bg" />
            <div className="hg-buzz-team-tag" style={{ color: buzzColor }}>
              {buzzedIn.team === 'red' ? '🔴 Red Team' : '🔵 Blue Team'}
            </div>
            <div className="hg-buzz-name">{buzzedIn.name}</div>
            <div className="hg-buzz-role">{buzzedIn.role}</div>
          </div>
          <div className="hg-score-actions fade-in">
            <div className="hg-score-btns">
              <button className="hg-score-btn tossup" onClick={handleTossup}>
                <span className="hg-score-btn-pts">+4</span>
                <span className="hg-score-btn-label">Tossup</span>
              </button>
              <button className="hg-score-btn blurp" onClick={handleBlurp}>
                <span className="hg-score-btn-pts">−4</span>
                <span className="hg-score-btn-label">Blurp</span>
              </button>
            </div>
            <button className="hg-reset-btn active" onClick={handleReset}>↺ Reset (no points)</button>
          </div>
        </div>
      )}

      {/* FLOW: Bonus step (after tossup) */}
      {flow === 'bonus' && (
        <div className="hg-main fade-in">
          <div className="hg-bonus-panel scale-in">
            <div className="hg-bonus-title">Award bonus?</div>
            <div className="hg-bonus-sub">
              {currentEntry?.events.find(e => e.type === 'Tossup')?.player} answered correctly
            </div>
            <div className="hg-bonus-btns">
              <button className="hg-score-btn bonus big" onClick={handleBonus}>
                <span className="hg-score-btn-pts">+10</span>
                <span className="hg-score-btn-label">Award Bonus</span>
              </button>
            </div>
            <button className="hg-reset-btn active" onClick={handleSkipBonus}>Skip bonus →</button>
          </div>
        </div>
      )}

      {/* Log preview */}
      {log.length > 0 && (
        <div className="hg-log-preview fade-in">
          <div className="hg-log-header">Recent questions</div>
          {log.slice(-3).reverse().map(entry => (
            <div key={entry.q} className="hg-log-entry">
              {entry.events.length === 0 ? (
                <div className="hg-log-row">
                  <span className="hg-log-q">Q{entry.q}</span>
                  <span className="hg-log-cat">{entry.category}</span>
                  <span className="hg-log-player" style={{ color: 'var(--text-dim)' }}>No points</span>
                  <span className="hg-log-pts" />
                </div>
              ) : (
                entry.events.map((ev, i) => (
                  <div key={i} className="hg-log-row">
                    <span className="hg-log-q">{i === 0 ? `Q${entry.q}` : ''}</span>
                    <span className="hg-log-cat">{i === 0 ? entry.category : ''}</span>
                    <span className="hg-log-player">
                      {ev.player ? `${ev.player} (${ev.team === 'red' ? 'Red' : 'Blue'})` : `${ev.team === 'red' ? 'Red' : 'Blue'} Team`}
                    </span>
                    <span className={`hg-log-pts ${ev.pts.startsWith('+') ? 'pos' : 'neg'}`}>{ev.pts}</span>
                  </div>
                ))
              )}
            </div>
          ))}
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
