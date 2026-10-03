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
const {
  STAGES,
  DIFFICULTY_MULTIPLIER,
  RATE_CARD,
  additionalProductsGuide,
  residentSystemPrompt,
  currentStage,
  clampStage,
  stageJourney,
} = require('./difficulty')

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

app.get('/api/resident', (req, res) => {
  const resident = generateResident()
  const sessionId = `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  createEvent(sessionId, resident)
  res.json({ resident, sessionId, rateCard: RATE_CARD })
})

// Structured output for resident replies: what they say plus their updated
// openness stage, which the frontend echoes back on the next turn.
const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    stage: { type: 'string', enum: STAGES },
  },
  required: ['reply', 'stage'],
}

const OPEN_QUESTION = /^(what|how|why|tell me|walk me|describe|which|when)\b|what do you|how do you|how many/i
const FILLER = /^(what else|anything else|and\??|ok(ay)?|cool|got it)\W*$/i

// Keyword-based resident used when no API key is configured. Approximates the
// difficulty rules: open questions build openness, filler and pushing don't.
function fallbackChat(resident, previousStage, lastUser) {
  const text = lastUser ? lastUser.text.trim() : ''
  const idx = STAGES.indexOf(previousStage)
  let next = idx
  if (FILLER.test(text)) next = idx
  else if (OPEN_QUESTION.test(text)) next = idx + 1
  else if (/sign up|switch today|buy|deal today/i.test(text)) next = idx - 1
  const stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, next))]
  const guarded = stage === 'Closed'
  const difficulty = resident.difficulty || 'Medium'

  let reply
  if (FILLER.test(text)) {
    reply = guarded ? "Not really." : "I'm not sure what else to tell you."
  } else if (/promo|promotion|\$\d+/i.test(text) && !/after|standard|regular|long[- ]term/i.test(text) && difficulty !== 'Easy') {
    reply = 'Okay, but what happens when that promotion ends? What will I actually be paying?'
  } else if (/pay|paying|bill|cost/i.test(text) && OPEN_QUESTION.test(text)) {
    reply = stage === 'Closed' || stage === 'Curious'
      ? "I'd rather not get into numbers yet."
      : `Right now it's around $${resident.currentMonthlyCost} a month all in.`
  } else if (/provider|who do you|currently have|use now/i.test(text)) {
    reply = guarded ? 'I already have service, thanks.' : `I've got ${resident.existingProvider.replace(' · ', ' and ').toLowerCase()}.`
  } else if (/like|love|enjoy/i.test(text) && OPEN_QUESTION.test(text)) {
    reply = "Honestly, it's pretty reliable. I just don't love what I'm paying."
  } else if (/how many|people|household|devices/i.test(text)) {
    reply = guarded
      ? 'A few of us.'
      : `There are ${resident.householdSize} of us with about ${resident.deviceCount} devices.`
  } else if (/transfer|move|address/i.test(text)) {
    reply = 'Oh good — what address are you moving to?'
  } else if (/slow|lag|drop|disconnect/i.test(text)) {
    reply = guarded ? "It's fine most of the time." : 'Yes, it drops during peak times and when I stream.'
  } else if (/work|zoom|meetings|remote/i.test(text)) {
    reply = 'I really need this to be stable for my meetings.'
  } else if (guarded) {
    reply = difficulty === 'Hard' ? "I'm happy with what I have. Why would I switch?" : "I'm just looking around."
  } else {
    reply = `My main issue is: ${resident.problem}`
  }
  return { reply, stage }
}

app.post('/api/chat', async (req, res) => {
  const { conversation, resident, sessionId } = req.body || {}

  if (!conversation || !resident || !sessionId) {
    return res.status(400).json({ error: 'Missing conversation, resident, or sessionId' })
  }

  updateEventResident(sessionId, resident)

  const messages = toMessages(conversation)
  const previousStage = currentStage(resident, conversation)
  const lastUser = conversation.slice().reverse().find((c) => c.role === 'player')

  const anthropic = getAnthropic()
  if (anthropic && messages.length) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 400,
        thinking: { type: 'disabled' },
        system: residentSystemPrompt(resident, previousStage),
        messages,
        output_config: {
          format: { type: 'json_schema', schema: CHAT_SCHEMA },
        },
      })

      const parsed = JSON.parse(textOf(response))
      const stage = clampStage(previousStage, parsed.stage)
      if (lastUser) {
        addMessage(sessionId, 'player', lastUser.text)
      }
      addMessage(sessionId, 'resident', parsed.reply)
      return res.json({ reply: parsed.reply, stage })
    } catch (err) {
      console.error('Anthropic chat call failed', err)
    }
  }

  const { reply: fallbackReply, stage } = fallbackChat(resident, previousStage, lastUser)

  if (lastUser) {
    addMessage(sessionId, 'player', lastUser.text)
  }
  addMessage(sessionId, 'resident', fallbackReply)
  res.json({ reply: fallbackReply, stage })
})

const SKILL_KEYS = [
  'openEndedQuestions',
  'discoveryDepth',
  'activeListening',
  'needsIdentification',
  'objectionHandling',
  'pricingKnowledge',
  'postPromoAwareness',
  'valuePositioning',
  'solutionFit',
  'rapport',
]

const EVALUATOR_SYSTEM = `You are an expert sales coach evaluating how a Comcast rep handled a community-event conversation with a resident. The game rewards consultative discovery, not aggressive selling.

Score the rep 0-100 on each metric (customerSatisfaction, discoveryScore, salesEffectiveness, and an overall eventSuccessScore). Also score each skill 0-100, or null if it genuinely never came up:
- openEndedQuestions: quality of open-ended questions (not count; "what else?" filler earns nothing)
- discoveryDepth: how much of the resident's real situation was uncovered (providers, cost, household, devices, usage, pain points, motivations)
- activeListening: reflecting back and building on what the resident said
- needsIdentification: correctly naming the resident's actual needs
- objectionHandling: addressing skepticism and concerns honestly
- pricingKnowledge: accurate use of the rate card. Comcast also offers products that aren't on the rate card (listed below); accurately offering them counts as accurate pricing, never as an error
- postPromoAwareness: giving the post-promotion price when the resident asked about long-term cost (or proactively); relying only on promo pricing scores low
- valuePositioning: connecting price to value for this resident's lifestyle
- solutionFit: recommending an appropriate solution only after understanding needs
- rapport: warmth and trust built

Offering additional Comcast products beyond the rate card (such as Xfinity Shield or Internet Essentials) brings more value to the resident. Never penalize the rep for it in any score; credit it under valuePositioning and solutionFit when it fits the resident's needs.

This simulation is for beginners, so score encouragingly. A rep who moves the resident to Receptive has done the core job well and should land around 75-80 or higher overall. Reserve scores below 50 for real mistakes: wrong prices, misleading claims, dodging questions, or pushy selling. The rate card is simulated and offers change over time, so prices that are close to it count as accurate; only mark down pricingKnowledge for clearly wrong figures or wrong terms (such as claiming the mobile promo lasts 5 years).

Calibrate for difficulty. Easy residents share freely, so high discovery scores require going beyond what they volunteered. Hard residents start guarded; moving them toward Receptive through good discovery is a strong achievement and should be credited, while pitching early to a guarded resident should be penalized. Give a few concise feedback bullets on what went well and a few targeted coaching tips for next time.`

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
    skills: {
      type: 'object',
      additionalProperties: false,
      // null = didn't come up in this conversation (e.g. no pricing discussion).
      properties: Object.fromEntries(SKILL_KEYS.map((k) => [k, { anyOf: [{ type: 'integer' }, { type: 'null' }] }])),
      required: SKILL_KEYS,
    },
    feedback: { type: 'array', items: { type: 'string' } },
    coach: { type: 'array', items: { type: 'string' } },
  },
  required: ['scores', 'skills', 'feedback', 'coach'],
}

// Attach difficulty context: the openness journey and difficulty-weighted
// event points, so a strong Hard conversation is worth more than an Easy one.
function withDifficulty(result, resident, journey) {
  const difficulty = resident.difficulty || 'Medium'
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] || 1
  return {
    ...result,
    difficulty,
    journey,
    multiplier,
    eventPoints: Math.round(result.scores.eventSuccessScore * multiplier),
  }
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
  const journey = stageJourney(resident, conversation)

  const anthropic = getAnthropic()
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        thinking: { type: 'adaptive' },
        system: EVALUATOR_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Resident persona (difficulty: ${resident.difficulty || 'Medium'}):\n${JSON.stringify(resident, null, 2)}\n\nRate card:\n${JSON.stringify(RATE_CARD)}\n\n${additionalProductsGuide()}\n\nResident openness journey: ${journey.join(' → ')}\n\nConversation transcript:\n${transcriptOf(conversation)}`,
          },
        ],
        output_config: {
          format: { type: 'json_schema', schema: EVALUATION_SCHEMA },
        },
      })

      const parsed = withDifficulty(JSON.parse(textOf(response)), resident, journey)
      addEvaluation(sessionId, parsed)
      return res.json(parsed)
    } catch (err) {
      console.error('Anthropic evaluation call failed', err)
    }
  }

  // Keyword fallback. Reaching further along the openness journey counts for
  // more than question volume, and post-promo pricing earns credit.
  const userMessages = conversation.filter((c) => c.role === 'player')
  const openQuestions = userMessages.filter((m) => OPEN_QUESTION.test(m.text.trim()) && !FILLER.test(m.text.trim())).length
  const stageGain = STAGES.indexOf(journey[journey.length - 1]) - STAGES.indexOf(journey[0])
  const mentionedPromo = userMessages.some((m) => /promo|promotion/i.test(m.text))
  const gavePostPromo = userMessages.some((m) => /after (the )?promo|standard|regular price|long[- ]term|\$\d+.*after/i.test(m.text))

  let cs = 65
  let ds = 50 + Math.min(20, openQuestions * 5) + stageGain * 10
  let se = 50
  if (userMessages.some((m) => /recommend|plan|package|bundle/i.test(m.text))) se += 10
  if (gavePostPromo) se += 10
  else if (mentionedPromo && resident.difficulty !== 'Easy') se -= 10
  if (userMessages.some((m) => /sorry|understand|thanks|happy to help|sounds like|so you/i.test(m.text))) cs += 10
  cs += stageGain * 5
  ds = Math.max(0, ds)
  se = Math.max(0, se)

  const eventSuccessScore = Math.round((cs + ds + se) / 3)
  const evaluationResult = withDifficulty({
    scores: {
      customerSatisfaction: Math.min(100, cs),
      discoveryScore: Math.min(100, ds),
      salesEffectiveness: Math.min(100, se),
      eventSuccessScore: Math.min(100, eventSuccessScore),
    },
    skills: {
      openEndedQuestions: Math.min(100, 40 + openQuestions * 15),
      postPromoAwareness: gavePostPromo ? 85 : mentionedPromo ? 30 : null,
    },
    feedback: [
      'Asked some open-ended questions.',
      'Could probe more on device count and usage patterns.',
    ],
    coach: [
      'Keep responses customer-focused and ask one open-ended question at a time.',
      'Tie recommended solutions back to the resident’s stated challenges.',
    ],
  }, resident, journey)
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
