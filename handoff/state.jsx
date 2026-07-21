// state.jsx — v2 multi-game store, with player roster and stats
//
// Shape:
//   {
//     version: 2,
//     theme: 'auto' | 'light' | 'dark',
//     players: [{ id, name, createdAt }],          // roster of all known players
//     games:   [{ id, createdAt, updatedAt,
//                 p0Id, p1Id,                      // player references
//                 scores: [0,0], boxes: [0,0],
//                 hands: [...], deal, dealerStart,
//                 phase: 'playing' | 'finished',
//                 winner: 0 | 1 | null }],
//     activeGameId: string | null,                 // the game currently being played
//     view: 'home' | 'setup' | 'game' | 'stats',   // which screen is showing
//   }
//
// Scoring rules: standard. See scoreHand() below.

const STORAGE_KEY  = 'gr-counter.v2';
const LEGACY_KEY   = 'gr-counter.v1';
const TARGET_SCORE = 100;
const APP_VERSION  = '1.0.0';

// Scoring rules — these are the user-configurable bonuses. Each game stores
// a snapshot so historical games keep their original math even if the global
// defaults change later. The store also carries a global `rules` field that
// new games inherit.
const DEFAULT_RULES = {
  target:        100,
  ginBonus:       25,
  longGinBonus:   25,
  undercutBonus:  25,
  boxBonus:       25,
  gameBonus:     100,
  shutoutBonus:  100,
};

// What the app shipped with before this setting existed. Old games migrate to
// these so their stored `totalThisHand` values stay arithmetically correct.
const LEGACY_RULES = {
  target:        100,
  ginBonus:       25,
  longGinBonus:   25,
  undercutBonus:  10,
  boxBonus:       25,
  gameBonus:     100,
  shutoutBonus:  100,
};

const rulesOf = (g) => ({ ...DEFAULT_RULES, ...(g?.rules || {}) });

// ── id helpers ────────────────────────────────────────────────────────────
const rid = (p) => p + Math.random().toString(36).slice(2, 10);

// ── factories ─────────────────────────────────────────────────────────────
const newPlayer = (name) => ({
  id: rid('p_'),
  name: String(name).trim(),
  createdAt: Date.now(),
});

const newGame = (p0Id, p1Id, rules) => ({
  id: rid('g_'),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  p0Id, p1Id,
  scores: [0, 0],
  boxes:  [0, 0],
  hands:  [],
  deal: 1,
  dealerStart: Math.random() < 0.5 ? 0 : 1,
  phase: 'playing',     // 'playing' | 'finished'
  winner: null,
  rules: { ...DEFAULT_RULES, ...(rules || {}) },
});

const initialStore = () => ({
  version: 2,
  theme: 'auto',
  rules: { ...DEFAULT_RULES },
  players: [],
  games: [],
  activeGameId: null,
  view: 'home',
});

// ── migration v1 → v2 ─────────────────────────────────────────────────────
// v1 stored a single game in flat keys. If we find it, wrap it as one entry
// in the v2 store and delete the legacy key so we don't migrate twice.
function migrateFromV1(v1) {
  if (!v1 || !Array.isArray(v1.players) || !v1.players[0] || !v1.players[1]) {
    return initialStore();
  }
  const p0 = newPlayer(v1.players[0]);
  const p1 = newPlayer(v1.players[1]);
  const hasGame = v1.phase === 'playing' || v1.phase === 'finished';
  const game = hasGame ? {
    ...newGame(p0.id, p1.id, LEGACY_RULES),
    scores: v1.scores || [0, 0],
    boxes:  v1.boxes  || [0, 0],
    hands:  v1.hands  || [],
    deal:   v1.deal   || 1,
    dealerStart: v1.dealerStart || 0,
    phase:  v1.phase  || 'playing',
    winner: v1.winner ?? null,
  } : null;
  return {
    version: 2,
    theme: v1.theme || 'auto',
    rules: { ...DEFAULT_RULES },
    players: [p0, p1],
    games: game ? [game] : [],
    activeGameId: game ? game.id : null,
    view: game && game.phase === 'playing' ? 'game' :
          game && game.phase === 'finished' ? 'game' : 'home',
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const merged = {
        ...initialStore(),
        ...s,
        view: s.view || (s.activeGameId ? 'game' : 'home'),
        rules: { ...DEFAULT_RULES, ...(s.rules || {}) },
        // Backfill rules onto pre-rules games. Old games used Undercut +10,
        // so seed those with LEGACY_RULES rather than the new defaults — that
        // keeps stored totals arithmetically consistent if a hand is edited.
        games: (s.games || []).map((g) => g.rules ? g : { ...g, rules: { ...LEGACY_RULES } }),
      };
      return merged;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateFromV1(JSON.parse(legacy));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
      } catch (e) {}
      return migrated;
    }
  } catch (e) {}
  return initialStore();
}

function saveStore(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

// ── scoring ──────────────────────────────────────────────────────────────
// Standard scoring:
//   Knock: knocker scores (opp deadwood - knocker deadwood) if positive
//   Gin:   knocker scores opp deadwood + 25 gin bonus
//   Undercut: defender scores (knocker deadwood - defender deadwood) + 10 undercut bonus
//   Game end: 100+ wins. Winner adds 100 game bonus + 25 per box + 100 line bonus if shutout.
function applyHandToGame(game, { type, winner, points }) {
  const rules = rulesOf(game);
  const scores = [...game.scores];
  const boxes  = [...game.boxes];
  let added = points;
  if (type === 'gin')      added += rules.ginBonus;
  if (type === 'longGin')  added += rules.longGinBonus;
  if (type === 'undercut') added += rules.undercutBonus;
  scores[winner] += added;
  boxes[winner] += 1;
  const id = rid('h_');
  const handEntry = { id, deal: game.deal, type, winner, points, totalThisHand: added };
  const finished = scores[0] >= rules.target || scores[1] >= rules.target;
  return {
    ...game,
    scores, boxes,
    hands: [...game.hands, handEntry],
    deal: game.deal + 1,
    phase: finished ? 'finished' : 'playing',
    winner: finished ? (scores[0] > scores[1] ? 0 : 1) : null,
    updatedAt: Date.now(),
  };
}

function undoLastHand(game) {
  if (!game || game.hands.length === 0) return game;
  const last = game.hands[game.hands.length - 1];
  const scores = [...game.scores];
  const boxes  = [...game.boxes];
  scores[last.winner] -= last.totalThisHand;
  boxes[last.winner]  -= 1;
  // If we just unwound the winning hand, return to 'playing'.
  return {
    ...game,
    scores, boxes,
    hands: game.hands.slice(0, -1),
    deal: Math.max(1, game.deal - 1),
    phase: 'playing',
    winner: null,
    updatedAt: Date.now(),
  };
}

// Recompute a game's running totals from its hands array. Used after a
// middle-of-game edit/delete so scores/boxes/phase/winner stay in sync. Pure.
function recomputeGame(game) {
  const rules = rulesOf(game);
  let s0 = 0, s1 = 0, b0 = 0, b1 = 0;
  let lastDeal = 0;
  for (const h of game.hands) {
    if (h.winner === 0) { s0 += h.totalThisHand; b0 += 1; }
    else                { s1 += h.totalThisHand; b1 += 1; }
    if (h.deal > lastDeal) lastDeal = h.deal;
  }
  const finished = s0 >= rules.target || s1 >= rules.target;
  return {
    ...game,
    scores: [s0, s1],
    boxes:  [b0, b1],
    deal:   lastDeal + 1,
    phase:  finished ? 'finished' : 'playing',
    winner: finished ? (s0 > s1 ? 0 : 1) : null,
    updatedAt: Date.now(),
  };
}

// Mutate one hand in the ledger and rebuild downstream totals. The
// `patch` object accepts any of { type, winner, points } — totalThisHand
// is derived per the same rules as applyHandToGame.
function editHandInGame(game, handId, patch) {
  if (!game) return game;
  const rules = rulesOf(game);
  const hands = game.hands.map((h) => {
    if (h.id !== handId) return h;
    const type   = patch.type   ?? h.type;
    const winner = patch.winner ?? h.winner;
    const points = patch.points ?? h.points;
    let total = points;
    if (type === 'gin')      total += rules.ginBonus;
    if (type === 'longGin')  total += rules.longGinBonus;
    if (type === 'undercut') total += rules.undercutBonus;
    return { ...h, type, winner, points, totalThisHand: total, edited: true };
  });
  return recomputeGame({ ...game, hands });
}

function deleteHandInGame(game, handId) {
  if (!game) return game;
  // Renumber subsequent deals so the ledger stays 1..N with no gaps.
  let removed = false;
  const hands = [];
  for (const h of game.hands) {
    if (h.id === handId) { removed = true; continue; }
    hands.push(removed ? { ...h, deal: h.deal - 1 } : h);
  }
  return recomputeGame({ ...game, hands });
}

// Apply a new rule set to a game and re-derive every hand's totalThisHand
// from its raw `points`. Useful when the user changes scoring rules mid-game
// — historical hands get rescored with the new bonuses, scores follow.
function applyRulesToGame(game, newRules) {
  if (!game) return game;
  const rules = { ...DEFAULT_RULES, ...newRules };
  const hands = game.hands.map((h) => {
    let total = h.points;
    if (h.type === 'gin')      total += rules.ginBonus;
    if (h.type === 'longGin')  total += rules.longGinBonus;
    if (h.type === 'undercut') total += rules.undercutBonus;
    return { ...h, totalThisHand: total };
  });
  return recomputeGame({ ...game, hands, rules });
}

// Whose deal is the active hand? Standard rotation: dealer alternates,
// starting from dealerStart at deal 1.
function dealerOf(game) {
  return (game.dealerStart + game.deal - 1) % 2;
}

// Reconstructs the celebration summary from a finished game. Pure — safe to
// recompute every render rather than caching it in storage.
function summaryForGame(game) {
  if (!game || game.phase !== 'finished' || game.winner == null) return null;
  const rules = rulesOf(game);
  const winner = game.winner;
  const loser = 1 - winner;
  let wScore = game.scores[winner] + rules.gameBonus;
  wScore += game.boxes[winner] * rules.boxBonus;
  let lScore = game.scores[loser] + game.boxes[loser] * rules.boxBonus;
  const shutout = game.boxes[loser] === 0;
  if (shutout) wScore += rules.shutoutBonus;
  const finals = [0, 0];
  finals[winner] = wScore;
  finals[loser]  = lScore;
  return {
    winner, finals, shutout, rules,
    boxBonus: game.boxes[winner] * rules.boxBonus,
    loserBoxBonus: game.boxes[loser] * rules.boxBonus,
    gameBonus: rules.gameBonus,
    shutoutBonusValue: shutout ? rules.shutoutBonus : 0,
  };
}

// ── stats ────────────────────────────────────────────────────────────────
// Aggregates across every game in the store. Returns a record keyed by
// player id. Players who have never played still appear with zeros.
function computeStats(store) {
  const out = {};
  for (const p of store.players) {
    out[p.id] = {
      id: p.id, name: p.name,
      gamesPlayed: 0, wins: 0,
      handsPlayed: 0, handsWon: 0,
      gins: 0, longGins: 0, knocks: 0, undercuts: 0,
      totalPointsScored: 0,    // sum of points across all hands won
      biggestHand: 0,          // best single-hand total
      currentStreak: 0,        // consecutive game wins ending at most-recent game
    };
  }
  const sortedGames = [...store.games].sort((a, b) => a.createdAt - b.createdAt);
  for (const g of sortedGames) {
    const ids = [g.p0Id, g.p1Id];
    for (let i = 0; i < 2; i++) {
      const s = out[ids[i]]; if (!s) continue;
      if (g.phase === 'finished') {
        s.gamesPlayed += 1;
        if (g.winner === i) s.wins += 1;
      }
      s.totalPointsScored += g.scores[i];
      for (const h of g.hands) {
        if (h.winner === i) {
          s.handsWon += 1;
          s.handsPlayed += 1;
          if (h.totalThisHand > s.biggestHand) s.biggestHand = h.totalThisHand;
          if (h.type === 'gin') s.gins += 1;
          if (h.type === 'longGin') { s.gins += 1; s.longGins += 1; }
          if (h.type === 'undercut') s.undercuts += 1;
          if (h.type === 'knock') s.knocks += 1;
        } else {
          s.handsPlayed += 1;
        }
      }
    }
  }
  // streak — walk most-recent-first, count consecutive wins
  const finished = sortedGames.filter((g) => g.phase === 'finished').reverse();
  for (const pid of Object.keys(out)) {
    let streak = 0;
    for (const g of finished) {
      const i = g.p0Id === pid ? 0 : g.p1Id === pid ? 1 : -1;
      if (i < 0) continue;
      if (g.winner === i) streak += 1;
      else break;
    }
    out[pid].currentStreak = streak;
  }
  return out;
}

// Head-to-head: tally finished games between every pair of players. Returns
// a map keyed by `${minId}|${maxId}` (sorted for stability). Each entry has
// `{ players: [pA, pB], wins: [wA, wB], total, lastPlayed }` where pA's id <
// pB's id. UI does the lookup by sorting two ids.
function computeHeadToHead(store) {
  const out = {};
  const pid = (p) => p?.id;
  for (const g of store.games) {
    if (g.phase !== 'finished') continue;
    const a = findPlayer(store, g.p0Id);
    const b = findPlayer(store, g.p1Id);
    if (!a || !b) continue;
    const [lo, hi] = pid(a) < pid(b) ? [a, b] : [b, a];
    const key = `${lo.id}|${hi.id}`;
    if (!out[key]) {
      out[key] = { players: [lo, hi], wins: [0, 0], total: 0, lastPlayed: 0 };
    }
    const e = out[key];
    e.total += 1;
    e.lastPlayed = Math.max(e.lastPlayed, g.updatedAt || g.createdAt);
    // The winner is g.winner (0 or 1), referencing g.p0Id/g.p1Id. Map to lo/hi.
    const winnerId = g.winner === 0 ? g.p0Id : g.p1Id;
    if (winnerId === lo.id) e.wins[0] += 1; else e.wins[1] += 1;
  }
  return out;
}

// Rename a player by id. Trimming is enforced; empty strings are rejected.
function renamePlayerInStore(store, id, name) {
  const trimmed = String(name || '').trim().slice(0, 24);
  if (!trimmed) return store;
  return {
    ...store,
    players: store.players.map((p) => p.id === id ? { ...p, name: trimmed } : p),
  };
}

// ── export / import ──────────────────────────────────────────────────────
// JSON backup of the whole store. We add a `kind` marker so we can be
// confident on import that we're looking at our own data and not some other
// app's localStorage dump.
function exportStoreJSON(store) {
  const payload = {
    kind: 'gin-rummy-counter.v2',
    exportedAt: new Date().toISOString(),
    store,
  };
  return JSON.stringify(payload, null, 2);
}

function parseImportJSON(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { return { error: "That doesn't look like a valid backup file." }; }
  if (!data || data.kind !== 'gin-rummy-counter.v2' || !data.store) {
    return { error: "This file isn't a Gin Rummy Counter backup." };
  }
  const s = data.store;
  if (!Array.isArray(s.players) || !Array.isArray(s.games)) {
    return { error: 'Backup is missing players or games.' };
  }
  // Strip unknown fields to defend against tampered payloads; rebuild a
  // clean store shape from scratch.
  const clean = {
    ...initialStore(),
    theme: ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto',
    players: s.players.filter((p) => p && p.id && p.name).map((p) => ({
      id: String(p.id), name: String(p.name).slice(0, 24),
      createdAt: Number(p.createdAt) || Date.now(),
    })),
    games: s.games.filter((g) => g && g.id && g.p0Id && g.p1Id).map((g) => ({
      id: String(g.id),
      createdAt: Number(g.createdAt) || Date.now(),
      updatedAt: Number(g.updatedAt) || Date.now(),
      p0Id: String(g.p0Id), p1Id: String(g.p1Id),
      scores: Array.isArray(g.scores) ? [Number(g.scores[0]) || 0, Number(g.scores[1]) || 0] : [0, 0],
      boxes:  Array.isArray(g.boxes)  ? [Number(g.boxes[0])  || 0, Number(g.boxes[1])  || 0] : [0, 0],
      hands:  Array.isArray(g.hands) ? g.hands.filter(Boolean).map((h) => ({
        id: String(h.id || rid('h_')),
        deal: Number(h.deal) || 1,
        type: ['knock','gin','undercut'].includes(h.type) ? h.type : 'knock',
        winner: h.winner === 1 ? 1 : 0,
        points: Number(h.points) || 0,
        totalThisHand: Number(h.totalThisHand) || 0,
      })) : [],
      deal: Number(g.deal) || 1,
      dealerStart: g.dealerStart === 1 ? 1 : 0,
      phase: g.phase === 'finished' ? 'finished' : 'playing',
      winner: g.winner === 0 || g.winner === 1 ? g.winner : null,
    })),
    activeGameId: null,    // always land on home on import
    view: 'home',
  };
  return { store: clean };
}

// ── helpers exposed to screens ────────────────────────────────────────────
function findPlayer(store, id)   { return store.players.find((p) => p.id === id); }
function findGame(store, id)     { return store.games.find((g) => g.id === id); }
function activeGame(store)       { return findGame(store, store.activeGameId); }
function gamePlayers(store, g)   { return [findPlayer(store, g.p0Id), findPlayer(store, g.p1Id)]; }

Object.assign(window, {
  TARGET_SCORE, DEFAULT_RULES, LEGACY_RULES, rulesOf, APP_VERSION, STORAGE_KEY, LEGACY_KEY,
  initialStore, loadStore, saveStore,
  newPlayer, newGame,
  applyHandToGame, undoLastHand, summaryForGame, computeStats,
  recomputeGame, editHandInGame, deleteHandInGame, dealerOf, applyRulesToGame,
  computeHeadToHead, renamePlayerInStore,
  exportStoreJSON, parseImportJSON,
  findPlayer, findGame, activeGame, gamePlayers,
});
