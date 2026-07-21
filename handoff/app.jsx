// app.jsx — root: routes views, owns the persistent store, dispatches
// mutations through pure helpers in state.jsx. Persists on every change.

const { useState: useSA, useEffect: useEA } = React;

function App() {
  const [store, setStore] = useSA(() => loadStore());
  useEA(() => { saveStore(store); }, [store]);

  // ── locale (auto / en / de / ru / …) ─────────────────────────────────
  const localeSetting = store.locale || 'auto';
  const locale = resolveLocale(localeSetting);
  const t = React.useMemo(() => makeT(locale), [locale]);
  const setLocale = (l) => setStore((s) => ({ ...s, locale: l }));

  // ── theme (auto / light / dark) ────────────────────────────────────────
  const [systemDark, setSystemDark] = useSA(() =>
    typeof matchMedia !== 'undefined'
      ? matchMedia('(prefers-color-scheme: dark)').matches : true);
  useEA(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const theme = store.theme || 'auto';
  const resolved = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
  const setTheme = (t) => setStore((s) => ({ ...s, theme: t }));

  // ── transient (non-persistent) UI state ────────────────────────────────
  const [toast, setToast] = useSA(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // ── navigation ─────────────────────────────────────────────────────────
  const go = (view, opts = {}) => setStore((s) => ({ ...s, view, ...opts }));

  // ── players ────────────────────────────────────────────────────────────
  const renamePlayer = (id, name) => setStore((s) => renamePlayerInStore(s, id, name));
  const deletePlayer = (id) => setStore((s) => {
    const inUse = s.games.some((g) => g.p0Id === id || g.p1Id === id);
    if (inUse) return s;
    return { ...s, players: s.players.filter((p) => p.id !== id) };
  });

  // ── games ──────────────────────────────────────────────────────────────
  const startGameByNames = (entryA, entryB) => {
    setStore((s) => {
      let players = s.players;
      const resolveEntry = (entry) => {
        if (entry.id) return [players, entry.id];
        const p = newPlayer(entry.name);
        return [[...players, p], p.id];
      };
      let id0, id1;
      [players, id0] = resolveEntry(entryA);
      [players, id1] = resolveEntry(entryB);
      const g = newGame(id0, id1, s.rules);
      return { ...s, players, games: [...s.games, g], activeGameId: g.id, view: 'game' };
    });
  };

  const mutateActive = (fn) => setStore((s) => ({
    ...s,
    games: s.games.map((g) => g.id === s.activeGameId ? fn(g) : g),
  }));

  const scoreHand    = (entry)        => mutateActive((g) => applyHandToGame(g, entry));
  const undo         = ()             => mutateActive((g) => undoLastHand(g));
  const editHand     = (handId, p)    => mutateActive((g) => editHandInGame(g, handId, p));
  const deleteHand   = (handId)       => mutateActive((g) => deleteHandInGame(g, handId));

  const resumeGame   = (id) => setStore((s) => ({ ...s, activeGameId: id, view: 'game' }));
  const exitToHome   = ()   => setStore((s) => ({ ...s, view: 'home', activeGameId: null }));
  const deleteGame   = (id) => setStore((s) => ({
    ...s,
    games: s.games.filter((g) => g.id !== id),
    activeGameId: s.activeGameId === id ? null : s.activeGameId,
  }));

  // Same players, new game. Inherits the previous game's rules so "Another
  // Round?" keeps the same scoring setup the players were just using.
  const playAgain = () => {
    setStore((s) => {
      const cur = s.games.find((g) => g.id === s.activeGameId);
      if (!cur) return { ...s, view: 'home', activeGameId: null };
      const g = newGame(cur.p0Id, cur.p1Id, cur.rules);
      return { ...s, games: [...s.games, g], activeGameId: g.id, view: 'game' };
    });
  };

  // ── scoring rules ──────────────────────────────────────────────────────
  // Global defaults — apply to NEW games started from Home.
  const setRules = (rules) => setStore((s) => ({ ...s, rules: { ...DEFAULT_RULES, ...rules } }));
  // Per-game override — used from the in-game menu. Re-derives every hand's
  // totalThisHand so the ledger stays mathematically consistent.
  const setActiveGameRules = (rules) =>
    mutateActive((g) => applyRulesToGame(g, rules));

  // Hard wipe — used by Settings → "Delete all data". Resets the store to
  // its factory defaults and clears persisted data on next save tick.
  const wipeAll = () => {
    setStore(initialStore());
    showToast(t('wipeDone'));
  };

  // ── export / import ────────────────────────────────────────────────────
  const exportBackup = () => {
    const text = exportStoreJSON(store);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gin-rummy-counter-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t('backupDownloaded'));
  };

  // Hidden file input is mounted globally; clicking triggers picker.
  const importInputRef = React.useRef(null);
  const importBackup = () => importInputRef.current?.click();
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-picked
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseImportJSON(text);
      if (result.error) {
        // Map state-layer error strings to localized toasts.
        const map = {
          "That doesn't look like a valid backup file.": 'importInvalidJson',
          "This file isn't a Gin Rummy Counter backup.": 'importBadFormat',
          'Backup is missing players or games.': 'importMissing',
        };
        showToast(t(map[result.error] || 'importReadError'));
        return;
      }
      const ok = window.confirm(t('importConfirm',
        file.name, result.store.players.length, result.store.games.length));
      if (!ok) return;
      setStore(result.store);
      showToast(t('backupRestored'));
    } catch (err) {
      showToast(t('importReadError'));
    }
  };

  // ── render ─────────────────────────────────────────────────────────────
  const cls = `gr ${resolved === 'light' ? 'gr--light' : ''}`;
  const game = activeGame(store);
  const summary = game ? summaryForGame(game) : null;

  return (
    <LocaleContext.Provider value={{ t, locale, setLocale, localeSetting }}>
    <div className={cls}>
      {/* hidden file input, always mounted so refs survive view switches */}
      <input
        ref={importInputRef}
        type="file" accept="application/json,.json"
        onChange={onImportFile}
        style={{ position: 'absolute', left: -9999, top: -9999, opacity: 0 }} />

      {store.view === 'home' && (
        <HomeScreen
          store={store}
          onNewGame={() => go('setup')}
          onResume={resumeGame}
          onDeleteGame={deleteGame}
          onStats={() => go('stats')}
          onExport={exportBackup}
          onImport={importBackup}
          onWipeAll={wipeAll}
          rules={store.rules || DEFAULT_RULES}
          onSetRules={setRules}
          theme={theme} resolvedTheme={resolved} onSetTheme={setTheme} />
      )}
      {store.view === 'setup' && (
        <SetupScreen
          store={store}
          onStart={startGameByNames}
          onDeletePlayer={deletePlayer}
          onRenamePlayer={renamePlayer}
          onBack={() => go('home')} />
      )}
      {store.view === 'stats' && (
        <StatsScreen
          store={store}
          onBack={() => go(store.activeGameId ? 'game' : 'home')} />
      )}
      {store.view === 'game' && game && game.phase === 'playing' && (
        <GameScreen
          store={store} game={game}
          onScore={scoreHand}
          onUndo={undo}
          onEditHand={editHand}
          onDeleteHand={deleteHand}
          onExit={exitToHome}
          onStats={() => go('stats')}
          onExport={exportBackup}
          onImport={importBackup}
          onSetRules={setActiveGameRules}
          theme={theme} resolvedTheme={resolved} onSetTheme={setTheme} />
      )}
      {store.view === 'game' && game && game.phase === 'finished' && summary && (
        <WinnerScreen
          store={store} game={game} summary={summary}
          onPlayAgain={playAgain}
          onHome={exitToHome} />
      )}
      {store.view === 'game' && !game && (() => { exitToHome(); return null; })()}

      {/* Toast */}
      {toast && (
        <div className="fade" style={{
          position: 'absolute', left: '50%', bottom: 26,
          transform: 'translateX(-50%)', zIndex: 200,
          background: 'rgba(0,0,0,0.78)',
          color: 'var(--parchment)',
          fontFamily: 'var(--serif)', fontSize: 14,
          padding: '10px 18px', borderRadius: 999,
          border: '1px solid var(--brass-deep)',
          maxWidth: '80%', textAlign: 'center',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}
    </div>
    </LocaleContext.Provider>
  );
}

Object.assign(window, { App });
