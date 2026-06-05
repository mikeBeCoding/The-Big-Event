const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'sessions.json')

function loadData() {
  if (!fs.existsSync(dbPath)) {
    return { events: {}, messages: {}, evaluations: {} }
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
  } catch (err) {
    console.error('Failed to load session data:', err)
    return { events: {}, messages: {}, evaluations: {} }
  }
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8')
}

const data = loadData()

function ensureSessionCollections(sessionId) {
  if (!data.messages[sessionId]) data.messages[sessionId] = []
  if (!data.evaluations[sessionId]) data.evaluations[sessionId] = []
}

function createEvent(sessionId, resident) {
  const now = new Date().toISOString()
  data.events[sessionId] = {
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    resident,
  }
  ensureSessionCollections(sessionId)
  saveData(data)
}

function updateEventResident(sessionId, resident) {
  const now = new Date().toISOString()
  if (!data.events[sessionId]) return
  data.events[sessionId].resident = resident
  data.events[sessionId].updatedAt = now
  saveData(data)
}

function addMessage(sessionId, role, text) {
  ensureSessionCollections(sessionId)
  data.messages[sessionId].push({ role, text, createdAt: new Date().toISOString() })
  saveData(data)
}

function addEvaluation(sessionId, payload) {
  ensureSessionCollections(sessionId)
  data.evaluations[sessionId].push({ payload, createdAt: new Date().toISOString() })
  saveData(data)
}

function getSession(sessionId) {
  return data.events[sessionId] || null
}

function getSessionHistory(sessionId) {
  ensureSessionCollections(sessionId)
  return {
    messages: data.messages[sessionId],
    evaluations: data.evaluations[sessionId],
  }
}

module.exports = {
  createEvent,
  updateEventResident,
  addMessage,
  addEvaluation,
  getSession,
  getSessionHistory,
}
