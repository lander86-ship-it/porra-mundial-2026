// Mirror of server BRACKET_TREE — keyed by match code
// Source: 2026 FIFA World Cup knockout stage — ESPN/FIFA official match numbers
// M89=Houston Jul4 (Canada/SouthAfrica+Netherlands/Morocco), M90=Philadelphia Jul4 (Germany+France)
const KNOCKOUT_TREE = {
  // Round of 32 → Round of 16
  '1/16-1':  { code: '1/8-1',      side: 'home', type: 'winner' }, // M73→M89
  '1/16-2':  { code: '1/8-2',      side: 'home', type: 'winner' }, // M74→M90
  '1/16-3':  { code: '1/8-1',      side: 'away', type: 'winner' }, // M75→M89
  '1/16-4':  { code: '1/8-3',      side: 'home', type: 'winner' },
  '1/16-5':  { code: '1/8-2',      side: 'away', type: 'winner' }, // M77→M90
  '1/16-6':  { code: '1/8-3',      side: 'away', type: 'winner' },
  '1/16-7':  { code: '1/8-4',      side: 'home', type: 'winner' },
  '1/16-8':  { code: '1/8-4',      side: 'away', type: 'winner' },
  '1/16-9':  { code: '1/8-6',      side: 'home', type: 'winner' },
  '1/16-10': { code: '1/8-6',      side: 'away', type: 'winner' },
  '1/16-11': { code: '1/8-5',      side: 'home', type: 'winner' },
  '1/16-12': { code: '1/8-5',      side: 'away', type: 'winner' },
  '1/16-13': { code: '1/8-8',      side: 'home', type: 'winner' },
  '1/16-14': { code: '1/8-7',      side: 'home', type: 'winner' },
  '1/16-15': { code: '1/8-8',      side: 'away', type: 'winner' },
  '1/16-16': { code: '1/8-7',      side: 'away', type: 'winner' },
  // Round of 16 → Quarterfinals
  // M89→M97, M90→M97, M91→M99, M92→M99, M93→M98, M94→M98, M95→M100, M96→M100
  '1/8-1':   { code: '1/4-1',      side: 'home', type: 'winner' },
  '1/8-2':   { code: '1/4-1',      side: 'away', type: 'winner' },
  '1/8-3':   { code: '1/4-3',      side: 'home', type: 'winner' },
  '1/8-4':   { code: '1/4-3',      side: 'away', type: 'winner' },
  '1/8-5':   { code: '1/4-2',      side: 'home', type: 'winner' },
  '1/8-6':   { code: '1/4-2',      side: 'away', type: 'winner' },
  '1/8-7':   { code: '1/4-4',      side: 'home', type: 'winner' },
  '1/8-8':   { code: '1/4-4',      side: 'away', type: 'winner' },
  '1/4-1':   { code: '1/2-1',      side: 'home', type: 'winner' },
  '1/4-2':   { code: '1/2-1',      side: 'away', type: 'winner' },
  '1/4-3':   { code: '1/2-2',      side: 'home', type: 'winner' },
  '1/4-4':   { code: '1/2-2',      side: 'away', type: 'winner' },
  '1/2-1': [
    { code: 'Final',      side: 'home', type: 'winner' },
    { code: '3er Puesto', side: 'home', type: 'loser'  },
  ],
  '1/2-2': [
    { code: 'Final',      side: 'away', type: 'winner' },
    { code: '3er Puesto', side: 'away', type: 'loser'  },
  ],
}

/**
 * Returns a map of matchId → { home_team, away_team }
 * with the teams the player predicts will appear in each knockout match.
 *
 * Uses real teams from DB when the source match already has a real result;
 * falls back to the player's predicted winner when there's no real result yet.
 */
export function computePlayerBracket(allMatches, myPreds) {
  const matchByCode = {}
  for (const m of allMatches) {
    if (m.code) matchByCode[m.code] = m
  }

  // r16 teams are fixed and equal for all players (from group stage).
  // r8+ slots start empty and are filled solely by the player's predicted winner.
  const effective = {}
  for (const m of allMatches) {
    effective[m.id] = m.phase === 'r16'
      ? { home_team: m.home_team || '', away_team: m.away_team || '' }
      : { home_team: '', away_team: '' }
  }

  const PHASE_ORDER = ['r16', 'r8', 'r4', 'r2']

  for (const phase of PHASE_ORDER) {
    const sourceMatches = allMatches
      .filter(m => m.phase === phase)
      .sort((a, b) => (a.match_order || 0) - (b.match_order || 0))

    for (const src of sourceMatches) {
      const pred = myPreds[src.id]
      if (!pred || pred.home_score === null || pred.home_score === undefined) continue

      const home = effective[src.id]?.home_team
      const away = effective[src.id]?.away_team
      if (!home || !away || home.startsWith('Por definir') || away.startsWith('Por definir')) continue

      let winner, loser
      if (pred.home_score > pred.away_score) {
        winner = home; loser = away
      } else if (pred.away_score > pred.home_score) {
        winner = away; loser = home
      } else {
        const pw = pred.pred_penalty_winner
        if (!pw) continue
        if (pw === home) { winner = home; loser = away }
        else if (pw === away) { winner = away; loser = home }
        else continue
      }

      const entries = Array.isArray(KNOCKOUT_TREE[src.code])
        ? KNOCKOUT_TREE[src.code]
        : KNOCKOUT_TREE[src.code] ? [KNOCKOUT_TREE[src.code]] : []

      for (const entry of entries) {
        const nextMatch = matchByCode[entry.code]
        if (!nextMatch) continue
        const team = entry.type === 'loser' ? loser : winner
        if (entry.side === 'home' && !effective[nextMatch.id].home_team)
          effective[nextMatch.id].home_team = team
        if (entry.side === 'away' && !effective[nextMatch.id].away_team)
          effective[nextMatch.id].away_team = team
      }
    }
  }

  return effective
}
