import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export const auth = {
  login: (name, pin) => api.post('/auth/login', { name, pin }),
  register: (name, pin) => api.post('/auth/register', { name, pin }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePin: (currentPin, newPin) => api.post('/auth/change-pin', { currentPin, newPin }),
}

export const matches = {
  all: () => api.get('/matches'),
  groups: () => api.get('/matches/groups'),
  knockout: () => api.get('/matches/knockout'),
  teams: () => api.get('/matches/teams'),
}

export const predictions = {
  my: () => api.get('/predictions/my'),
  saveMatch: (matchId, homeScore, awayScore, predPenaltyWinner) =>
    api.post('/predictions/match', { matchId, homeScore, awayScore, predPenaltyWinner }),
  submit: () => api.post('/predictions/submit'),
  saveScorer: (scorerId) => api.post('/predictions/scorer', { scorerId }),
  scorers: () => api.get('/predictions/scorers'),
}

export const ranking = {
  get: () => api.get('/ranking'),
  simulate: (hypotheticalResults) => api.post('/ranking/simulate', { hypotheticalResults }),
  progression: () => api.get('/ranking/progression'),
}

export const daily = {
  dates: () => api.get('/daily/dates'),
  byDate: (date) => api.get(`/daily/${date}`),
  groupStats: () => api.get('/daily/group-stats'),
}

export const scoring = {
  public: () => api.get('/admin/scoring/public'),
}

export const admin = {
  setResult: (id, homeScore, awayScore, homeTeam, awayTeam, penaltyWinner) =>
    api.put(`/admin/result/${id}`, { homeScore, awayScore, homeTeam, awayTeam, penaltyWinner }),
  clearResult: (id) => api.delete(`/admin/result/${id}`),
  clearGroupResults: (group) => api.delete(`/admin/group/${group}/results`),
  // Phase 2
  phase2Unlock: () => api.post('/admin/phase2/unlock'),
  phase2Lock: () => api.post('/admin/phase2/lock'),
  phase2Status: () => api.get('/admin/phase2'),
  phase2StatusPublic: () => api.get('/admin/settings/phase2'),
  phase2PredsVisible: () => api.get('/admin/phase2/preds-visible'),
  phase2PredsVisibleToggle: () => api.post('/admin/phase2/preds-visible/toggle'),
  // Group closing
  groupsStatus: () => api.get('/admin/groups/status'),
  groupsStatusPublic: () => api.get('/admin/groups/status/public'),
  closeGroup: (group) => api.post(`/admin/group/${group}/close`),
  openGroup: (group) => api.post(`/admin/group/${group}/open`),
  // Players
  players: () => api.get('/admin/players'),
  deletePlayer: (id) => api.delete(`/admin/players/${id}`),
  resetPin: (id, pin) => api.put(`/admin/players/${id}/pin`, { pin }),
  togglePaid: (id, paid) => api.put(`/admin/players/${id}/paid`, { paid }),
  setManualPoints: (id, manual_points) => api.put(`/admin/players/${id}/manual_points`, { manual_points }),
  unlockPlayer: (id) => api.put(`/admin/players/${id}/unlock`),
  // Scoring
  scoring: () => api.get('/admin/scoring'),
  updateScoring: (phase, data) => api.put(`/admin/scoring/${phase}`, data),
  updateSpecialScoring: (data) => api.put('/admin/scoring/special/update', data),
  // Scorers
  scorers: () => api.get('/admin/scorers'),
  updateScorerGoals: (id, goals) => api.put(`/admin/scorers/${id}/goals`, { goals }),
  // Predictions
  changeAdminPin: (pin) => api.put('/admin/pin', { pin }),
  matchPredictions: (matchId) => api.get(`/admin/predictions/${matchId}`),
  playerPredictions: (playerId) => api.get(`/admin/player/${playerId}/predictions`),
  editPlayerPrediction: (playerId, matchId, homeScore, awayScore) =>
    api.put(`/admin/player/${playerId}/predictions/${matchId}`, { homeScore, awayScore }),
}

export const bets = {
  all: () => api.get('/bets'),
  create: (description) => api.post('/bets', { description }),
  resolve: (id) => api.put(`/bets/${id}/resolve`),
  delete: (id) => api.delete(`/bets/${id}`),
}

export const notifications = {
  vapidKey: () => api.get('/notifications/vapid-key'),
  subscribe: (sub) => api.post('/notifications/subscribe', sub),
  unsubscribe: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
}

export const attendance = {
  get: (matchId) => api.get(`/attendance/${matchId}`),
  toggle: (matchId) => api.post(`/attendance/${matchId}/toggle`),
  beer: (matchId) => api.post(`/attendance/${matchId}/beer`),
  removeBeer: (matchId) => api.post(`/attendance/${matchId}/beer/remove`),
}

export default api
