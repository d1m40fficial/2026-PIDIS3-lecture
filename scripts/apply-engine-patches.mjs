// Применяет правки вендорного движка лекций. Запускается из postinstall,
// чтобы движок был пропатчен после каждой установки зависимостей, и вручную
// через `npm run engine:patch`, когда понадобится пересобрать.
import { applyEdits, installExtraFiles } from './engine-edits.mjs'

const installed = installExtraFiles()
const applied = applyEdits()
const fresh = applied.filter((id) => !id.includes('уже применена'))

console.log(
  installed.length
    ? `ENGINE: добавлено файлов — ${installed.join(', ')}`
    : 'ENGINE: дополнительные файлы уже на месте.',
)
console.log(
  fresh.length
    ? `ENGINE: применено правок — ${fresh.length}: ${fresh.join(', ')}`
    : `ENGINE: все ${applied.length} правок уже были применены.`,
)