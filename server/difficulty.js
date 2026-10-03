// Resident difficulty tiers, competitor assignment, and simulated pricing.
// Layered on top of the base personas in persona-generator.js: a persona keeps
// its name, personality, and problem, and this module decides how open the
// resident is and which providers they currently have.

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

// How guarded the resident is. Every resident can reach Receptive; difficulty
// only changes where they start and how much good discovery it takes to move.
const STAGES = ['Closed', 'Curious', 'Engaged', 'Receptive']
const STARTING_STAGE = { Easy: 'Engaged', Medium: 'Curious', Hard: 'Closed' }

// Event points multiplier so a successful Hard conversation is worth more.
const DIFFICULTY_MULTIPLIER = { Easy: 1, Medium: 1.25, Hard: 1.5 }

const REGIONS = [
  { name: 'San Francisco Bay Area', cities: ['Santa Rosa', 'Oakland', 'Napa', 'Petaluma', 'Hayward', 'Walnut Creek', 'Vallejo', 'Martinez', 'Hercules'] },
  { name: 'Sacramento area', cities: ['Sacramento', 'Elk Grove', 'Roseville', 'Folsom', 'Citrus Heights'] },
]

// Fiber/fixed-wireless competitors by region. Keep these lists current with
// who actually serves each market.
const INTERNET_COMPETITORS = {
  'San Francisco Bay Area': ['AT&T Fiber', 'Verizon 5G Home Internet', 'T-Mobile 5G Home Internet', 'Sonic Fiber'],
  'Sacramento area': ['AT&T Fiber', 'Verizon 5G Home Internet', 'T-Mobile 5G Home Internet', 'Sonic Fiber', 'Fidium Fiber'],
}

const MOBILE_COMPETITORS = ['AT&T', 'Verizon', 'T-Mobile']

// Simulated rate card for training. Internet prices are fixed by a multi-year
// price guarantee; mobile is a shorter promotion. Residents asking about
// long-term cost expect the term length and what they'll pay after it ends.
const RATE_CARD = {
  guaranteeYears: 5,
  mobilePromoMonths: 12,
  internet: [
    { plan: '300 Mbps', promo: 40, standard: 85 },
    { plan: '500 Mbps', promo: 55, standard: 95 },
    { plan: '1 Gig', promo: 70, standard: 110 },
    { plan: '2 Gig', promo: 95, standard: 130 },
  ],
  mobile: [
    { plan: 'Unlimited (per line)', promo: 0, standard: 30 },
    { plan: 'Unlimited Plus (per line)', promo: 15, standard: 45 },
  ],
  notes: 'Simulated training prices. Internet has a 5-year price guarantee; mobile is a 12-month promo. Mobile requires Comcast internet.',
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function chance(p) {
  return Math.random() < p
}

const isMobilePersona = (base) => base.category === 'Mobile Phone Customer'
const hasInternetCompetitor = (base) =>
  !isMobilePersona(base) && base.existingProvider === 'Competitor'
const hasNoService = (base) =>
  ['No current service', 'None'].includes(base.existingProvider)

// Which tiers fit a persona's existing situation. Easy requires no internet
// competitor; Hard requires something to switch away from.
function allowedDifficulties(base) {
  if (hasInternetCompetitor(base)) return ['Medium', 'Hard']
  if (isMobilePersona(base)) return ['Easy', 'Medium', 'Hard']
  if (hasNoService(base)) return ['Easy', 'Medium']
  return DIFFICULTIES // Comcast internet customers
}

// Build the provider/pricing situation for a resident at a given difficulty.
function buildServiceProfile(base, difficulty, region, householdSize) {
  const internetCompetitor = () => randomChoice(INTERNET_COMPETITORS[region.name])
  const mobileCompetitor = () => randomChoice(MOBILE_COMPETITORS)

  let internet
  let mobile = null
  let pricingConcern = false

  if (isMobilePersona(base)) {
    // Mobile is the core concern, so a mobile competitor is always present.
    mobile = mobileCompetitor()
    if (difficulty === 'Easy') internet = chance(0.5) ? 'Comcast' : null
    else if (difficulty === 'Medium') internet = randomChoice(['Comcast', null, internetCompetitor()])
    else internet = chance(0.7) ? internetCompetitor() : 'Comcast'
  } else if (hasInternetCompetitor(base)) {
    internet = internetCompetitor()
    mobile = chance(difficulty === 'Hard' ? 0.75 : 0.5) ? mobileCompetitor() : null
  } else if (hasNoService(base)) {
    internet = null
    if (difficulty === 'Easy') mobile = chance(0.3) ? mobileCompetitor() : null
    else if (chance(0.5)) mobile = mobileCompetitor()
    else pricingConcern = true
  } else {
    internet = 'Comcast'
    if (difficulty === 'Easy') mobile = chance(0.3) ? mobileCompetitor() : null
    else if (difficulty === 'Medium') {
      if (chance(0.5)) mobile = mobileCompetitor()
      else pricingConcern = true
    } else mobile = mobileCompetitor()
  }

  if (difficulty !== 'Easy' && !pricingConcern) pricingConcern = chance(0.5)

  const lines = mobile ? Math.max(1, Math.min(householdSize, randomInt(1, 4))) : 0
  const internetCost = internet && internet !== 'Comcast' ? randomInt(55, 90) : internet === 'Comcast' ? randomInt(80, 115) : 0
  const mobileCost = lines * randomInt(40, 70)

  return {
    internetProvider: internet,
    mobileProvider: mobile,
    mobileLines: lines,
    currentMonthlyCost: internetCost + mobileCost,
    pricingConcern,
  }
}

function describeProviders({ internetProvider, mobileProvider, mobileLines }) {
  const internet = internetProvider ? `Internet: ${internetProvider}` : 'Internet: none'
  const mobile = mobileProvider
    ? `Mobile: ${mobileProvider} (${mobileLines} line${mobileLines === 1 ? '' : 's'})`
    : 'Mobile: none'
  return `${internet} · ${mobile}`
}

function timeInCommunity(difficulty) {
  if (difficulty === 'Easy') return randomChoice(['Moved in two weeks ago', 'Moved in last month', 'Moved in about three months ago'])
  return randomChoice(['Lived here about two years', 'Lived here five years', 'Long-time resident (10+ years)'])
}

// Pick a difficulty and attach the competitor/pricing situation to a resident.
function applyDifficulty(base, householdSize) {
  const difficulty = randomChoice(allowedDifficulties(base))
  const region = randomChoice(REGIONS)
  const service = buildServiceProfile(base, difficulty, region, householdSize)

  return {
    difficulty,
    region: region.name,
    city: randomChoice(region.cities),
    timeInCommunity: timeInCommunity(difficulty),
    ...service,
    existingProvider: describeProviders(service),
  }
}

const TIER_BEHAVIOR = {
  Easy: `DIFFICULTY: EASY. You are cooperative, curious about Comcast, and happy to chat.
- Answer questions openly and share useful details, including roughly what you pay, without much probing.
- Respond warmly to open-ended questions. Still let the rep ask — don't dump your whole situation in one reply.
- Your needs are fairly straightforward.`,

  Medium: `DIFFICULTY: MEDIUM. You are somewhat skeptical and price-aware.
- Share information selectively: answer what was asked, but hold back details the rep hasn't earned yet.
- Compare Comcast to what you have now and raise reasonable objections.
- You care about long-term cost. If the rep quotes a promotional price, ask what you'll actually pay after the promotion ends, and don't treat the promo price as a complete answer.
- Warm up when the rep addresses your concerns honestly and shows clear value for your situation.`,

  Hard: `DIFFICULTY: HARD. You are guarded and not fully ready to switch. You are NOT rude — you are busy, cautious, and need a reason to open up.
- At first, give short answers and don't volunteer what you pay or who your providers are.
- Ask challenging questions and question whether switching is worth the hassle.
- Be skeptical of promotional pricing; focus on the real long-term cost.
- You'd pay a bit more if the value clearly fits your lifestyle, but the rep has to show you how.
- You are NOT impossible to win over. Your openness is earned through good discovery.`,
}

const STAGE_GUIDE = `OPENNESS STAGES (how much you share):
- Closed: brief, polite, guarded. Reveal almost nothing personal.
- Curious: willing to talk a little. Share surface details (what you like/dislike about your current service).
- Engaged: share specifics — providers, household, devices, usage, pain points, rough monthly cost.
- Receptive: open about what you value most and what would make you switch; willing to hear a recommendation.

HOW TO UPDATE YOUR STAGE after each rep message:
- Move up one stage when the rep asks a thoughtful, open-ended question tied to your situation, reflects back something you said, or addresses a concern honestly.
- Stay put for closed yes/no questions, generic filler ("what else?", "anything else?"), or small talk.
- Move down one stage if the rep pushes a product before understanding you, dodges a pricing question, or relies only on promotional pricing after you asked about the long-term cost.
- Reward the quality of questions, not the number of them.`

function pricingGuide() {
  const years = RATE_CARD.guaranteeYears
  const months = RATE_CARD.mobilePromoMonths
  const fmt = (rows, term) => rows.map((r) => `${r.plan}: $${r.promo}/mo for ${term}, $${r.standard}/mo after`).join('; ')
  return `COMCAST PRICING (for judging the rep's answers; never recite this yourself):
Internet comes with a ${years}-year price guarantee: a fixed monthly price for ${years} years, not a short-term promotion. Internet — ${fmt(RATE_CARD.internet, `${years} years`)}.
Mobile is a ${months}-month promotion, not part of the ${years}-year guarantee. Mobile — ${fmt(RATE_CARD.mobile, `${months} months`)}.
If you ask about long-term internet cost, accept an answer that explains the ${years}-year price guarantee and its fixed price. If you ask about long-term mobile cost, only accept an answer that gives the price after the ${months}-month promotion ends; a rep who claims mobile is covered by the ${years}-year guarantee is wrong. The rep's exact numbers may differ slightly from these, since offers are updated over time.`
}

function residentSystemPrompt(resident, stage) {
  return `You are ${resident.name}, a resident visiting a Comcast community event booth. Stay fully in character using this persona:

${JSON.stringify(resident, null, 2)}

${TIER_BEHAVIOR[resident.difficulty] || TIER_BEHAVIOR.Medium}

${STAGE_GUIDE}

Your openness stage before the rep's latest message: ${stage}.

${pricingGuide()}

You are the CUSTOMER, not the sales rep. Respond to what the rep says and share your needs, concerns, and reactions when asked — do not ask the rep's discovery questions for them. Only reveal what your updated stage allows. Reply in first person, concise (1-3 sentences), and natural for your mood. The reply is only what you say out loud — no narration, stage directions, or meta-commentary. Never break character or mention being an AI.`
}

function startingStage(resident) {
  return STARTING_STAGE[resident.difficulty] || 'Curious'
}

// The resident's stage is carried on resident messages in the transcript, so
// the server stays stateless.
function currentStage(resident, conversation) {
  const last = (conversation || [])
    .slice()
    .reverse()
    .find((c) => c.role === 'resident' && STAGES.includes(c.stage))
  return last ? last.stage : startingStage(resident)
}

// Limit stage changes to one step per turn so openness has to be built.
function clampStage(previous, next) {
  const from = STAGES.indexOf(previous)
  const to = STAGES.indexOf(next)
  if (from < 0) return previous
  if (to < 0) return previous
  return STAGES[Math.max(from - 1, Math.min(from + 1, to))]
}

// Ordered list of distinct stages the resident passed through.
function stageJourney(resident, conversation) {
  const journey = [startingStage(resident)]
  for (const c of conversation || []) {
    if (c.role === 'resident' && STAGES.includes(c.stage) && c.stage !== journey[journey.length - 1]) {
      journey.push(c.stage)
    }
  }
  return journey
}

module.exports = {
  STAGES,
  DIFFICULTY_MULTIPLIER,
  RATE_CARD,
  applyDifficulty,
  residentSystemPrompt,
  startingStage,
  currentStage,
  clampStage,
  stageJourney,
}
