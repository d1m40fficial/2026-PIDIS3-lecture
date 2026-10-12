// Сборка файла доступа из файла преподавателя.
// Читает config/access-codes.json (не публикуется) и пишет public/access-codes.json:
// в сборку попадают только SHA-256 хеши кодов, ключ подписи и хеш мастер-кода.
import { createHash, randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const course = JSON.parse(await readFile(resolve(root, 'public/course.json'), 'utf8'))
const normalize = (value) => String(value).trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
const hash = (code) => createHash('sha256').update(normalize(code), 'utf8').digest('hex')

let source
try {
  source = JSON.parse(await readFile(resolve(root, 'config/access-codes.json'), 'utf8'))
} catch {
  console.log('ACCESS: config/access-codes.json не найден, лекции открыты без кода.')
  process.exit(0)
}
if (!source || typeof source !== 'object' || !source.lectures) throw Error('Некорректный config/access-codes.json')

const secret =
  typeof source.secret === 'string' && source.secret.length >= 32 ? source.secret : randomBytes(32).toString('hex')
if (typeof source.secret !== 'string' || source.secret.length < 32) {
  console.warn('ACCESS: ключ подписи сгенерирован заново и не сохранён. Скопируйте certificateKey из public/access-codes.json в config/access-codes.json.')
}

const lectures = {}
let total = 0
const weak = []
const unknown = []
for (const lecture of course.lectures) {
  const codes = Array.isArray(source.lectures[lecture.id]) ? source.lectures[lecture.id] : []
  if (source.lectures[lecture.id] !== undefined && !Array.isArray(source.lectures[lecture.id])) {
    throw Error(`${lecture.id}: ожидался массив кодов`)
  }
  const list = [...new Set(codes.map(normalize).filter(Boolean))]
  for (const code of list) if (code.length < 8) weak.push(`${lecture.id}: ${code}`)
  lectures[lecture.id] = list.map(hash)
  total += list.length
}
for (const id of Object.keys(source.lectures)) {
  if (!course.lectures.some((lecture) => lecture.id === id)) unknown.push(id)
}
if (weak.length) throw Error('Код короче 8 символов, его можно подобрать: ' + weak.join(', '))
if (unknown.length) throw Error('В файле кодов есть лекции, которых нет в курсе: ' + unknown.join(', '))

const releaseCode = normalize(source.releaseCode || '')
if (releaseCode.length < 8) throw Error('Мастер-код (releaseCode) короче 8 символов или не задан.')

const file = {
  schemaVersion: 1,
  courseId: course.id,
  contentVersion: course.contentVersion,
  certificateKey: secret,
  releaseHash: hash(releaseCode),
  lectures,
}
await writeFile(resolve(root, 'public/access-codes.json'), JSON.stringify(file, null, 2) + '\n')

const guarded = Object.values(lectures).filter((list) => list.length).length
console.log(`ACCESS: ${total} кодов для ${guarded} лекций из ${course.lectures.length}; в сборку попадают только SHA-256 хеши.`)