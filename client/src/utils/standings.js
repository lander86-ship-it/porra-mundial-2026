/**
 * Compute group standings from an array of matches with scores.
 * Each match: { home_team, away_team, home_score, away_score }
 * Returns sorted array: [{ name, pts, gf, ga, gd, played }]
 */
export function computeStandings(matches) {
  const teams = {}

  for (const m of matches) {
    const hs = parseInt(m.home_score)
    const as_ = parseInt(m.away_score)

    if (!m.home_team) continue
    if (!teams[m.home_team]) teams[m.home_team] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 }
    if (!teams[m.away_team]) teams[m.away_team] = { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 }

    if (isNaN(hs) || isNaN(as_)) continue

    teams[m.home_team].gf += hs
    teams[m.home_team].ga += as_
    teams[m.home_team].gd = teams[m.home_team].gf - teams[m.home_team].ga
    teams[m.home_team].played++

    teams[m.away_team].gf += as_
    teams[m.away_team].ga += hs
    teams[m.away_team].gd = teams[m.away_team].gf - teams[m.away_team].ga
    teams[m.away_team].played++

    if (hs > as_) {
      teams[m.home_team].pts += 3
    } else if (hs < as_) {
      teams[m.away_team].pts += 3
    } else {
      teams[m.home_team].pts += 1
      teams[m.away_team].pts += 1
    }
  }

  return Object.entries(teams)
    .sort(([, a], [, b]) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    .map(([name, stats]) => ({ name, ...stats }))
}
