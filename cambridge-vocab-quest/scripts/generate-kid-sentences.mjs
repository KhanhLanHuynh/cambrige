/**
 * Give every vocabulary word 10 kid-friendly example sentences.
 * Uses AI-crafted classroom templates (suitable for YLE / young learners).
 */
import { loadAllVocabulary, writeVocabularyByLevel } from './vocab-files.mjs'

const TARGET = 10

const KIDS = ['Mia', 'Leo', 'Sam', 'Ana', 'Tom', 'Lily', 'Ben', 'Emma', 'Noah', 'Zoe']

function cleanDisplay(word) {
  return String(word)
    .replace(/\)+$/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function articleFor(word) {
  const base = word.replace(/^(the|a|an)\s+/i, '')
  return /^[aeiou]/i.test(base) ? 'an' : 'a'
}

const MASS_NOUNS = new Set([
  'bread', 'butter', 'cheese', 'milk', 'water', 'juice', 'lemonade', 'rice', 'pasta', 'soup',
  'breakfast', 'lunch', 'dinner', 'food', 'fruit', 'money', 'homework', 'music', 'weather',
  'fun', 'help', 'paper', 'sand', 'snow', 'rain', 'hair', 'grass', 'toast', 'chocolate',
  'sugar', 'salt', 'pepper', 'honey', 'jam', 'yoghurt', 'yogurt', 'meat', 'fish', 'chicken',
])

function withArticle(word) {
  const lower = word.toLowerCase()
  if (/^(a|an|the)\s/i.test(word)) return word
  if (MASS_NOUNS.has(lower)) return word
  if (/\s/.test(word)) return `the ${word}`
  if (/(sses|ches|shes|xes|zes|ies)$/i.test(word) || (/s$/i.test(word) && !/(ss|us|is|ous|ness|asis)$/i.test(word))) {
    return `the ${word}`
  }
  return `${articleFor(word)} ${word}`
}

function sceneFor(word, category, definition) {
  const lower = cleanDisplay(word).toLowerCase()
  const def = String(definition || '').toLowerCase()
  const cat = String(category || '').toLowerCase()
  const text = `${lower} ${def} ${cat}`

  // Corrupt / multi-lemma rows — keep sentences generic.
  if (!lower || lower.split(/\s+/).length >= 3) return 'general'

  // --- Headword-first maps (never trust loose definition keywords alone) ---
  if (/^(apple|banana|bean|beans|biscuit|biscuits|bread|burger|cake|candy|carrot|carrots|cereal|cheese|chicken|chips|chocolate|coconut|cookie|cookies|date|dessert|egg|eggs|fish|food|fries|fruit|grape|grapes|herb|herbs|honey|ice cream|icecream|jam|juice|kiwi|lemon|lemonade|lime|mango|meat|meatballs|melon|milk|milkshake|mushroom|noodles|olive|olives|onion|orange|pancake|pasta|peach|peanut|pear|pepper|pizza|potato|rice|salad|salt|sandwich|sauce|sausage|snack|soup|spinach|strawberry|sugar|supper|toast|tomato|vanilla|vegetable|water|watermelon|yoghurt|yogurt|chilli|chili|cabbage|lettuce|breakfast|lunch|dinner|meal|drink|coffee|tea)$/i.test(lower)) {
    return 'food'
  }
  if (/^(arm|arms|leg|legs|hand|hands|foot|feet|head|eye|eyes|ear|ears|face|nose|mouth|tooth|teeth|finger|fingers|toe|toes|knee|knees|shoulder|shoulders|neck|hair|body|chin|back|stomach|tummy|thumb|thumbs|elbow|elbows|lip|lips|tongue|cheek|cheeks|beard|moustache|mustache|ankle|wrist|waist|hip|hips)$/i.test(lower)) {
    return 'body'
  }
  if (/^(cat|dog|bird|fish|horse|cow|duck|frog|bear|bee|goat|sheep|mouse|rabbit|lion|tiger|monkey|elephant|giraffe|hippo|crocodile|dolphin|whale|pet|animal|spider|snake|bat|owl|parrot|puppy|kitten|chick|hen|donkey|camel|zebra|fox|beetle|creature)$/i.test(lower)) {
    return 'animals'
  }
  if (/^(shirt|dress|hat|shoe|shoes|jacket|jeans|boot|boots|sock|socks|coat|scarf|gloves|trousers|skirt|sweater|sweatshirt|jumper|tie|belt|cap|helmet|uniform|pyjamas|pajamas|shorts|t-shirt|pants|suit|sleeve|clothing|clothes|sandal|sandals|tights)$/i.test(lower)) {
    return 'clothes'
  }
  if (/^(bus|train|car|plane|boat|bike|bicycle|taxi|lorry|truck|van|scooter|helicopter|ship|tram|underground|subway)$/i.test(lower)) {
    return 'travel'
  }
  if (/^(computer|phone|keyboard|tablet|robot|internet|screen|camera|laptop|app|email|download|podcast|wifi|website)$/i.test(lower)) {
    return 'technology'
  }
  if (/^(airport|station|hotel|museum|library|shop|street|beach|park|city|town|restaurant|cafe|cafeteria|canteen|school|hospital|garage|cinema|theatre|theater|zoo|farm|market|supermarket|nightclub)$/i.test(lower)) {
    return 'places'
  }
  if (/^(tree|flower|plant|leaf|grass|seed|bush|forest)$/i.test(lower)) {
    return 'nature'
  }
  if (/^(bowl|plate|cup|glass|pot|pan|fridge|freezer|cooker|oven|kettle|refrigerator|heater|microwave|fork|spoon|knife|dishwasher)$/i.test(lower)) {
    return 'home'
  }
  if (/^(morning|afternoon|evening|night|day|week|hour|minute|clock|time|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(lower)) {
    return 'time'
  }
  if (/^(mother|mum|mom|father|dad|parent|family|friend|baby|child|brother|sister|boy|girl|man|woman|people|person)$/i.test(lower)) {
    return 'people'
  }
  if (/^(teacher|doctor|nurse|pilot|farmer|cook|chef|driver|firefighter|police|singer|actor|actress)$/i.test(lower)) {
    return 'jobs'
  }
  if (/^(football|tennis|basketball|hockey|golf|race|swim|swimming|sport|sports)$/i.test(lower)) {
    return 'sports'
  }
  if (/^(rain|sun|cloud|snow|wind|storm|weather|fog|thunder|lightning)$/i.test(lower)) {
    return 'weather'
  }

  // Places / rooms from definition (before food — "place where food is sold")
  if (/\b(place|building|room|shop|store|area|location)\b/.test(def) && /\b(eat|food|meal|drink)\b/.test(def)) return 'places'
  if (/\b(appliance|machine|device|container|furniture|tool)\b/.test(def)) return 'home'
  if (/\b(person who|someone who|occupation|job title)\b/.test(def)) return 'jobs'

  // Category hints — never trust bare "food" metadata (many rows are mis-tagged).
  if (/^(food|fruit|drink)$/i.test(cat)) {
    // Only keep food when the headword itself is edible (checked above) or def is clearly edible.
    if (
      /\b(fruit|snack|meal|beverage|edible|eaten as food)\b/.test(def)
      && !/\b(material|fabric|tanning|appliance|machine|building|place|person who|thermal|cessation|sit upon|luggage|art and practice|preparing food|heating)\b/.test(def)
    ) {
      return 'food'
    }
    // Otherwise ignore mis-tagged category.
  }
  if (/^(animal|animals|pet)$/i.test(cat)) return 'animals'
  if (/^(clothes|clothing)$/i.test(cat)) {
    // Ignore mis-tagged rows (e.g. address marked as clothes).
    if (/\b(garment|apparel|worn|clothing|shirt|shoe|shoes|jacket|hat|dress)\b/.test(def) || /clothes|clothing|wear/.test(lower)) {
      return 'clothes'
    }
  }
  if (/^(body|health)$/i.test(cat)) return /health|ill|sick|medicine|hospital|doctor|nurse/.test(def) ? 'health' : 'body'
  if (/^(transport|travel)$/i.test(cat)) return 'travel'
  if (/^(school|education)$/i.test(cat)) return 'school'
  if (/^(home|house)$/i.test(cat)) return 'home'
  if (/^(sport|sports)$/i.test(cat)) return 'sports'
  if (/^(weather)$/i.test(cat)) return 'weather'
  if (/^(nature|plant)$/i.test(cat)) return 'nature'
  if (/^(technology|tech)$/i.test(cat)) return 'technology'
  if (/^(job|jobs|work)$/i.test(cat)) return 'jobs'
  if (/^(place|places)$/i.test(cat)) return 'places'
  if (/^(family|people)$/i.test(cat)) return 'people'
  if (/^(time)$/i.test(cat)) return 'time'

  // Soft definition heuristics — avoid bare "food|eat|taste" (mis-tags mouth, cooker, restaurant…)
  if (
    /\b(fruit|snack|meal|beverage|edible)\b/.test(def)
    && !/\b(place|building|person|appliance|container|body|organ|material|fabric|line of|garden|art and practice|preparing food|thermal|cessation|luggage|sit upon|heating)\b/.test(def)
  ) {
    return 'food'
  }
  if (
    /\bvegetables?\b/.test(def)
    && !/\b(plant|garden|line of|row of|grow)\b/.test(def)
    && !/\b(place|building|person|appliance|container|body|organ|material)\b/.test(def)
  ) {
    return 'food'
  }
  if (/\b(animal|bird|pet|mammal|insect|reptile)\b/.test(def)) return 'animals'
  // Avoid bare "clothes" — luggage defs say "carrying clothes".
  if (/\b(shirt|hat|shoe|shoes|garment|jacket|trousers|sock|socks|fleece|apparel)\b/.test(def)) return 'clothes'
  if (/\b(classroom|lesson|homework|pencil|textbook)\b/.test(def)) return 'school'
  if (/\b(furniture|bedroom|kitchen|bathroom)\b/.test(def)) return 'home'
  if (/\b(sport|team|player|athlete)\b/.test(def)) return 'sports'
  if (/\b(body part|limb|organ)\b/.test(def)) return 'body'
  if (/\b(family|relative|parent)\b/.test(def)) return 'people'
  if (/\b(city|town|park|museum|library|beach)\b/.test(def)) return 'places'
  if (/\b(vehicle|transport|aircraft|railway|luggage)\b/.test(def)) return 'travel'
  if (/\b(weather|rainfall|temperature|climate)\b/.test(def)) return 'weather'
  if (/\b(tree|flower|forest|plant|river|mountain)\b/.test(def) && !/\b(space|rocket|planet)\b/.test(def)) return 'nature'
  if (/\b(computer|software|digital|electronic)\b/.test(def)) return 'technology'
  if (/\b(morning|afternoon|evening|hour|o'clock)\b/.test(def)) return 'time'
  if (/\b(doctor|nurse|hospital|medicine|illness)\b/.test(def)) return 'health'
  if (/\b(job|occupation|profession)\b/.test(def)) return 'jobs'

  if (cat && !['general', 'technology', 'food', 'clothes', 'clothing'].includes(cat)) return cat
  return 'general'
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function tidySentence(text) {
  let out = String(text).replace(/\s+/g, ' ').trim()
  if (!out) return ''
  out = capitalize(out)
  if (!/[.!?]$/.test(out)) out += '.'
  return out
}

function hashSeed(text) {
  let hash = 2166136261
  for (const ch of text) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pickKids(seed, count = 3) {
  const result = []
  let value = seed
  while (result.length < count) {
    value = (value * 1664525 + 1013904223) >>> 0
    const kid = KIDS[value % KIDS.length]
    if (!result.includes(kid)) result.push(kid)
  }
  return result
}

function rotate(items, seed) {
  if (!items.length) return items
  const offset = seed % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function templatePool(word, pos, category, definition, level) {
  const w = cleanDisplay(word)
  if (!w) return []
  const art = withArticle(w)
  const scene = sceneFor(w, category, definition)
  const [a, b, c] = pickKids(hashSeed(`${w}|${pos}|${scene}`))
  const schoolish = level === 'Preliminary' || level === 'Flyers'
  const sentences = []

  if (pos === 'verb') {
    if (/^let['’]s$/i.test(w)) {
      return [
        'Let’s play outside after school.',
        'Let’s read a funny story together.',
        'Let’s draw a big rainbow.',
        'Let’s help Mum in the kitchen.',
        'Let’s sing our favourite song.',
        'Let’s tidy the classroom now.',
        'Let’s ride our bikes in the park.',
        'Let’s make a snack for everyone.',
        'Let’s practise English with a game.',
        'Let’s share the crayons, please.',
      ]
    }
    if (/^can$/i.test(w)) {
      return [
        'I can ride my bike.',
        'Can you help me, please?',
        `${a} can swim very well.`,
        'We can finish this puzzle together.',
        'You can choose a blue pencil.',
        `${b} can count to twenty.`,
        'Can we play in the garden?',
        'Birds can fly high in the sky.',
        'I can write my name neatly.',
        `${c} can catch the soft ball.`,
      ]
    }
    if (/^have got$/i.test(w)) {
      return [
        'I have got a red school bag.',
        `${a} has got two pet rabbits.`,
        'Have you got a pencil case?',
        'We have got a big garden.',
        `${b} has got a new kite.`,
        'I have got three blue crayons.',
        'They have got lunch at school.',
        `${c} has got a friendly dog.`,
        'Have we got enough paper?',
        'She has got a bright smile.',
      ]
    }
    if (/^go to bed$/i.test(w)) {
      return [
        'I go to bed at eight o’clock.',
        `${a} goes to bed after a story.`,
        'Please go to bed quietly tonight.',
        'We go to bed when we feel sleepy.',
        `${b} likes to go to bed early.`,
        'Do you go to bed before nine?',
        'I brush my teeth and go to bed.',
        `${c} will go to bed soon.`,
        'On school nights I go to bed early.',
        'Let’s go to bed and rest.',
      ]
    }
    if (/^go to sleep$/i.test(w)) {
      return [
        'I go to sleep after Mum reads to me.',
        `${a} can go to sleep quickly.`,
        'The kitten will go to sleep in the basket.',
        'Please go to sleep now, it’s late.',
        'We go to sleep when the lights are off.',
        `${b} tries to go to sleep quietly.`,
        'I hug my teddy and go to sleep.',
        'Can you go to sleep on the bus? No!',
        `${c} will go to sleep after the song.`,
        'Close your eyes and go to sleep.',
      ]
    }

    const verbExtras = {
      sports: [`We ${w} during PE class.`, `${a} loves to ${w} at the sports club.`],
      food: [`Please help me ${w} the fruit.`, `We ${w} before we eat.`],
    }
    sentences.push(
      ...(verbExtras[scene] || []),
      `I like to ${w} with my friends.`,
      `${a} can ${w} very carefully.`,
      `Let’s ${w} together after lunch.`,
      `We ${w} every morning at school.`,
      `Can you ${w} for me, please?`,
      `${b} wants to ${w} in the park.`,
      `Today we will ${w} in class.`,
      `Watch me ${w}!`,
      `${c} learned how to ${w} last week.`,
      `Please ${w} slowly and smile.`,
      `Do you ${w} at the weekend?`,
      `My teacher asked us to ${w}.`,
      `${a} and ${b} love to ${w} outside.`,
      `First listen, then ${w}.`,
    )
  } else if (pos === 'adjective') {
    const adjExtras = {
      feelings: [`I feel ${w} when I see my friends.`, `${a} felt ${w} after the kind note.`],
      weather: [`The sky looks ${w} this morning.`, `It feels ${w} outside today.`],
    }
    sentences.push(
      ...(adjExtras[scene] || []),
      `The puppy looks very ${w}.`,
      `I feel ${w} today.`,
      `${a} drew a ${w} picture.`,
      `This story is ${w} and fun.`,
      `My new bag is ${w}.`,
      `${b} thinks the game is ${w}.`,
      `What a ${w} day at school!`,
      `The flowers look ${w} in the sun.`,
      `${c} wore a ${w} hat.`,
      `We made a ${w} poster for class.`,
      `Is your favourite toy ${w}?`,
      `Everyone smiled at the ${w} surprise.`,
      `${a} feels ${w} after PE.`,
      `Our classroom looks ${w} today.`,
    )
  } else if (pos === 'adverb') {
    sentences.push(
      `Please speak ${w}.`,
      `${a} runs ${w} in the race.`,
      `We listened ${w} to the story.`,
      `Write your name ${w}, please.`,
      `${b} smiled ${w} at her friend.`,
      `The rabbit hopped ${w} across the grass.`,
      `Can you open the door ${w}?`,
      `${c} answered the question ${w}.`,
      `Walk ${w} near the busy road.`,
      `She packed her bag ${w}.`,
      `They clapped ${w} after the song.`,
      `I finished my homework ${w}.`,
      `${a} read the page ${w}.`,
      `Please sit ${w} on the mat.`,
    )
  } else {
    const drink = /^(coffee|tea|juice|milk|water|lemonade|hot chocolate|cocoa|milkshake|drink)$/i.test(w)
    const byScene = {
      animals: [
        `${a} saw ${art} at the zoo.`,
        `The ${w} likes to play in the garden.`,
        `We fed ${art} some fresh food.`,
        `${b} read a story about ${art}.`,
      ],
      food: drink ? [
        `${a} drank ${art} at breakfast.`,
        `Please pass me ${art}.`,
        `${b} likes ${art} a lot.`,
        `We bought ${art} at the shop.`,
        `${c} shared ${art} with a friend.`,
        `There is ${art} on the table.`,
      ] : [
        `${a} ate ${art} for lunch.`,
        `Please pass me ${art}.`,
        `${b} likes ${art} a lot.`,
        `We bought ${art} at the shop.`,
        `${c} shared ${art} with a friend.`,
        `There is ${art} on the table.`,
      ],
      clothes: [
        `${a} put on ${art} this morning.`,
        `My ${w} is soft and warm.`,
        `Where is your ${w}?`,
        `${b} washed ${art} carefully.`,
      ],
      school: [
        `Put your ${w} in your bag.`,
        `Our teacher showed us ${art}.`,
        `${a} used ${art} in the lesson.`,
        `We need ${art} for homework.`,
      ],
      home: [
        `There is ${art} in our house.`,
        `${a} cleaned ${art} carefully.`,
        `We keep ${art} in the kitchen.`,
        `${b} sat near ${art}.`,
      ],
      sports: [
        `${a} plays with ${art} after school.`,
        `We need ${art} for the game.`,
        `${b} kicked ${art} across the field.`,
        `Bring ${art} to PE class.`,
      ],
      body: [
        `Touch your ${w} and smile!`,
        `My ${w} feels better now.`,
        `Open your ${w}, please.`,
        `${a} pointed to her ${w}.`,
        `Can you see my ${w}?`,
        `We learned about the ${w} in class.`,
        `${b} drew a big ${w} in the picture.`,
        `Look at the ${w} in the mirror!`,
        `The doctor checked his ${w} kindly.`,
        `${c} washed her ${w} before dinner.`,
      ],
      people: [
        `${a} met ${art} at the park.`,
        `My ${w} is very kind.`,
        `We waved to ${art}.`,
        `${b} helped ${art} today.`,
      ],
      places: [
        `We visited ${art} at the weekend.`,
        `${a} likes ${art} near the river.`,
        `Is ${art} far from school?`,
        `${b} drew ${art} in art class.`,
        `Mum took us to ${art} today.`,
        `There is ${art} in our town.`,
      ],
      travel: [
        `${a} saw ${art} on the trip.`,
        `We talked about ${art} before our holiday.`,
        `${b} pointed to ${art} in the picture.`,
        `Look at ${art} near the station!`,
        `Our teacher told us about ${art}.`,
        `${c} drew ${art} in her notebook.`,
      ],
      weather: [
        `Look at ${art} in the sky!`,
        `${a} loves ${art} after rain.`,
        `Today there is ${art} outside.`,
        `We talked about ${art} in class.`,
      ],
      nature: [
        `${a} looked at ${art} carefully.`,
        `We learned about ${art} in science.`,
        `Can you see ${art} outside?`,
        `${b} took a photo of ${art}.`,
        `There is ${art} near our school.`,
        `${c} drew ${art} in art class.`,
      ],
      technology: [
        `${a} learned about ${art} at school.`,
        `We talked about ${art} in the lesson.`,
        `Can you see ${art} in the picture?`,
        `${b} pointed to ${art} and smiled.`,
        `Our teacher showed us ${art}.`,
        `${c} wrote a note about ${art}.`,
      ],
      time: [
        `We play games in the ${w}.`,
        `${a} reads every ${w}.`,
        `See you in the ${w}!`,
        `Our lesson is in the ${w}.`,
      ],
      health: [
        `${a} visited ${art} with Mum.`,
        `Drink water and rest your ${w}.`,
        `The nurse checked ${art} kindly.`,
        `${b} learned about ${art} today.`,
      ],
      jobs: [
        `${a} wants to be ${art} one day.`,
        `The ${w} helped us at school.`,
        `We thanked ${art} with a smile.`,
        `${b} drew ${art} in a picture.`,
      ],
    }

    sentences.push(
      ...(byScene[scene] || []),
      `I can see ${art} in the picture.`,
      `${a} has ${art} at home.`,
      `Look! There is ${art} near the tree.`,
      `We learned about ${art} at school today.`,
      `${b} pointed to ${art} and smiled.`,
      `Can you draw ${art}, please?`,
      `There is ${art} on the table.`,
      `${c} found ${art} in the book.`,
      `My favourite thing is ${art}.`,
      `Please show me ${art}.`,
      `We talked about ${art} in class.`,
      `Can you see ${art}?`,
      `${a} coloured ${art} with a crayon.`,
      `I wrote the word “${w}” in my notebook.`,
    )

    if (schoolish) {
      sentences.push(
        `In our English book there is ${art}.`,
        `${a} wrote a short note about ${art}.`,
      )
    }
  }

  return sentences.map(tidySentence)
}

function uniqueSentences(candidates) {
  const seen = new Set()
  const out = []
  for (const raw of candidates) {
    const text = tidySentence(raw)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

function buildSentences(word) {
  const display = cleanDisplay(word.word)
  const seed = hashSeed(word.id)
  const pool = templatePool(display, word.partOfSpeech, word.category, word.definition, word.level)
  // Keep the most relevant scene lines first; rotate only the remainder for variety.
  const pinned = pool.slice(0, Math.min(4, pool.length))
  const rest = rotate(pool.slice(pinned.length), seed)
  const existing = Array.isArray(word.sentences) ? word.sentences.map(tidySentence).filter(Boolean) : []
  const merged = uniqueSentences([...pinned, ...rest, ...existing])

  if (merged.length >= TARGET) return merged.slice(0, TARGET)

  const art = withArticle(display || word.word)
  let n = 1
  while (merged.length < TARGET) {
    const filler = tidySentence(`In picture ${n}, children talk about ${art}`)
    if (!merged.some((item) => item.toLowerCase() === filler.toLowerCase())) merged.push(filler)
    n += 1
    if (n > 20) break
  }
  return merged.slice(0, TARGET)
}

function main() {
  const data = loadAllVocabulary()
  console.log(`Generating ${TARGET} kid sentences for ${data.words.length} words…`)

  for (const word of data.words) {
    const sentences = buildSentences(word)
    word.sentences = sentences
  }

  writeVocabularyByLevel(data.words, {
    ...data.source,
    sentencesGeneratedAt: new Date().toISOString(),
  })

  const complete = data.words.filter((word) => Array.isArray(word.sentences) && word.sentences.length === TARGET).length
  const sample = data.words.find((word) => word.word === 'apple') || data.words[0]
  console.log(`Done. ${complete}/${data.words.length} words have ${TARGET} sentences.`)
  console.log(`Sample (${sample.word}):`)
  for (const sentence of sample.sentences) console.log(`  - ${sentence}`)
}

main()
