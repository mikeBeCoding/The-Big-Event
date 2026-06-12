const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
// Load env from server/.env regardless of the process's cwd. `npm run dev`
// launches this with cwd at the repo root, where a bare config() would never
// find server/.env — silently dropping ANTHROPIC_API_KEY and PORT.
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

// Modern Messages API client. Only created when a key is present; otherwise the
// keyword-based fallbacks below keep the game playable with no API key.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'

// Load the SDK lazily on first use rather than at startup. Requiring
// @anthropic-ai/sdk at the top level wedges the process before app.listen(),
// so we defer it: no API key -> the keyword fallbacks below run and the SDK is
// never touched. Memoized so we only pay the import once.
let _anthropic
let _anthropicResolved = false
function getAnthropic() {
  if (_anthropicResolved) return _anthropic
  _anthropicResolved = true
  if (!process.env.ANTHROPIC_API_KEY) {
    _anthropic = null
    return _anthropic
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk')
    _anthropic = new Anthropic()
  } catch (err) {
    console.error('Failed to load @anthropic-ai/sdk; using fallbacks', err)
    _anthropic = null
  }
  return _anthropic
}

// Convert the game's {role: 'player'|'resident'} transcript into Messages API
// turns. The resident is the assistant we're generating, the player is the user.
// The Messages API can't start with an assistant turn, so drop the scripted
// resident opener (and any leading resident lines) before the first player turn.
function toMessages(conversation) {
  const turns = (conversation || []).map((c) => ({
    role: c.role === 'player' ? 'user' : 'assistant',
    content: c.text,
  }))
  while (turns.length && turns[0].role === 'assistant') turns.shift()
  return turns
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

const personasPath = path.join(__dirname, 'personas.json')
let personas = []
try {
  personas = JSON.parse(fs.readFileSync(personasPath, 'utf8'))
} catch (e) {
  console.error('Failed to load personas.json', e)
}

const {
  createEvent,
  updateEventResident,
  addMessage,
  addEvaluation,
  getSession,
  getSessionHistory,
} = require('./db')
const { generateResident } = require('./persona-generator')

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

app.get('/api/resident', (req, res) => {
  const resident = generateResident()
  const sessionId = `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  createEvent(sessionId, resident)
  res.json({ resident, sessionId })
})

app.post('/api/chat', async (req, res) => {
  const { conversation, resident, sessionId } = req.body || {}

  if (!conversation || !resident || !sessionId) {
    return res.status(400).json({ error: 'Missing conversation, resident, or sessionId' })
  }

  updateEventResident(sessionId, resident)

  const messages = toMessages(conversation)

  const anthropic = getAnthropic()
  if (anthropic && messages.length) {
    try {
      const system = `You are ${resident.name}, a resident visiting a Comcast community event booth. Stay fully in character using this persona:

${JSON.stringify(resident, null, 2)}

You are the CUSTOMER, not the sales rep. Respond to what the rep says and share your needs, concerns, and reactions when asked — do not ask the rep's discovery questions for them. Reply in first person, concise (1-3 sentences), and natural for your mood. Respond only with what you say out loud — no narration, stage directions, or meta-commentary. Never break character or mention being an AI.`

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 400,
        thinking: { type: 'disabled' },
        system,
        messages,
      })

      const reply = textOf(response)
      const playerMessage = conversation.slice().reverse().find((c) => c.role === 'player')
      if (playerMessage) {
        addMessage(sessionId, 'player', playerMessage.text)
      }
      addMessage(sessionId, 'resident', reply)
      return res.json({ reply })
    } catch (err) {
      console.error('Anthropic chat call failed', err)
    }
  }

  const lastUser = Array.isArray(conversation)
    ? conversation.slice().reverse().find((c) => c.role === 'player')
    : null

  const fallbackReply = lastUser && /transfer|move|address/i.test(lastUser.text)
    ? 'Oh good — what address are you moving to?'
    : lastUser && /price|cost|promo|discount/i.test(lastUser.text)
    ? 'Are there bundle options or discounts for my situation?'
    : lastUser && /slow|lag|drop|disconnect/i.test(lastUser.text)
    ? 'Yes, it drops during peak times and when I stream.'
    : lastUser && /work|zoom|meetings|remote/i.test(lastUser.text)
    ? 'I really need this to be stable for my meetings.'
    : lastUser && /kids|devices|streaming/i.test(lastUser.text)
    ? 'We have so many devices and the kids stream a lot, so it really matters.'
    : `My main issue is: ${resident.problem}`

  if (lastUser) {
    addMessage(sessionId, 'player', lastUser.text)
  }
  addMessage(sessionId, 'resident', fallbackReply)
  res.json({ reply: fallbackReply })
})

// Structured-output schema for the coaching evaluation. Guarantees valid,
// parseable JSON in the exact shape the frontend's EvaluationResult expects.
const EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        customerSatisfaction: { type: 'integer' },
        discoveryScore: { type: 'integer' },
        salesEffectiveness: { type: 'integer' },
        eventSuccessScore: { type: 'integer' },
      },
      required: [
        'customerSatisfaction',
        'discoveryScore',
        'salesEffectiveness',
        'eventSuccessScore',
      ],
    },
    feedback: { type: 'array', items: { type: 'string' } },
    coach: { type: 'array', items: { type: 'string' } },
  },
  required: ['scores', 'feedback', 'coach'],
}

function transcriptOf(conversation) {
  return (conversation || [])
    .map((c) => `${c.role === 'player' ? 'Rep' : 'Resident'}: ${c.text}`)
    .join('\n')
}

app.post('/api/evaluate', async (req, res) => {
  const { conversation, resident, sessionId } = req.body || {}

  if (!conversation || !resident || !sessionId) {
    return res.status(400).json({ error: 'Missing conversation, resident, or sessionId' })
  }

  updateEventResident(sessionId, resident)
  addEvaluation(sessionId, { conversation, resident, evaluatedAt: new Date().toISOString() })

  const anthropic = getAnthropic()
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        thinking: { type: 'adaptive' },
        system:
          'You are an expert sales coach evaluating how a Comcast rep handled a community-event conversation with a resident. Score the rep 0-100 on each metric (customerSatisfaction, discoveryScore, salesEffectiveness, and an overall eventSuccessScore). Give a few concise feedback bullets on what happened and a few targeted coaching tips for next time.',
        messages: [
          {
            role: 'user',
            content: `Resident persona:\n${JSON.stringify(resident, null, 2)}\n\nConversation transcript:\n${transcriptOf(conversation)}`,
          },
        ],
        output_config: {
          format: { type: 'json_schema', schema: EVALUATION_SCHEMA },
        },
      })

      const parsed = JSON.parse(textOf(response))
      addEvaluation(sessionId, parsed)
      return res.json(parsed)
    } catch (err) {
      console.error('Anthropic evaluation call failed', err)
    }
  }

  let cs = 70
  let ds = 60
  let se = 50
  if (conversation && conversation.length) {
    const userMessages = conversation.filter((c) => c.role === 'player')
    if (userMessages.some((m) => /how|what|tell me/i.test(m.text))) ds += 10
    if (userMessages.some((m) => /recommend|plan|package|bundle/i.test(m.text))) se += 10
    if (userMessages.some((m) => /sorry|understand|thanks|happy to help/i.test(m.text))) cs += 10
  }

  const eventSuccessScore = Math.round((cs + ds + se) / 3)
  const evaluationResult = {
    scores: {
      customerSatisfaction: Math.min(100, cs),
      discoveryScore: Math.min(100, ds),
      salesEffectiveness: Math.min(100, se),
      eventSuccessScore,
    },
    feedback: [
      'Asked some open-ended questions.',
      'Could probe more on device count and usage patterns.',
    ],
    coach: [
      'Keep responses customer-focused and ask one open-ended question at a time.',
      'Tie recommended solutions back to the resident’s stated challenges.',
    ],
  }
  addEvaluation(sessionId, evaluationResult)

  res.json(evaluationResult)
})

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const session = getSession(sessionId)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  const history = getSessionHistory(sessionId)
  res.json({ session, history })
})

// Serve the built frontend (Vite output) so the whole app runs from one
// process in production. Falls back to the SPA's index.html for client-side
// routes. Skipped silently in dev when no build exists.
const distDir = path.join(__dirname, '..', 'The Big Event', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  console.warn(`No frontend build found at ${distDir}. Run "npm run build" to serve the UI.`)
}

app.listen(PORT, () => console.log(`Server listening on ${PORT}`))
