/**
 * One-off patches for awkward lemmas in content packs.
 * Run: node scripts/patch-yle-pack-specials.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sentenceContainsLemma } from './yle-content-templates.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function patchPack(rel, patches) {
  const path = resolve(root, rel)
  const pack = JSON.parse(readFileSync(path, 'utf8'))
  for (const [id, fields] of Object.entries(patches)) {
    if (!pack[id]) {
      console.warn('missing id', id)
      continue
    }
    Object.assign(pack[id], fields)
  }
  writeFileSync(path, `${JSON.stringify(pack, null, 2)}\n`)
}

patchPack('scripts/movers-content-pack.json', {
  'movers-etc': {
    definition: 'and other things — a short way to continue a list',
    definitionVi: 'va nhung thu khac (viet tat)',
    hint: 'You write etc. at the end of a list.',
    fact: 'Etc. comes from Latin and means “and the rest”.',
    category: 'general',
    sentences: [
      'We need pens, pencils, rulers, etc.',
      'Bring books, notebooks, etc. tomorrow.',
      'Please write apples, bananas, etc.',
      'The bag has toys, games, etc.',
      'She packed socks, shoes, etc.',
      'I like cats, dogs, etc.',
      'Add sugar, milk, etc. to the list.',
      'They talked about school, homework, etc.',
      'Buy bread, cheese, etc. at the shop.',
      'My hobbies are drawing, reading, etc.',
    ],
  },
})

// Fix Vietnamese without ASCII mangling
{
  const path = resolve(root, 'scripts/movers-content-pack.json')
  const pack = JSON.parse(readFileSync(path, 'utf8'))
  pack['movers-etc'].definitionVi = 'và những thứ khác (viết tắt)'
  writeFileSync(path, `${JSON.stringify(pack, null, 2)}\n`)
}

patchPack('scripts/flyers-content-pack.json', {
  'flyers-future': {
    hint: 'Talk about what you want to do when you grow up.',
  },
})

patchPack('scripts/preliminary-content-pack.json', {
  'preliminary-a-m': {
    category: 'time',
    definition: 'in the morning, before midday',
    definitionVi: 'buổi sáng (trước 12 giờ)',
    hint: 'School often starts at 8 a.m.',
    fact: 'a.m. means before noon.',
    sentences: [
      'The lesson starts at 9 a.m.',
      'I wake up at 7 a.m. every day.',
      'The shop opens at 8 a.m.',
      'We have English at 10 a.m.',
      'Breakfast is at 7.30 a.m.',
      'The train leaves at 6 a.m.',
      'Call me after 9 a.m., please.',
      'The museum opens at 10 a.m.',
      'I have a test at 11 a.m.',
      'Sports club meets at 8 a.m. on Monday.',
    ],
  },
  'preliminary-p-m': {
    category: 'time',
    definition: 'in the afternoon or evening, after midday',
    definitionVi: 'buổi chiều hoặc tối (sau 12 giờ)',
    hint: 'Many people finish school at 4 p.m.',
    fact: 'p.m. means after noon.',
    sentences: [
      'The film starts at 7 p.m.',
      'I finish school at 4 p.m.',
      'Dinner is at 6.30 p.m.',
      'The shop closes at 8 p.m.',
      'We meet at 5 p.m. in the park.',
      'My class ends at 3 p.m.',
      'The concert begins at 9 p.m.',
      'Call me before 10 p.m., please.',
      'The bus leaves at 6 p.m.',
      'I do homework at 7 p.m.',
    ],
  },
  'preliminary-check-in': {
    category: 'travel',
    definition: 'the place or time when you arrive and register',
    definitionVi: 'quầy / giờ làm thủ tục check-in',
    hint: 'At an airport you go to check-in with your ticket.',
    fact: 'Online check-in lets you get a boarding pass at home.',
    sentences: [
      'Please go to the check-in desk.',
      'Our check-in opens two hours before the flight.',
      'I lost my bag at check-in.',
      'Online check-in is faster.',
      'Where is the check-in for London?',
      'We finished check-in early.',
      'Show your passport at check-in.',
      'The check-in queue is long.',
      'Hotel check-in is after 2 p.m.',
      'I prefer online check-in.',
    ],
  },
  'preliminary-full-time': {
    category: 'jobs',
    definition: 'working or studying for the whole of the normal hours',
    definitionVi: 'toàn thời gian',
    hint: 'A full-time job is usually five days a week.',
    fact: 'Full-time study often means many hours each week.',
    sentences: [
      'She has a full-time job in a shop.',
      'He is a full-time student.',
      'I want a full-time course next year.',
      'Full-time work can be tiring.',
      'My mum works full-time.',
      'Is this a full-time post?',
      'They offered me a full-time contract.',
      'Full-time staff get more hours.',
      'He left his full-time job.',
      'Are you studying full-time?',
    ],
  },
  'preliminary-part-time': {
    category: 'jobs',
    definition: 'working or studying for only some of the normal hours',
    definitionVi: 'bán thời gian',
    hint: 'A part-time job might be two or three days a week.',
    fact: 'Many students take part-time jobs at weekends.',
    sentences: [
      'She has a part-time job in a café.',
      'He is a part-time student.',
      'I want a part-time course.',
      'Part-time work can fit around school.',
      'My brother works part-time.',
      'Is this a part-time post?',
      'They offered me a part-time contract.',
      'Part-time staff work fewer hours.',
      'He left his part-time job.',
      'Are you studying part-time?',
    ],
  },
})

const tests = [
  ['We need pens, etc.', 'etc.'],
  ['The lesson starts at 9 a.m.', 'a.m.'],
  ['Please go to the check-in desk.', 'check-in'],
  ['She has a full-time job.', 'full-time'],
]
for (const [s, w] of tests) console.log(w, sentenceContainsLemma(s, w))
console.log('specials patched')
