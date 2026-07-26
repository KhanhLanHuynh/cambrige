/**
 * Give every vocabulary word a unique kid-friendly SPACE FACT (real trivia style).
 * Priority: curated bank → Wikipedia summary (kid-edited) → usage/world-knowledge fallback.
 *
 * Usage:
 *   node scripts/generate-kid-facts.mjs
 *   node scripts/generate-kid-facts.mjs --offline   # curated + cache only (no network)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAllVocabulary, writeVocabularyByLevel } from './vocab-files.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = resolve(ROOT, 'scripts/.fact-wiki-cache.json')
const OFFLINE = process.argv.includes('--offline')
const USER_AGENT = 'CambridgeVocabQuest/1.0 (local vocab fact enrich; educational)'

function cleanDisplay(word) {
  return String(word)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[)\]}>]+$/g, '')
    .replace(/^[(\[{<]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeKey(word) {
  return cleanDisplay(word).toLowerCase()
}

function capitalize(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function tidyFact(text) {
  let out = String(text).replace(/\s+/g, ' ').trim()
  if (!out) return ''
  out = capitalize(out)
  if (!/[.!?]$/.test(out)) out += '.'
  if (out.length > 140) out = `${out.slice(0, 137).replace(/\s+\S*$/, '')}…`
  return out
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isWeakFact(text) {
  const t = String(text || '')
  if (!t.trim()) return true
  if (/\bis on the Cambridge .+ vocabulary list/i.test(t)) return true
  if (/\bmeans\b/i.test(t) && !/^“[^”]+” (is|talks|gives|can|often)/i.test(t)) {
    // Allow a few intentional function-word lines; reject dictionary echoes
    if (/\bmeans (to |an? |the |that |something)/i.test(t) || /^[A-Z][\w'’ -]+ means /i.test(t)) return true
  }
  if (/is a word for\b/i.test(t)) return true
  if (/\b(action|describing|naming) word/i.test(t)) return true
  if (/try pointing|picture stories|picture books|spot the word|useful english word|practise saying/i.test(t)) return true
  if (/handy school word|feelings word|weather word|travel word|people word|place word|job word|home word|clothes word|food word|nature word|technology word|health word|sports talk/i.test(t)) return true
  if (/nouns like|verbs like|adjectives like|adverbs like/i.test(t)) return true
  return false
}

/** Curated world-knowledge / vivid trivia — never “X means [definition]”. */
const CURATED_FACTS = {
  // Animals
  ant: 'An ant can lift many times its own body weight.',
  animal: 'Scientists have named more than a million kinds of animals on Earth.',
  bat: 'Bats find their way in the dark using sound, not light.',
  bear: 'Polar bears have black skin under their white fur.',
  bee: 'Bees dance to tell other bees where the flowers are.',
  bird: 'Some birds can sleep while they are flying.',
  butterfly: 'Butterflies taste with their feet.',
  camel: 'Camels store fat in their humps, not water.',
  cat: 'Cats sleep for about 12 to 16 hours every day.',
  chicken: 'Chickens can remember more than 100 different faces.',
  cow: 'Cows have best friends and like to stay near them.',
  crocodile: 'Crocodiles can go a long time without eating.',
  dog: 'Dogs can smell about 40 times better than people.',
  dolphin: 'Dolphins talk to each other with clicks and whistles.',
  duck: 'Duck feathers are waterproof so ducks stay dry in water.',
  elephant: 'Elephants can hear sounds with their feet as well as their ears.',
  fish: 'Some fish can sleep with their eyes open.',
  frog: 'Frogs drink water through their skin.',
  giraffe: 'A giraffe’s tongue can be about 45 centimetres long.',
  goat: 'Goats have rectangular pupils that help them see all around.',
  hippo: 'Hippos can hold their breath underwater for about five minutes.',
  horse: 'Horses can sleep standing up.',
  insect: 'There are more kinds of insects than any other animal group.',
  kitten: 'Kittens are born with their eyes closed.',
  lion: 'A lion’s roar can be heard from several kilometres away.',
  monkey: 'Some monkeys use tools, like sticks, to get food.',
  mouse: 'A mouse’s teeth never stop growing.',
  parrot: 'Parrots can copy human words and sounds.',
  pet: 'Looking after a pet teaches children kindness and responsibility.',
  puppy: 'Puppies are usually born deaf and blind.',
  rabbit: 'Rabbits’ teeth grow all their lives.',
  shark: 'Sharks have been swimming in the oceans for millions of years.',
  sheep: 'Sheep can recognise the faces of other sheep.',
  snake: 'Snakes smell with their tongues.',
  spider: 'Not all spiders make webs — some hunt on the ground.',
  tiger: 'No two tigers have exactly the same stripe pattern.',
  whale: 'Blue whales are the largest animals that have ever lived.',
  zebra: 'Every zebra has a unique stripe pattern, like a fingerprint.',

  // Food & drink
  apple: 'There are thousands of different kinds of apples in the world.',
  banana: 'Bananas are berries, but strawberries are not!',
  bread: 'Bread is one of the oldest foods people still eat today.',
  breakfast: 'Breakfast got its name from “breaking the fast” after a night without food.',
  burger: 'The hamburger was named after the German city of Hamburg.',
  butter: 'Butter is made by shaking cream until it turns solid.',
  cake: 'Birthday cakes with candles became popular more than 200 years ago.',
  carrot: 'Carrots were first grown for their leaves and seeds, not the orange root.',
  cheese: 'There are hundreds of kinds of cheese around the world.',
  chocolate: 'Chocolate comes from beans that grow on cacao trees.',
  dinner: 'In some countries “dinner” is the midday meal; in others it is the evening meal.',
  egg: 'An egg shell has thousands of tiny holes for air.',
  food: 'Your body turns food into energy so you can run, think, and grow.',
  fruit: 'Fruit has natural sugar that gives plants energy to grow seeds.',
  honey: 'Honey never really goes bad if it is kept sealed.',
  ice: 'Ice is just frozen water — the same H₂O in a solid shape.',
  'ice cream': 'The first ice-cream-like desserts were enjoyed thousands of years ago.',
  juice: 'Fresh juice can come from fruits or vegetables.',
  lemon: 'Lemons float in water, but limes often sink.',
  lunch: 'Many schools serve lunch so children have energy for afternoon lessons.',
  milk: 'Milk helps bones grow strong because it has calcium.',
  orange: 'Oranges are a great source of vitamin C.',
  pizza: 'The first pizzas were made in Naples, Italy.',
  rice: 'Rice feeds more people than any other crop in the world.',
  salad: 'A colourful salad can mix leaves, fruit, seeds, and crunchy vegetables.',
  salt: 'Salt comes from the sea or from under the ground.',
  sandwich: 'The sandwich is named after the Earl of Sandwich.',
  soup: 'Soup can be hot or cold — both can taste delicious.',
  sugar: 'Sugar can come from sugar cane or from sugar beet plants.',
  tomato: 'Tomatoes are fruits, even though we cook them like vegetables.',
  water: 'About 60% of a person’s body is made of water.',
  yoghurt: 'Yoghurt is made when friendly bacteria turn milk thick and tangy.',
  yogurt: 'Yogurt is made when friendly bacteria turn milk thick and tangy.',

  // Body
  arm: 'Your arm has three long bones that help you lift and throw.',
  body: 'An adult human body has about 206 bones.',
  ear: 'Your ears help you keep your balance as well as hear.',
  eye: 'Your eyes blink thousands of times every day to stay wet and clean.',
  face: 'No two faces are exactly the same — even identical twins differ a little.',
  foot: 'Each foot has 26 bones — that’s a lot for walking!',
  hair: 'Hair is made of keratin, the same material as fingernails.',
  hand: 'Your hands have many small muscles for careful movements.',
  head: 'Your brain sits safely inside your head, protected by bone.',
  heart: 'Your heart beats about 100,000 times every day.',
  leg: 'Strong leg muscles help you run, jump, and climb.',
  mouth: 'Your tongue has thousands of tiny taste buds.',
  nose: 'Your nose can smell thousands of different scents.',
  tooth: 'Baby teeth fall out so adult teeth have room to grow.',
  teeth: 'Adults usually have 32 teeth, including wisdom teeth.',

  // Nature & weather
  cloud: 'Clouds are made of tiny water drops or ice crystals floating in air.',
  flower: 'Flowers make seeds so new plants can grow.',
  forest: 'Forests make oxygen that people and animals need to breathe.',
  grass: 'Grass grows from the bottom, so it can keep growing after you cut it.',
  leaf: 'Leaves use sunlight to make food for the plant.',
  moon: 'The Moon has no air, so there is no weather there.',
  mountain: 'Mountains can be so high that snow stays on top all year.',
  plant: 'Plants make their own food using sunlight, water, and air.',
  rain: 'Raindrops form when tiny water drops in clouds join together.',
  rainbow: 'A rainbow appears when sunlight shines through raindrops.',
  river: 'Rivers carry water from high land down to lakes or the sea.',
  snow: 'Every snowflake has six sides, but each one looks a little different.',
  star: 'The stars you see at night are giant balls of hot glowing gas.',
  sun: 'The Sun is a star — the closest star to Earth.',
  tree: 'Some trees can live for hundreds or even thousands of years.',
  weather: 'Weather is what the air is doing outside right now — sun, rain, wind, or snow.',
  wind: 'Wind is air that is moving from one place to another.',

  // Space
  alien: 'Scientists search for life beyond Earth, but no aliens have been confirmed yet.',
  astronaut: 'Astronauts float in space because they are falling around Earth.',
  earth: 'Earth is the only planet we know that has liquid water on its surface.',
  planet: 'Planets travel around stars in paths called orbits.',
  rocket: 'Rockets push themselves forward by shooting gas out behind them.',
  space: 'Space begins about 100 kilometres above Earth.',
  universe: 'The universe is everything that exists — space, time, matter, and energy.',

  // Transport
  bike: 'Riding a bike is one of the fastest ways to travel without an engine.',
  boat: 'Boats float because they push water out of the way.',
  bus: 'School buses help many children travel safely together.',
  car: 'The first cars were slower than a bicycle!',
  helicopter: 'Helicopters can fly straight up, down, and sideways.',
  plane: 'Aeroplanes fly because their wings create lift in the air.',
  train: 'Trains can carry hundreds of people on one journey.',

  // School / home / objects
  alphabet: 'The English alphabet has 26 letters, from A to Z.',
  armchair: 'An armchair has side rests so your arms can relax while you sit.',
  balloon: 'A helium balloon rises because helium is lighter than the air around it.',
  baseball: 'A baseball has 108 stitches sewn by hand.',
  bath: 'Warm baths can help tired muscles feel more comfortable.',
  book: 'Books let you visit new places without leaving your chair.',
  box: 'Cardboard boxes can be folded flat to save space when empty.',
  camera: 'The first cameras needed many minutes of light to take one photo.',
  chair: 'Chairs with four legs spread your weight so sitting feels steady.',
  clock: 'A clock helps everyone agree on what time it is.',
  computer: 'Computers follow instructions called programs, step by step.',
  desk: 'A clear desk makes reading and writing easier for your eyes and hands.',
  dictionary: 'A dictionary helps you check spelling and learn new words.',
  door: 'Doors have been used for thousands of years to keep homes safe and warm.',
  house: 'Houses protect people from weather and give families a place to share life.',
  map: 'Maps show places from above so you can find your way.',
  paper: 'Most paper today is made from wood pulp pressed into thin sheets.',
  pencil: 'Most pencils can draw a line about 55 kilometres long!',
  phone: 'Modern phones can send messages around the world in under a second.',
  picture: 'A picture can tell a story without any words.',
  radio: 'Radio waves travel at the speed of light to bring music and news.',
  robot: 'Robots follow programs to do jobs that are hard, dull, or dangerous for people.',
  school: 'Schools help children learn reading, writing, maths, and friendship.',
  table: 'Tables give a flat surface for eating, drawing, and playing games.',
  teacher: 'Teachers help learners discover new ideas every day.',
  television: 'Television pictures are made of many tiny coloured dots of light.',
  window: 'Windows let sunlight in while keeping wind and rain outside.',

  // People / family
  aunt: 'An aunt is the sister of your mum or dad — or married to your uncle.',
  baby: 'Babies learn language by listening long before they can talk.',
  boy: '“Boy” is used for a young male child — everyone starts as a child learning the world.',
  brother: 'A brother shares the same parents as you, or grows up in your family.',
  child: 'Children’s brains grow quickly, which is why play and stories matter so much.',
  family: 'Families can look different, but they share care and belonging.',
  father: '“Dad” and “Father” both name a parent who cares for you.',
  friend: 'Friends make hard days easier and fun days even better.',
  girl: '“Girl” is used for a young female child — curiosity and kindness help every child grow.',
  man: 'Adults were once children too — growing up takes many years of learning.',
  mother: '“Mum” and “Mother” both name a parent who cares for you.',
  people: 'There are more than 8 billion people living on Earth today.',
  person: 'Every person has a unique mix of fingerprints, voice, and life story.',
  sister: 'A sister shares the same parents as you, or grows up in your family.',
  uncle: 'An uncle is the brother of your mum or dad — or married to your aunt.',
  woman: 'Women and girls make up about half of the world’s people.',

  // Colours
  black: 'Black clothes can feel warmer in the sun because they absorb more light.',
  blue: 'On a clear day, the sky often looks blue because of how sunlight scatters.',
  brown: 'Brown is a common colour for soil, wood, and many animals’ fur.',
  colour: 'Colours are how our eyes and brain see different kinds of light.',
  color: 'Colors are how our eyes and brain see different kinds of light.',
  green: 'Many plants look green because of chlorophyll, which helps them make food.',
  grey: 'Grey is what you get when black and white mix — like foggy sky days.',
  gray: 'Gray is what you get when black and white mix — like foggy sky days.',
  pink: 'Pink sunsets appear when sunlight travels through more air at the end of the day.',
  purple: 'Purple dye was once so rare that only kings and queens could wear it.',
  red: 'Red is often used for stop signs because it stands out and grabs attention.',
  white: 'White reflects most light, which is why white clothes can feel cooler in the sun.',
  yellow: 'Yellow is one of the easiest colours for human eyes to notice quickly.',

  // Feelings / adjectives
  afraid: 'Feeling afraid is normal — it helps your body get ready to stay safe.',
  angry: 'Taking slow breaths can help your body calm down when you feel angry.',
  asleep: 'When you are asleep, your brain still works and helps you remember.',
  awake: 'Being awake is when your mind is ready to notice, learn, and play.',
  beautiful: 'People find beauty in nature, art, kindness, and even maths patterns.',
  big: 'The biggest living animal is the blue whale — longer than a school bus.',
  boring: 'Trying a new game or book is a quick way to turn a boring moment around.',
  busy: 'Being busy feels better when you finish one small job at a time.',
  careful: 'Being careful helps you finish work well and stay safe near roads or tools.',
  clean: 'Washing hands with soap can remove many germs you cannot see.',
  cold: 'When you feel cold, your body may shiver to make a little extra heat.',
  dirty: 'Dirt can hide germs, so washing hands and clothes helps you stay healthy.',
  easy: 'A job feels easy after practice — every expert started as a beginner.',
  exciting: 'Feeling excited makes your heart beat faster, like before a big game.',
  famous: 'Famous people are known by many strangers — even across other countries.',
  fast: 'Cheetahs are the fastest land animals, sprinting about 100 km per hour.',
  funny: 'Laughing with friends can make hard days feel lighter.',
  happy: 'Smiling when you feel happy can make other people smile too.',
  hot: 'Drinking water helps your body cool down on hot days.',
  hungry: 'Feeling hungry is your body’s way of asking for energy.',
  interesting: 'Interesting ideas make your brain want to ask “why?” and “how?”',
  kind: 'A kind word or small help can change someone’s whole day.',
  love: 'People all over the world say “I love you” to show care for family and friends.',
  loud: 'Sounds above about 85 decibels can hurt ears if you listen for too long.',
  new: 'Trying something new helps your brain grow new connections.',
  nice: 'Being nice — sharing, listening, waiting your turn — makes groups work better.',
  old: 'Some trees are thousands of years old and still growing.',
  quiet: 'Libraries stay quiet so everyone can focus on reading and thinking.',
  sad: 'Feeling sad is okay — talking to someone you trust can help you feel better.',
  short: 'A short story can still teach a big idea in just a few pages.',
  slow: 'Going slow helps when you are learning a new skill carefully.',
  small: 'Some insects are so small you need a magnifying glass to see them well.',
  strong: 'Muscles grow stronger when you use them regularly, then rest.',
  tall: 'The tallest trees on Earth can grow over 100 metres high.',
  thirsty: 'Feeling thirsty is your body’s signal that it needs more water.',
  tired: 'Sleep helps your body repair itself when you feel tired.',
  warm: 'Warm clothes trap a layer of air that keeps your body heat close.',
  young: 'Young animals often learn by watching older members of their group.',

  // School verbs / common actions
  add: 'Adding numbers is one of the first maths skills children learn at school.',
  answer: 'A good answer often starts by reading the question carefully twice.',
  ask: '“Ask” is what you do when you want help, permission, or information.',
  choose: 'Choosing carefully is useful when a menu, game, or team has many options.',
  clap: 'People clap to show they enjoyed a song, play, or sports moment.',
  close: 'Closing a door gently keeps fingers safe and rooms quieter.',
  come: '“Come here” is one of the first directions many children understand.',
  count: 'People have counted with fingers for thousands of years before calculators.',
  cry: 'Tears can help wash dust from eyes and also release strong feelings.',
  dance: 'Dancing is exercise that also helps memory and mood.',
  draw: 'Drawing trains your eye and hand to work together.',
  drink: 'Drinking water during the day helps you think and play better.',
  eat: 'Eating slowly helps your body notice when it is full.',
  find: 'Treasure hunts and puzzles make “find” a fun classroom game.',
  fly: 'Birds fly by pushing air down with their wings to lift their bodies up.',
  give: 'Giving a gift or helping hand builds friendship and trust.',
  go: 'People have travelled on foot, animals, wheels, and wings to go places.',
  help: 'Helping others can make both people feel happier.',
  jump: 'Jumping uses strong leg muscles and helps with balance.',
  kick: 'Football players practise kicking so the ball goes where they aim.',
  know: 'Your brain stores knowledge as networks of connected memories.',
  laugh: 'Laughing is contagious — hearing others laugh can make you laugh too.',
  learn: 'Your brain learns best with practice, sleep, and a little challenge.',
  like: 'Saying what you like helps friends choose games and books together.',
  listen: 'Good listeners look at the speaker and wait before answering.',
  look: 'Looking carefully helps you notice details others might miss.',
  make: 'Making things with your hands builds patience and problem-solving.',
  open: 'Opening a book is the start of many adventures.',
  paint: 'Paint colours mix in surprising ways — blue and yellow make green.',
  play: 'Play helps children practise rules, teamwork, and creativity.',
  put: 'Putting toys away makes the next playtime easier to start.',
  read: 'Reading every day is one of the best ways to grow vocabulary.',
  ride: 'Learning to ride a bike takes balance, practice, and a little courage.',
  run: 'Running makes your heart stronger and your lungs work harder.',
  say: 'People say about 15,000 words on an average day.',
  see: 'Your eyes send signals to your brain, which builds the pictures you see.',
  sing: 'Singing uses breath control and can help you remember words better.',
  sit: 'Sitting with your feet on the floor helps your back stay comfortable.',
  sleep: 'Most children need about 9–12 hours of sleep each night.',
  smile: 'A smile uses many small face muscles — and people notice it quickly.',
  speak: 'Speaking a new language gets easier when you practise a little every day.',
  stand: 'Standing desks and stretch breaks help people who sit for long lessons.',
  start: 'Starting a big project with one small step makes it less scary.',
  stop: 'Stop signs are red so drivers notice them in time to stay safe.',
  swim: 'Humans can learn to swim, but fish are born ready for water life.',
  take: 'Taking turns is a simple rule that keeps games fair.',
  talk: 'Talking with family at dinner helps children grow language skills.',
  tell: 'Telling a story in order — beginning, middle, end — helps listeners follow.',
  think: 'Your brain uses about 20% of your body’s energy just to think.',
  throw: 'Throwing well needs eye, arm, and timing working together.',
  try: 'Trying again after a mistake is how most skills are really learned.',
  walk: 'Walking is one of the simplest ways to explore and stay healthy.',
  want: 'Saying what you want clearly helps others understand you.',
  watch: 'Watching carefully is the first step in many science experiments.',
  wear: 'People wear different clothes for weather, sports, and celebrations.',
  write: 'Writing helps ideas stay on paper so you can share and remember them.',

  // Time / calendar
  afternoon: 'Afternoon is the part of the day between midday and evening.',
  birthday: 'A birthday celebrates the day you were born each year.',
  day: 'Earth turns once every 24 hours — that is what makes a day.',
  evening: 'Evening light turns softer and often more colourful near sunset.',
  hour: 'There are 24 hours in a day and 60 minutes in each hour.',
  minute: 'A minute has 60 seconds — about one deep breath cycle many times over.',
  morning: 'Morning sunlight helps many people’s bodies wake up naturally.',
  night: 'At night, many animals hunt while others sleep safely in nests or dens.',
  today: '“Today” is the only day you can act in — yesterday is memory, tomorrow is a plan.',
  tomorrow: 'Tomorrow’s plans work better when you prepare a little today.',
  week: 'A week has seven days — a pattern used in many calendars worldwide.',
  year: 'Earth takes about 365 days to travel once around the Sun — one year.',
  yesterday: 'Yesterday’s lessons help you make smarter choices today.',

  // Misc high-frequency
  apartment: 'Apartments stack many homes in one building to save city space.',
  ball: 'Round balls roll smoothly because every side is the same distance from the centre.',
  beach: 'Beaches are made of tiny bits of rock and shell worn smooth by waves.',
  bed: 'A good bed and dark room help your brain sleep more deeply.',
  city: 'More than half of the world’s people now live in cities.',
  game: 'Games teach rules, patience, and how to win or lose kindly.',
  garden: 'Gardens can grow food, flowers, and homes for bees and butterflies.',
  holiday: 'Holidays give families time to rest, travel, or celebrate together.',
  hospital: 'Hospitals bring doctors, nurses, and tools together to help sick people.',
  island: 'An island is land with water all around it.',
  kitchen: 'Kitchens are designed so cooking, washing, and storing food stay safe.',
  letter: 'Letters can travel across oceans and still arrive months later.',
  music: 'Music can change how you feel in just a few notes.',
  name: 'Your name is one of the first words most people learn to write.',
  number: 'Numbers help us count, measure, and share fair amounts.',
  park: 'City parks give people green space to play when homes have no gardens.',
  party: 'Parties often use music, food, and games to celebrate together.',
  shop: 'Shops let people trade money for food, clothes, and tools they need.',
  sport: 'Sport helps your heart, muscles, and teamwork grow stronger.',
  story: 'Stories help people remember history and share feelings.',
  street: 'Street names and numbers help post and visitors find the right house.',
  town: 'Towns are smaller than cities but still have shops, schools, and streets.',
  village: 'Villages are small communities where many neighbours know each other.',

  // Function / multi-word (usage, not dictionary gloss)
  'have to': '“Have to” is for necessary things — like homework you must finish.',
  'have (got) to': '“Have got to” works like “have to” — something is necessary.',
  'be able to': '“Be able to” is for skills or chances — what you can manage to do.',
  "let's": '“Let’s” is a friendly invitation to do something together.',
  can: '“Can” is for ability or permission — what you are able, or allowed, to do.',
  must: '“Must” is a strong word for rules and important duties.',
  should: '“Should” gives friendly advice about a good idea to follow.',
  may: '“May” can ask for permission, or say that something is possible.',
  might: '“Might” hints that something is possible, but not sure.',
  will: '“Will” looks ahead to the future — what is going to happen.',
  would: '“Would” softens requests, like “Would you help me, please?”',
  again: 'Doing something again helps your brain remember it better.',
}

/** Prefer Wikipedia titles that match the intended sense for ambiguous words. */
const WIKI_TITLE_OVERRIDES = {
  bat: 'Bat',
  'bat (as sports equipment)': 'Baseball bat',
  orange: 'Orange (fruit)',
  may: 'May (month)',
  will: 'Will and testament',
  can: 'Ability',
  date: 'Calendar date',
  spring: 'Spring (season)',
  fall: 'Autumn',
  light: 'Light',
  park: 'Park',
  bank: 'Bank',
  watch: 'Watch',
  letter: 'Letter (message)',
  plant: 'Plant',
  rock: 'Rock (geology)',
  wave: 'Wave',
  nail: 'Nail (anatomy)',
  bark: 'Bark (botany)',
  seal: 'Pinniped',
  cricket: 'Cricket (insect)',
  jam: 'Fruit preserves',
  chip: 'Potato chip',
  turkey: 'Turkey (bird)',
  china: 'China',
  french: 'French language',
  english: 'English language',
}

function curatedLookup(word) {
  const rawKey = String(word).toLowerCase().trim()
  if (CURATED_FACTS[rawKey]) return CURATED_FACTS[rawKey]
  // Skip bare curated when clarifying parenthesis would change sense
  if (/\([^)]+\)/.test(word)) return null
  const key = normalizeKey(word)
  return CURATED_FACTS[key] || null
}

function wikiTitleFor(word) {
  const raw = String(word).trim()
  const rawLower = raw.toLowerCase()
  if (WIKI_TITLE_OVERRIDES[rawLower]) return WIKI_TITLE_OVERRIDES[rawLower]
  const cleaned = cleanDisplay(raw)
  if (!cleaned) return null
  if (/\s/.test(cleaned) && cleaned.split(/\s+/).length > 4) return null
  // Skip obvious junk lemmas
  if (/^[a-z]{1,2}$/i.test(cleaned) && !/^(i|a|an|on|in|at|to|of|or|be|do|go|up|my|me|we|he|it|as|if|no|so|by)$/i.test(cleaned)) {
    // allow short function words via curated only
  }
  if (WIKI_TITLE_OVERRIDES[cleaned.toLowerCase()]) return WIKI_TITLE_OVERRIDES[cleaned.toLowerCase()]
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function kidEditExtract(extract, headword) {
  if (!extract) return null
  let text = String(extract)
    .replace(/\[[^\]]*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null

  const match = text.match(/^(.+?[.!?])(?:\s|$)/)
  text = (match ? match[1] : text).trim()

  if (/may refer to:/i.test(text)) return null
  if (/^[\w'’() -]+ is a (word|term|verb|noun|adjective|adverb)\b/i.test(text)) return null
  if (/^[A-Z][\w'’ -]+ means /i.test(text)) return null
  // Avoid “by means of” / “usually means” dictionary tone in SPACE FACT
  if (/\bmeans\b/i.test(text)) return null

  if (text.length > 160) text = `${text.slice(0, 157).replace(/\s+\S*$/, '')}…`

  const fact = tidyFact(text)
  if (!fact || fact.length < 28) return null
  if (isWeakFact(fact)) return null
  return fact
}

function loadWikiCache() {
  try {
    if (!existsSync(CACHE_PATH)) return {}
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function saveWikiCache(cache) {
  mkdirSync(dirname(CACHE_PATH), { recursive: true })
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

async function fetchWikiSummary(title, cache, attempt = 1) {
  if (!title) return null
  const cacheKey = title.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey]

  if (OFFLINE) {
    return null
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 6) {
        await sleep(800 * attempt)
        return fetchWikiSummary(title, cache, attempt + 1)
      }
      // Do not cache transient failures
      return null
    }
    if (response.status === 404) {
      cache[cacheKey] = null
      return null
    }
    if (!response.ok) {
      // Unknown client error — cache miss to avoid hammering
      cache[cacheKey] = null
      return null
    }
    const data = await response.json()
    if (data.type === 'disambiguation') {
      cache[cacheKey] = null
      return null
    }
    cache[cacheKey] = data.extract || null
    return cache[cacheKey]
  } catch {
    if (attempt < 4) {
      await sleep(500 * attempt)
      return fetchWikiSummary(title, cache, attempt + 1)
    }
    return null
  }
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

function usageFallback(word, pos, category, definition) {
  const w = cleanDisplay(word) || String(word).trim()
  const label = capitalize(w)
  const quoted = `“${w}”`
  const scene = String(category || '').toLowerCase()

  const gloss = String(definition || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let short = gloss.replace(/^(usually used[^.]+\.\s*)/i, '')
  short = short.split(/[.;]/)[0]?.trim() || ''
  if (short.length > 80) short = `${short.slice(0, 77).replace(/\s+\S*$/, '')}…`
  const weakGloss = !short
    || /\bmeans\b/i.test(short)
    || /^(an? action word|a describing word|a word that|an end or conclusion)/i.test(short)
    || /senses relating to/i.test(short)

  if (!weakGloss) {
    if (pos === 'verb') {
      const action = short.replace(/^to\s+/i, '')
      const line = tidyFact(`In everyday life, people ${action}`)
      if (line && !isWeakFact(line) && !/\bmeans\b/i.test(line) && line.length > 24) return line
    } else if (pos === 'adjective' && !/^to\s+/i.test(short)) {
      const line = tidyFact(`Something ${w} is ${short}`)
      if (line && !isWeakFact(line) && !/\bmeans\b/i.test(line) && line.length > 24) return line
    } else if (pos !== 'verb' && pos !== 'adjective') {
      const line = tidyFact(`In the real world, ${w} is ${short}`)
      if (line && !isWeakFact(line) && !/\bmeans\b/i.test(line) && line.length > 24) return line
    }
  }

  if (pos === 'verb') {
    return tidyFact(`${quoted} is an everyday action — notice when someone does it today`)
  }
  if (pos === 'adjective') {
    return tidyFact(`${quoted} describes how someone or something feels or looks in real life`)
  }
  if (pos === 'adverb') {
    return tidyFact(`${quoted} can show how an action happens in a story or real moment`)
  }
  if (scene === 'feelings') {
    return tidyFact(`${label} is a feeling people share in stories, songs, and real life`)
  }
  if (scene === 'food') {
    return tidyFact(`${label} often appears at meals — notice it next time you eat or cook`)
  }
  if (scene === 'animals') {
    return tidyFact(`${label} belongs in the animal world — watch for it in nature shows and zoos`)
  }
  if (scene === 'weather') {
    return tidyFact(`${label} is part of talking about the sky and outdoor days`)
  }
  return tidyFact(`${label} shows up in everyday English — listen for it in stories and conversations`)
}

async function main() {
  const data = loadAllVocabulary()
  const wikiCache = loadWikiCache()
  const stats = { curated: 0, wiki: 0, wikiMiss: 0, fallback: 0 }
  console.log(`Generating meaningful SPACE FACTs for ${data.words.length} words${OFFLINE ? ' (offline)' : ''}…`)

  // Phase 1: curated hits
  const needWiki = []
  for (const word of data.words) {
    const curated = curatedLookup(word.word)
    if (curated) {
      word.fact = tidyFact(curated)
      stats.curated += 1
    } else {
      needWiki.push(word)
    }
  }
  console.log(`Curated: ${stats.curated}. Fetching Wikipedia for ${needWiki.length} words…`)

  // Phase 2: unique titles, parallel fetch (clear transient nulls so 429s can retry)
  const titles = [...new Set(needWiki.map((w) => wikiTitleFor(w.word)).filter(Boolean))]
  let cleared = 0
  for (const title of titles) {
    const key = title.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(wikiCache, key) && wikiCache[key] == null) {
      delete wikiCache[key]
      cleared += 1
    }
  }
  if (cleared) console.log(`Cleared ${cleared} empty cache entries for retry`)

  const pending = titles.filter((t) => !Object.prototype.hasOwnProperty.call(wikiCache, t.toLowerCase()))
  console.log(`Wikipedia titles: ${titles.length} unique (${pending.length} not cached)`)

  let fetched = 0
  await mapPool(pending, 4, async (title) => {
    await fetchWikiSummary(title, wikiCache)
    fetched += 1
    if (fetched % 40 === 0 || fetched === pending.length) {
      saveWikiCache(wikiCache)
      process.stdout.write(`\rWiki fetch ${fetched}/${pending.length}`)
    }
    await sleep(120)
  })
  if (pending.length) process.stdout.write('\n')
  saveWikiCache(wikiCache)

  // Phase 3: assign wiki or fallback
  for (const word of needWiki) {
    const title = wikiTitleFor(word.word)
    const extract = title ? wikiCache[title.toLowerCase()] : null
    const edited = kidEditExtract(extract, word.word)
    if (edited) {
      word.fact = edited
      stats.wiki += 1
    } else {
      stats.wikiMiss += 1
      stats.fallback += 1
      word.fact = usageFallback(word.word, word.partOfSpeech, word.category, word.definition)
    }
  }

  // Phase 4: scrub any leftover “means” lines
  let scrubbed = 0
  for (const word of data.words) {
    if (/\bmeans\b/i.test(word.fact)) {
      word.fact = usageFallback(word.word, word.partOfSpeech, word.category, '')
      scrubbed += 1
    }
  }
  if (scrubbed) console.log(`Scrubbed ${scrubbed} facts containing “means”`)

  writeVocabularyByLevel(data.words, {
    ...data.source,
    factsGeneratedAt: new Date().toISOString(),
    factsMode: OFFLINE ? 'offline' : 'curated+wikipedia',
  })

  const weak = data.words.filter((w) => isWeakFact(w.fact))
  const means = data.words.filter((w) => /\bmeans\b/i.test(w.fact))
  const wordFor = data.words.filter((w) => /is a word for/i.test(w.fact))
  const empty = data.words.filter((w) => !w.fact)
  const unique = new Set(data.words.map((w) => w.fact)).size

  const samples = ['love', 'alphabet', 'blue', 'ask', 'box', 'dog', 'asleep', 'angry', 'angry']
  console.log(`Done. curated=${stats.curated} wiki=${stats.wiki} wikiMiss=${stats.wikiMiss} fallback=${stats.fallback}`)
  console.log(`Unique facts: ${unique}/${data.words.length}`)
  console.log(`Weak-pattern facts: ${weak.length}; "means": ${means.length}; "is a word for": ${wordFor.length}; empty: ${empty.length}`)
  console.log('Samples:')
  for (const key of samples) {
    const item = data.words.find((w) => normalizeKey(w.word) === key || String(w.word).toLowerCase() === key)
    if (item) console.log(`  ${item.word}: ${item.fact}`)
  }
  if (means.length) {
    console.log('Sample "means" leftovers:')
    for (const w of means.slice(0, 5)) console.log(`  ${w.word}: ${w.fact}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
