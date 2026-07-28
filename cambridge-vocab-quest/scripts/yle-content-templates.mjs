/**
 * Teacher-designed Cambridge YLE / Preliminary content templates (no external LLM).
 * POS + semantic-class sentence/hint helpers and headword-first category maps.
 */
export const ALLOWED_CATEGORIES = new Set([
  'animals', 'food', 'school', 'people', 'home', 'sports', 'travel', 'weather',
  'places', 'body', 'clothes', 'health', 'nature', 'technology', 'feelings',
  'time', 'jobs', 'general',
])

const KIDS = ['Mia', 'Leo', 'Sam', 'Ana', 'Tom', 'Lily', 'Ben', 'Emma', 'Noah', 'Zoe']

/** Known OCR / wordlist corruptions → classroom headword */
const DISPLAY_OVERRIDES = {
  'pl)': 'please',
  pl: 'please',
  adj: 'and',
  ame: 'name',
  'ame)': 'name',
  'candy)': 'candy',
  'pron here': 'here',
  'pron hit': 'hit',
  "may (as in girl’s, ame)": 'May',
  "may (as in girl's, ame)": 'May',
  'sweet(s)': 'sweet',
  'teddy (bear)': 'teddy',
  'bat (as sports equipment)': 'bat',
}

export function cleanDisplay(word) {
  const raw = String(word || '').replace(/\u00a0/g, ' ').trim()
  const lower = raw.toLowerCase()
  if (DISPLAY_OVERRIDES[lower]) return DISPLAY_OVERRIDES[lower]
  if (DISPLAY_OVERRIDES[raw]) return DISPLAY_OVERRIDES[raw]

  let out = raw
    .replace(/\)+$/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/^pron\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Trailing OCR crumbs like "May , ame"
  out = out.replace(/\s*,\s*ame$/i, '').trim()
  if (DISPLAY_OVERRIDES[out.toLowerCase()]) return DISPLAY_OVERRIDES[out.toLowerCase()]
  return out
}

function articleFor(word) {
  const base = word.replace(/^(the|a|an)\s+/i, '')
  return /^[aeiou]/i.test(base) ? 'an' : 'a'
}

const MASS = new Set([
  'bread', 'butter', 'cheese', 'milk', 'water', 'juice', 'lemonade', 'rice', 'soup',
  'breakfast', 'lunch', 'dinner', 'food', 'fruit', 'homework', 'music', 'weather',
  'fun', 'paper', 'sand', 'snow', 'rain', 'hair', 'grass', 'toast', 'chocolate',
  'sugar', 'salt', 'honey', 'jam', 'yoghurt', 'yogurt', 'meat', 'fish', 'chicken',
])

export function withArticle(word) {
  const w = cleanDisplay(word)
  const lower = w.toLowerCase()
  if (/^(a|an|the)\s/i.test(w)) return w
  if (MASS.has(lower)) return w
  if (/\s/.test(w)) return `the ${w}`
  if (/(sses|ches|shes|xes|zes|ies)$/i.test(w) || (/s$/i.test(w) && !/(ss|us|is|ous|ness)$/i.test(w))) {
    return `the ${w}`
  }
  return `${articleFor(w)} ${w}`
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function tidySentence(text) {
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

/** Headword → category (YLE + common Preliminary). First match via maps + overrides. */
const CATEGORY_WORDS = {
  animals: [
    'alien', 'animal', 'bat', 'bear', 'bee', 'bird', 'butterfly', 'camel', 'cat', 'chicken',
    'cow', 'crocodile', 'dog', 'dolphin', 'donkey', 'duck', 'elephant', 'fish', 'fox', 'frog',
    'giraffe', 'goat', 'hippo', 'horse', 'insect', 'jellyfish', 'kitten', 'lion', 'lizard',
    'monkey', 'monster', 'mouse', 'octopus', 'panda', 'parrot', 'penguin', 'pet', 'polar bear',
    'puppy', 'rabbit', 'shark', 'sheep', 'snake', 'spider', 'squirrel', 'swan', 'tail', 'tiger',
    'whale', 'wolf', 'zebra',
  ],
  food: [
    'apple', 'banana', 'bean', 'biscuit', 'bread', 'breakfast', 'burger', 'butter', 'cake',
    'candy', 'carrot', 'cereal', 'cheese', 'chips', 'chocolate', 'coconut', 'coffee', 'cookie',
    'dessert', 'dinner', 'drink', 'eat', 'egg', 'food', 'fries', 'fruit', 'grape', 'honey',
    'ice cream', 'jam', 'juice', 'kiwi', 'lemon', 'lemonade', 'lime', 'lunch', 'mango', 'meat',
    'meatballs', 'melon', 'milk', 'milkshake', 'mushroom', 'noodles', 'onion', 'pancake', 'pasta',
    'pea', 'peach', 'pear', 'pepper', 'pie', 'pineapple', 'pizza', 'potato', 'rice', 'salad',
    'salt', 'sandwich', 'sauce', 'sausage', 'snack', 'soup', 'strawberry', 'sugar', 'sweet',
    'sweets', 'tea', 'toast', 'tomato', 'vegetable', 'water', 'watermelon', 'yoghurt', 'yogurt',
  ],
  school: [
    'add', 'alphabet', 'answer', 'ask', 'board', 'book', 'bookcase', 'bookshop', 'class',
    'classmate', 'classroom', 'complete', 'count', 'crayon', 'desk', 'dictionary', 'draw',
    'drawing', 'eraser', 'exam', 'example', 'homework', 'language', 'learn', 'lesson', 'letter',
    'library', 'listen', 'maths', 'math', 'number', 'page', 'paint', 'painting', 'pen', 'pencil',
    'picture', 'poster', 'practise', 'practice', 'project', 'question', 'read', 'rubber', 'ruler',
    'school', 'science', 'sentence', 'spell', 'story', 'student', 'study', 'subject', 'teacher',
    'test', 'tick', 'understand', 'university', 'word', 'write',
  ],
  people: [
    'aunt', 'baby', 'boy', 'brother', 'child', 'children', 'cousin', 'dad', 'daughter', 'family',
    'father', 'friend', 'girl', 'grandfather', 'grandma', 'grandmother', 'grandpa', 'husband',
    'kid', 'man', 'mother', 'mum', 'nephew', 'niece', 'parent', 'person', 'people', 'sister',
    'son', 'uncle', 'wife', 'woman', 'young',
  ],
  home: [
    'apartment', 'armchair', 'balcony', 'bath', 'bathroom', 'bed', 'bedroom', 'blanket', 'box',
    'chair', 'clock', 'cooker', 'cupboard', 'curtain', 'dining room', 'door', 'flat', 'floor',
    'fridge', 'furniture', 'garden', 'hall', 'home', 'house', 'kitchen', 'lamp', 'living room',
    'mat', 'mirror', 'pillow', 'radio', 'room', 'rug', 'shelf', 'sofa', 'stairs', 'table',
    'television', 'TV', 'wall', 'window',
  ],
  sports: [
    'badminton', 'ball', 'balloon', 'baseball', 'baseball cap', 'basketball', 'bat', 'bike',
    'board game', 'bounce', 'catch', 'climb', 'football', 'game', 'golf', 'hit', 'hobby',
    'hockey', 'jump', 'kick', 'kite', 'play', 'race', 'ride', 'run', 'skateboard', 'skateboarding',
    'soccer', 'sport', 'swim', 'table tennis', 'tennis', 'tennis racket', 'throw', 'volleyball',
  ],
  travel: [
    'airport', 'boat', 'bus', 'car', 'drive', 'fly', 'helicopter', 'journey', 'lorry', 'map',
    'motorbike', 'passenger', 'plane', 'ship', 'station', 'taxi', 'ticket', 'train', 'tram',
    'travel', 'trip', 'truck', 'underground',
  ],
  weather: [
    'cloud', 'cloudy', 'cold', 'cool', 'fog', 'hot', 'ice', 'rain', 'rainbow', 'snow', 'storm',
    'sun', 'sunny', 'temperature', 'warm', 'weather', 'wind', 'windy',
  ],
  places: [
    'beach', 'bridge', 'castle', 'city', 'cinema', 'farm', 'hospital', 'hotel', 'island',
    'market', 'museum', 'park', 'playground', 'restaurant', 'sea', 'shop', 'square', 'store',
    'street', 'town', 'village', 'zoo',
  ],
  body: [
    'arm', 'back', 'body', 'ear', 'eye', 'face', 'finger', 'foot', 'hair', 'hand', 'head',
    'knee', 'leg', 'mouth', 'neck', 'nose', 'shoulder', 'stomach', 'tooth', 'teeth',
  ],
  clothes: [
    'belt', 'boots', 'clothes', 'coat', 'dress', 'glasses', 'glove', 'gloves', 'handbag', 'hat',
    'jacket', 'jeans', 'jumper', 'pyjamas', 'scarf', 'shirt', 'shoe', 'shorts', 'skirt', 'sock',
    'sweater', 'tie', 'trousers', 'T-shirt', 'uniform', 'wear',
  ],
  health: [
    'cough', 'dentist', 'doctor', 'earache', 'fever', 'headache', 'healthy', 'hospital', 'hurt',
    'ill', 'medicine', 'nurse', 'pain', 'sick', 'temperature', 'toothache',
  ],
  nature: [
    'earth', 'environment', 'field', 'flower', 'forest', 'grass', 'hill', 'lake', 'leaf', 'moon',
    'mountain', 'plant', 'river', 'rock', 'sand', 'shell', 'sky', 'space', 'star', 'stone',
    'tree', 'wood',
  ],
  technology: [
    'app', 'battery', 'camera', 'computer', 'email', 'internet', 'keyboard', 'laptop', 'message',
    'phone', 'photo', 'programme', 'program', 'robot', 'screen', 'software', 'tablet',
    'take a photo', 'website', 'wifi',
  ],
  feelings: [
    'afraid', 'angry', 'asleep', 'awake', 'beautiful', 'bored', 'brave', 'excited', 'favourite',
    'fun', 'funny', 'good', 'great', 'happy', 'kind', 'love', 'nervous', 'nice', 'proud', 'sad',
    'scared', 'scary', 'silly', 'sorry', 'surprised', 'tired', 'ugly', 'worried',
  ],
  time: [
    'afternoon', 'birthday', 'calendar', 'century', 'clock', 'date', 'day', 'evening', 'future',
    'hour', 'minute', 'month', 'morning', 'night', 'now', 'o’clock', 'past', 'second', 'today',
    'tomorrow', 'week', 'weekend', 'year', 'yesterday',
  ],
  jobs: [
    'actor', 'actress', 'artist', 'chef', 'cleaner', 'cook', 'dentist', 'doctor', 'driver',
    'engineer', 'farmer', 'firefighter', 'journalist', 'mechanic', 'nurse', 'pilot', 'police',
    'singer', 'teacher', 'waiter', 'waitress', 'writer',
  ],
}

const CATEGORY_LOOKUP = new Map()
for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
  for (const w of words) CATEGORY_LOOKUP.set(w.toLowerCase(), cat)
}

// Disambiguation overrides (later maps intentionally overwrite)
for (const w of ['beach', 'sea', 'garden']) CATEGORY_LOOKUP.set(w, 'places')
CATEGORY_LOOKUP.set('water', 'food')
CATEGORY_LOOKUP.set('teacher', 'jobs')
CATEGORY_LOOKUP.set('star', 'nature')
CATEGORY_LOOKUP.set('alien', 'general')
CATEGORY_LOOKUP.set('orange', 'general') // colour adjective in Starters list
CATEGORY_LOOKUP.set('walk', 'general')

export function categoryFor(word, fallback = 'general') {
  const key = cleanDisplay(word).toLowerCase()
  return CATEGORY_LOOKUP.get(key) || fallback
}

/** Semantic class for sentence templates */
export function semanticClass(word, pos, category) {
  const w = cleanDisplay(word).toLowerCase()
  if (pos === 'verb') {
    if (/^(add|count|complete)$/.test(w)) return 'math'
    if (/^(ask|say|tell|talk|answer|spell)$/.test(w)) return 'speech'
    if (/^(run|walk|jump|fly|swim|bounce|come|go|go to bed|go to sleep)$/.test(w)) return 'motion'
    if (/^(read|write|draw|learn|listen|paint)$/.test(w)) return 'school-action'
    if (/^(catch|throw|kick|hit|play|ride)$/.test(w)) return 'sport-action'
    if (/^(eat|drink|sleep|sit|stand|wear|open|close|clean|wash)$/.test(w)) return 'daily'
    if (/^(see|look|look at|find|know|understand|watch|point|show|pick up|hold|get|give|put|take a photo|choose|try|start|stop|make|have|have got|want|would like|love|enjoy|smile|wave|clap|cross|drive)$/.test(w)) {
      return 'general-verb'
    }
    return 'general-verb'
  }
  if (pos === 'adjective') {
    if (/feelings|people/.test(category) || /^(angry|happy|sad|scary|silly|sorry|beautiful|good|great|nice|fun|funny|fantastic|favourite|ugly|new|old|young|big|small|long|short|clean|dirty|closed|correct|double|right)$/.test(w)) {
      return 'describe'
    }
    return 'colour'
  }
  if (pos === 'adverb') return 'adverb'
  if (category && category !== 'general') return category
  return 'thing'
}

const VERB_SENTENCES = {
  math: (w, a, b) => [
    `Please ${w} the numbers on the board.`,
    `${a} can ${w} very well in maths.`,
    `Let’s ${w} these two numbers.`,
    `Can you ${w} them for me, please?`,
    `We ${w} in our maths lesson.`,
    `First count, then ${w}.`,
    `${b} likes to ${w} at school.`,
    `My teacher asked us to ${w}.`,
    `I ${w} with my pencil and paper.`,
    `Watch me ${w}!`,
  ],
  speech: (w, a, b) => {
    if (w === 'ask') {
      return [
        'Can I ask a question, please?',
        `${a} likes to ask the teacher.`,
        'Please ask for help if you need it.',
        'We ask questions in class.',
        `${b} asked about the picture.`,
        'Do not be shy — ask!',
        'I ask my friend for a pencil.',
        'Let’s ask Mum where the bag is.',
        'The children ask about the story.',
        'Ask me again, please.',
      ]
    }
    if (w === 'say') {
      return [
        'Please say your name clearly.',
        `${a} can say the alphabet.`,
        'What did you say?',
        'Say “please” and “thank you”.',
        `${b} said hello to her friend.`,
        'Can you say that again?',
        'We say the words together.',
        'I say good morning at school.',
        'Don’t say that word in class.',
        'Say the sentence after me.',
      ]
    }
    if (w === 'tell') {
      return [
        'Please tell me a story.',
        `${a} can tell the time.`,
        'Tell your friend the answer.',
        'Can you tell me your name?',
        `${b} told a funny joke.`,
        'Tell Mum about your day.',
        'We tell stories in class.',
        'Don’t tell secrets in the park.',
        'I tell my teacher when I need help.',
        'Tell me what you can see.',
      ]
    }
    if (w === 'talk') {
      return [
        'Please talk quietly in the library.',
        `${a} likes to talk with friends.`,
        'We talk about the picture.',
        'Can I talk to you, please?',
        `${b} talked to her grandma.`,
        'Don’t talk when the teacher is speaking.',
        'I talk to my classmate about the game.',
        'Let’s talk after lunch.',
        'The children talk in English.',
        'Talk to me about your hobby.',
      ]
    }
    return [
      `Please ${w} the answer clearly.`,
      `${a} can ${w} in English.`,
      `Let’s ${w} together in class.`,
      `Can you ${w} for me, please?`,
      `${b} likes to ${w} at school.`,
      `We ${w} every morning.`,
      `My teacher asked us to ${w}.`,
      `I ${w} with my friends.`,
      `First listen, then ${w}.`,
      `Do you ${w} at home?`,
    ]
  },
  motion: (w, a, b) => {
    if (w === 'go to bed') {
      return [
        'I go to bed at eight o’clock.',
        `${a} goes to bed after a story.`,
        'Please go to bed now.',
        'What time do you go to bed?',
        `${b} goes to bed early on school days.`,
        'We go to bed when we are tired.',
        'Children go to bed before nine.',
        'Go to bed and sleep well!',
        'I go to bed after I brush my teeth.',
        'Do you go to bed late at the weekend?',
      ]
    }
    if (w === 'go to sleep') {
      return [
        'I go to sleep quickly at night.',
        `${a} goes to sleep after a song.`,
        'Please go to sleep now.',
        'The baby goes to sleep in the bed.',
        `${b} cannot go to sleep yet.`,
        'We go to sleep when it is dark.',
        'Go to sleep — good night!',
        'I go to sleep with my teddy.',
        'Do you go to sleep late?',
        'Quiet music helps me go to sleep.',
      ]
    }
    return [
      `I can ${w} in the park.`,
      `${a} likes to ${w} with friends.`,
      `Let’s ${w} to the playground!`,
      `Can you ${w} fast?`,
      `${b} can ${w} very well.`,
      `We ${w} every afternoon.`,
      `Watch me ${w}!`,
      `Please ${w} carefully.`,
      `Do you ${w} at the weekend?`,
      `${a} and ${b} love to ${w} outside.`,
    ]
  },
  'school-action': (w, a, b) => [
    `I ${w} at school every day.`,
    `${a} can ${w} very carefully.`,
    `Please ${w} this sentence.`,
    `Let’s ${w} together.`,
    `${b} likes to ${w} in class.`,
    `Can you ${w} for me, please?`,
    `We ${w} in our English lesson.`,
    `My teacher asked us to ${w}.`,
    `First listen, then ${w}.`,
    `Do you ${w} at home too?`,
  ],
  'sport-action': (w, a, b) => {
    if (w === 'play') {
      return [
        'I like to play in the park.',
        `${a} plays football with friends.`,
        'Let’s play a board game!',
        'Can you play with me?',
        `${b} loves to play at the weekend.`,
        'We play in our sports lesson.',
        'Watch us play!',
        'Please play carefully.',
        'Do you play with your friends?',
        `${a} and ${b} play every afternoon.`,
      ]
    }
    return [
      `I like to ${w} in the park.`,
      `${a} can ${w} the ball.`,
      `Let’s ${w} together after school.`,
      `Can you ${w} with me?`,
      `${b} loves to ${w} at the weekend.`,
      `We ${w} in our sports lesson.`,
      `Watch me ${w}!`,
      `Please ${w} carefully.`,
      `Do you ${w} with your friends?`,
      `${a} and ${b} ${w} every afternoon.`,
    ]
  },
  daily: (w, a, b) => {
    if (w === 'eat') {
      return [
        'I eat breakfast in the morning.',
        `${a} eats an apple for lunch.`,
        'Please eat your dinner.',
        'What do you eat at school?',
        `${b} likes to eat fruit.`,
        'We eat together as a family.',
        'Don’t eat in the classroom.',
        'I eat slowly and smile.',
        'Can animals eat this food?',
        'Eat your vegetables, please.',
      ]
    }
    if (w === 'drink') {
      return [
        'I drink water every day.',
        `${a} drinks milk at breakfast.`,
        'Please drink your juice.',
        'What do you drink at lunch?',
        `${b} likes to drink lemonade.`,
        'We drink water after sport.',
        'Don’t drink from that cup.',
        'I drink slowly.',
        'Can I drink some water, please?',
        'Drink your milk, please.',
      ]
    }
    if (w === 'wear') {
      return [
        'I wear a blue T-shirt today.',
        `${a} wears a red hat.`,
        'Please wear your shoes.',
        'What do you wear to school?',
        `${b} likes to wear jeans.`,
        'We wear warm clothes in winter.',
        'Don’t wear dirty socks.',
        'I wear glasses to read.',
        'Can I wear my new jacket?',
        'Wear your coat, please.',
      ]
    }
    return [
      `I ${w} every morning.`,
      `${a} can ${w} carefully.`,
      `Please ${w} now.`,
      `Let’s ${w} together.`,
      `${b} likes to ${w} at home.`,
      `We ${w} after school.`,
      `Can you ${w} for me, please?`,
      `Watch me ${w}!`,
      `Do you ${w} every day?`,
      `First wash, then ${w}.`,
    ]
  },
  'general-verb': (w, a, b) => {
    const special = {
      see: [
        'I can see a bird in the tree.',
        `${a} can see the board.`,
        'What can you see in the picture?',
        'See you at school tomorrow!',
        `${b} sees her friend in the park.`,
        'We see many animals at the zoo.',
        'Can you see the blue ball?',
        'I see Mum at the door.',
        'Look and see!',
        'Do you see my bag?',
      ],
      look: [
        'Please look at the board.',
        `${a} looks happy today.`,
        'Look! There is a kite.',
        'Don’t look out of the window.',
        `${b} looks for her pencil.`,
        'We look at the picture together.',
        'Look at me, please.',
        'I look in my bag for a book.',
        'Can you look again?',
        'Look under the table.',
      ],
      'look at': [
        'Please look at the board.',
        `${a} looks at the picture.`,
        'Look at this funny dog!',
        'Don’t look at your friend’s paper.',
        `${b} looks at the clock.`,
        'We look at books in class.',
        'Look at me, please.',
        'I look at the map.',
        'Can you look at page ten?',
        'Look at the sun — it’s beautiful!',
      ],
      find: [
        'Can you find your pencil?',
        `${a} finds a shell on the beach.`,
        'Please find page ten.',
        'I can’t find my bag.',
        `${b} found a red ball in the garden.`,
        'We find new words in the book.',
        'Find the cat in the picture.',
        'Help me find my shoes.',
        'Did you find your friend?',
        'Let’s find a quiet place to read.',
      ],
      know: [
        'I know the answer!',
        `${a} knows how to swim.`,
        'Do you know this word?',
        'I don’t know — can you help?',
        `${b} knows her address.`,
        'We know many colours.',
        'I know a funny song.',
        'Does he know your name?',
        'I know where the shop is.',
        'Kids know how to play.',
      ],
      understand: [
        'I understand the question.',
        `${a} understands the story.`,
        'Do you understand?',
        'I don’t understand — please say it again.',
        `${b} understands English well.`,
        'We understand the teacher.',
        'Can you understand this sentence?',
        'Now I understand!',
        'Children understand with pictures.',
        'Please help me understand.',
      ],
      love: [
        'I love my family.',
        `${a} loves animals.`,
        'We love to play outside.',
        'I love this book!',
        `${b} loves ice cream.`,
        'Children love stories.',
        'I love my friends at school.',
        'Do you love music?',
        'We love sunny days.',
        'I love to draw pictures.',
      ],
      smile: [
        'Please smile for the photo!',
        `${a} smiles at her friend.`,
        'I smile when I am happy.',
        'Smile and say cheese!',
        `${b} smiles every morning.`,
        'We smile in the class photo.',
        'A smile can help a friend.',
        'Don’t forget to smile!',
        'The baby smiles at Mum.',
        'I smile when I see my dog.',
      ],
      choose: [
        'Please choose a colour.',
        `${a} chooses a red pencil.`,
        'You can choose a book.',
        'Choose your favourite fruit.',
        `${b} chooses the blue ball.`,
        'We choose teams for the game.',
        'I choose to sit next to my friend.',
        'Can you choose again?',
        'Children choose toys in the shop.',
        'Choose carefully, please.',
      ],
      make: [
        'I make a cake with Mum.',
        `${a} makes a card for Dad.`,
        'Let’s make a funny face!',
        'Can you make a paper plane?',
        `${b} makes music on the piano.`,
        'We make pictures in art class.',
        'Please make your bed.',
        'I make new friends at school.',
        'Don’t make a mess!',
        'Make a circle, please.',
      ],
      have: [
        'I have a blue bag.',
        `${a} has two sisters.`,
        'Do you have a pencil?',
        'We have lunch at school.',
        `${b} has a new bike.`,
        'I have got a pet cat.',
        'Please have a seat.',
        'What do you have in your bag?',
        'Children have fun in the park.',
        'Have a nice day!',
      ],
      'have got': [
        'I have got a red school bag.',
        `${a} has got two pet rabbits.`,
        'Have you got a pencil case?',
        'We have got a big garden.',
        `${b} has got a new kite.`,
        'I have got three blue crayons.',
        'They have got lunch at school.',
        'Have you got any brothers?',
        'She has got long hair.',
        'We have got lots of books.',
      ],
      want: [
        'I want an apple, please.',
        `${a} wants to play outside.`,
        'What do you want?',
        'I want to read this book.',
        `${b} wants a new pencil.`,
        'We want to go to the park.',
        'Do you want some water?',
        'I want help with this question.',
        'Children want to learn new words.',
        'Want to play a game?',
      ],
      'would like': [
        'I would like some juice, please.',
        `${a} would like a banana.`,
        'Would you like a cake?',
        'I would like to play football.',
        `${b} would like a new book.`,
        'We would like to go to the zoo.',
        'Would you like some help?',
        'I would like water, please.',
        'Children would like more stories.',
        'Would you like to sit here?',
      ],
      'pick up': [
        'Please pick up your bag.',
        `${a} picks up the pencil.`,
        'Pick up your toys, please.',
        'Can you pick up the ball?',
        `${b} picked up a shell.`,
        'We pick up litter in the park.',
        'Don’t forget to pick up your coat.',
        'I pick up my book from the floor.',
        'Pick up your feet when you walk!',
        'Help me pick up the crayons.',
      ],
      'take a photo': [
        'Can you take a photo, please?',
        `${a} takes a photo of her dog.`,
        'We take a photo in class.',
        'Mum takes a photo at the beach.',
        `${b} likes to take a photo.`,
        'Take a photo of the rainbow!',
        'Please smile when I take a photo.',
        'I take a photo with my phone.',
        'Don’t take a photo in the museum.',
        'Let’s take a photo together.',
      ],
      put: [
        'Please put your bag under the desk.',
        `${a} puts the book on the table.`,
        'Put on your shoes.',
        'Where did you put my pencil?',
        `${b} puts the toys in the box.`,
        'We put our names on the paper.',
        'Put the milk in the fridge.',
        'Don’t put dirty shoes on the bed.',
        'I put my homework in my bag.',
        'Put your hand up to answer.',
      ],
      give: [
        'Please give me a pencil.',
        `${a} gives a book to her friend.`,
        'Give the ball to Tom.',
        'Can you give me some water?',
        `${b} gives Mum a big smile.`,
        'We give presents on birthdays.',
        'Give your paper to the teacher.',
        'Don’t give food to the animals.',
        'I give my seat to Grandma.',
        'Give it back, please.',
      ],
      get: [
        'Please get your book.',
        `${a} gets a sticker for good work.`,
        'Get ready for school!',
        'Can you get me a glass of water?',
        `${b} gets home at four o’clock.`,
        'We get new words every day.',
        'I get up early in the morning.',
        'Don’t get dirty in the garden.',
        'Get your coat — it’s cold.',
        'How do I get to the park?',
      ],
      come: [
        'Please come here.',
        `${a} comes to school by bus.`,
        'Come and play with us!',
        'Can you come to my party?',
        `${b} comes home after school.`,
        'We come to class on time.',
        'Come in and sit down.',
        'Don’t come late, please.',
        'I come from a small town.',
        'Come and look at this!',
      ],
      go: [
        'I go to school every day.',
        `${a} goes to the park after lunch.`,
        'Please go to your seat.',
        'Where do you go at the weekend?',
        `${b} goes home by bike.`,
        'We go swimming on Fridays.',
        'Go and wash your hands.',
        'Don’t go near the road alone.',
        'Let’s go outside!',
        'I go to bed at eight.',
      ],
      can: [
        'I can ride my bike.',
        'Can you help me, please?',
        `${a} can swim very well.`,
        'We can finish this puzzle together.',
        'You can choose a blue pencil.',
        `${b} can count to twenty.`,
        'Can we play in the garden?',
        'Birds can fly high in the sky.',
        'I can write my name neatly.',
        `${a} can catch the soft ball.`,
      ],
      "let’s": [
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
      ],
      open: [
        'Please open your book.',
        `${a} opens the door for Mum.`,
        'Open the window, please.',
        'Can you open this box?',
        `${b} opens her bag.`,
        'We open our books to page ten.',
        'Open your eyes!',
        'Don’t open that cupboard.',
        'I open the gift and smile.',
        'Open the shop at nine o’clock.',
      ],
      close: [
        'Please close the door.',
        `${a} closes her book.`,
        'Close the window — it’s cold.',
        'Can you close the box?',
        `${b} closes her eyes to sleep.`,
        'We close our books now.',
        'Close your mouth when you eat.',
        'Don’t close the gate yet.',
        'I close my bag after class.',
        'Close the fridge, please.',
      ],
    }
    if (special[w]) return special[w]
    return [
      `I can ${w} at school.`,
      `${a} likes to ${w}.`,
      `Please ${w} carefully.`,
      `Let’s ${w} together.`,
      `${b} can ${w} very well.`,
      `We ${w} every day.`,
      `Can you ${w} for me, please?`,
      `Watch me ${w}!`,
      `Do you ${w} at home?`,
      `My teacher asked us to ${w}.`,
    ]
  },
}

function nounSentences(w, art, category, a, b, c) {
  const byCat = {
    food: [
      `I like ${art} for lunch.`,
      `${a} eats ${art} at school.`,
      `Please give me ${art}.`,
      `We buy ${art} at the shop.`,
      `${b} has ${art} in her bag.`,
      `Can you see ${art} in the picture?`,
      `${art[0].toUpperCase()}${art.slice(1)} is my favourite food.`,
      `Mum puts ${art} on the table.`,
      `Don’t play with ${art}!`,
      `Let’s share ${art}.`,
    ],
    animals: [
      `I can see ${art} at the zoo.`,
      `${a} likes ${art}.`,
      `The ${w} is in the garden.`,
      `Can you draw ${art}, please?`,
      `${b} has a book about ${art}.`,
      `Look at ${art}!`,
      `We learn about ${art} at school.`,
      `Don’t scare ${art}.`,
      `${c} points to ${art} in the picture.`,
      `My favourite animal is ${art}.`,
    ],
    body: [
      `Touch your ${w}, please.`,
      `${a} washes her ${w}.`,
      `I hurt my ${w} in the park.`,
      `Point to your ${w}.`,
      `${b} has a small ${w}.`,
      `We learn body words: ${w}.`,
      `Don’t put your ${w} in the water.`,
      `My ${w} feels cold.`,
      `Can you move your ${w}?`,
      `Wash your ${w} before lunch.`,
    ],
    clothes: [
      `I wear ${art} to school.`,
      `${a} puts on ${art}.`,
      `Where is my ${w}?`,
      `Please wear your ${w}.`,
      `${b} has a new ${w}.`,
      `We put ${art} in the bag.`,
      `Don’t lose your ${w}.`,
      `This ${w} is too small.`,
      `Can you find my ${w}?`,
      `I like my blue ${w}.`,
    ],
    home: [
      `There is ${art} in my house.`,
      `${a} sits on ${art}.`,
      `Please clean the ${w}.`,
      `We have ${art} at home.`,
      `${b} points to ${art}.`,
      `Can you see ${art} in the picture?`,
      `Don’t jump on the ${w}.`,
      `My favourite room has ${art}.`,
      `Mum buys ${art} for the house.`,
      `Look! There is ${art}.`,
    ],
    school: [
      `I use ${art} at school.`,
      `${a} has ${art} in her bag.`,
      `Please open your ${w}.`,
      `We need ${art} for the lesson.`,
      `${b} writes with ${art}.`,
      `Can you give me ${art}?`,
      `Don’t lose your ${w}.`,
      `My teacher shows ${art}.`,
      `I like this ${w}.`,
      `Put ${art} on the desk.`,
    ],
    sports: [
      `I play with ${art} in the park.`,
      `${a} likes ${art}.`,
      `Let’s play ${w}!`,
      `Can you catch ${art}?`,
      `${b} has ${art} at home.`,
      `We learn ${w} at school.`,
      `Don’t kick ${art} in the house.`,
      `My favourite sport is ${w}.`,
      `Watch me with ${art}!`,
      `Where is my ${w}?`,
    ],
    travel: [
      `I go to school by ${w}.`,
      `${a} likes the ${w}.`,
      `Look at ${art}!`,
      `We see ${art} in the street.`,
      `${b} draws ${art}.`,
      `Can you hear the ${w}?`,
      `Don’t run near the ${w}.`,
      `My dad drives ${art}.`,
      `The ${w} is blue.`,
      `We travel on ${art}.`,
    ],
    places: [
      `We go to the ${w} on Saturday.`,
      `${a} likes the ${w}.`,
      `There is a big ${w} near my house.`,
      `Can we go to the ${w}, please?`,
      `${b} plays at the ${w}.`,
      `I can see the ${w} in the picture.`,
      `Don’t run in the ${w}.`,
      'Meet me at the ' + w + '.',
      `The ${w} is fun.`,
      `We learn about the ${w} at school.`,
    ],
    people: [
      `This is my ${w}.`,
      `${a} has a kind ${w}.`,
      `I love my ${w}.`,
      `Where is your ${w}?`,
      `${b} plays with her ${w}.`,
      `My ${w} helps me.`,
      `Can you see the ${w}?`,
      `We live with our ${w}.`,
      `Say hello to my ${w}.`,
      `My ${w} is at home.`,
    ],
    time: [
      `I play in the ${w}.`,
      `${a} reads every ${w}.`,
      `See you in the ${w}!`,
      `Our lesson is in the ${w}.`,
      `What do you do in the ${w}?`,
      `${b} walks the dog in the ${w}.`,
      `The ${w} is my favourite time.`,
      `We eat lunch in the ${w}.`,
      'Good ' + w + '!',
      `I sleep at ${w === 'night' ? 'night' : 'this time'}.`,
    ],
    technology: [
      `I use ${art} at home.`,
      `${a} likes ${art}.`,
      `Please put ${art} on the table.`,
      `We learn with ${art} at school.`,
      `${b} takes a photo with ${art}.`,
      `Can you see ${art}?`,
      `Don’t drop ${art}.`,
      `My ${w} is new.`,
      `Look at ${art}!`,
      `We talk about ${art} in class.`,
    ],
    nature: [
      `I can see ${art} outside.`,
      `${a} likes ${art}.`,
      `Look at ${art}!`,
      `We draw ${art} at school.`,
      `${b} finds ${art} in the park.`,
      `Can you see ${art} in the park?`,
      `Don’t hurt ${art}.`,
      `The ${w} is beautiful.`,
      `There is ${art} near the house.`,
      `My favourite thing in nature is ${art}.`,
    ],
    weather: [
      `I like the ${w}.`,
      `${a} plays in the ${w}.`,
      `Look at the ${w}!`,
      `We talk about the ${w} in class.`,
      `${b} draws the ${w}.`,
      `Don’t go out in bad ${w}.`,
      `The ${w} is nice today.`,
      `Can you feel the ${w}?`,
      `I wear a coat in cold ${w}.`,
      `What is the ${w} like today?`,
    ],
    jobs: [
      `${a} wants to be ${art} one day.`,
      `The ${w} helps us at school.`,
      `We thanked ${art} with a smile.`,
      `${b} drew ${art} in a picture.`,
      `My ${w} is kind.`,
      `Can you see the ${w}?`,
      `The ${w} reads a story.`,
      'I like my ' + w + '.',
      `We learn with our ${w}.`,
      `Say thank you to the ${w}.`,
    ],
    feelings: [
      `I feel ${w} today.`,
      `${a} looks ${w}.`,
      `Don’t be ${w}.`,
      `We all feel ${w} sometimes.`,
      `${b} is ${w} about the game.`,
      `Why are you ${w}?`,
      `A story can make you ${w}.`,
      `I am not ${w} now.`,
      'Smile when you feel happy — not ' + w + '.',
      `Talk to a friend if you feel ${w}.`,
    ],
    general: [
      `I can see ${art} in the picture.`,
      `${a} has ${art} at home.`,
      `Look! There is ${art}.`,
      `We learned about ${art} at school today.`,
      `${b} pointed to ${art} and smiled.`,
      `Can you draw ${art}, please?`,
      `Please show me ${art}.`,
      `My favourite thing is ${art}.`,
      `${c} found ${art} in the book.`,
      `We talked about ${art} in class.`,
    ],
  }

  // Mass nouns / no-article fixes for food sentences
  let list = byCat[category] || byCat.general
  if (category === 'food' && MASS.has(w.toLowerCase())) {
    list = [
      `I like ${w} for lunch.`,
      `${a} eats ${w} at school.`,
      `Please give me some ${w}.`,
      `We buy ${w} at the shop.`,
      `${b} has ${w} at home.`,
      `Can you see ${w} in the picture?`,
      `${capitalize(w)} is my favourite food.`,
      `Mum puts ${w} on the table.`,
      `Don’t play with ${w}!`,
      `Let’s share the ${w}.`,
    ]
  }
  return list
}

function adjectiveSentences(w, a, b) {
  if (/^(black|blue|brown|green|grey|gray|pink|purple|red|white|yellow|orange)$/i.test(w)) {
    return [
      `I have a ${w} bag.`,
      `${a} likes the ${w} ball.`,
      `Please colour it ${w}.`,
      `My favourite colour is ${w}.`,
      `${b} wears a ${w} T-shirt.`,
      `Can you see the ${w} flower?`,
      `The sky looks ${w} today.`,
      `Draw a ${w} house.`,
      `Is your pencil ${w}?`,
      `We learn the colour ${w}.`,
    ]
  }
  if (/^(big|small|long|short|new|old|young|clean|dirty|closed|double|correct|right)$/i.test(w)) {
    return [
      `This bag is too ${w}.`,
      `${a} has a ${w} pencil.`,
      `Is your room ${w}?`,
      `Please find the ${w} one.`,
      `${b} draws a ${w} tree.`,
      `My shoes are ${w}.`,
      `The ${w} door is over there.`,
      `Can you see the ${w} box?`,
      `I want the ${w} book.`,
      `Look at that ${w} dog!`,
    ]
  }
  if (/^(beautiful|fantastic|favourite|good|great|nice|funny|fun|silly|scary|ugly)$/i.test(w)) {
    return [
      `What a ${w} day!`,
      `${a} has a ${w} smile.`,
      `This story is ${w}.`,
      `My friend is very ${w}.`,
      `${b} thinks the park is ${w}.`,
      `That was a ${w} game!`,
      `I like this ${w} picture.`,
      `You look ${w} today!`,
      `We had a ${w} time at school.`,
      `Isn’t this ${w}?`,
    ]
  }
  return [
    `I feel ${w} today.`,
    `${a} looks ${w}.`,
    `What a ${w} day!`,
    `Don’t be ${w}.`,
    `${b} is ${w} about the party.`,
    `This story is ${w}.`,
    `My friend is very ${w}.`,
    `Why do you feel ${w}?`,
    `We all feel ${w} sometimes.`,
    `Smile — you look ${w}!`,
  ]
}

function adverbSentences(w, a, b) {
  const special = {
    again: [
      'Please say that again.',
      `${a} reads the story again.`,
      'Can you try again?',
      'Let’s play the game again.',
      `${b} asks the question again.`,
      'I want to watch it again.',
      'Write your name again, please.',
      'Don’t make that mistake again.',
      'We sing the song again.',
      'Come here again tomorrow.',
    ],
    here: [
      'Please come here.',
      `${a} sits here every day.`,
      'Is my bag here?',
      'Put your book here.',
      `${b} is here now.`,
      'We play here after school.',
      'Stay here, please.',
      'I live here.',
      'Who is here today?',
      'Come and sit here.',
    ],
    now: [
      'Please sit down now.',
      `${a} is reading now.`,
      'What are you doing now?',
      'We start the lesson now.',
      `${b} wants to play now.`,
      'Wash your hands now.',
      'I am hungry now.',
      'Listen carefully now.',
      'It’s time to go now.',
      'Open your books now.',
    ],
    really: [
      'I really like this book.',
      `${a} is really happy today.`,
      'Do you really understand?',
      'This cake is really good!',
      `${b} can really swim well.`,
      'I am really sorry.',
      'We really want to play.',
      'Is it really a spider?',
      'Thank you — I really need help.',
      'That story is really funny.',
    ],
    too: [
      'I am too tired to play.',
      `${a} has too many books.`,
      'This bag is too big.',
      'Can I come too?',
      `${b} wants ice cream too.`,
      'Don’t run too fast.',
      'The music is too loud.',
      'I like apples too.',
      'It’s too cold outside.',
      'We can help too.',
    ],
    very: [
      'I am very happy today.',
      `${a} is very kind.`,
      'This story is very funny.',
      'Please speak very clearly.',
      `${b} runs very fast.`,
      'Thank you very much!',
      'The dog is very small.',
      'I am very hungry.',
      'Be very careful near the road.',
      'We had a very good day.',
    ],
  }
  if (special[w]) return special[w]
  return [
    `Please do it ${w}.`,
    `${a} works ${w}.`,
    `Speak ${w}, please.`,
    `We play ${w} in the park.`,
    `${b} can run ${w}.`,
    `Listen ${w} in class.`,
    `I write ${w} in my book.`,
    `Don’t go ${w}.`,
    `Can you do it ${w}?`,
    `Children learn ${w} with games.`,
  ]
}

export function generateSentences(word, pos, category, level = 'Starters') {
  const w = cleanDisplay(word)
  if (!w) return []
  // Corrupt / multi-lemma rows — keep short quoted practice sentences
  if (w.length > 48 || w.split(/\s+/).length > 6) {
    const short = w.slice(0, 40).trim()
    return [
      `We practise English words in class.`,
      `Please look at this word in your book.`,
      `I wrote a new word in my notebook.`,
      `Can you find this word in the list?`,
      `This entry needs a clearer headword.`,
      `We talked about vocabulary today.`,
      `My teacher explained a difficult word.`,
      `Please check the wordlist carefully.`,
      `I learned a new phrase this week.`,
      `Do you know this Cambridge word?`,
    ].map(tidySentence)
  }
  const art = withArticle(w)
  const seed = hashSeed(`${w}|${pos}|${category}|${level}`)
  const [a, b, c] = pickKids(seed)
  const cls = semanticClass(w, pos, category)
  let list = []
  if (pos === 'verb') {
    const fn = VERB_SENTENCES[cls] || VERB_SENTENCES['general-verb']
    list = fn(w, a, b, c)
  } else if (pos === 'adjective') {
    list = adjectiveSentences(w, a, b)
  } else if (pos === 'adverb') {
    list = adverbSentences(w, a, b)
  } else {
    list = nounSentences(w, art, category, a, b, c)
  }
  if (level === 'Preliminary') {
    list = [
      ...list,
      `In the exam we may see the word “${w}”.`,
      `Please write a short note using “${w}”.`,
    ]
  }
  const seen = new Set()
  const out = []
  for (const s of list.map(tidySentence)) {
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase())
    out.push(s)
    if (out.length >= 10) break
  }
  while (out.length < 10) {
    const filler = tidySentence(
      level === 'Preliminary'
        ? `We practise the word “${w}” in class.`
        : `We learn the word “${w}” in class.`,
    )
    if (!seen.has(filler.toLowerCase())) {
      seen.add(filler.toLowerCase())
      out.push(filler)
    } else break
  }
  return out.slice(0, 10)
}

export function fallbackHint(word, pos, category, level = 'Starters') {
  const w = cleanDisplay(word)
  const pet = level === 'Preliminary'
  if (pos === 'verb') {
    if (category === 'school') return pet ? `Use this verb when talking about study or exams.` : `You do this in class to learn.`
    if (category === 'sports') return pet ? `Use this when talking about sport or exercise.` : `You do this when you play.`
    return pet ? `Notice how people use “${w}” in real situations.` : `Picture the action: when do you ${w}?`
  }
  if (pos === 'adjective') {
    if (/^(black|blue|brown|green|grey|gray|pink|purple|red|white|yellow|orange)$/i.test(w)) {
      return `It is a colour you can see.`
    }
    return pet
      ? `This adjective describes a person, place, or thing.`
      : `It tells us how someone or something feels or looks.`
  }
  if (pos === 'adverb') {
    return pet ? `This adverb adds detail about time, place, or manner.` : `It tells us when or how something happens.`
  }
  if (category === 'food') return pet ? `Talk about meals, cooking, or shopping.` : `You can eat or drink this.`
  if (category === 'animals') return pet ? `Use it when talking about wildlife or pets.` : `It is an animal you can see in books or at the zoo.`
  if (category === 'body') return `It is a part of your body.`
  if (category === 'clothes') return `You wear this.`
  if (category === 'home') return pet ? `You may find this at home or in a flat.` : `You can find this at home.`
  if (category === 'school') return pet ? `Useful for school, college, or exams.` : `You use this at school.`
  if (category === 'people') return `It is a person in a family or community.`
  if (category === 'sports') return `It is about games and sport.`
  if (category === 'travel') return `It helps people go from place to place.`
  if (category === 'places') return `It is a place you can visit.`
  if (category === 'time') return `It is about time in the day or year.`
  if (category === 'jobs') return pet ? `A job or role people do for work.` : `A job people do.`
  if (category === 'health') return `It is about feeling well or getting help.`
  if (category === 'technology') return pet ? `Connected to phones, computers, or the internet.` : `It is about phones or computers.`
  if (category === 'nature') return `It is about the natural world outdoors.`
  if (category === 'weather') return `It is about the weather outside.`
  return pet ? `Listen for “${w}” in stories and conversations.` : `Picture ${withArticle(w)} in your mind.`
}

export function fallbackDefinition(word, pos, category, _level = 'Starters') {
  const w = cleanDisplay(word)
  if (!w) return 'a useful English word'
  // Corrupt multi-lemma / example rows from wordlist parsing
  if (w.length > 48 || w.split(/\s+/).length > 6) {
    return 'a useful English word from the Cambridge list'
  }
  if (pos === 'verb') return `to ${w}`
  if (pos === 'adjective') return `when someone or something is ${w}`
  if (pos === 'adverb') return `a word that tells us more about an action: ${w}`
  if (category === 'animals') return `an animal called ${w}`
  if (category === 'food') return `food or drink: ${w}`
  if (category === 'body') return `a part of the body: ${w}`
  if (category === 'clothes') return `something you wear: ${w}`
  if (category === 'jobs') return `a person whose job is connected with ${w}`
  if (category === 'places') return `a place: ${w}`
  if (category === 'health') return `something about health: ${w}`
  return withArticle(w)
}

export function fallbackDefinitionVi(word, pos, category, _level = 'Starters') {
  const w = cleanDisplay(word)
  if (!w || w.length > 48 || w.split(/\s+/).length > 6) return 'từ / cụm từ trong danh sách Cambridge'
  if (pos === 'verb') return `làm hành động “${w}”`
  if (pos === 'adjective') return `có tính chất / trạng thái “${w}”`
  if (pos === 'adverb') return `từ chỉ cách thức hoặc thời gian: ${w}`
  if (category === 'animals') return `con vật: ${w}`
  if (category === 'food') return `đồ ăn hoặc đồ uống: ${w}`
  if (category === 'body') return `một bộ phận cơ thể: ${w}`
  if (category === 'clothes') return `đồ mặc: ${w}`
  if (category === 'home') return `đồ / chỗ trong nhà: ${w}`
  if (category === 'school') return `từ dùng ở trường học: ${w}`
  if (category === 'people') return `người: ${w}`
  if (category === 'sports') return `liên quan đến thể thao / trò chơi: ${w}`
  if (category === 'travel') return `liên quan đến đi lại: ${w}`
  if (category === 'places') return `một địa điểm: ${w}`
  if (category === 'jobs') return `công việc / nghề: ${w}`
  if (category === 'health') return `liên quan đến sức khỏe: ${w}`
  if (category === 'technology') return `công nghệ / thiết bị: ${w}`
  if (category === 'nature') return `thiên nhiên: ${w}`
  if (category === 'weather') return `thời tiết: ${w}`
  if (category === 'feelings') return `cảm xúc / tính chất: ${w}`
  if (category === 'time') return `thời gian: ${w}`
  return `từ tiếng Anh: ${w}`
}

export function fallbackFact(word, category, level = 'Starters') {
  const w = cleanDisplay(word)
  const label = capitalize(w)
  const pet = level === 'Preliminary'
  if (category === 'animals') {
    return pet
      ? `${label} appears often in nature documentaries and travel writing.`
      : `${label} is an animal children often see in stories and at the zoo.`
  }
  if (category === 'food') {
    return pet
      ? `Talking about ${w} is common when describing meals and culture.`
      : `Many children enjoy ${w} at home or at school.`
  }
  if (category === 'school') {
    return pet
      ? `You will meet “${w}” in lessons, homework, and exam tasks.`
      : `You hear the word “${w}” a lot in English class.`
  }
  if (category === 'sports') {
    return pet
      ? `${label} is part of everyday talk about fitness and free time.`
      : `Playing with ${w} helps children move and have fun.`
  }
  return pet
    ? `Learners use “${w}” in stories, messages, and everyday English.`
    : `Children use the word “${w}” in stories, games, and everyday talk.`
}

export function sentenceContainsLemma(sentence, word) {
  const w = cleanDisplay(word).toLowerCase()
  const s = String(sentence).toLowerCase()
  if (!w) return false
  const norm = (text) => text
    .replace(/[’']/g, "'")
    .replace(/[“”]/g, '"')
  const sn = norm(s)
  const wn = norm(w)
  if (sn.includes(wn)) return true
  // Space ↔ hyphen variants: "check in" ↔ "check-in", "full time" ↔ "full-time"
  if (/\s/.test(wn)) {
    const hyphenated = wn.replace(/\s+/g, '-')
    if (sn.includes(hyphenated)) return true
  }
  // Hyphen / dot variants: check-in ↔ check in, a.m. ↔ am
  if (wn.includes('-') || wn.includes('.')) {
    const spaced = wn.replace(/[-.]+/g, ' ').replace(/\s+/g, ' ').trim()
    const compact = wn.replace(/[-.\s]+/g, '')
    if (spaced && sn.includes(spaced)) return true
    if (compact.length >= 2 && sn.replace(/[-.\s]/g, '').includes(compact)) return true
  }
  const bare = wn.replace(/[.?!,;:()]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (bare && bare !== wn && sn.includes(bare)) return true
  const tokens = bare.split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    const esc = tokens[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`\\b${esc}(s|es|ed|ing|er|est)?\\b`, 'i').test(sn)) return true
    if (tokens[0].endsWith('y')) {
      const stem = tokens[0].slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${stem}(ies|ied)\\b`, 'i').test(sn)) return true
    }
  }
  if (w === 'can' && /\bcan\b/i.test(sn)) return true
  if ((w === "let’s" || w === 'lets' || w === "let's") && /let['’]?s/i.test(sn)) return true
  return false
}
