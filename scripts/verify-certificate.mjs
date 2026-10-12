// Проверка подписанного результата самопроверки на стороне преподавателя.
//
//   npm run verify:certificate -- путь/к/результату.json [код]
//
// Код нужен, чтобы подтвердить отпечаток: подпись сама по себе проверяется
// ключом из config/access-codes.json, а код связывает отпечаток с человеком.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const normalize = (value) => String(value).trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
const sha256 = (value) => createHash('sha256').update(normalize(value), 'utf8').digest('hex')

const [reportPath, code] = process.argv.slice(2)
if (!reportPath) {
  console.error('Укажите файл результата: npm run verify:certificate -- results/ЛР-01.json [КОД]')
  process.exit(2)
}

// Windows-редакторы часто пишут JSON со знаком порядка байтов, поэтому
// метку снимаем перед разбором.
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''))

const config = readJson(resolve(root, 'config/access-codes.json'))
const report = readJson(resolve(root, reportPath))

const payload = [
  'pidis3-certificate-v1',
  String(report.name ?? '').trim(),
  String(report.lectureId ?? ''),
  String(report.score ?? ''),
  String(report.total ?? ''),
  String(report.fingerprint ?? ''),
  String(report.stamp ?? ''),
  String(report.contentVersion ?? ''),
].join('|')

const expected = createHmac('sha256', config.secret).update(payload, 'utf8').digest('hex')
const actual = String(report.signature ?? '')
const same = actual.length === expected.length && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))

console.log('ФИО:            ', report.name)
console.log('Лекция:         ', report.lectureId)
console.log('Баллы:          ', `${report.score} из ${report.total}`)
console.log('Отпечаток кода: ', report.fingerprint)
console.log('Время:          ', new Date(report.stamp).toLocaleString('ru-RU'))
console.log('Версия курса:   ', report.contentVersion)
console.log('Подпись:        ', actual)

if (!code) {
  console.log('\nКод не указан: подпись и структура проверены, отпечаток кода не подтверждён.')
} else {
  const hash = sha256(code)
  const expectedFingerprint = hash.slice(0, 4)
  const matches = expectedFingerprint === report.fingerprint
  console.log(`Отпечаток кода ${matches ? 'совпал' : 'НЕ совпал'} (ожидали ${expectedFingerprint}).`)
  if (matches && !same) console.log('\nПРОВАЛ: отпечаток кода чужой, подпись не сходится.')
}

if (!same) {
  console.error('\nПРОВАЛ: подпись не сходится с ключом курса.')
  process.exit(1)
}
console.log('\nПОДПИСЬ ВЕРНА.')