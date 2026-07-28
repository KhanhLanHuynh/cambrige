/**
 * Curated gloss content (category, definition, definitionVi, hint, fact) for all 447
 * Cambridge Flyers vocabulary entries in server/data/flyers.json.
 *
 * Hand-written, teacher-style content for ages 8-12 (A2 level). Categories are
 * restricted to the shared YLE category set (see ALLOWED_CATEGORIES in
 * yle-content-templates.mjs).
 */
import { cleanDisplay, categoryFor } from '../yle-content-templates.mjs'

/** Headword overrides for OCR-corrupted Flyers wordlist entries. */
export const HEAD_OVERRIDES = {
  'ibility)': 'could',
  'bike)': 'racing',
  'chemist(’s)': "chemist's shop",
  'p.m. pajamas': 'pajamas',
}

function headword(word) {
  return cleanDisplay(HEAD_OVERRIDES[word] || word)
}

/** Splits words into buckets by the first letter of their cleaned headword. */
export function bucketFor(word) {
  const letter = headword(word).replace(/^[^a-zA-Z]+/, '').charAt(0).toUpperCase()
  if (letter >= 'A' && letter <= 'F') return 'af'
  if (letter >= 'G' && letter <= 'M') return 'gm'
  return 'nz'
}

export const GLOSS_BY_ID = {
  "flyers-as": {
    "category": "general",
    "definition": "a word used to compare two things, like 'as big as'",
    "definitionVi": "từ dùng để so sánh, nghĩa là 'bằng như'",
    "hint": "Use 'as' with another 'as' to compare things: 'as tall as'.",
    "fact": "You often see 'as' twice in one sentence, like 'as fast as a cheetah'."
  },
  "flyers-as-as": {
    "category": "general",
    "definition": "used to say two things are the same in some way",
    "definitionVi": "cấu trúc so sánh bằng, nghĩa là 'bằng như'",
    "hint": "Try it: 'She is as tall as her brother.'",
    "fact": "This pattern helps you compare people, animals, or things easily."
  },
  "flyers-astronaut": {
    "category": "jobs",
    "definition": "a person who travels and works in space",
    "definitionVi": "phi hành gia, người bay vào vũ trụ",
    "hint": "Astronauts wear a special suit and helmet in space.",
    "fact": "Astronauts float because there is very little gravity in space."
  },
  "flyers-at-the-moment": {
    "category": "time",
    "definition": "right now, at this exact time",
    "definitionVi": "ngay lúc này, hiện tại",
    "hint": "Use it to say what is happening now: 'I am reading at the moment.'",
    "fact": "'At the moment' is a handy phrase for talking about now in English."
  },
  "flyers-autumn": {
    "category": "weather",
    "definition": "the season between summer and winter when leaves fall",
    "definitionVi": "mùa thu, mùa giữa hè và đông",
    "hint": "Leaves turn orange and brown in autumn.",
    "fact": "Autumn is also called 'fall' in American English."
  },
  "flyers-away": {
    "category": "general",
    "definition": "not in the usual place, or moving from a place",
    "definitionVi": "đi xa, không ở đây nữa",
    "hint": "Say 'run away' when someone leaves quickly.",
    "fact": "Birds fly away to warmer places in winter."
  },
  "flyers-agree": {
    "category": "general",
    "definition": "to think the same as someone else",
    "definitionVi": "đồng ý với ai đó",
    "hint": "Nod your head to show you agree.",
    "fact": "Friends do not always agree, and that is okay!"
  },
  "flyers-air": {
    "category": "nature",
    "definition": "the gas all around us that we breathe",
    "definitionVi": "không khí, thứ ta hít thở",
    "hint": "You cannot see air, but you can feel the wind.",
    "fact": "Air is made mostly of a gas called nitrogen."
  },
  "flyers-airport": {
    "category": "travel",
    "definition": "a place where planes take off and land",
    "definitionVi": "sân bay, nơi máy bay cất và hạ cánh",
    "hint": "You check in your bags before you get on a plane at the airport.",
    "fact": "Some airports are so big that people travel between gates by train."
  },
  "flyers-alone": {
    "category": "feelings",
    "definition": "without any other person near you",
    "definitionVi": "một mình, không có ai bên cạnh",
    "hint": "Being alone for a little while can feel peaceful.",
    "fact": "Some animals, like tigers, like to live alone."
  },
  "flyers-already": {
    "category": "time",
    "definition": "before now, or sooner than expected",
    "definitionVi": "đã rồi, xong trước rồi",
    "hint": "Say 'I have already finished' when a job is done early.",
    "fact": "'Already' shows something happened faster than we thought!"
  },
  "flyers-also": {
    "category": "general",
    "definition": "as well as something else already said",
    "definitionVi": "cũng, cũng vậy",
    "hint": "Use 'also' to add more information: 'I like cats. I also like dogs.'",
    "fact": "'Also', 'too', and 'as well' all mean almost the same thing."
  },
  "flyers-amazing": {
    "category": "feelings",
    "definition": "very surprising and wonderful",
    "definitionVi": "tuyệt vời, đáng kinh ngạc",
    "hint": "Say 'amazing' when something is much better than you expected.",
    "fact": "Fireworks and rainbows often make people say 'amazing!'"
  },
  "flyers-ambulance": {
    "category": "health",
    "definition": "a vehicle that takes sick or hurt people to hospital",
    "definitionVi": "xe cứu thương",
    "hint": "An ambulance has a loud siren and flashing lights.",
    "fact": "Ambulances can drive fast through red lights in an emergency."
  },
  "flyers-anywhere": {
    "category": "general",
    "definition": "in, at, or to any place",
    "definitionVi": "bất cứ đâu",
    "hint": "Say 'anywhere' when the place does not matter: 'Sit anywhere you like.'",
    "fact": "You use 'anywhere' mostly in questions and negative sentences."
  },
  "flyers-appear": {
    "category": "general",
    "definition": "to start to be seen",
    "definitionVi": "xuất hiện",
    "hint": "A rainbow can appear after it rains.",
    "fact": "Magicians often make things appear and disappear as a trick."
  },
  "flyers-arrive": {
    "category": "travel",
    "definition": "to get to a place at the end of a journey",
    "definitionVi": "đến nơi, tới nơi",
    "hint": "You arrive at school after your journey there.",
    "fact": "Trains and planes have a special time when they should arrive."
  },
  "flyers-art": {
    "category": "school",
    "definition": "the subject where you draw, paint, and make things",
    "definitionVi": "môn mỹ thuật, môn vẽ",
    "hint": "In art class you might paint a picture or make a model.",
    "fact": "Famous paintings are kept safe in places called art galleries."
  },
  "flyers-artist": {
    "category": "jobs",
    "definition": "a person who makes paintings or other art",
    "definitionVi": "họa sĩ, nghệ sĩ",
    "hint": "An artist often uses a brush and paint.",
    "fact": "Some artists paint pictures, and some make statues or music."
  },
  "flyers-act": {
    "category": "general",
    "definition": "to perform a part in a play or film",
    "definitionVi": "diễn xuất, đóng vai",
    "hint": "Actors act on a stage or in front of a camera.",
    "fact": "Children can act in school plays too!"
  },
  "flyers-actor": {
    "category": "jobs",
    "definition": "a person whose job is acting in films or plays",
    "definitionVi": "diễn viên",
    "hint": "An actor learns lines and pretends to be someone else.",
    "fact": "Actors sometimes wear costumes and make-up for their part."
  },
  "flyers-actually": {
    "category": "general",
    "definition": "used to say what is really true",
    "definitionVi": "thực ra, thực tế là",
    "hint": "Use 'actually' to correct something: 'Actually, it's blue, not green.'",
    "fact": "'Actually' helps you share a surprising true fact."
  },
  "flyers-adventure": {
    "category": "general",
    "definition": "an exciting journey or experience",
    "definitionVi": "cuộc phiêu lưu",
    "hint": "Storybooks about pirates or explorers are full of adventure.",
    "fact": "Going somewhere new can feel like a small adventure."
  },
  "flyers-after": {
    "category": "time",
    "definition": "later than something, or next in time",
    "definitionVi": "sau, sau đó",
    "hint": "You have a snack after school.",
    "fact": "'After' tells you the order things happen in."
  },
  "flyers-ago": {
    "category": "time",
    "definition": "back in time from now",
    "definitionVi": "trước đây, cách đây",
    "hint": "Say 'two days ago' to talk about the past.",
    "fact": "'Ago' always comes after the amount of time, like 'a week ago'."
  },
  "flyers-business": {
    "category": "jobs",
    "definition": "work of buying, selling, or making things for money",
    "definitionVi": "công việc kinh doanh",
    "hint": "A shop is a small kind of business.",
    "fact": "Some people start their own business when they grow up."
  },
  "flyers-businessman": {
    "category": "jobs",
    "definition": "a man who works in business, buying or selling things",
    "definitionVi": "doanh nhân (nam)",
    "hint": "A businessman often wears a suit and carries a briefcase.",
    "fact": "Businessmen and businesswomen help run shops and companies."
  },
  "flyers-butter": {
    "category": "food",
    "definition": "a soft yellow food made from milk",
    "definitionVi": "bơ (làm từ sữa)",
    "hint": "We spread butter on bread or toast.",
    "fact": "Butter is made by shaking or churning cream."
  },
  "flyers-butterfly": {
    "category": "animals",
    "definition": "a colourful insect with big, thin wings",
    "definitionVi": "con bướm",
    "hint": "A butterfly starts life as a caterpillar.",
    "fact": "Butterflies taste with their feet, not their mouth!"
  },
  "flyers-by-myself": {
    "category": "feelings",
    "definition": "alone, with no one helping you",
    "definitionVi": "tự mình, một mình (làm gì)",
    "hint": "Say 'I did it by myself' when you needed no help.",
    "fact": "Doing something by myself can make you feel proud."
  },
  "flyers-by-yourself": {
    "category": "feelings",
    "definition": "alone, without anyone else helping you",
    "definitionVi": "tự bạn, một mình bạn (làm gì)",
    "hint": "A teacher might say, 'Try it by yourself first.'",
    "fact": "Learning to do things by yourself helps you grow up."
  },
  "flyers-backpack": {
    "category": "school",
    "definition": "a bag you carry on your back",
    "definitionVi": "ba lô",
    "hint": "You carry your books to school in a backpack.",
    "fact": "Backpacks have two straps so you can carry them on both shoulders."
  },
  "flyers-bandage": {
    "category": "health",
    "definition": "a strip of cloth used to cover a cut",
    "definitionVi": "băng gạc, băng vết thương",
    "hint": "A nurse puts a bandage on a hurt knee or arm.",
    "fact": "Bandages keep a wound clean while it heals."
  },
  "flyers-bank": {
    "category": "places",
    "definition": "a place where people keep their money safe",
    "definitionVi": "ngân hàng",
    "hint": "You can save your money in a bank.",
    "fact": "Banks also help people borrow money to buy a house."
  },
  "flyers-beetle": {
    "category": "animals",
    "definition": "a small insect with a hard, shiny back",
    "definitionVi": "con bọ cánh cứng",
    "hint": "A beetle's hard wings protect its soft wings underneath.",
    "fact": "There are more kinds of beetles than any other animal on Earth."
  },
  "flyers-before": {
    "category": "time",
    "definition": "earlier than something, or first in time",
    "definitionVi": "trước, trước khi",
    "hint": "Wash your hands before you eat.",
    "fact": "'Before' is the opposite of 'after'."
  },
  "flyers-begin": {
    "category": "school",
    "definition": "to start doing something",
    "definitionVi": "bắt đầu",
    "hint": "The lesson will begin when the bell rings.",
    "fact": "'Begin' and 'start' mean almost the same thing."
  },
  "flyers-believe": {
    "category": "general",
    "definition": "to feel sure that something is true",
    "definitionVi": "tin tưởng, tin rằng",
    "hint": "Say 'I believe you' when you trust what someone says.",
    "fact": "Many children believe in magic when they are young."
  },
  "flyers-belt": {
    "category": "clothes",
    "definition": "a strip you wear around your waist",
    "definitionVi": "thắt lưng, dây nịt",
    "hint": "A belt keeps your trousers from falling down.",
    "fact": "In karate, belts of different colours show your skill level."
  },
  "flyers-bicycle": {
    "category": "travel",
    "definition": "a vehicle with two wheels that you pedal",
    "definitionVi": "xe đạp",
    "hint": "You need to balance carefully when you ride a bicycle.",
    "fact": "'Bicycle' and 'bike' mean the same thing."
  },
  "flyers-bin": {
    "category": "home",
    "definition": "a container where you put rubbish",
    "definitionVi": "thùng rác",
    "hint": "Put your rubbish in the bin, not on the floor.",
    "fact": "Some bins are for recycling paper, plastic, or glass."
  },
  "flyers-biscuit": {
    "category": "food",
    "definition": "a small, flat, baked sweet snack",
    "definitionVi": "bánh quy",
    "hint": "You might dip a biscuit in milk or tea.",
    "fact": "In the US, a similar snack is called a 'cookie'."
  },
  "flyers-bit": {
    "category": "general",
    "definition": "a small amount or small piece of something",
    "definitionVi": "một chút, một mẩu nhỏ",
    "hint": "Say 'a bit tired' to mean a little tired.",
    "fact": "'A bit' is a friendly way to say 'a little'."
  },
  "flyers-bored": {
    "category": "feelings",
    "definition": "feeling tired because there is nothing fun to do",
    "definitionVi": "cảm thấy chán",
    "hint": "Find a game or a book when you feel bored.",
    "fact": "Being bored sometimes helps you think of fun new ideas."
  },
  "flyers-borrow": {
    "category": "school",
    "definition": "to take something and give it back later",
    "definitionVi": "mượn",
    "hint": "You can borrow books from the library.",
    "fact": "Always remember to return what you borrow!"
  },
  "flyers-bracelet": {
    "category": "clothes",
    "definition": "a piece of jewellery worn around the wrist",
    "definitionVi": "vòng đeo tay",
    "hint": "A bracelet can be made of beads, metal, or string.",
    "fact": "Friends sometimes make matching bracelets for each other."
  },
  "flyers-bridge": {
    "category": "places",
    "definition": "a structure built over a river or road",
    "definitionVi": "cây cầu",
    "hint": "A bridge helps you cross a river without getting wet.",
    "fact": "Some famous bridges, like Tower Bridge, can open in the middle."
  },
  "flyers-broken": {
    "category": "general",
    "definition": "damaged and in pieces, or not working",
    "definitionVi": "bị hỏng, bị vỡ",
    "hint": "A broken toy needs to be fixed or thrown away.",
    "fact": "If you drop a glass, it might get broken."
  },
  "flyers-brush": {
    "category": "home",
    "definition": "a tool with bristles for cleaning or hair",
    "definitionVi": "cái bàn chải, lược chải",
    "hint": "You use a brush to tidy your hair or paint a picture.",
    "fact": "There are brushes for teeth, hair, paint, and even floors."
  },
  "flyers-burn": {
    "category": "health",
    "definition": "to damage something with fire or heat",
    "definitionVi": "đốt, bị bỏng",
    "hint": "Be careful — the oven can burn your fingers.",
    "fact": "Fire fighters work hard to stop things from burning."
  },
  "flyers-calendar": {
    "category": "time",
    "definition": "a chart that shows the days, weeks, and months",
    "definitionVi": "lịch (xem ngày tháng)",
    "hint": "Look at the calendar to find out what day your birthday is.",
    "fact": "A calendar has 12 months and about 365 days."
  },
  "flyers-camel": {
    "category": "animals",
    "definition": "a large desert animal with one or two humps",
    "definitionVi": "con lạc đà",
    "hint": "A camel's humps store fat, not water!",
    "fact": "Camels can travel a long way in hot deserts without drinking."
  },
  "flyers-camp": {
    "category": "travel",
    "definition": "to sleep outside in a tent",
    "definitionVi": "cắm trại",
    "hint": "Families often camp near a lake or in the forest.",
    "fact": "You can see many more stars at night when you camp outdoors."
  },
  "flyers-card": {
    "category": "general",
    "definition": "a small piece of stiff paper with a message or picture",
    "definitionVi": "tấm thiệp, tấm thẻ",
    "hint": "You send a card to say happy birthday.",
    "fact": "People collect special cards, like football or game cards."
  },
  "flyers-cartoon": {
    "category": "technology",
    "definition": "a funny drawn film or picture",
    "definitionVi": "phim hoạt hình",
    "hint": "You watch cartoons on TV or online.",
    "fact": "The first cartoons on film were made over 100 years ago."
  },
  "flyers-castle": {
    "category": "places",
    "definition": "a large old building built for a king or queen",
    "definitionVi": "lâu đài",
    "hint": "Old castles often have tall towers and thick walls.",
    "fact": "Many castles were built hundreds of years ago to keep people safe."
  },
  "flyers-cave": {
    "category": "nature",
    "definition": "a large natural hole in a hill or under the ground",
    "definitionVi": "hang động",
    "hint": "Bats and bears sometimes live in caves.",
    "fact": "Some caves have beautiful rock shapes called stalactites."
  },
  "flyers-century": {
    "category": "time",
    "definition": "a period of one hundred years",
    "definitionVi": "thế kỷ (100 năm)",
    "hint": "We live in the twenty-first century.",
    "fact": "A century is ten times longer than a decade."
  },
  "flyers-cereal": {
    "category": "food",
    "definition": "a breakfast food made from grain, eaten with milk",
    "definitionVi": "ngũ cốc ăn sáng",
    "hint": "Many children eat cereal with milk for breakfast.",
    "fact": "Cereal is often made from corn, wheat, oats, or rice."
  },
  "flyers-channel": {
    "category": "technology",
    "definition": "a station you can watch on TV",
    "definitionVi": "kênh truyền hình",
    "hint": "You change the channel with the TV remote.",
    "fact": "There are channels just for cartoons, sport, or nature shows."
  },
  "flyers-chat": {
    "category": "people",
    "definition": "to talk in a friendly, relaxed way",
    "definitionVi": "trò chuyện, tán gẫu",
    "hint": "You can chat with friends at break time.",
    "fact": "'Chat' can also mean sending friendly messages online."
  },
  "flyers-cheap": {
    "category": "general",
    "definition": "not costing very much money",
    "definitionVi": "rẻ",
    "hint": "A cheap toy does not cost many coins.",
    "fact": "'Cheap' is the opposite of 'expensive'."
  },
  "flyers-chemist-s": {
    "category": "places",
    "definition": "a shop where you buy medicine",
    "definitionVi": "hiệu thuốc",
    "hint": "You go to the chemist's shop to buy medicine or shampoo.",
    "fact": "A chemist's shop can also be called a pharmacy."
  },
  "flyers-chess": {
    "category": "sports",
    "definition": "a board game for two players with pieces like kings",
    "definitionVi": "cờ vua",
    "hint": "In chess, you try to trap the other player's king.",
    "fact": "Chess is one of the oldest board games in the world."
  },
  "flyers-chopsticks": {
    "category": "food",
    "definition": "two thin sticks used for eating food",
    "definitionVi": "đôi đũa",
    "hint": "People in many Asian countries eat rice with chopsticks.",
    "fact": "It takes practice to hold chopsticks correctly!"
  },
  "flyers-club": {
    "category": "school",
    "definition": "a group of people who meet to share an interest",
    "definitionVi": "câu lạc bộ",
    "hint": "You might join a football club or a book club.",
    "fact": "Clubs meet regularly so members can enjoy the same hobby together."
  },
  "flyers-collect": {
    "category": "general",
    "definition": "to gather things together over time",
    "definitionVi": "sưu tầm, thu thập",
    "hint": "Some children collect stamps, coins, or stickers.",
    "fact": "Collecting things is a popular and fun hobby."
  },
  "flyers-college": {
    "category": "school",
    "definition": "a school where older students study after secondary school",
    "definitionVi": "trường cao đẳng",
    "hint": "You often go to college after you finish secondary school.",
    "fact": "At college, students can choose subjects they enjoy most."
  },
  "flyers-comb": {
    "category": "home",
    "definition": "a flat tool with teeth used to tidy hair",
    "definitionVi": "cái lược",
    "hint": "You use a comb to make your hair neat.",
    "fact": "Combs have been used to tidy hair for thousands of years."
  },
  "flyers-competition": {
    "category": "sports",
    "definition": "a game or contest where people try to win",
    "definitionVi": "cuộc thi, cuộc thi đấu",
    "hint": "You can win a prize in a school competition.",
    "fact": "The Olympics is a huge sports competition held every four years."
  },
  "flyers-concert": {
    "category": "general",
    "definition": "a show where musicians play music for people",
    "definitionVi": "buổi hòa nhạc",
    "hint": "People clap and sing along at a concert.",
    "fact": "Some concerts have thousands of people singing together."
  },
  "flyers-conversation": {
    "category": "people",
    "definition": "when two or more people talk together",
    "definitionVi": "cuộc trò chuyện",
    "hint": "You take turns speaking during a conversation.",
    "fact": "Good conversations need good listening, too!"
  },
  "flyers-cooker": {
    "category": "home",
    "definition": "a machine used to cook food in the kitchen",
    "definitionVi": "bếp nấu ăn",
    "hint": "You boil or fry food on top of the cooker.",
    "fact": "A cooker usually has hot rings on top and an oven inside."
  },
  "flyers-cookie": {
    "category": "food",
    "definition": "a small, sweet baked treat",
    "definitionVi": "bánh quy ngọt",
    "hint": "Cookies often have chocolate chips inside.",
    "fact": "In British English, a cookie is usually called a 'biscuit'."
  },
  "flyers-corner": {
    "category": "places",
    "definition": "the point where two lines or walls meet",
    "definitionVi": "góc, góc phố",
    "hint": "The shop is on the corner of the street.",
    "fact": "A square has four corners."
  },
  "flyers-costume": {
    "category": "clothes",
    "definition": "special clothes worn to look like someone else",
    "definitionVi": "trang phục hóa trang",
    "hint": "Children wear costumes for parties or plays.",
    "fact": "People wear fun costumes for Halloween or a fancy dress party."
  },
  "flyers-ibility": {
    "category": "general",
    "definition": "was able to do something in the past",
    "definitionVi": "đã có thể (làm gì đó trong quá khứ)",
    "hint": "Say 'I could swim when I was five' to talk about past ability.",
    "fact": "'Could' is the past form of the word 'can'."
  },
  "flyers-creature": {
    "category": "animals",
    "definition": "a living being, especially an animal",
    "definitionVi": "sinh vật, sinh linh",
    "hint": "A dinosaur was a huge creature that lived long ago.",
    "fact": "Storybooks are full of strange and magical creatures."
  },
  "flyers-crown": {
    "category": "clothes",
    "definition": "a special hat worn by a king or queen",
    "definitionVi": "vương miện",
    "hint": "A crown is often made of gold and jewels.",
    "fact": "Kings and queens wear a crown at important ceremonies."
  },
  "flyers-cushion": {
    "category": "home",
    "definition": "a soft pillow used on a chair or sofa",
    "definitionVi": "gối tựa, đệm ngồi",
    "hint": "You put a cushion on the sofa to make it comfy.",
    "fact": "Cushions can be soft, colourful, and many shapes."
  },
  "flyers-cut": {
    "category": "school",
    "definition": "to use scissors or a knife to divide something",
    "definitionVi": "cắt",
    "hint": "You cut paper with scissors in art class.",
    "fact": "Be careful — sharp scissors can cut your finger too!"
  },
  "flyers-cycle": {
    "category": "sports",
    "definition": "to ride a bicycle",
    "definitionVi": "đạp xe",
    "hint": "Wear a helmet when you cycle to stay safe.",
    "fact": "Cycling is great exercise and does not pollute the air."
  },
  "flyers-drum": {
    "category": "general",
    "definition": "a musical instrument you hit to make a beat",
    "definitionVi": "cái trống",
    "hint": "You hit a drum with your hands or sticks.",
    "fact": "Drums are one of the oldest instruments in the world."
  },
  "flyers-dark": {
    "category": "weather",
    "definition": "with little or no light",
    "definitionVi": "tối, thiếu ánh sáng",
    "hint": "Turn on a light when the room is dark.",
    "fact": "The sky gets dark at night because the sun has set."
  },
  "flyers-date": {
    "category": "time",
    "definition": "a particular day, shown by the day, month and year",
    "definitionVi": "ngày tháng",
    "hint": "Write today's date at the top of your worksheet.",
    "fact": "A date tells us exactly which day something happens."
  },
  "flyers-dear": {
    "category": "people",
    "definition": "loved, or used to start a friendly letter",
    "definitionVi": "thân mến (dùng để mở đầu thư)",
    "hint": "Letters often begin with 'Dear' and then the person's name.",
    "fact": "'Dear' shows you care about the person you are writing to."
  },
  "flyers-decide": {
    "category": "general",
    "definition": "to choose something after thinking about it",
    "definitionVi": "quyết định",
    "hint": "Take your time to decide which book to read.",
    "fact": "It can be hard to decide between two favourite things!"
  },
  "flyers-deep": {
    "category": "nature",
    "definition": "going far down from the top or surface",
    "definitionVi": "sâu",
    "hint": "The ocean is very deep in some places.",
    "fact": "The deepest part of the ocean is deeper than Mount Everest is tall."
  },
  "flyers-delicious": {
    "category": "food",
    "definition": "tasting very good",
    "definitionVi": "ngon",
    "hint": "Say 'delicious' when your food tastes really good.",
    "fact": "Your favourite meal probably tastes delicious to you!"
  },
  "flyers-desert": {
    "category": "nature",
    "definition": "a very dry, sandy place with little rain",
    "definitionVi": "sa mạc",
    "hint": "Deserts are hot in the day and cold at night.",
    "fact": "Camels are well suited to living in the desert."
  },
  "flyers-design": {
    "category": "school",
    "definition": "a drawing or plan showing how to make something",
    "definitionVi": "thiết kế, bản vẽ",
    "hint": "You make a design before you build or draw something.",
    "fact": "Designers plan everything from clothes to buildings."
  },
  "flyers-designer": {
    "category": "jobs",
    "definition": "a person who plans how things will look",
    "definitionVi": "nhà thiết kế",
    "hint": "A designer might plan clothes, toys, or buildings.",
    "fact": "Fashion designers create the clothes we wear."
  },
  "flyers-diary": {
    "category": "school",
    "definition": "a book where you write about your day",
    "definitionVi": "nhật ký",
    "hint": "You can write your feelings and plans in a diary.",
    "fact": "Some famous diaries have become books that people still read today."
  },
  "flyers-dictionary": {
    "category": "school",
    "definition": "a book that explains what words mean",
    "definitionVi": "từ điển",
    "hint": "Look up a new word in the dictionary to learn its meaning.",
    "fact": "A big dictionary can have hundreds of thousands of words."
  },
  "flyers-dinosaur": {
    "category": "animals",
    "definition": "a huge animal that lived millions of years ago",
    "definitionVi": "khủng long",
    "hint": "You can see dinosaur bones in a museum.",
    "fact": "Dinosaurs disappeared about 66 million years ago."
  },
  "flyers-disappear": {
    "category": "general",
    "definition": "to stop being seen, or go away suddenly",
    "definitionVi": "biến mất",
    "hint": "A magician can make a coin disappear.",
    "fact": "'Disappear' is the opposite of 'appear'."
  },
  "flyers-eagle": {
    "category": "animals",
    "definition": "a large, strong bird that hunts other animals",
    "definitionVi": "chim đại bàng",
    "hint": "An eagle has sharp eyes to spot food from high up.",
    "fact": "Eagles can see much better than humans can."
  },
  "flyers-early": {
    "category": "time",
    "definition": "before the usual or expected time",
    "definitionVi": "sớm",
    "hint": "Get up early so you are not late for school.",
    "fact": "'Early' is the opposite of 'late'."
  },
  "flyers-east": {
    "category": "places",
    "definition": "the direction where the sun rises",
    "definitionVi": "hướng đông",
    "hint": "The sun always rises in the east.",
    "fact": "A compass has four main directions: north, south, east, and west."
  },
  "flyers-elbow": {
    "category": "body",
    "definition": "the joint where your arm bends",
    "definitionVi": "khuỷu tay",
    "hint": "Bend your elbow to touch your shoulder.",
    "fact": "Your elbow lets your arm bend so you can reach things."
  },
  "flyers-else": {
    "category": "general",
    "definition": "different, or in addition to what has been said",
    "definitionVi": "khác nữa, còn gì khác",
    "hint": "Ask 'What else do you need?' to find out more.",
    "fact": "'Else' often follows question words like 'who' or 'what'."
  },
  "flyers-empty": {
    "category": "home",
    "definition": "with nothing inside",
    "definitionVi": "trống rỗng",
    "hint": "An empty glass has no water in it.",
    "fact": "'Empty' is the opposite of 'full'."
  },
  "flyers-engine": {
    "category": "travel",
    "definition": "the part of a vehicle that makes it move",
    "definitionVi": "động cơ",
    "hint": "A car's engine is usually at the front.",
    "fact": "Engines can run on petrol, diesel, or electricity."
  },
  "flyers-engineer": {
    "category": "jobs",
    "definition": "a person who designs or builds machines and structures",
    "definitionVi": "kỹ sư",
    "hint": "Engineers design bridges, machines, and computers.",
    "fact": "There are many kinds of engineers, like those who build planes."
  },
  "flyers-enormous": {
    "category": "general",
    "definition": "extremely big in size",
    "definitionVi": "khổng lồ, cực kỳ to lớn",
    "hint": "An enormous whale is much bigger than a car.",
    "fact": "'Enormous' means even bigger than just 'big'."
  },
  "flyers-enough": {
    "category": "general",
    "definition": "as much as you need",
    "definitionVi": "đủ",
    "hint": "Ask 'Do we have enough?' before you start.",
    "fact": "If you have enough, you don't need any more."
  },
  "flyers-enter-a-competition": {
    "category": "sports",
    "definition": "to join a contest to try to win",
    "definitionVi": "tham gia một cuộc thi",
    "hint": "You can enter a competition at school or online.",
    "fact": "Entering a competition can be fun even if you don't win."
  },
  "flyers-entrance": {
    "category": "places",
    "definition": "the door or way into a place",
    "definitionVi": "lối vào, cửa vào",
    "hint": "Wait at the entrance for your friends.",
    "fact": "'Entrance' is the opposite of 'exit'."
  },
  "flyers-envelope": {
    "category": "school",
    "definition": "a paper cover used to send a letter",
    "definitionVi": "phong bì thư",
    "hint": "You put a letter inside an envelope before posting it.",
    "fact": "You stick a stamp on the envelope before you post it."
  },
  "flyers-environment": {
    "category": "nature",
    "definition": "the natural world around us, like air, land, and water",
    "definitionVi": "môi trường tự nhiên",
    "hint": "Recycling helps protect the environment.",
    "fact": "Trees clean the air and help the environment."
  },
  "flyers-ever": {
    "category": "time",
    "definition": "at any time, in your whole life",
    "definitionVi": "từng, đã bao giờ",
    "hint": "Ask 'Have you ever seen a whale?'",
    "fact": "'Ever' is often used in questions about experiences."
  },
  "flyers-everywhere": {
    "category": "places",
    "definition": "in every place, or all around",
    "definitionVi": "khắp mọi nơi",
    "hint": "Toys were everywhere after the party!",
    "fact": "'Everywhere' means there is no place it does not include."
  },
  "flyers-excellent": {
    "category": "feelings",
    "definition": "extremely good",
    "definitionVi": "xuất sắc, tuyệt vời",
    "hint": "A teacher might say 'excellent work!' for a great answer.",
    "fact": "'Excellent' is a stronger way of saying 'very good'."
  },
  "flyers-excited": {
    "category": "feelings",
    "definition": "feeling very happy about something that will happen",
    "definitionVi": "hào hứng, phấn khích",
    "hint": "You feel excited before your birthday party.",
    "fact": "Being excited can make your heart beat a little faster."
  },
  "flyers-exit": {
    "category": "places",
    "definition": "the door or way out of a place",
    "definitionVi": "lối ra, cửa thoát",
    "hint": "Look for the exit sign to find the way out.",
    "fact": "'Exit' is the opposite of 'entrance'."
  },
  "flyers-expensive": {
    "category": "general",
    "definition": "costing a lot of money",
    "definitionVi": "đắt tiền",
    "hint": "A new bike can be quite expensive.",
    "fact": "'Expensive' is the opposite of 'cheap'."
  },
  "flyers-explain": {
    "category": "school",
    "definition": "to tell someone something clearly so they understand",
    "definitionVi": "giải thích",
    "hint": "Ask your teacher to explain if you don't understand.",
    "fact": "Explaining something well helps other people learn it too."
  },
  "flyers-explore": {
    "category": "travel",
    "definition": "to travel and look around a new place",
    "definitionVi": "khám phá",
    "hint": "Explorers like to explore forests, caves, and oceans.",
    "fact": "You can explore a new park or even your own garden."
  },
  "flyers-extinct": {
    "category": "animals",
    "definition": "no longer existing on Earth",
    "definitionVi": "tuyệt chủng",
    "hint": "Dinosaurs are extinct — none are alive today.",
    "fact": "When an animal becomes extinct, it can never come back."
  },
  "flyers-factory": {
    "category": "places",
    "definition": "a building where things are made in large numbers",
    "definitionVi": "nhà máy",
    "hint": "Toys and cars are often made in a factory.",
    "fact": "Machines in factories can make thousands of things every day."
  },
  "flyers-fall-over": {
    "category": "body",
    "definition": "to lose your balance and drop to the ground",
    "definitionVi": "ngã, té ngã",
    "hint": "Be careful on ice so you don't fall over.",
    "fact": "Babies fall over a lot while they learn to walk."
  },
  "flyers-far": {
    "category": "places",
    "definition": "a long distance away",
    "definitionVi": "xa",
    "hint": "Ask 'Is it far?' before you start walking.",
    "fact": "'Far' is the opposite of 'near' or 'close'."
  },
  "flyers-fast": {
    "category": "sports",
    "definition": "moving quickly, not slowly",
    "definitionVi": "nhanh",
    "hint": "A cheetah can run very fast.",
    "fact": "'Fast' is the opposite of 'slow'."
  },
  "flyers-feel": {
    "category": "feelings",
    "definition": "to have a certain emotion or sensation",
    "definitionVi": "cảm thấy",
    "hint": "Say 'I feel happy' to share how you feel.",
    "fact": "You can also feel things with your hands, like soft or rough."
  },
  "flyers-festival": {
    "category": "general",
    "definition": "a special day or time of celebration",
    "definitionVi": "lễ hội",
    "hint": "There is music, food, and fun at a festival.",
    "fact": "Different countries have their own special festivals to celebrate."
  },
  "flyers-fetch": {
    "category": "general",
    "definition": "to go and bring something back",
    "definitionVi": "mang lại, lấy về",
    "hint": "Dogs love to fetch a thrown ball.",
    "fact": "'Fetch' is a fun game to play with a pet dog."
  },
  "flyers-file": {
    "category": "school",
    "definition": "a folder used to keep papers together",
    "definitionVi": "tệp hồ sơ, cặp đựng tài liệu",
    "hint": "Keep your worksheets tidy in a file.",
    "fact": "On a computer, a 'file' can also mean a document you save."
  },
  "flyers-find-out": {
    "category": "school",
    "definition": "to discover information you did not know",
    "definitionVi": "tìm hiểu, khám phá ra",
    "hint": "Read a book to find out more about a topic.",
    "fact": "Scientists find out new things by testing their ideas."
  },
  "flyers-finger": {
    "category": "body",
    "definition": "one of the five parts at the end of your hand",
    "definitionVi": "ngón tay",
    "hint": "Point with your finger to show something.",
    "fact": "You have ten fingers, including your two thumbs."
  },
  "flyers-finish": {
    "category": "school",
    "definition": "to complete something or come to the end",
    "definitionVi": "hoàn thành, kết thúc",
    "hint": "Try to finish your homework before dinner.",
    "fact": "'Finish' is the opposite of 'begin' or 'start'."
  },
  "flyers-fire": {
    "category": "home",
    "definition": "hot, bright flames that burn",
    "definitionVi": "lửa",
    "hint": "Never play with fire — it can be dangerous.",
    "fact": "Fire needs oxygen, heat, and fuel to keep burning."
  },
  "flyers-fire-engine": {
    "category": "travel",
    "definition": "a large vehicle that carries fire fighters and water",
    "definitionVi": "xe cứu hỏa",
    "hint": "A fire engine is usually red with a loud siren.",
    "fact": "Fire engines carry long hoses and ladders to fight fires."
  },
  "flyers-fire-fighter": {
    "category": "jobs",
    "definition": "a person whose job is to put out fires",
    "definitionVi": "lính cứu hỏa",
    "hint": "A fire fighter wears a helmet and special suit to stay safe.",
    "fact": "Fire fighters also help rescue people and animals in danger."
  },
  "flyers-fire-station": {
    "category": "places",
    "definition": "a building where fire engines and fire fighters are based",
    "definitionVi": "trạm cứu hỏa",
    "hint": "Fire engines wait at the fire station until they are needed.",
    "fact": "Fire fighters can leave the fire station in under a minute."
  },
  "flyers-flag": {
    "category": "general",
    "definition": "a piece of cloth with colours that represents a country",
    "definitionVi": "lá cờ",
    "hint": "Every country has its own special flag.",
    "fact": "Flags often use colours and symbols that mean something important."
  },
  "flyers-flashlight": {
    "category": "home",
    "definition": "a small light you carry and hold in your hand",
    "definitionVi": "đèn pin",
    "hint": "Use a flashlight to see in the dark.",
    "fact": "In British English, a flashlight is usually called a 'torch'."
  },
  "flyers-flour": {
    "category": "food",
    "definition": "a white powder made from grain, used for baking",
    "definitionVi": "bột mì",
    "hint": "You need flour to bake bread or a cake.",
    "fact": "Flour is usually made by grinding wheat into a fine powder."
  },
  "flyers-fog": {
    "category": "weather",
    "definition": "a thick cloud of mist close to the ground",
    "definitionVi": "sương mù",
    "hint": "It is hard to see far when there is fog.",
    "fact": "Fog forms when warm, wet air cools down near the ground."
  },
  "flyers-foggy": {
    "category": "weather",
    "definition": "covered with a thick, low cloud of fog",
    "definitionVi": "có sương mù",
    "hint": "Drive slowly and carefully on a foggy morning.",
    "fact": "On a foggy day, you cannot see very far ahead."
  },
  "flyers-follow": {
    "category": "general",
    "definition": "to go behind or after someone",
    "definitionVi": "theo sau, đi theo",
    "hint": "Follow the teacher in a line to the playground.",
    "fact": "Ducklings follow their mother wherever she swims."
  },
  "flyers-forget": {
    "category": "school",
    "definition": "to not remember something",
    "definitionVi": "quên",
    "hint": "Write a note so you don't forget your homework.",
    "fact": "'Forget' is the opposite of 'remember'."
  },
  "flyers-fork": {
    "category": "food",
    "definition": "a tool with points, used for eating food",
    "definitionVi": "cái nĩa",
    "hint": "You hold food still with a fork while you cut it.",
    "fact": "A fork usually has three or four sharp points called tines."
  },
  "flyers-fridge": {
    "category": "home",
    "definition": "a machine that keeps food cold",
    "definitionVi": "tủ lạnh",
    "hint": "Put the milk back in the fridge so it stays fresh.",
    "fact": "'Fridge' is short for 'refrigerator'."
  },
  "flyers-friendly": {
    "category": "people",
    "definition": "kind and pleasant to other people",
    "definitionVi": "thân thiện",
    "hint": "Smile and say hello to be friendly.",
    "fact": "A friendly dog often wags its tail."
  },
  "flyers-frightening": {
    "category": "feelings",
    "definition": "making you feel afraid",
    "definitionVi": "đáng sợ",
    "hint": "A loud thunderstorm can be frightening for some pets.",
    "fact": "Scary films are made to feel frightening on purpose."
  },
  "flyers-front": {
    "category": "places",
    "definition": "at the part that faces forward, or first in a line",
    "definitionVi": "phía trước",
    "hint": "Sit at the front of the class to see the board better.",
    "fact": "'Front' is the opposite of 'back'."
  },
  "flyers-full": {
    "category": "food",
    "definition": "holding as much as possible, with no space left",
    "definitionVi": "đầy",
    "hint": "Say 'I'm full' when you cannot eat any more.",
    "fact": "'Full' is the opposite of 'empty'."
  },
  "flyers-fur": {
    "category": "animals",
    "definition": "the soft hair covering many animals' bodies",
    "definitionVi": "bộ lông (thú)",
    "hint": "Cats and rabbits have soft fur.",
    "fact": "Fur keeps many animals warm in cold weather."
  },
  "flyers-furry": {
    "category": "animals",
    "definition": "covered with soft, thick fur",
    "definitionVi": "có lông mềm, đầy lông",
    "hint": "A furry rabbit feels soft when you stroke it.",
    "fact": "Furry animals often feel warm and soft to touch."
  },
  "flyers-future": {
    "category": "time",
    "definition": "the time that has not happened yet",
    "definitionVi": "tương lai",
    "hint": "Think about what job you might have in the future.",
    "fact": "'Future' is the opposite of 'past'."
  },
  "flyers-gate": {
    "category": "home",
    "definition": "a door in a fence or wall, often outside",
    "definitionVi": "cổng",
    "hint": "Close the gate so pets cannot run onto the road.",
    "fact": "Airports also have 'gates' where you get on your plane."
  },
  "flyers-geography": {
    "category": "school",
    "definition": "the school subject about countries, land, and maps",
    "definitionVi": "môn địa lý",
    "hint": "In geography, you learn about mountains, rivers, and countries.",
    "fact": "Geography helps you understand maps of the whole world."
  },
  "flyers-get-to": {
    "category": "travel",
    "definition": "to arrive at a place",
    "definitionVi": "đến được (một nơi nào đó)",
    "hint": "Ask 'How do I get to the station?' for directions.",
    "fact": "'Get to' is another way of saying 'arrive at'."
  },
  "flyers-glove": {
    "category": "clothes",
    "definition": "clothing that covers and warms your hand",
    "definitionVi": "găng tay",
    "hint": "Wear gloves to keep your hands warm in winter.",
    "fact": "Gloves have a separate space for each finger and thumb."
  },
  "flyers-glue": {
    "category": "school",
    "definition": "a sticky liquid used to join things together",
    "definitionVi": "keo dán",
    "hint": "Use glue to stick paper shapes in art class.",
    "fact": "Glue can be made from plants, animals, or chemicals."
  },
  "flyers-go-out": {
    "category": "general",
    "definition": "to leave your home to do something",
    "definitionVi": "đi ra ngoài",
    "hint": "We go out to play when the sun is shining.",
    "fact": "'Go out' can also mean a light or fire stops burning."
  },
  "flyers-gold": {
    "category": "general",
    "definition": "having the colour of the shiny yellow metal gold",
    "definitionVi": "màu vàng kim",
    "hint": "The winner's medal is often gold.",
    "fact": "Real gold never rusts, even after thousands of years."
  },
  "flyers-golf": {
    "category": "sports",
    "definition": "a game where you hit a small ball into holes",
    "definitionVi": "môn gôn",
    "hint": "You use a long stick called a club to play golf.",
    "fact": "Golf is usually played outside on a large, grassy course."
  },
  "flyers-group": {
    "category": "school",
    "definition": "a number of people or things together",
    "definitionVi": "nhóm",
    "hint": "Work in a group of three for this activity.",
    "fact": "Animals like wolves also live and hunt in groups."
  },
  "flyers-guess": {
    "category": "school",
    "definition": "an answer you give without being completely sure",
    "definitionVi": "sự phỏng đoán",
    "hint": "Have a guess even if you are not certain of the answer.",
    "fact": "A good guess uses clues to make a smart choice."
  },
  "flyers-gym": {
    "category": "places",
    "definition": "a room or building with equipment for exercise",
    "definitionVi": "phòng tập thể dục",
    "hint": "You do sport and exercise in the school gym.",
    "fact": "'Gym' is short for 'gymnasium'."
  },
  "flyers-half": {
    "category": "school",
    "definition": "one of two equal parts of something",
    "definitionVi": "một nửa",
    "hint": "Cut the apple in half to share it with a friend.",
    "fact": "Two halves always make one whole thing."
  },
  "flyers-happen": {
    "category": "general",
    "definition": "to take place, or occur",
    "definitionVi": "xảy ra",
    "hint": "Ask 'What happened?' to find out about an event.",
    "fact": "Stories often start by telling you what happened first."
  },
  "flyers-hard": {
    "category": "school",
    "definition": "difficult to do, or firm and solid",
    "definitionVi": "khó, cứng",
    "hint": "Some maths questions can be quite hard.",
    "fact": "'Hard' can mean difficult, or it can mean not soft."
  },
  "flyers-hate": {
    "category": "feelings",
    "definition": "to dislike something very strongly",
    "definitionVi": "ghét",
    "hint": "Say 'I hate' only about things, not people, to be kind.",
    "fact": "'Hate' is the strong opposite of 'love'."
  },
  "flyers-hear": {
    "category": "body",
    "definition": "to notice a sound with your ears",
    "definitionVi": "nghe thấy",
    "hint": "You hear music with your ears.",
    "fact": "Bats can hear sounds that humans cannot hear at all."
  },
  "flyers-heavy": {
    "category": "general",
    "definition": "weighing a lot, not light",
    "definitionVi": "nặng",
    "hint": "A heavy bag is hard to carry far.",
    "fact": "'Heavy' is the opposite of 'light'."
  },
  "flyers-high": {
    "category": "nature",
    "definition": "a long way up from the ground",
    "definitionVi": "cao",
    "hint": "Birds can fly very high in the sky.",
    "fact": "'High' is the opposite of 'low'."
  },
  "flyers-hill": {
    "category": "nature",
    "definition": "a high area of land, smaller than a mountain",
    "definitionVi": "quả đồi",
    "hint": "It's fun to roll down a grassy hill.",
    "fact": "A hill is like a small mountain."
  },
  "flyers-history": {
    "category": "school",
    "definition": "the school subject about things that happened long ago",
    "definitionVi": "môn lịch sử",
    "hint": "In history class, we learn about people from the past.",
    "fact": "History helps us understand how the world became what it is today."
  },
  "flyers-hole": {
    "category": "nature",
    "definition": "an empty space or opening in something",
    "definitionVi": "cái lỗ",
    "hint": "Rabbits dig a hole to make their home.",
    "fact": "Golfers try to hit the ball into a small hole."
  },
  "flyers-honey": {
    "category": "food",
    "definition": "a sweet, sticky food made by bees",
    "definitionVi": "mật ong",
    "hint": "Bears love to eat honey from a beehive.",
    "fact": "Bees make honey from the nectar of flowers."
  },
  "flyers-hope": {
    "category": "feelings",
    "definition": "to want something to happen and think it might",
    "definitionVi": "hy vọng",
    "hint": "Say 'I hope it doesn't rain' before a picnic.",
    "fact": "Hoping for good things can make you feel happy inside."
  },
  "flyers-horrible": {
    "category": "feelings",
    "definition": "very unpleasant or bad",
    "definitionVi": "kinh khủng, tồi tệ",
    "hint": "A horrible smell makes you want to hold your nose.",
    "fact": "'Horrible' is a strong way to say something is bad."
  },
  "flyers-hotel": {
    "category": "places",
    "definition": "a building where people pay to stay the night",
    "definitionVi": "khách sạn",
    "hint": "Families often stay in a hotel when they travel.",
    "fact": "Some hotels even have swimming pools for guests."
  },
  "flyers-hour": {
    "category": "time",
    "definition": "a unit of time equal to sixty minutes",
    "definitionVi": "giờ (60 phút)",
    "hint": "There are twenty-four hours in one day.",
    "fact": "A short film usually lasts about one or two hours."
  },
  "flyers-how-long": {
    "category": "time",
    "definition": "used to ask about the amount of time something takes",
    "definitionVi": "bao lâu",
    "hint": "Ask 'How long is the film?' to find out its length.",
    "fact": "'How long' can ask about time or about size too."
  },
  "flyers-hurry": {
    "category": "general",
    "definition": "to move or act quickly",
    "definitionVi": "vội vàng, nhanh lên",
    "hint": "Hurry up so you are not late for the bus!",
    "fact": "When you hurry, your heart beats a little faster."
  },
  "flyers-husband": {
    "category": "people",
    "definition": "the man someone is married to",
    "definitionVi": "chồng",
    "hint": "A husband and wife are a married couple.",
    "fact": "A woman's husband is part of her close family."
  },
  "flyers-important": {
    "category": "school",
    "definition": "very valuable or needing serious attention",
    "definitionVi": "quan trọng",
    "hint": "Listening carefully in class is important.",
    "fact": "Remembering important dates, like birthdays, makes people happy."
  },
  "flyers-improve": {
    "category": "school",
    "definition": "to become better, or make something better",
    "definitionVi": "cải thiện, tiến bộ",
    "hint": "Practising every day helps you improve at reading.",
    "fact": "Everyone can improve a skill with enough practice."
  },
  "flyers-information": {
    "category": "school",
    "definition": "facts or details about something",
    "definitionVi": "thông tin",
    "hint": "Books and the internet are full of useful information.",
    "fact": "Libraries are great places to find information for a project."
  },
  "flyers-insect": {
    "category": "animals",
    "definition": "a small animal with six legs, like an ant or bee",
    "definitionVi": "côn trùng",
    "hint": "Ants, bees, and butterflies are all insects.",
    "fact": "Insects are the largest group of animals on Earth."
  },
  "flyers-instead": {
    "category": "general",
    "definition": "in place of something else",
    "definitionVi": "thay vì",
    "hint": "Have juice instead of soda if you want something healthier.",
    "fact": "'Instead' shows one thing replaces another."
  },
  "flyers-instrument": {
    "category": "general",
    "definition": "an object used to make music",
    "definitionVi": "nhạc cụ",
    "hint": "A piano, guitar, and drum are all instruments.",
    "fact": "Learning to play an instrument takes lots of practice."
  },
  "flyers-interested": {
    "category": "feelings",
    "definition": "wanting to know or learn more about something",
    "definitionVi": "quan tâm, thích thú",
    "hint": "Say 'I'm interested in space' to share what you enjoy.",
    "fact": "Being interested in a topic makes learning much more fun."
  },
  "flyers-interesting": {
    "category": "feelings",
    "definition": "holding your attention because it is enjoyable to learn about",
    "definitionVi": "thú vị",
    "hint": "A good book is often interesting from the very first page.",
    "fact": "Interesting facts are fun to share with friends."
  },
  "flyers-invent": {
    "category": "technology",
    "definition": "to design or make something new for the first time",
    "definitionVi": "phát minh",
    "hint": "Thomas Edison helped invent the light bulb.",
    "fact": "Children can invent new games with simple things at home."
  },
  "flyers-invitation": {
    "category": "general",
    "definition": "a card or message asking someone to an event",
    "definitionVi": "thư mời",
    "hint": "You send an invitation to ask friends to your party.",
    "fact": "An invitation usually tells you the time, date, and place."
  },
  "flyers-jam": {
    "category": "food",
    "definition": "a sweet spread made from fruit and sugar",
    "definitionVi": "mứt",
    "hint": "You spread jam on toast or bread.",
    "fact": "Jam is made by cooking fruit with a lot of sugar."
  },
  "flyers-job": {
    "category": "jobs",
    "definition": "the work a person does to earn money",
    "definitionVi": "công việc, nghề nghiệp",
    "hint": "Ask 'What job do you want?' to talk about the future.",
    "fact": "There are thousands of different jobs people can do."
  },
  "flyers-join-a-club": {
    "category": "school",
    "definition": "to become a member of a club or group",
    "definitionVi": "gia nhập câu lạc bộ",
    "hint": "You can join a club to make new friends with the same hobby.",
    "fact": "Joining a club is a fun way to try a new activity."
  },
  "flyers-journalist": {
    "category": "jobs",
    "definition": "a person who writes news stories",
    "definitionVi": "nhà báo",
    "hint": "A journalist asks questions and writes about what happens.",
    "fact": "Journalists work for newspapers, TV, and websites."
  },
  "flyers-journey": {
    "category": "travel",
    "definition": "the act of travelling from one place to another",
    "definitionVi": "chuyến đi, hành trình",
    "hint": "A journey can be short, like to school, or very long.",
    "fact": "'Journey' can describe a trip by car, plane, boat, or on foot."
  },
  "flyers-just": {
    "category": "general",
    "definition": "exactly, or only a moment ago",
    "definitionVi": "vừa mới, chỉ",
    "hint": "Say 'I just finished' to mean you finished a moment ago.",
    "fact": "'Just' can mean 'only', 'exactly', or 'a moment ago'."
  },
  "flyers-keep": {
    "category": "general",
    "definition": "to have or hold something and not give it away",
    "definitionVi": "giữ",
    "hint": "You can keep your favourite drawing on your wall.",
    "fact": "'Keep' can also mean to continue doing something."
  },
  "flyers-key": {
    "category": "home",
    "definition": "a metal tool used to lock or unlock a door",
    "definitionVi": "chìa khóa",
    "hint": "You need a key to open a locked door.",
    "fact": "The first metal keys were used thousands of years ago."
  },
  "flyers-kilometre": {
    "category": "travel",
    "definition": "a unit used to measure distance",
    "definitionVi": "kilômét (đơn vị đo khoảng cách)",
    "hint": "A kilometre is about the length of ten football pitches.",
    "fact": "There are one thousand metres in one kilometre."
  },
  "flyers-king": {
    "category": "people",
    "definition": "a man who rules a country, often born into the role",
    "definitionVi": "vua",
    "hint": "A king often wears a crown and lives in a palace.",
    "fact": "Some countries still have a king or queen today."
  },
  "flyers-knee": {
    "category": "body",
    "definition": "the joint in the middle of your leg",
    "definitionVi": "đầu gối",
    "hint": "You bend your knee when you sit down.",
    "fact": "Your knee helps you walk, run, and jump."
  },
  "flyers-knife": {
    "category": "food",
    "definition": "a tool with a sharp blade used for cutting",
    "definitionVi": "con dao",
    "hint": "Always ask an adult before using a sharp knife.",
    "fact": "A knife, fork, and spoon are the main tools we eat with."
  },
  "flyers-land": {
    "category": "travel",
    "definition": "to come down and arrive on the ground after flying",
    "definitionVi": "hạ cánh, đáp xuống",
    "hint": "The plane will land at the airport soon.",
    "fact": "'Land' is the opposite of 'take off'."
  },
  "flyers-language": {
    "category": "school",
    "definition": "the words a group of people use to talk",
    "definitionVi": "ngôn ngữ",
    "hint": "English is the language you are learning right now.",
    "fact": "There are thousands of different languages spoken around the world."
  },
  "flyers-large": {
    "category": "general",
    "definition": "big in size or amount",
    "definitionVi": "lớn, to",
    "hint": "An elephant is a very large animal.",
    "fact": "'Large' means almost the same as 'big'."
  },
  "flyers-late": {
    "category": "time",
    "definition": "after the expected or usual time",
    "definitionVi": "muộn, trễ",
    "hint": "Set an alarm so you are not late for school.",
    "fact": "'Late' is the opposite of 'early'."
  },
  "flyers-later": {
    "category": "time",
    "definition": "at a time after now",
    "definitionVi": "sau này, lát nữa",
    "hint": "Say 'see you later' when you will meet again soon.",
    "fact": "'Later' talks about the future, even if it's just in a few minutes."
  },
  "flyers-lazy": {
    "category": "feelings",
    "definition": "not wanting to work or be active",
    "definitionVi": "lười biếng",
    "hint": "It is easy to feel lazy on a rainy day.",
    "fact": "Even lazy days can be good for resting your body."
  },
  "flyers-leave": {
    "category": "travel",
    "definition": "to go away from a place",
    "definitionVi": "rời đi",
    "hint": "We leave for school at eight o'clock.",
    "fact": "'Leave' can also mean to not take something with you."
  },
  "flyers-left": {
    "category": "places",
    "definition": "on the side opposite to the right",
    "definitionVi": "bên trái",
    "hint": "Most people write with their right hand, but some use their left.",
    "fact": "'Left' is the opposite of 'right'."
  },
  "flyers-let": {
    "category": "general",
    "definition": "to allow someone to do something",
    "definitionVi": "cho phép",
    "hint": "Ask 'Please let me try' when you want a turn.",
    "fact": "'Let's' is short for 'let us', used to suggest doing something."
  },
  "flyers-lie": {
    "category": "body",
    "definition": "to rest flat on a surface, like a bed",
    "definitionVi": "nằm",
    "hint": "You lie down on your bed when you are tired.",
    "fact": "'Lie' can also mean to say something that is not true."
  },
  "flyers-lift-ride": {
    "category": "travel",
    "definition": "a machine that carries people up or down in a building",
    "definitionVi": "thang máy",
    "hint": "Take the lift instead of the stairs to a high floor.",
    "fact": "In American English, a lift is usually called an 'elevator'."
  },
  "flyers-light": {
    "category": "general",
    "definition": "not heavy, or having a lot of brightness",
    "definitionVi": "nhẹ, sáng",
    "hint": "A feather is very light.",
    "fact": "'Light' can describe weight or brightness."
  },
  "flyers-look-after": {
    "category": "health",
    "definition": "to take care of someone or something",
    "definitionVi": "chăm sóc",
    "hint": "You look after a pet by feeding it every day.",
    "fact": "Looking after younger children shows kindness and responsibility."
  },
  "flyers-look-like": {
    "category": "body",
    "definition": "to have a similar appearance to someone or something",
    "definitionVi": "trông giống như",
    "hint": "Say 'she looks like her mother' to compare appearances.",
    "fact": "Twins often look exactly like each other."
  },
  "flyers-lovely": {
    "category": "feelings",
    "definition": "very nice or beautiful",
    "definitionVi": "dễ thương, đáng yêu",
    "hint": "Say 'what a lovely day' when the weather is nice.",
    "fact": "'Lovely' is a warm, friendly way to say something is nice."
  },
  "flyers-low": {
    "category": "nature",
    "definition": "not high, close to the ground",
    "definitionVi": "thấp",
    "hint": "The ball rolled under the low table.",
    "fact": "'Low' is the opposite of 'high'."
  },
  "flyers-lucky": {
    "category": "feelings",
    "definition": "having good things happen by chance",
    "definitionVi": "may mắn",
    "hint": "Say 'you're so lucky!' when a good surprise happens.",
    "fact": "Some people think a four-leaf clover brings good luck."
  },
  "flyers-magazine": {
    "category": "school",
    "definition": "a thin book with stories and pictures, published often",
    "definitionVi": "tạp chí",
    "hint": "You can read a magazine about animals or sport.",
    "fact": "New magazines come out every week or every month."
  },
  "flyers-make-sure": {
    "category": "school",
    "definition": "to check that something is definitely true or done",
    "definitionVi": "đảm bảo, chắc chắn",
    "hint": "Make sure you have your bag before you leave.",
    "fact": "'Make sure' helps you avoid making silly mistakes."
  },
  "flyers-manager": {
    "category": "jobs",
    "definition": "a person who is in charge of a business or team",
    "definitionVi": "người quản lý",
    "hint": "A shop manager makes sure everything runs smoothly.",
    "fact": "A football team also has a manager who plans their games."
  },
  "flyers-married": {
    "category": "people",
    "definition": "joined to someone as husband and wife",
    "definitionVi": "đã kết hôn",
    "hint": "Married people often wear a ring on their finger.",
    "fact": "A wedding is the special day when two people get married."
  },
  "flyers-match-football": {
    "category": "sports",
    "definition": "a game of football played between two teams",
    "definitionVi": "trận đấu bóng đá",
    "hint": "Two teams play against each other in a football match.",
    "fact": "A football match usually lasts ninety minutes."
  },
  "flyers-maths": {
    "category": "school",
    "definition": "the school subject about numbers and shapes",
    "definitionVi": "môn toán",
    "hint": "In maths, you learn to add, subtract, and count.",
    "fact": "'Maths' is short for 'mathematics'."
  },
  "flyers-may": {
    "category": "general",
    "definition": "used to ask for or give permission",
    "definitionVi": "có thể (xin phép)",
    "hint": "Say 'May I go, please?' to ask politely.",
    "fact": "'May' is a polite word for asking permission."
  },
  "flyers-meal": {
    "category": "food",
    "definition": "the food eaten at a certain time, like lunch",
    "definitionVi": "bữa ăn",
    "hint": "Breakfast, lunch, and dinner are all meals.",
    "fact": "Many families enjoy eating a meal together."
  },
  "flyers-mechanic": {
    "category": "jobs",
    "definition": "a person who repairs machines, especially cars",
    "definitionVi": "thợ máy",
    "hint": "A mechanic fixes cars when they stop working.",
    "fact": "Mechanics use special tools to find and fix problems."
  },
  "flyers-medicine": {
    "category": "health",
    "definition": "something you take to help you feel better when ill",
    "definitionVi": "thuốc",
    "hint": "A doctor tells you what medicine to take when you are sick.",
    "fact": "Some medicine comes as a tablet, and some as a liquid."
  },
  "flyers-meet": {
    "category": "people",
    "definition": "to come together with someone",
    "definitionVi": "gặp gỡ",
    "hint": "Say 'nice to meet you' when you meet someone new.",
    "fact": "You might meet a new friend on your first day of school."
  },
  "flyers-meeting": {
    "category": "jobs",
    "definition": "when people come together to talk about something",
    "definitionVi": "cuộc họp",
    "hint": "Grown-ups often have a meeting at work to make plans.",
    "fact": "Meetings help people share ideas and make decisions together."
  },
  "flyers-member": {
    "category": "school",
    "definition": "a person who belongs to a group or club",
    "definitionVi": "thành viên",
    "hint": "Every member of the club gets a special badge.",
    "fact": "You become a member when you officially join a group."
  },
  "flyers-metal": {
    "category": "general",
    "definition": "made from a hard, shiny material like iron or gold",
    "definitionVi": "bằng kim loại",
    "hint": "A metal spoon feels cold and hard.",
    "fact": "Metal can be melted and shaped into many different things."
  },
  "flyers-midday": {
    "category": "time",
    "definition": "twelve o'clock in the middle of the day",
    "definitionVi": "giữa trưa, 12 giờ trưa",
    "hint": "The sun is highest in the sky at midday.",
    "fact": "Midday is also called 'noon'."
  },
  "flyers-middle": {
    "category": "places",
    "definition": "the point in the centre of something",
    "definitionVi": "chính giữa",
    "hint": "Sit in the middle of the row to see the whole board.",
    "fact": "Wednesday is right in the middle of the school week."
  },
  "flyers-midnight": {
    "category": "time",
    "definition": "twelve o'clock in the middle of the night",
    "definitionVi": "nửa đêm, 12 giờ đêm",
    "hint": "Some people stay up until midnight on New Year's Eve.",
    "fact": "Midnight is the very start of a brand new day."
  },
  "flyers-might": {
    "category": "general",
    "definition": "used to say something is possibly true or could happen",
    "definitionVi": "có thể (không chắc chắn)",
    "hint": "Say 'it might rain' when you are not sure about the weather.",
    "fact": "'Might' shows less certainty than 'will'."
  },
  "flyers-million": {
    "category": "school",
    "definition": "the number 1,000,000",
    "definitionVi": "một triệu",
    "hint": "A million is a thousand thousands.",
    "fact": "If you counted to a million, it would take many days!"
  },
  "flyers-mind": {
    "category": "feelings",
    "definition": "to feel bothered or upset by something",
    "definitionVi": "phiền lòng, để ý",
    "hint": "Ask 'Do you mind if I sit here?' to be polite.",
    "fact": "'I don't mind' means you are happy either way."
  },
  "flyers-minute": {
    "category": "time",
    "definition": "a unit of time equal to sixty seconds",
    "definitionVi": "phút",
    "hint": "There are sixty minutes in one hour.",
    "fact": "It only takes a minute to brush your teeth!"
  },
  "flyers-missing": {
    "category": "school",
    "definition": "not in the place where it should be",
    "definitionVi": "bị mất, bị thiếu",
    "hint": "Look under the bed for your missing sock.",
    "fact": "Posters sometimes ask for help finding a missing pet."
  },
  "flyers-mix": {
    "category": "food",
    "definition": "to combine different things together",
    "definitionVi": "trộn",
    "hint": "Mix blue and yellow paint to make green.",
    "fact": "You mix flour, eggs, and sugar to make a cake."
  },
  "flyers-money": {
    "category": "general",
    "definition": "coins and notes used to buy things",
    "definitionVi": "tiền",
    "hint": "You need money to buy things at a shop.",
    "fact": "Money can be coins, paper notes, or even numbers on a card."
  },
  "flyers-month": {
    "category": "time",
    "definition": "one of the twelve parts of a year",
    "definitionVi": "tháng",
    "hint": "There are twelve months in a year.",
    "fact": "February is the shortest month of the year."
  },
  "flyers-motorway": {
    "category": "travel",
    "definition": "a wide road for cars to travel fast between cities",
    "definitionVi": "đường cao tốc",
    "hint": "Cars drive fast on a motorway between towns.",
    "fact": "Motorways usually have several lanes for traffic."
  },
  "flyers-much": {
    "category": "school",
    "definition": "used to ask about or describe a large amount",
    "definitionVi": "nhiều",
    "hint": "Ask 'How much does it cost?' when shopping.",
    "fact": "'Much' is usually used with things you cannot count, like water."
  },
  "flyers-museum": {
    "category": "places",
    "definition": "a building where old and interesting objects are shown",
    "definitionVi": "bảo tàng",
    "hint": "You can see dinosaur bones in a museum.",
    "fact": "Some museums keep objects that are thousands of years old."
  },
  "flyers-necklace": {
    "category": "clothes",
    "definition": "a piece of jewellery worn around the neck",
    "definitionVi": "vòng cổ, dây chuyền",
    "hint": "A necklace can be made of beads, gold, or shells.",
    "fact": "People have worn necklaces for thousands of years."
  },
  "flyers-nest": {
    "category": "animals",
    "definition": "a place birds build to lay their eggs",
    "definitionVi": "tổ chim",
    "hint": "Birds build a nest from twigs and leaves.",
    "fact": "Some birds build a new nest every single year."
  },
  "flyers-news": {
    "category": "technology",
    "definition": "information about things that have just happened",
    "definitionVi": "tin tức",
    "hint": "Grown-ups often watch the news in the evening.",
    "fact": "News can come from TV, newspapers, radio, or the internet."
  },
  "flyers-newspaper": {
    "category": "technology",
    "definition": "printed sheets of paper with news stories",
    "definitionVi": "báo giấy",
    "hint": "A newspaper is printed with new stories every day.",
    "fact": "Newspapers have been telling people the news for hundreds of years."
  },
  "flyers-next": {
    "category": "time",
    "definition": "coming immediately after this one",
    "definitionVi": "tiếp theo, kế tiếp",
    "hint": "What is the next lesson after break time?",
    "fact": "'Next' tells you what comes right after something."
  },
  "flyers-noisy": {
    "category": "general",
    "definition": "making a lot of loud sound",
    "definitionVi": "ồn ào",
    "hint": "The playground is very noisy at break time.",
    "fact": "'Noisy' is the opposite of 'quiet'."
  },
  "flyers-north": {
    "category": "places",
    "definition": "the direction to your left when facing the sunrise",
    "definitionVi": "hướng bắc",
    "hint": "A compass needle always points to the north.",
    "fact": "The North Pole is the coldest place at the very top of the Earth."
  },
  "flyers-nowhere": {
    "category": "places",
    "definition": "not in, at, or to any place",
    "definitionVi": "không nơi nào",
    "hint": "Say 'there's nowhere to sit' when every seat is taken.",
    "fact": "'Nowhere' means the total opposite of 'everywhere'."
  },
  "flyers-ocean": {
    "category": "nature",
    "definition": "a huge area of salty sea water",
    "definitionVi": "đại dương",
    "hint": "The Pacific Ocean is the biggest ocean on Earth.",
    "fact": "Oceans cover more than two-thirds of our planet."
  },
  "flyers-octopus": {
    "category": "animals",
    "definition": "a sea animal with eight long arms",
    "definitionVi": "con bạch tuộc",
    "hint": "An octopus can change colour to hide from danger.",
    "fact": "An octopus has three hearts and blue blood!"
  },
  "flyers-of-course": {
    "category": "general",
    "definition": "used to say yes in a strong, friendly way",
    "definitionVi": "tất nhiên rồi",
    "hint": "Say 'of course!' when the answer is clearly yes.",
    "fact": "'Of course' shows you are very happy to agree."
  },
  "flyers-office": {
    "category": "jobs",
    "definition": "a room or building where people do desk work",
    "definitionVi": "văn phòng",
    "hint": "Many grown-ups work at a desk in an office.",
    "fact": "An office often has desks, computers, and telephones."
  },
  "flyers-olives": {
    "category": "food",
    "definition": "small green or black fruits used in cooking",
    "definitionVi": "quả ô liu",
    "hint": "Olives grow on trees in warm countries.",
    "fact": "Oil made from olives is called olive oil."
  },
  "flyers-once": {
    "category": "time",
    "definition": "one time, or at some time in the past",
    "definitionVi": "một lần, đã từng",
    "hint": "Say 'once upon a time' to start a fairy tale.",
    "fact": "'Once' can mean 'one time' or 'in the past'."
  },
  "flyers-online": {
    "category": "technology",
    "definition": "connected to the internet",
    "definitionVi": "trực tuyến",
    "hint": "You can read books or play games online.",
    "fact": "Being online means your device is connected to the internet."
  },
  "flyers-oven": {
    "category": "home",
    "definition": "an enclosed space used to bake or roast food",
    "definitionVi": "lò nướng",
    "hint": "We bake a cake in a hot oven.",
    "fact": "Ovens can be part of a cooker or a separate machine."
  },
  "flyers-over": {
    "category": "general",
    "definition": "above something, or finished",
    "definitionVi": "phía trên, kết thúc",
    "hint": "Say 'the film is over' when it has finished.",
    "fact": "'Over' can mean above, across, or finished."
  },
  "flyers-p-m-pajamas": {
    "category": "clothes",
    "definition": "soft, comfortable clothes worn for sleeping",
    "definitionVi": "đồ ngủ, bộ pyjama",
    "hint": "You put on pajamas before you go to bed.",
    "fact": "'Pajamas' is the American spelling of 'pyjamas'."
  },
  "flyers-passenger": {
    "category": "travel",
    "definition": "a person travelling in a car, bus, plane, or train",
    "definitionVi": "hành khách",
    "hint": "A passenger does not drive the vehicle.",
    "fact": "Big planes can carry hundreds of passengers at once."
  },
  "flyers-past": {
    "category": "time",
    "definition": "the time before now",
    "definitionVi": "quá khứ",
    "hint": "History lessons teach us about the past.",
    "fact": "'Past' is the opposite of 'future'."
  },
  "flyers-path": {
    "category": "places",
    "definition": "a narrow track for people to walk along",
    "definitionVi": "con đường mòn, lối đi",
    "hint": "Follow the path through the park to the lake.",
    "fact": "Paths in a forest are often made just by people walking."
  },
  "flyers-pepper": {
    "category": "food",
    "definition": "a spice or vegetable used to add flavour to food",
    "definitionVi": "hạt tiêu / quả ớt chuông",
    "hint": "A little pepper adds a strong flavour to soup.",
    "fact": "Black pepper comes from small dried berries."
  },
  "flyers-perhaps": {
    "category": "general",
    "definition": "possibly, maybe",
    "definitionVi": "có lẽ",
    "hint": "Say 'perhaps' when you are not completely sure.",
    "fact": "'Perhaps' and 'maybe' mean almost the same thing."
  },
  "flyers-photographer": {
    "category": "jobs",
    "definition": "a person whose job is taking photographs",
    "definitionVi": "nhiếp ảnh gia",
    "hint": "A photographer uses a camera to capture special moments.",
    "fact": "Photographers can work at weddings, in nature, or for magazines."
  },
  "flyers-piece": {
    "category": "food",
    "definition": "a part of something bigger",
    "definitionVi": "miếng, mảnh",
    "hint": "Ask for a piece of cake, please.",
    "fact": "A puzzle is made of many small pieces."
  },
  "flyers-pilot": {
    "category": "jobs",
    "definition": "a person who flies a plane",
    "definitionVi": "phi công",
    "hint": "A pilot sits at the front of the plane to fly it.",
    "fact": "Pilots train for years before they can fly a passenger plane."
  },
  "flyers-pizza": {
    "category": "food",
    "definition": "a flat, round bread with cheese and toppings, baked",
    "definitionVi": "bánh pizza",
    "hint": "You can put many toppings, like cheese, on a pizza.",
    "fact": "Pizza first became popular in Naples, Italy."
  },
  "flyers-planet": {
    "category": "nature",
    "definition": "a huge round object in space that circles a star",
    "definitionVi": "hành tinh",
    "hint": "Earth is the planet we live on.",
    "fact": "There are eight planets in our solar system."
  },
  "flyers-plastic": {
    "category": "general",
    "definition": "made of a light, man-made material",
    "definitionVi": "làm bằng nhựa",
    "hint": "A plastic cup is light and does not break easily.",
    "fact": "Plastic can take hundreds of years to break down."
  },
  "flyers-platform": {
    "category": "travel",
    "definition": "the raised area where you wait for a train",
    "definitionVi": "sân ga",
    "hint": "Wait behind the yellow line on the platform.",
    "fact": "Big train stations can have many different platforms."
  },
  "flyers-pleased": {
    "category": "feelings",
    "definition": "feeling happy and satisfied about something",
    "definitionVi": "hài lòng, vui vẻ",
    "hint": "Say 'pleased to meet you' when you meet someone new.",
    "fact": "'Pleased' is a polite way of saying you are happy."
  },
  "flyers-pocket": {
    "category": "clothes",
    "definition": "a small bag sewn into clothes to hold things",
    "definitionVi": "túi quần/áo",
    "hint": "You can keep small things, like keys, in your pocket.",
    "fact": "Some clothes have several pockets for different things."
  },
  "flyers-police-officer": {
    "category": "jobs",
    "definition": "a person whose job is to keep people safe from crime",
    "definitionVi": "cảnh sát",
    "hint": "A police officer wears a special uniform.",
    "fact": "Police officers help people who are lost or in danger too."
  },
  "flyers-police-station": {
    "category": "places",
    "definition": "a building where police officers work",
    "definitionVi": "đồn công an",
    "hint": "You can report a problem at the police station.",
    "fact": "Police officers start and end their working day at the station."
  },
  "flyers-pond": {
    "category": "nature",
    "definition": "a small area of still water, smaller than a lake",
    "definitionVi": "cái ao",
    "hint": "Ducks often swim on a pond in the park.",
    "fact": "A pond is much smaller than a lake or the sea."
  },
  "flyers-poor": {
    "category": "feelings",
    "definition": "having very little money, or deserving sympathy",
    "definitionVi": "nghèo, tội nghiệp",
    "hint": "Say 'poor dog' when an animal looks sad or hurt.",
    "fact": "'Poor' is the opposite of 'rich'."
  },
  "flyers-pop-music": {
    "category": "general",
    "definition": "popular modern music with a catchy tune",
    "definitionVi": "nhạc pop",
    "hint": "Pop music is often played on the radio.",
    "fact": "'Pop' is short for 'popular'."
  },
  "flyers-popular": {
    "category": "feelings",
    "definition": "liked by a lot of people",
    "definitionVi": "phổ biến, được yêu thích",
    "hint": "Football is a very popular sport around the world.",
    "fact": "A popular song is one that many people enjoy listening to."
  },
  "flyers-post": {
    "category": "general",
    "definition": "to send a letter or parcel by mail",
    "definitionVi": "gửi thư, gửi bưu kiện",
    "hint": "Put a stamp on the letter before you post it.",
    "fact": "You can also 'post' a message online to share with others."
  },
  "flyers-post-office": {
    "category": "places",
    "definition": "a place where you send letters and parcels",
    "definitionVi": "bưu điện",
    "hint": "Buy stamps at the post office before you post a letter.",
    "fact": "The post office also sells boxes for sending parcels."
  },
  "flyers-postcard": {
    "category": "travel",
    "definition": "a card with a picture, sent by post without an envelope",
    "definitionVi": "bưu thiếp",
    "hint": "People send a postcard to friends while on holiday.",
    "fact": "Postcards usually have a photo of a place on the front."
  },
  "flyers-prefer": {
    "category": "feelings",
    "definition": "to like one thing more than another",
    "definitionVi": "thích hơn",
    "hint": "Say 'I prefer apples to bananas' to show what you like more.",
    "fact": "Everyone has different things they prefer to eat or do."
  },
  "flyers-prepare": {
    "category": "school",
    "definition": "to get ready for something",
    "definitionVi": "chuẩn bị",
    "hint": "Prepare your bag the night before school.",
    "fact": "Chefs prepare food carefully before they cook it."
  },
  "flyers-prize": {
    "category": "school",
    "definition": "something you win for doing well in a contest",
    "definitionVi": "phần thưởng",
    "hint": "The winner of the race gets a prize.",
    "fact": "A prize can be a medal, a trophy, or even money."
  },
  "flyers-problem": {
    "category": "school",
    "definition": "something difficult that needs to be solved",
    "definitionVi": "vấn đề",
    "hint": "Tell a grown-up if you have a problem you cannot solve.",
    "fact": "Maths problems become easier the more you practise."
  },
  "flyers-programme": {
    "category": "technology",
    "definition": "a show on TV or radio",
    "definitionVi": "chương trình (TV, đài)",
    "hint": "What is your favourite TV programme?",
    "fact": "'Programme' can also mean a plan for an event."
  },
  "flyers-project": {
    "category": "school",
    "definition": "a piece of work you plan and research over time",
    "definitionVi": "dự án, bài tập lớn",
    "hint": "You might make a poster for a school project.",
    "fact": "Projects often let you choose a topic you find interesting."
  },
  "flyers-pull": {
    "category": "general",
    "definition": "to move something towards you",
    "definitionVi": "kéo",
    "hint": "Pull the door open instead of pushing it.",
    "fact": "'Pull' is the opposite of 'push'."
  },
  "flyers-push": {
    "category": "general",
    "definition": "to move something away from you using force",
    "definitionVi": "đẩy",
    "hint": "Push the swing to make it go higher.",
    "fact": "'Push' is the opposite of 'pull'."
  },
  "flyers-puzzle": {
    "category": "general",
    "definition": "a game or toy that makes you think to solve it",
    "definitionVi": "trò chơi xếp hình, câu đố",
    "hint": "Fit all the pieces together to finish a puzzle.",
    "fact": "A jigsaw puzzle can have hundreds of small pieces."
  },
  "flyers-pyjamas": {
    "category": "clothes",
    "definition": "soft, comfortable clothes worn for sleeping",
    "definitionVi": "bộ đồ ngủ",
    "hint": "You put on pyjamas before you get into bed.",
    "fact": "Pyjamas usually have a top and matching trousers."
  },
  "flyers-pyramid": {
    "category": "places",
    "definition": "a large stone shape with a square base and pointed top",
    "definitionVi": "kim tự tháp",
    "hint": "The pyramids in Egypt are thousands of years old.",
    "fact": "The Great Pyramid of Giza was built for an ancient king."
  },
  "flyers-quarter": {
    "category": "school",
    "definition": "one of four equal parts of something",
    "definitionVi": "một phần tư",
    "hint": "Cut the pizza into a quarter for each friend.",
    "fact": "'Quarter past' means fifteen minutes after the hour."
  },
  "flyers-queen": {
    "category": "people",
    "definition": "a woman who rules a country, or a king's wife",
    "definitionVi": "nữ hoàng",
    "hint": "A queen often wears a crown like a king does.",
    "fact": "Some countries still have a queen who is part of the royal family."
  },
  "flyers-quite": {
    "category": "general",
    "definition": "fairly, but not extremely",
    "definitionVi": "khá là",
    "hint": "Say 'quite tired' to mean fairly tired, not very tired.",
    "fact": "'Quite' can make a word a little stronger or weaker."
  },
  "flyers-quiz": {
    "category": "school",
    "definition": "a short test or game with questions",
    "definitionVi": "bài kiểm tra ngắn, trò chơi đố vui",
    "hint": "You answer questions quickly in a quiz.",
    "fact": "Quizzes are a fun way to check what you have learned."
  },
  "flyers-race": {
    "category": "sports",
    "definition": "a competition to see who is fastest",
    "definitionVi": "cuộc đua",
    "hint": "Runners line up at the start of a race.",
    "fact": "In a race, the winner crosses the finish line first."
  },
  "flyers-bike": {
    "category": "sports",
    "definition": "connected with fast competitions, like a racing car",
    "definitionVi": "thuộc về đua xe, tốc độ",
    "hint": "A racing car is built to go extremely fast.",
    "fact": "Racing bikes are made very light so riders can go faster."
  },
  "flyers-railway": {
    "category": "travel",
    "definition": "the metal tracks that trains travel along",
    "definitionVi": "đường sắt",
    "hint": "Trains travel along a railway to different towns.",
    "fact": "The first railways were built about 200 years ago."
  },
  "flyers-ready": {
    "category": "school",
    "definition": "prepared and able to do something",
    "definitionVi": "sẵn sàng",
    "hint": "Say 'I'm ready!' when you have everything you need.",
    "fact": "Being ready early means you never have to rush."
  },
  "flyers-remember": {
    "category": "school",
    "definition": "to keep something in your mind and not forget it",
    "definitionVi": "nhớ",
    "hint": "Try to remember your homework every day.",
    "fact": "'Remember' is the opposite of 'forget'."
  },
  "flyers-repair": {
    "category": "technology",
    "definition": "to fix something that is broken",
    "definitionVi": "sửa chữa",
    "hint": "A mechanic can repair a broken bicycle.",
    "fact": "'Repair' and 'fix' mean the same thing."
  },
  "flyers-repeat": {
    "category": "school",
    "definition": "to say or do something again",
    "definitionVi": "lặp lại",
    "hint": "Ask 'Can you repeat that, please?' if you did not hear.",
    "fact": "Repeating new words helps you remember them better."
  },
  "flyers-restaurant": {
    "category": "places",
    "definition": "a place where people pay to eat a meal",
    "definitionVi": "nhà hàng",
    "hint": "You order food from a menu at a restaurant.",
    "fact": "Restaurants can serve food from countries all around the world."
  },
  "flyers-rich": {
    "category": "feelings",
    "definition": "having a lot of money",
    "definitionVi": "giàu có",
    "hint": "'Rich' is the opposite of 'poor'.",
    "fact": "Being rich in friends and family is important too!"
  },
  "flyers-ring": {
    "category": "clothes",
    "definition": "a piece of jewellery worn on a finger",
    "definitionVi": "chiếc nhẫn",
    "hint": "A ring can be made of gold, silver, or plastic.",
    "fact": "People often wear a special ring when they get married."
  },
  "flyers-rock-music": {
    "category": "general",
    "definition": "loud music with electric guitars and strong drums",
    "definitionVi": "nhạc rock",
    "hint": "Rock music often has a strong, fast beat.",
    "fact": "Rock music became very popular around the 1950s and 1960s."
  },
  "flyers-rocket": {
    "category": "technology",
    "definition": "a vehicle that flies fast into space",
    "definitionVi": "tên lửa",
    "hint": "A rocket blasts off with fire and smoke.",
    "fact": "Rockets have to travel very fast to escape Earth's gravity."
  },
  "flyers-rucksack": {
    "category": "school",
    "definition": "a bag carried on your back",
    "definitionVi": "ba lô",
    "hint": "You carry a rucksack when you go hiking or to school.",
    "fact": "'Rucksack' and 'backpack' mean almost the same thing."
  },
  "flyers-salt": {
    "category": "food",
    "definition": "a white food used to add flavour",
    "definitionVi": "muối",
    "hint": "A little salt makes food taste better.",
    "fact": "The sea contains a huge amount of natural salt."
  },
  "flyers-same": {
    "category": "school",
    "definition": "not different, exactly alike",
    "definitionVi": "giống nhau",
    "hint": "Twins can wear the same clothes.",
    "fact": "'Same' is the opposite of 'different'."
  },
  "flyers-save": {
    "category": "general",
    "definition": "to keep something safe, or to keep money",
    "definitionVi": "tiết kiệm, cứu",
    "hint": "Save your coins in a piggy bank.",
    "fact": "'Save' can mean to keep money or to rescue someone."
  },
  "flyers-science": {
    "category": "school",
    "definition": "the school subject about how the world works",
    "definitionVi": "môn khoa học",
    "hint": "In science, you might do experiments with water or plants.",
    "fact": "Science helps us understand animals, space, and the human body."
  },
  "flyers-scissors": {
    "category": "school",
    "definition": "a tool with two blades for cutting paper",
    "definitionVi": "cái kéo",
    "hint": "Use scissors carefully to cut along the line.",
    "fact": "Scissors have two blades joined together in the middle."
  },
  "flyers-screen": {
    "category": "technology",
    "definition": "the flat surface of a TV, phone, or computer that shows pictures",
    "definitionVi": "màn hình",
    "hint": "You watch videos on a phone or TV screen.",
    "fact": "Screens can show words, pictures, games, and videos."
  },
  "flyers-search": {
    "category": "technology",
    "definition": "the act of trying to find something",
    "definitionVi": "sự tìm kiếm",
    "hint": "Do an online search to find the answer to a question.",
    "fact": "You can search the internet using just a few words."
  },
  "flyers-secret": {
    "category": "feelings",
    "definition": "something known only to a few people, kept hidden",
    "definitionVi": "bí mật",
    "hint": "Whisper a secret so only your friend can hear.",
    "fact": "Everyone loves a good secret, especially about a surprise party!"
  },
  "flyers-sell": {
    "category": "general",
    "definition": "to give something to someone who pays for it",
    "definitionVi": "bán",
    "hint": "Shops sell food, clothes, and toys.",
    "fact": "'Sell' is the opposite of 'buy'."
  },
  "flyers-several": {
    "category": "school",
    "definition": "more than two, but not a huge number",
    "definitionVi": "vài, một số",
    "hint": "Say 'several times' to mean more than two or three times.",
    "fact": "'Several' is more than 'a few' but less than 'many'."
  },
  "flyers-shampoo": {
    "category": "home",
    "definition": "a soapy liquid used to wash your hair",
    "definitionVi": "dầu gội đầu",
    "hint": "You use shampoo when you wash your hair in the shower.",
    "fact": "Shampoo makes lots of bubbles when you rub it into wet hair."
  },
  "flyers-shelf": {
    "category": "home",
    "definition": "a flat board used to store or display things",
    "definitionVi": "cái kệ",
    "hint": "Put your books back on the shelf when you finish.",
    "fact": "A bookcase is made of several shelves joined together."
  },
  "flyers-should": {
    "category": "general",
    "definition": "used to give or ask for advice",
    "definitionVi": "nên",
    "hint": "Say 'you should wear a coat' when it's cold outside.",
    "fact": "'Should' is a gentle way to give someone advice."
  },
  "flyers-silver": {
    "category": "general",
    "definition": "having the colour of the shiny grey metal silver",
    "definitionVi": "màu bạc",
    "hint": "The second-place winner often gets a silver medal.",
    "fact": "Silver is a shiny metal often used to make jewellery."
  },
  "flyers-singer": {
    "category": "jobs",
    "definition": "a person whose job is to sing",
    "definitionVi": "ca sĩ",
    "hint": "A singer often performs songs on a stage.",
    "fact": "Some singers write their own songs, too."
  },
  "flyers-ski": {
    "category": "sports",
    "definition": "a long, flat board used to slide over snow",
    "definitionVi": "ván trượt tuyết",
    "hint": "You wear a ski on each foot to glide over the snow.",
    "fact": "People have used skis to travel over snow for thousands of years."
  },
  "flyers-sledge": {
    "category": "sports",
    "definition": "a vehicle used to slide over snow, often for fun",
    "definitionVi": "xe trượt tuyết",
    "hint": "Children love to ride a sledge down a snowy hill.",
    "fact": "A sledge has no wheels — it slides on the snow."
  },
  "flyers-smell": {
    "category": "body",
    "definition": "something you notice with your nose",
    "definitionVi": "mùi",
    "hint": "Fresh bread has a lovely smell.",
    "fact": "Dogs can smell things far better than humans can."
  },
  "flyers-snack": {
    "category": "food",
    "definition": "a small amount of food eaten between meals",
    "definitionVi": "đồ ăn nhẹ",
    "hint": "Fruit makes a healthy snack between meals.",
    "fact": "A snack is smaller than a full meal."
  },
  "flyers-snowball": {
    "category": "weather",
    "definition": "a ball made by pressing snow together",
    "definitionVi": "quả cầu tuyết",
    "hint": "Roll the snow in your hands to make a snowball.",
    "fact": "Snowballs are perfect for a friendly snowball fight."
  },
  "flyers-snowboard": {
    "category": "sports",
    "definition": "a board used to slide down snowy hills standing up",
    "definitionVi": "ván trượt tuyết (đứng)",
    "hint": "You stand sideways on a snowboard as you slide down.",
    "fact": "Snowboarding became an Olympic sport in 1998."
  },
  "flyers-snowboarding": {
    "category": "sports",
    "definition": "the sport of sliding down snow on a snowboard",
    "definitionVi": "môn trượt ván tuyết",
    "hint": "You need a snowy mountain to go snowboarding.",
    "fact": "Snowboarding is a fun winter sport enjoyed all over the world."
  },
  "flyers-snowman": {
    "category": "weather",
    "definition": "a figure of a person made from packed snow",
    "definitionVi": "người tuyết",
    "hint": "You can build a snowman with a carrot for a nose.",
    "fact": "A snowman melts away once the weather gets warmer."
  },
  "flyers-so": {
    "category": "general",
    "definition": "to a great degree, or as a result",
    "definitionVi": "vì vậy, quá",
    "hint": "Say 'so happy' to mean very happy.",
    "fact": "'So' can join two ideas or make a word stronger."
  },
  "flyers-soap": {
    "category": "health",
    "definition": "a substance used with water to clean your skin",
    "definitionVi": "xà phòng",
    "hint": "Wash your hands with soap and water before you eat.",
    "fact": "Soap makes bubbles that help wash dirt and germs away."
  },
  "flyers-soft": {
    "category": "general",
    "definition": "gentle to touch, not hard or rough",
    "definitionVi": "mềm",
    "hint": "A pillow feels soft when you rest your head on it.",
    "fact": "'Soft' is the opposite of 'hard'."
  },
  "flyers-somewhere": {
    "category": "places",
    "definition": "in, at, or to a place, not stated exactly",
    "definitionVi": "một nơi nào đó",
    "hint": "Say 'let's go somewhere fun' when you haven't decided yet.",
    "fact": "'Somewhere' means a place, but you don't say exactly where."
  },
  "flyers-soon": {
    "category": "time",
    "definition": "in a short time from now",
    "definitionVi": "sớm thôi, chẳng bao lâu nữa",
    "hint": "Say 'see you soon' when you will meet again shortly.",
    "fact": "'Soon' means something will happen before too long."
  },
  "flyers-sore": {
    "category": "health",
    "definition": "painful, especially when touched",
    "definitionVi": "đau, nhức",
    "hint": "A sore throat can make it hurt to swallow.",
    "fact": "Resting a sore muscle helps it feel better."
  },
  "flyers-sound": {
    "category": "general",
    "definition": "something you can hear",
    "definitionVi": "âm thanh",
    "hint": "Music, voices, and thunder are all kinds of sound.",
    "fact": "Sound travels through the air as invisible waves."
  },
  "flyers-south": {
    "category": "places",
    "definition": "the direction opposite to north",
    "definitionVi": "hướng nam",
    "hint": "Birds fly south to find warmer weather in winter.",
    "fact": "The South Pole is at the very bottom of the Earth."
  },
  "flyers-space": {
    "category": "nature",
    "definition": "the huge area beyond Earth's sky with stars and planets",
    "definitionVi": "không gian vũ trụ",
    "hint": "Astronauts travel to space in a rocket.",
    "fact": "There is no air to breathe in space."
  },
  "flyers-spaceship": {
    "category": "technology",
    "definition": "a vehicle that travels through space",
    "definitionVi": "tàu vũ trụ",
    "hint": "A spaceship carries astronauts to the Moon or beyond.",
    "fact": "Some spaceships have carried astronauts all the way to the Moon."
  },
  "flyers-speak": {
    "category": "school",
    "definition": "to say words out loud",
    "definitionVi": "nói",
    "hint": "Speak clearly so everyone can understand you.",
    "fact": "You can speak more than one language if you practise."
  },
  "flyers-special": {
    "category": "feelings",
    "definition": "different and better than usual, important",
    "definitionVi": "đặc biệt",
    "hint": "Your birthday is a special day just for you.",
    "fact": "Special days, like festivals, are often full of celebration."
  },
  "flyers-spend": {
    "category": "general",
    "definition": "to use money to buy something, or to use time doing something",
    "definitionVi": "tiêu (tiền), dành (thời gian)",
    "hint": "Don't spend all your pocket money at once.",
    "fact": "You can spend money or spend time — both use the same word."
  },
  "flyers-spoon": {
    "category": "food",
    "definition": "a tool with a small bowl shape, used for eating",
    "definitionVi": "cái thìa",
    "hint": "You eat soup with a spoon.",
    "fact": "A spoon, fork, and knife are the main tools used at meals."
  },
  "flyers-spot": {
    "category": "animals",
    "definition": "a small, round, coloured mark",
    "definitionVi": "đốm, chấm",
    "hint": "A ladybird has black spots on its red back.",
    "fact": "Leopards and giraffes both have spots on their fur."
  },
  "flyers-spotted": {
    "category": "animals",
    "definition": "covered with small, round marks",
    "definitionVi": "có đốm",
    "hint": "A spotted dog has small marks all over its fur.",
    "fact": "Dalmatian dogs are famous for being spotted."
  },
  "flyers-spring": {
    "category": "weather",
    "definition": "the season between winter and summer when flowers grow",
    "definitionVi": "mùa xuân",
    "hint": "Flowers and baby animals appear in spring.",
    "fact": "Spring is when many plants start to grow again after winter."
  },
  "flyers-stadium": {
    "category": "places",
    "definition": "a large building with seats for watching sports",
    "definitionVi": "sân vận động",
    "hint": "Thousands of fans watch a match at a stadium.",
    "fact": "Some stadiums can hold more than one hundred thousand people."
  },
  "flyers-stage-theatre": {
    "category": "places",
    "definition": "the raised area where actors perform",
    "definitionVi": "sân khấu",
    "hint": "Actors stand on the stage so the audience can see them.",
    "fact": "Bright lights help everyone see the actors on the stage."
  },
  "flyers-stamp": {
    "category": "general",
    "definition": "a small sticker you put on post to pay for sending it",
    "definitionVi": "tem thư",
    "hint": "Stick a stamp on the envelope before you post a letter.",
    "fact": "Some people collect stamps from different countries as a hobby."
  },
  "flyers-stay": {
    "category": "travel",
    "definition": "to remain in a place and not leave",
    "definitionVi": "ở lại",
    "hint": "We will stay at a hotel during our holiday.",
    "fact": "'Stay' means you don't go anywhere else."
  },
  "flyers-step": {
    "category": "body",
    "definition": "a movement of the foot when walking, or a stair",
    "definitionVi": "bước chân, bậc thang",
    "hint": "Take a big step to jump over the puddle.",
    "fact": "Walking up stairs means climbing one step at a time."
  },
  "flyers-still": {
    "category": "time",
    "definition": "continuing to happen, up until now",
    "definitionVi": "vẫn còn",
    "hint": "Say 'I'm still hungry' if you want more food.",
    "fact": "'Still' can also mean staying without moving at all."
  },
  "flyers-stone": {
    "category": "nature",
    "definition": "a small hard piece of rock",
    "definitionVi": "hòn đá",
    "hint": "You can skim a flat stone across a lake.",
    "fact": "Ancient people used stone to make their first tools."
  },
  "flyers-storm": {
    "category": "weather",
    "definition": "very bad weather with strong wind, rain, or thunder",
    "definitionVi": "cơn bão",
    "hint": "Stay inside safely during a storm.",
    "fact": "A storm can bring loud thunder and bright lightning."
  },
  "flyers-straight-on": {
    "category": "places",
    "definition": "continuing forward without turning",
    "definitionVi": "đi thẳng",
    "hint": "Go straight on until you reach the shop.",
    "fact": "'Straight on' is a common direction people give when helping you."
  },
  "flyers-strange": {
    "category": "feelings",
    "definition": "unusual or difficult to explain",
    "definitionVi": "kỳ lạ",
    "hint": "It felt strange to see snow in summer.",
    "fact": "'Strange' and 'unusual' mean almost the same thing."
  },
  "flyers-strawberry": {
    "category": "food",
    "definition": "a small, red, sweet fruit",
    "definitionVi": "quả dâu tây",
    "hint": "Strawberries have tiny seeds on the outside.",
    "fact": "Strawberries are the only fruit with seeds on the outside."
  },
  "flyers-stream": {
    "category": "nature",
    "definition": "a small, narrow river",
    "definitionVi": "dòng suối",
    "hint": "Fish can swim in a small, clear stream.",
    "fact": "Many streams flow into bigger rivers."
  },
  "flyers-stripe": {
    "category": "clothes",
    "definition": "a long, narrow band of colour",
    "definitionVi": "sọc",
    "hint": "A zebra has black and white stripes.",
    "fact": "Every zebra has its own unique pattern of stripes."
  },
  "flyers-striped": {
    "category": "clothes",
    "definition": "having long, narrow bands of colour",
    "definitionVi": "có sọc",
    "hint": "A striped T-shirt has lines of different colours.",
    "fact": "Tigers have striped fur to help them hide in tall grass."
  },
  "flyers-student": {
    "category": "school",
    "definition": "a person who is learning at a school or college",
    "definitionVi": "học sinh, sinh viên",
    "hint": "Every student in the class has their own desk.",
    "fact": "Students learn new things every single day at school."
  },
  "flyers-study": {
    "category": "school",
    "definition": "to spend time learning about a subject",
    "definitionVi": "học tập",
    "hint": "Study a little every day before a big test.",
    "fact": "You study best in a quiet place with no distractions."
  },
  "flyers-subject": {
    "category": "school",
    "definition": "an area of knowledge taught at school, like maths",
    "definitionVi": "môn học",
    "hint": "What is your favourite subject at school?",
    "fact": "Schools usually teach many different subjects every week."
  },
  "flyers-suddenly": {
    "category": "general",
    "definition": "happening quickly, without warning",
    "definitionVi": "đột nhiên",
    "hint": "Suddenly, the rain started to pour down.",
    "fact": "'Suddenly' makes a story feel exciting and surprising."
  },
  "flyers-sugar": {
    "category": "food",
    "definition": "a sweet substance added to food and drinks",
    "definitionVi": "đường",
    "hint": "A little sugar makes tea taste sweeter.",
    "fact": "Sugar is made from plants like sugar cane or sugar beet."
  },
  "flyers-suitcase": {
    "category": "travel",
    "definition": "a case used to carry clothes when travelling",
    "definitionVi": "vali",
    "hint": "Pack your clothes in a suitcase before a holiday.",
    "fact": "Suitcases often have wheels so they are easy to pull."
  },
  "flyers-summer": {
    "category": "weather",
    "definition": "the warmest season of the year",
    "definitionVi": "mùa hè",
    "hint": "Children often swim outside during the summer.",
    "fact": "Summer has the longest days of sunlight in the year."
  },
  "flyers-sunglasses": {
    "category": "clothes",
    "definition": "dark glasses that protect your eyes from the sun",
    "definitionVi": "kính râm",
    "hint": "Wear sunglasses on a bright, sunny day.",
    "fact": "Sunglasses protect your eyes from strong sunlight."
  },
  "flyers-sure": {
    "category": "feelings",
    "definition": "certain, without any doubt",
    "definitionVi": "chắc chắn",
    "hint": "Say 'I'm sure' when you have no doubt at all.",
    "fact": "'Sure' shows you feel confident about something."
  },
  "flyers-surname": {
    "category": "people",
    "definition": "your family name, the last part of your name",
    "definitionVi": "họ (trong tên)",
    "hint": "Your surname is usually the same as your parents'.",
    "fact": "In many countries, your surname comes after your first name."
  },
  "flyers-surprise": {
    "category": "feelings",
    "definition": "something unexpected that happens",
    "definitionVi": "sự bất ngờ, ngạc nhiên",
    "hint": "A birthday party can be a lovely surprise.",
    "fact": "A good surprise can make your whole day feel special."
  },
  "flyers-swan": {
    "category": "animals",
    "definition": "a large white bird with a long neck that swims",
    "definitionVi": "con thiên nga",
    "hint": "A swan glides gracefully across the water.",
    "fact": "Swans usually stay with the same partner for their whole life."
  },
  "flyers-swing": {
    "category": "places",
    "definition": "a seat that hangs and moves back and forth",
    "definitionVi": "cái xích đu",
    "hint": "You sit on a swing and push with your legs to move.",
    "fact": "Playgrounds almost always have a swing to play on."
  },
  "flyers-taste": {
    "category": "food",
    "definition": "the flavour of food, or the sense used to notice it",
    "definitionVi": "vị, mùi vị",
    "hint": "Lemons have a sour taste.",
    "fact": "Your tongue can taste sweet, sour, salty, and bitter flavours."
  },
  "flyers-taxi": {
    "category": "travel",
    "definition": "a car you pay a driver to take you somewhere",
    "definitionVi": "xe taxi",
    "hint": "You can call a taxi to take you to the airport.",
    "fact": "In many cities, taxis are a special colour, like yellow."
  },
  "flyers-team": {
    "category": "sports",
    "definition": "a group of people who play or work together",
    "definitionVi": "đội, nhóm",
    "hint": "Everyone on the team wears the same colour shirt.",
    "fact": "Football, basketball, and volleyball are all team sports."
  },
  "flyers-telephone": {
    "category": "technology",
    "definition": "a machine used to talk to someone far away",
    "definitionVi": "điện thoại",
    "hint": "You use a telephone to call your friends and family.",
    "fact": "'Telephone' is often shortened to 'phone'."
  },
  "flyers-tent": {
    "category": "travel",
    "definition": "a shelter made of cloth, used for camping",
    "definitionVi": "lều trại",
    "hint": "You sleep in a tent when you go camping.",
    "fact": "A tent can be put up and taken down quickly."
  },
  "flyers-thank": {
    "category": "people",
    "definition": "to tell someone you are grateful",
    "definitionVi": "cảm ơn",
    "hint": "Always thank someone who gives you a gift.",
    "fact": "Saying 'thank you' is a simple way to be polite."
  },
  "flyers-theatre": {
    "category": "places",
    "definition": "a building where plays and shows are performed",
    "definitionVi": "nhà hát",
    "hint": "You watch actors perform live on stage at a theatre.",
    "fact": "The oldest theatres were built by the ancient Greeks."
  },
  "flyers-thousand": {
    "category": "school",
    "definition": "the number 1,000",
    "definitionVi": "một nghìn",
    "hint": "A thousand is ten times a hundred.",
    "fact": "It would take about seventeen minutes to count to a thousand."
  },
  "flyers-tidy": {
    "category": "home",
    "definition": "neat, with everything in its proper place",
    "definitionVi": "gọn gàng",
    "hint": "Keep your room tidy by putting toys away.",
    "fact": "'Tidy' is the opposite of 'messy' or 'untidy'."
  },
  "flyers-time": {
    "category": "time",
    "definition": "the thing we measure using clocks and calendars",
    "definitionVi": "thời gian",
    "hint": "Look at a clock to check the time.",
    "fact": "Time is measured in seconds, minutes, hours, days, and years."
  },
  "flyers-timetable": {
    "category": "school",
    "definition": "a chart that shows when things happen",
    "definitionVi": "thời khóa biểu",
    "hint": "Check your timetable to see your next lesson.",
    "fact": "Buses and trains also have a timetable showing arrival times."
  },
  "flyers-toe": {
    "category": "body",
    "definition": "one of the five parts at the end of your foot",
    "definitionVi": "ngón chân",
    "hint": "You have five toes on each foot.",
    "fact": "Your big toe helps you balance when you walk."
  },
  "flyers-together": {
    "category": "people",
    "definition": "with each other, in the same place or time",
    "definitionVi": "cùng nhau",
    "hint": "Friends like to play games together.",
    "fact": "Working together often makes a big job easier."
  },
  "flyers-tomorrow": {
    "category": "time",
    "definition": "the day after today",
    "definitionVi": "ngày mai",
    "hint": "Say 'see you tomorrow' at the end of the school day.",
    "fact": "'Tomorrow' is the opposite of 'yesterday'."
  },
  "flyers-tonight": {
    "category": "time",
    "definition": "during the evening or night of today",
    "definitionVi": "tối nay",
    "hint": "We will watch a film tonight after dinner.",
    "fact": "'Tonight' means the night part of the day you are in now."
  },
  "flyers-torch": {
    "category": "home",
    "definition": "a small light you carry and hold in your hand",
    "definitionVi": "đèn pin",
    "hint": "Use a torch to find your way in the dark.",
    "fact": "In American English, a torch is usually called a 'flashlight'."
  },
  "flyers-tortoise": {
    "category": "animals",
    "definition": "a slow-moving animal with a hard, round shell",
    "definitionVi": "con rùa (cạn)",
    "hint": "A tortoise can hide its head inside its shell.",
    "fact": "Some tortoises can live for more than one hundred years."
  },
  "flyers-touch": {
    "category": "body",
    "definition": "to put your hand or fingers on something",
    "definitionVi": "chạm, sờ",
    "hint": "Touch the sand gently to feel how soft it is.",
    "fact": "Your fingertips are very good at feeling small details."
  },
  "flyers-tour": {
    "category": "travel",
    "definition": "a trip to see the interesting parts of a place",
    "definitionVi": "chuyến tham quan",
    "hint": "A guide leads you around on a tour of the museum.",
    "fact": "You can take a tour of a city, a castle, or even a factory."
  },
  "flyers-traffic": {
    "category": "travel",
    "definition": "all the cars and other vehicles on a road",
    "definitionVi": "giao thông, xe cộ",
    "hint": "There is a lot of traffic on the road after school.",
    "fact": "Traffic lights help control busy traffic safely."
  },
  "flyers-trainers": {
    "category": "clothes",
    "definition": "soft, comfortable shoes worn for sport",
    "definitionVi": "giày thể thao",
    "hint": "Wear trainers for PE so you can run comfortably.",
    "fact": "'Trainers' in British English are called 'sneakers' in American English."
  },
  "flyers-tune": {
    "category": "general",
    "definition": "a simple, pleasant series of musical notes",
    "definitionVi": "giai điệu",
    "hint": "You can hum a happy tune.",
    "fact": "A catchy tune is one that stays in your head all day!"
  },
  "flyers-turn": {
    "category": "places",
    "definition": "to change direction, or move around a point",
    "definitionVi": "rẽ, xoay",
    "hint": "Turn left at the corner to reach the park.",
    "fact": "A wheel turns round and round as a bike moves forward."
  },
  "flyers-turn-off": {
    "category": "home",
    "definition": "to stop something working by using a switch",
    "definitionVi": "tắt (đèn, máy...)",
    "hint": "Turn off the light when you leave the room.",
    "fact": "'Turn off' is the opposite of 'turn on'."
  },
  "flyers-turn-on": {
    "category": "home",
    "definition": "to make something start working by using a switch",
    "definitionVi": "bật (đèn, máy...)",
    "hint": "Turn on the TV to watch your favourite show.",
    "fact": "'Turn on' is the opposite of 'turn off'."
  },
  "flyers-twice": {
    "category": "time",
    "definition": "two times",
    "definitionVi": "hai lần",
    "hint": "Brush your teeth twice a day, morning and night.",
    "fact": "'Twice' means the same as 'two times'."
  },
  "flyers-tyre": {
    "category": "travel",
    "definition": "the round rubber part around a wheel",
    "definitionVi": "lốp xe",
    "hint": "A bicycle needs air inside its tyres.",
    "fact": "Cars usually have four tyres, but bicycles only have two."
  },
  "flyers-umbrella": {
    "category": "weather",
    "definition": "something you hold over your head to stay dry in rain",
    "definitionVi": "cái ô, dù",
    "hint": "Take an umbrella if it looks like it might rain.",
    "fact": "An umbrella can also protect you from strong sunshine."
  },
  "flyers-unfriendly": {
    "category": "people",
    "definition": "not kind or pleasant to other people",
    "definitionVi": "không thân thiện",
    "hint": "Try not to be unfriendly, even when you feel grumpy.",
    "fact": "'Unfriendly' is the opposite of 'friendly'."
  },
  "flyers-unhappy": {
    "category": "feelings",
    "definition": "feeling sad, not happy",
    "definitionVi": "không vui, buồn",
    "hint": "A kind word can cheer up someone who feels unhappy.",
    "fact": "'Unhappy' is the opposite of 'happy'."
  },
  "flyers-uniform": {
    "category": "clothes",
    "definition": "special matching clothes worn by a group, like at school",
    "definitionVi": "đồng phục",
    "hint": "You wear a school uniform to look the same as your classmates.",
    "fact": "Police officers, pilots, and nurses all wear a uniform for work."
  },
  "flyers-university": {
    "category": "school",
    "definition": "a place where people study after college, for a degree",
    "definitionVi": "trường đại học",
    "hint": "People often go to university when they are about eighteen.",
    "fact": "Some universities are hundreds of years old."
  },
  "flyers-unkind": {
    "category": "people",
    "definition": "not nice or caring towards other people",
    "definitionVi": "không tử tế",
    "hint": "It's never nice to be unkind to a friend.",
    "fact": "'Unkind' is the opposite of 'kind'."
  },
  "flyers-untidy": {
    "category": "home",
    "definition": "messy, not neat or in order",
    "definitionVi": "bừa bộn, lộn xộn",
    "hint": "Tidy up your untidy room before your friend visits.",
    "fact": "'Untidy' is the opposite of 'tidy'."
  },
  "flyers-unusual": {
    "category": "feelings",
    "definition": "not common, different from normal",
    "definitionVi": "khác thường, bất thường",
    "hint": "A purple cat would be a very unusual sight!",
    "fact": "'Unusual' is the opposite of 'usual' or 'normal'."
  },
  "flyers-use": {
    "category": "general",
    "definition": "to do something with an object for a purpose",
    "definitionVi": "sử dụng",
    "hint": "You use a pencil to write your name.",
    "fact": "You use different tools for different jobs."
  },
  "flyers-usually": {
    "category": "time",
    "definition": "most of the time, as a habit",
    "definitionVi": "thường thường",
    "hint": "I usually go to bed at eight o'clock.",
    "fact": "'Usually' tells us what happens most of the time, not always."
  },
  "flyers-view": {
    "category": "nature",
    "definition": "what you can see from a certain place",
    "definitionVi": "khung cảnh, tầm nhìn",
    "hint": "You get a great view of the town from the top of the hill.",
    "fact": "Tall towers often have the best views of a city."
  },
  "flyers-violin": {
    "category": "general",
    "definition": "a wooden musical instrument played with a bow",
    "definitionVi": "đàn vi-ô-lông",
    "hint": "You hold a violin under your chin and play it with a bow.",
    "fact": "A violin has four strings that make different notes."
  },
  "flyers-visit": {
    "category": "travel",
    "definition": "to go and see a person or place",
    "definitionVi": "đi thăm, ghé thăm",
    "hint": "We visit our grandparents on the weekend.",
    "fact": "People visit museums to learn about history and art."
  },
  "flyers-volleyball": {
    "category": "sports",
    "definition": "a game where two teams hit a ball over a net",
    "definitionVi": "bóng chuyền",
    "hint": "In volleyball, you hit the ball over the net without letting it drop.",
    "fact": "Volleyball can be played indoors or on a sandy beach."
  },
  "flyers-waiter": {
    "category": "jobs",
    "definition": "a person who brings food to tables in a restaurant",
    "definitionVi": "người phục vụ (nam)",
    "hint": "A waiter takes your order and brings your food.",
    "fact": "Remember to say 'thank you' to the waiter who serves you."
  },
  "flyers-warm": {
    "category": "weather",
    "definition": "having a comfortable, pleasant amount of heat",
    "definitionVi": "ấm áp",
    "hint": "Wear a jumper to stay warm in autumn.",
    "fact": "'Warm' is more comfortable than 'hot' but not 'cold'."
  },
  "flyers-way": {
    "category": "places",
    "definition": "a route or direction to somewhere",
    "definitionVi": "đường, cách",
    "hint": "Ask 'Which way is the park?' if you are lost.",
    "fact": "'Way' can mean a direction, or a way of doing something."
  },
  "flyers-west": {
    "category": "places",
    "definition": "the direction where the sun sets",
    "definitionVi": "hướng tây",
    "hint": "The sun sets in the west every evening.",
    "fact": "West is the opposite direction to east."
  },
  "flyers-wheel": {
    "category": "travel",
    "definition": "a round object that turns to help things move",
    "definitionVi": "bánh xe",
    "hint": "A car has four wheels, and a bicycle has two.",
    "fact": "The wheel is one of the most important inventions ever made."
  },
  "flyers-whisper": {
    "category": "people",
    "definition": "to speak very quietly and softly",
    "definitionVi": "thì thầm",
    "hint": "Whisper in the library so you don't disturb others.",
    "fact": "It is hard for other people to hear you when you whisper."
  },
  "flyers-whistle": {
    "category": "sports",
    "definition": "to make a high sound by blowing air through your lips",
    "definitionVi": "huýt sáo",
    "hint": "A referee will whistle to stop the game.",
    "fact": "Some birds can whistle beautiful tunes too."
  },
  "flyers-wife": {
    "category": "people",
    "definition": "the woman someone is married to",
    "definitionVi": "vợ",
    "hint": "A husband and wife are a married couple.",
    "fact": "A wife is part of a person's close family."
  },
  "flyers-wifi": {
    "category": "technology",
    "definition": "a way to connect to the internet without wires",
    "definitionVi": "wifi, mạng không dây",
    "hint": "You need wifi to use the internet on a tablet.",
    "fact": "'Wifi' lets many devices connect to the internet at the same time."
  },
  "flyers-wild": {
    "category": "animals",
    "definition": "living freely in nature, not kept as a pet",
    "definitionVi": "hoang dã",
    "hint": "Lions and tigers are wild animals, not pets.",
    "fact": "'Wild' is the opposite of 'tame'."
  },
  "flyers-will": {
    "category": "time",
    "definition": "used to talk about what happens in the future",
    "definitionVi": "sẽ",
    "hint": "Say 'I will help you' to promise something in the future.",
    "fact": "'Will' is one of the main ways to talk about the future."
  },
  "flyers-win": {
    "category": "sports",
    "definition": "to come first or be the best in a game or contest",
    "definitionVi": "chiến thắng",
    "hint": "You win a race by finishing before everyone else.",
    "fact": "'Win' is the opposite of 'lose'."
  },
  "flyers-wing": {
    "category": "animals",
    "definition": "the part of a bird or insect used for flying",
    "definitionVi": "cánh (chim, côn trùng)",
    "hint": "A bird flaps its wings to fly.",
    "fact": "Planes have wings too, just like birds!"
  },
  "flyers-winner": {
    "category": "sports",
    "definition": "the person or team who wins",
    "definitionVi": "người chiến thắng",
    "hint": "The winner of the race gets a shiny medal.",
    "fact": "Every competition has a winner at the very end."
  },
  "flyers-winter": {
    "category": "weather",
    "definition": "the coldest season of the year",
    "definitionVi": "mùa đông",
    "hint": "It can snow during winter in some countries.",
    "fact": "Some animals sleep through the whole winter."
  },
  "flyers-wish": {
    "category": "feelings",
    "definition": "a hope for something you want to happen",
    "definitionVi": "điều ước",
    "hint": "Make a wish before you blow out your birthday candles.",
    "fact": "People often wish on a falling star."
  },
  "flyers-wonderful": {
    "category": "feelings",
    "definition": "extremely good, causing wonder or joy",
    "definitionVi": "tuyệt vời",
    "hint": "Say 'what a wonderful surprise!' when something great happens.",
    "fact": "'Wonderful' means the same as 'amazing' or 'excellent'."
  },
  "flyers-wood": {
    "category": "nature",
    "definition": "the hard material that trees are made of",
    "definitionVi": "gỗ",
    "hint": "Chairs and tables are often made of wood.",
    "fact": "Wood comes from trees and can be used to build houses."
  },
  "flyers-wool": {
    "category": "clothes",
    "definition": "soft, warm material made from sheep's hair",
    "definitionVi": "len",
    "hint": "A woolly jumper keeps you warm in winter.",
    "fact": "Wool comes from the fluffy coat of a sheep."
  },
  "flyers-worried": {
    "category": "feelings",
    "definition": "feeling anxious about something that might go wrong",
    "definitionVi": "lo lắng",
    "hint": "Talk to someone if you feel worried about something.",
    "fact": "Everyone feels worried sometimes — it's a normal feeling."
  },
  "flyers-x-ray": {
    "category": "health",
    "definition": "a picture doctors take to see inside your body",
    "definitionVi": "chụp X-quang",
    "hint": "Doctors use an x-ray to check if a bone is broken.",
    "fact": "An x-ray can see straight through your skin to your bones."
  },
  "flyers-yet": {
    "category": "time",
    "definition": "up until now, used mostly in questions and negatives",
    "definitionVi": "chưa",
    "hint": "Say 'not yet' when something has not happened.",
    "fact": "'Yet' usually goes at the end of a question or sentence."
  },
  "flyers-yoghurt": {
    "category": "food",
    "definition": "a thick, creamy food made from milk",
    "definitionVi": "sữa chua",
    "hint": "Yoghurt can be plain or flavoured with fruit.",
    "fact": "Yoghurt is made by adding good bacteria to milk."
  },
  "flyers-zero": {
    "category": "school",
    "definition": "the number 0, meaning nothing",
    "definitionVi": "số không",
    "hint": "A rocket launch counts down to zero before it blasts off.",
    "fact": "Zero was invented as a number a very long time ago."
  }
}

/**
 * Returns curated gloss content for a Flyers vocabulary entry.
 * Falls back to a generic-but-sensible entry if an id is not (yet) curated.
 */
export function getFlyersGloss(id, word, pos) {
  const curated = GLOSS_BY_ID[id]
  if (curated) return curated

  const head = headword(word)
  const category = categoryFor(head, 'general')
  const definition = pos === 'verb' ? `to ${head}` : `a word connected with ${head}`
  return {
    category,
    definition,
    definitionVi: `từ tiếng Anh: ${head}`,
    hint: `Think about what "${head}" means and how it is used in a sentence.`,
    fact: `"${head}" is a useful word to know for Cambridge Flyers.`,
  }
}
