// Проверяет, что все правки вендорного движка применены и служебные файлы на
// месте. Ничего не пишет. Входит в `npm run build`, поэтому сборка падает,
// если движок не пропатчен после установки зависимостей.
import { existsSync, readFileSync } from 'node:fs'
import { edits, extraFiles, ENGINE_DIR, pendingEdits } from './engine-edits.mjs'

const pending = pendingEdits()
const stale = []
for (const item of extraFiles) {
  const target = new URL(item.target, ENGINE_DIR)
  if (!existsSync(target)) {
    stale.push(`${item.target} (нет файла)`)
    continue
  }
  const source = readFileSync(new URL(item.source, import.meta.url), 'utf8')
  if (readFileSync(target, 'utf8') !== source) stale.push(`${item.target} (устарел)`)
}

if (pending.length || stale.length) {
  if (pending.length) console.error(`Движок не пропатчен, не применены правки: ${pending.join(', ')}`)
  if (stale.length) console.error(`Файлы движка требуют обновления: ${stale.join(', ')}`)
  console.error('Выполните npm run engine:patch.')
  process.exit(1)
}

console.log(`ENGINE: движок актуален — ${edits.length} правок применены, файлы на месте.`)