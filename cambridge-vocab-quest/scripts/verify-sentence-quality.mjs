import { readFileSync } from 'node:fs'

const checks = ['mouth', 'leather', 'row', 'society', 'coffee', 'cooker', 'restaurant', 'stomach', 'bowl', 'seat', 'death', 'sweatshirt', 'suitcase', 'milkshake']
for (const level of ['starters', 'movers', 'flyers', 'preliminary']) {
  const data = JSON.parse(readFileSync(`server/data/${level}.json`, 'utf8'))
  for (const word of data.words) {
    if (checks.includes(word.word.toLowerCase())) {
      console.log(`${word.word} => ${word.sentence}`)
    }
  }
}

const food = /^(apple|banana|bean|beans|biscuit|bread|burger|cake|candy|carrot|cereal|cheese|chicken|chips|chocolate|coconut|cookie|dessert|egg|fish|food|fries|fruit|grape|herb|honey|ice cream|jam|juice|kiwi|lemon|lemonade|lime|mango|meat|meatballs|melon|milk|milkshake|mushroom|noodles|olive|olives|onion|orange|pancake|pasta|peach|peanut|pear|pepper|pizza|potato|rice|salad|salt|sandwich|sauce|sausage|soup|spinach|strawberry|sugar|supper|toast|tomato|vanilla|water|watermelon|yoghurt|yogurt|chilli|chili|cabbage|lettuce|coffee|tea|breakfast|lunch|dinner|meal|snack|drink|vegetable|date)$/i
const clothes = /^(shirt|dress|hat|shoe|shoes|jacket|jeans|boot|boots|sock|socks|coat|scarf|gloves|trousers|skirt|sweater|sweatshirt|jumper|tie|belt|cap|helmet|uniform|pyjamas|shorts|t-shirt|pants|suit|sleeve|clothing|clothes|sandal|sandals|tights)$/i

let bad = 0
for (const level of ['starters', 'movers', 'flyers', 'preliminary']) {
  const data = JSON.parse(readFileSync(`server/data/${level}.json`, 'utf8'))
  for (const word of data.words) {
    const head = word.word.replace(/\)+$/g, '').trim().toLowerCase()
    const sentence = word.sentence || ''
    if (/ate .+ for lunch/i.test(sentence) && !food.test(head)) {
      console.log('BAD FOOD:', word.id, sentence)
      bad += 1
    }
    if (/put on .+ this morning/i.test(sentence) && !clothes.test(head)) {
      console.log('BAD CLOTHES:', word.id, sentence)
      bad += 1
    }
  }
}
console.log('true nonsense remaining:', bad)
