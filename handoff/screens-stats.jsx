// screens-stats.jsx — Statistics across all games. Per-player breakdown
// (wins, hands, gins, biggest hand, win-rate, current streak) plus a small
// overall summary at the top.

function StatsScreen({ store, onBack }) {
  const { t } = useT();
  // Re-running across every render is fine at small scales but becomes
  // noticeable past ~200 games. Memoize on the parts that affect the result.
  const stats = React.useMemo(() => computeStats(store), [store.games, store.players]);
  const h2hMap = React.useMemo(() => computeHeadToHead(store), [store.games, store.players]);
  const rows = store.players
    .map((p) => stats[p.id])
    .filter(Boolean)
    .sort((a, b) => b.wins - a.wins || b.handsWon - a.handsWon);

  const totalGames = store.games.filter((g) => g.phase === 'finished').length;
  const inProgress = store.games.filter((g) => g.phase === 'playing').length;
  const totalHands = store.games.reduce((s, g) => s + g.hands.length, 0);

  const h2hRows = Object.values(h2hMap)
    .sort((a, b) => b.total - a.total || b.lastPlayed - a.lastPlayed);

  return (
    <div className="fade" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '24px 20px 24px',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <button className="btn-ghost press" onClick={onBack}>← {t('home')}</button>
        <Crest>{t('theRecord')}</Crest>
        <div style={{ width: 56 }} />
      </div>

      {/* totals strip */}
      <div className="parchment" style={{
        padding: '12px 14px', marginTop: 6,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        alignItems: 'center',
      }}>
        <BigStat label="Games" value={totalGames} sub={inProgress ? `${inProgress} in play` : null} />
        <BigStat label="Hands" value={totalHands} />
        <BigStat label="Players" value={rows.length} />
      </div>

      {rows.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          color: 'rgba(255,255,255,0.5)', padding: 24,
          textAlign: 'center',
        }}>
          <Suit symbol="♦" color="var(--brass-deep)" size={32} />
          <div className="display" style={{ fontSize: 20, color: 'var(--parchment)', marginTop: 8 }}>
            {t('nothingToCount')}
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
          }}>{t('playAFew')}</div>
        </div>
      ) : (
        <div style={{
          marginTop: 14, flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '2px 8px 8px 2px',
          scrollbarGutter: 'stable',
        }}>
          {rows.map((s, i) => <PlayerCard key={s.id} stats={s} rank={i + 1} />)}

          {h2hRows.length > 0 && (
            <>
              <div className="eyebrow" style={{
                color: 'var(--brass)', textAlign: 'center', margin: '10px 0 4px',
                letterSpacing: '0.18em',
              }}>{t('headToHead')}</div>
              {h2hRows.map((e) => <H2HCard key={e.players[0].id + e.players[1].id} entry={e} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BigStat({ label, value, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="num" style={{
        fontSize: 32, lineHeight: 1, color: 'var(--ink)', fontWeight: 600,
      }}>{value}</div>
      <div className="eyebrow" style={{
        marginTop: 4, color: 'var(--ink-faint)', fontSize: 9.5,
      }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: 10, color: 'var(--brass-deep)', marginTop: 2,
          fontFamily: 'var(--serif)', fontStyle: 'italic',
        }}>{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Per-player card: rank/name across the top, big win count + win-rate bar,
// then a grid of secondary stats.
// ─────────────────────────────────────────────────────────────────────────
function PlayerCard({ stats, rank }) {
  const { t } = useT();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;
  return (
    <div className="parchment" style={{ padding: '14px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="num" style={{
            fontSize: 18, color: rank === 1 ? 'var(--brass-deep)' : 'var(--ink-faint)',
            fontWeight: 600,
          }}>{rank === 1 ? '★' : `${rank}.`}</span>
          <span className="display" style={{
            fontSize: 22, color: 'var(--ink)', letterSpacing: '0.005em',
          }}>{stats.name}</span>
        </div>
        {stats.currentStreak >= 2 && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 999,
            background: 'oklch(0.85 0.08 80)',
            color: 'oklch(0.30 0.10 65)',
            fontFamily: 'var(--sans)', fontWeight: 600,
            letterSpacing: '0.08em',
          }}>{t('streak', stats.currentStreak)}</span>
        )}
      </div>

      {/* big numbers row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        marginTop: 10, alignItems: 'baseline',
      }}>
        <BigCell value={stats.wins} label={t('wins', stats.wins)} accent />
        <BigCell value={stats.gamesPlayed - stats.wins} label={t('losses', stats.gamesPlayed - stats.wins)} />
        <BigCell value={`${winRate}%`} label={t('winRate')} />
      </div>

      {/* win-rate bar */}
      <div style={{
        marginTop: 8, height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: winRate + '%', height: '100%',
          background: 'linear-gradient(90deg, var(--brass-deep), var(--brass))',
          borderRadius: 999,
        }} />
      </div>

      {/* sub stats — small grid */}
      <div style={{
        marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px 16px',
      }}>
        <SubStat label={t('handsWon')} value={`${stats.handsWon} / ${stats.handsPlayed}`} />
        <SubStat label={t('biggestHand')} value={stats.biggestHand || '—'} />
        <SubStat label={t('ginsCalled')} value={stats.longGins > 0 ? `${stats.gins} (${stats.longGins} ${t('longGinSuffix')})` : stats.gins} accent={stats.gins > 0} />
        <SubStat label={t('undercuts')} value={stats.undercuts} />
      </div>
    </div>
  );
}

function BigCell({ value, label, accent }) {
  return (
    <div>
      <div className="num" style={{
        fontSize: 30, fontWeight: 600, lineHeight: 1,
        color: accent ? 'var(--ink)' : 'var(--ink-soft)',
      }}>{value}</div>
      <div className="eyebrow" style={{
        marginTop: 2, color: 'var(--ink-faint)', fontSize: 9.5,
      }}>{label}</div>
    </div>
  );
}

function SubStat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{
        fontSize: 12, color: 'var(--ink-soft)',
      }}>{label}</span>
      <span className="num" style={{
        fontSize: 14, fontWeight: 600,
        color: accent ? 'var(--brass-deep)' : 'var(--ink)',
      }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Head-to-head card — for a 2-player game the rivalry record is the most
// interesting number. Shows W-L between the two, with a horizontal bar.
// ─────────────────────────────────────────────────────────────────────────
function H2HCard({ entry }) {
  const { t } = useT();
  const [p0, p1] = entry.players;
  const [w0, w1] = entry.wins;
  const total = entry.total;
  const pct0 = total ? (w0 / total) * 100 : 50;
  const leader = w0 === w1 ? -1 : w0 > w1 ? 0 : 1;
  return (
    <div className="parchment" style={{ padding: '14px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="display" style={{
            fontSize: 16, color: leader === 0 ? 'var(--ink)' : 'var(--ink-soft)',
            fontWeight: leader === 0 ? 600 : 500,
            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'inline-block',
          }}>{p0.name}</span>
          <span style={{ color: 'var(--ink-faint)', fontSize: 11, letterSpacing: '0.08em' }}>{t('versus')}</span>
          <span className="display" style={{
            fontSize: 16, color: leader === 1 ? 'var(--ink)' : 'var(--ink-soft)',
            fontWeight: leader === 1 ? 600 : 500,
            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'inline-block',
          }}>{p1.name}</span>
        </div>
        <span className="num" style={{
          fontSize: 18, color: 'var(--ink)', fontWeight: 600,
        }}>{w0}<span style={{ color: 'var(--ink-faint)', margin: '0 4px', fontSize: 14 }}>–</span>{w1}</span>
      </div>
      <div style={{
        height: 4, borderRadius: 999, overflow: 'hidden',
        background: 'rgba(0,0,0,0.06)',
        display: 'flex',
      }}>
        <div style={{
          width: pct0 + '%',
          background: leader === 0 ? 'var(--brass-deep)' : 'var(--ink-faint)',
        }} />
        <div style={{
          flex: 1,
          background: leader === 1 ? 'var(--brass-deep)' : 'var(--ink-faint)',
        }} />
      </div>
      <div style={{
        marginTop: 6,
        fontSize: 10, color: 'var(--ink-faint)',
        letterSpacing: '0.04em',
      }}>{t('nGames', total)}{leader >= 0 && (
        <span> · <span style={{ color: 'var(--brass-deep)', fontWeight: 600 }}>
          {t('leadsBy', entry.players[leader].name, Math.abs(w0 - w1))}
        </span></span>
      )}</div>
    </div>
  );
}

Object.assign(window, { StatsScreen, PlayerCard, H2HCard });
