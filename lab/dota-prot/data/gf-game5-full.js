/* Phase 4 shim. The game 5 payload moved to data/games/8960991322.js, where it is
   window.GAMES['8960991322']. This file fetches nothing and derives nothing: it only
   republishes that record as window.G5 so every reader written before Phase 4
   keeps working. Load data/games/8960991322.js BEFORE this file.
   Built by .claude/dota-work/build_game_full.py. */
window.GAMES = window.GAMES || {};
window.G5 = window.GAMES['8960991322'] || null;
