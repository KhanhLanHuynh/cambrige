/**
 * Find vocabulary sentences that use the wrong scene template
 * (e.g. food templates on non-food words like "mouth").
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAllVocabulary } from './vocab-files.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const FOOD_WORDS = new Set([
  'apple', 'banana', 'bread', 'burger', 'cake', 'candy', 'carrot', 'cheese', 'chicken',
  'chips', 'chocolate', 'coconut', 'egg', 'fish', 'food', 'fries', 'fruit', 'grape',
  'honey', 'ice cream', 'jam', 'juice', 'kiwi', 'lemon', 'lemonade', 'lime', 'meat',
  'milk', 'orange', 'pasta', 'pepper', 'pizza', 'rice', 'salad', 'salt', 'sandwich',
  'soup', 'sugar', 'toast', 'tomato', 'water', 'yoghurt', 'yogurt', 'bean', 'beans',
  'biscuit', 'biscuit', 'cookies', 'cookie', 'onion', 'potato', 'pear', 'peach',
  'mango', 'melon', 'watermelon', 'sausage', 'noodles', 'cereal', 'icecream',
])

const BODY_WORDS = new Set([
  'arm', 'arms', 'leg', 'legs', 'hand', 'hands', 'foot', 'feet', 'head', 'eye', 'eyes',
  'ear', 'ears', 'face', 'nose', 'mouth', 'tooth', 'teeth', 'finger', 'fingers', 'toe',
  'toes', 'knee', 'knees', 'shoulder', 'shoulders', 'neck', 'hair', 'body', 'chin',
  'back', 'stomach', 'tummy', 'thumb', 'thumbs', 'elbow', 'elbows', 'lip', 'lips',
  'tongue', 'cheek', 'cheeks', 'forehead', 'waist', 'hip', 'hips', 'ankle', 'ankles',
  'wrist', 'wrists', 'beard', 'moustache', 'mustache',
])

const ANIMAL_WORDS = new Set([
  'cat', 'dog', 'bird', 'fish', 'horse', 'cow', 'duck', 'frog', 'bear', 'bee', 'goat',
  'sheep', 'mouse', 'rabbit', 'lion', 'tiger', 'monkey', 'elephant', 'giraffe', 'hippo',
  'crocodile', 'dolphin', 'whale', 'pet', 'animal', 'spider', 'snake', 'bat', 'owl',
  'parrot', 'puppy', 'kitten', 'chick', 'hen', 'donkey', 'camel', 'zebra', 'fox',
])

const CLOTHES_WORDS = new Set([
  'shirt', 'dress', 'hat', 'shoe', 'shoes', 'jacket', 'jeans', 'boot', 'boots', 'sock',
  'socks', 'coat', 'scarf', 'gloves', 'trousers', 'skirt', 'sweater', 'jumper', 'tie',
  'belt', 'cap', 'helmet', 'uniform', 'pyjamas', 'pajamas', 'shorts', 't-shirt',
])

const FOOD_TEMPLATES = [
  /ate .+ for lunch/i,
  /^Please pass me /i,
  / likes .+ with friends/i,
  /bought .+ at the shop/i,
]

const CLOTHES_TEMPLATES = [
  /put on .+ this morning/i,
  / is soft and warm/i,
  /^Where is your /i,
  /washed .+ carefully/i,
]

const ANIMAL_TEMPLATES = [
  /saw .+ at the zoo/i,
  / likes to play in the garden/i,
  /fed .+ some fresh food/i,
  /read a story about /i,
]

const BODY_TEMPLATES = [
  /Touch your .+ and smile/i,
  /My .+ feels better now/i,
  /Open your .+, please/i,
  /pointed to (her|his) /i,
  /learned about the .+ in class/i,
  /Look at the .+ in the mirror/i,
  /The doctor checked (his|her) /i,
]

function isEdible(word, definition, category) {
  const w = clean(word)
  if (FOOD_WORDS.has(w)) return true
  if (BODY_WORDS.has(w) || ANIMAL_WORDS.has(w) || CLOTHES_WORDS.has(w)) return false
  // Multi-word food phrases
  if (/\b(soup|juice|salad|sandwich|pizza|cake|bread|fruit|vegetable|meal|snack)\b/i.test(w)) return true
  const text = `${w} ${definition} ${category}`.toLowerCase()
  // Only trust food keywords when the headword itself is food-adjacent, not just definition mentions
  if (/^(eat|drink|taste|hungry|meal|snack|food)$/i.test(w)) return true
  // Category food
  if (/food|fruit|drink|meal/i.test(category) && !/\b(part|body|animal|person)\b/i.test(definition)) {
    // still exclude if definition is clearly not edible
    if (/\b(opening|body|limb|organ|animal|person|clothing|garment|device|machine|place|building)\b/i.test(definition)) {
      return false
    }
    return true
  }
  return false
}

function clean(word) {
  return String(word).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

function matchesAny(sentence, patterns) {
  return patterns.some((re) => re.test(sentence))
}

function classifyMismatch(word, definition, category, sentence) {
  const w = clean(word)
  const issues = []

  if (matchesAny(sentence, FOOD_TEMPLATES) && !isEdible(word, definition, category)) {
    issues.push('food-template')
  }
  if (matchesAny(sentence, CLOTHES_TEMPLATES) && !CLOTHES_WORDS.has(w) && !/clothes|wear|clothing|garment/i.test(`${definition} ${category}`)) {
    // "Where is your X" and "washed carefully" are common false positives — only flag put on / soft and warm strongly
    if (/put on .+ this morning/i.test(sentence) || / is soft and warm/i.test(sentence)) {
      issues.push('clothes-template')
    }
  }
  if (matchesAny(sentence, ANIMAL_TEMPLATES) && !ANIMAL_WORDS.has(w) && !/animal|pet|zoo|mammal|insect|bird/i.test(`${definition} ${category} ${w}`)) {
    if (/saw .+ at the zoo/i.test(sentence) || /fed .+ some fresh food/i.test(sentence) || / likes to play in the garden/i.test(sentence)) {
      issues.push('animal-template')
    }
  }
  // Article + abstract nonsense: "ate a happiness", already covered by food
  // "Sit still in a mouth" travel template on non-vehicles
  if (/Sit still in .+please/i.test(sentence) && !/bus|train|car|plane|boat|bike|taxi|taxi|helicopter|lorry|truck|van|scooter/i.test(w)) {
    issues.push('travel-template')
  }
  if (/We planted .+ in the garden/i.test(sentence) && !/plant|tree|flower|seed|vegetable|fruit|bush|grass|leaf/i.test(`${w} ${definition}`)) {
    issues.push('nature-plant-template')
  }
  if (/Please turn off the .+ now/i.test(sentence) && !/computer|phone|tablet|robot|screen|tv|television|light|lamp|radio|camera|machine/i.test(w)) {
    issues.push('tech-template')
  }

  return issues
}

const data = loadAllVocabulary()
const badWords = []

for (const word of data.words) {
  const sentences = [word.sentence, ...(word.sentences || [])].filter(Boolean)
  const hits = []
  for (const sentence of sentences) {
    const issues = classifyMismatch(word.word, word.definition || '', word.category || '', sentence)
    if (issues.length) hits.push({ sentence, issues })
  }
  if (hits.length) {
    badWords.push({
      id: word.id,
      word: word.word,
      level: word.level,
      pos: word.partOfSpeech,
      category: word.category,
      definition: word.definition,
      primary: word.sentence,
      badCount: hits.length,
      samples: hits.slice(0, 3),
      issueTypes: [...new Set(hits.flatMap((h) => h.issues))],
    })
  }
}

badWords.sort((a, b) => b.badCount - a.badCount || a.word.localeCompare(b.word))

const outPath = resolve(root, 'scripts/.bad-sentences-report.json')
writeFileSync(outPath, JSON.stringify(badWords, null, 2))

console.log(`Flagged ${badWords.length} words with mismatched template sentences`)
console.log('Top issues:')
const byType = {}
for (const item of badWords) {
  for (const t of item.issueTypes) byType[t] = (byType[t] || 0) + 1
}
console.log(byType)
console.log('\nSample:')
for (const item of badWords.slice(0, 40)) {
  console.log(`- [${item.level}] ${item.word}: "${item.primary}" (${item.issueTypes.join(', ')}, ${item.badCount} bad)`)
}
console.log(`\nFull report: ${outPath}`)
