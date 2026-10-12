// Правки вендорного движка @olgakraven/lecture-engine 0.2.0.
//
// Движок приходит собранным: исходников в репозитории нет, а нужные правки
// затрагивают и каталог, и плеер лекции, и слайды. Поэтому здесь не unified
// diff, а список замен «первая строка региона → последняя строка региона».
// Совпадение идёт по обрезанной строке, отступы не важны; при несовпадении
// apply-engine-patches.mjs падает с номером правки и её описанием.
//
// Список применяется снизу вверх внутри одного файла, поэтому номера строк
// не «поедут». Каждая правка применяется один раз: повторный запуск на
// уже пропатченном движке её пропускает.

import { readFileSync, writeFileSync } from 'node:fs'

/** @typedef {{ id: string, note: string, file: string, from: string[], to: string[] }} Edit */

/**
 * Файлы, которые движку не хватает: их исходники лежат в репозитории, а в
 * node_modules копируются при каждой установке зависимостей.
 * @type {{ source: string, target: string }[]}
 */
export const extraFiles = [
  { source: '../vendor/access-runtime.js', target: 'access-runtime.js' },
]

/** @type {Edit[]} */
export const edits = [
  // ── Слайды: подпись семестра в шапке слайда ─────────────────────────────────
  {
    id: 'slideview-import-access',
    note: 'Подключить модуль доступа и подписи к чанку слайдов.',
    file: 'SlideView-CKuVrZ7x.js',
    from: ['import { createPortal as p } from "react-dom";'],
    to: [
      'import { createPortal as p } from "react-dom";',
      'import { CertificatePanel as pidisCertificatePanel } from "./access-runtime.js";',
    ],
  },
  {
    id: 'slideview-certificate-panel',
    note: 'Под результатами самопроверки показывать блок подписи для преподавателя.',
    file: 'SlideView-CKuVrZ7x.js',
    from: [
      '}) : /* @__PURE__ */ d("button", {',
      'className: "button ghost",',
      'onClick: () => o(!0),',
      'children: "Начать самопроверку заново"',
      '})',
      '] });',
    ],
    to: [
      '}) : /* @__PURE__ */ d("button", {',
      'className: "button ghost",',
      'onClick: () => o(!0),',
      'children: "Начать самопроверку заново"',
      '}),',
      's.length ? /* @__PURE__ */ d(pidisCertificatePanel, {',
      'lectureId: e.id,',
      'score: m,',
      'total: s.length',
      '}) : null',
      '] });',
    ],
  },

  // ── Лекция: гейт доступа ─────────────────────────────────────────────────
  {
    id: 'deck-import-access',
    note: 'Подключить модуль доступа и подписи к основному чанку.',
    file: 'lecture-engine.js',
    from: ['import { jsx as w, jsxs as T } from "react/jsx-runtime";'],
    to: [
      'import { jsx as w, jsxs as T } from "react/jsx-runtime";',
      'import { useLectureGate as pidisUseLectureGate } from "./access-runtime.js";',
      'import { LectureCardState as pidisLectureCardState } from "./access-runtime.js";',
    ],
  },
  {
    id: 'deck-gate-hook',
    note: 'Завести состояние гейта доступа в компоненте сайта.',
    file: 'lecture-engine.js',
    from: [
      'return /* @__PURE__ */ T(c, {',
      'course: e,',
      'base: t,',
      'children: [',
      'K ? /* @__PURE__ */ T("main", {',
    ],
    to: [
      'let pidisGate = pidisUseLectureGate(K?.id);',
      'return /* @__PURE__ */ T(c, {',
      'course: e,',
      'base: t,',
      'children: [',
      'K ? pidisGate.locked ? pidisGate.gate : /* @__PURE__ */ T("main", {',
    ],
  },
  {
    id: 'slide-brand-no-semester',
    note: 'В шапке слайда оставить только код дисциплины, без «5-й семестр».',
    file: 'SlideView-CKuVrZ7x.js',
    from: [
      '}), /* @__PURE__ */ f("span", { children: [',
      'e.code,',
      '" · ",',
      't.semester,',
      '"-й семестр"',
      '] })]',
    ],
    to: ['}), /* @__PURE__ */ f("span", { children: e.code })]'],
  },
  {
    id: 'slide-title-teacher',
    note: 'На титульном слайде показать Белоусова Д. И. без должности и кафедры.',
    file: 'SlideView-CKuVrZ7x.js',
    from: [
      'children: [',
      '/* @__PURE__ */ d("strong", { children: r.fullName || "Преподаватель" }),',
      '/* @__PURE__ */ d("span", { children: r.position }),',
      '/* @__PURE__ */ d("span", { children: r.department })',
      ']',
    ],
    to: ['children: /* @__PURE__ */ d("strong", { children: "Белоусов Д. И." })'],
  },

  // ── Лекция: нижние отметки ────────────────────────────────────────────────
  {
    id: 'lecture-no-study-marks',
    note: 'Убрать кнопки «Изучено», «Повторить» и «Закладка» под слайдом.',
    file: 'CourseTools-C3cpIfZW.js',
    from: [
      'return /* @__PURE__ */ p("div", {',
      'className: "study-actions",',
      '"aria-label": "Мои отметки",',
      'children: [[',
      '"done",',
      '"review",',
      '"bookmark"',
      '].map((e, t) => /* @__PURE__ */ f("button", {',
      'className: "button ghost",',
      '"aria-pressed": !!a[n.id]?.[e],',
      'onClick: () => {',
      'let t = {',
      '...a,',
      '[n.id]: {',
      '...a[n.id],',
      '[e]: !a[n.id]?.[e]',
      '}',
      '};',
      'o(t), i(r, t) || l("Отметки не сохранились. Сделайте резервную копию.");',
      '},',
      'children: [',
      '"Изучено",',
      '"Повторить",',
      '"Закладка"',
      '][t]',
      '}, e)), s && /* @__PURE__ */ f("span", {',
      'role: "alert",',
      'children: s',
      '})]',
      '});',
    ],
    to: ['return null;'],
  },

  // ── Каталог ───────────────────────────────────────────────────────────────
  {
    id: 'catalog-card-access-state',
    note: 'Карточка лекции: убрать «Сохранить PDF»; закрыта — «Доступ по коду» и «Ввести код», разблокирована — «Доступно» и «Открыть».',
    file: 'lecture-engine.js',
    from: [
      'children: [/* @__PURE__ */ T("button", {',
      'className: "button ghost",',
      'onClick: () => Z(t.id),',
      'children: [/* @__PURE__ */ w(v, { size: 17 }), "Сохранить PDF"]',
      '}), /* @__PURE__ */ w("button", {',
      'className: "button primary",',
      'onClick: () => ke(t),',
      'children: "Открыть"',
      '})]',
    ],
    to: [
      'children: [/* @__PURE__ */ w(pidisLectureCardState, {',
      'lectureId: t.id,',
      'onOpen: () => ke(t)',
      '})]',
    ],
  },
  {
    id: 'catalog-card-no-semester',
    note: 'Убрать подпись семестра с карточки лекции.',
    file: 'lecture-engine.js',
    from: [
      '}), /* @__PURE__ */ T("span", {',
      'className: "semester-tag",',
      'children: [t.semester, " семестр"]',
      '})]',
    ],
    to: ['})]'],
  },
  {
    id: 'catalog-no-filter-and-materials',
    note: 'Убрать фильтр по семестру и кнопку «Материалы» рядом с поиском.',
    file: 'lecture-engine.js',
    from: [
      '}),',
      '/* @__PURE__ */ w("div", {',
      'className: "semester-filter",',
      'children: ["all", ...e.semesters].map((e) => /* @__PURE__ */ w("button", {',
      'className: L === e ? "active" : "",',
      '"aria-pressed": L === e,',
      'onClick: () => Ce(e),',
      'children: e === "all" ? "Все темы" : `${e} семестр`',
      '}, e))',
      '}),',
      's(M) ? /* @__PURE__ */ T("a", {',
      'className: "materials-link",',
      'href: s(M),',
      'target: "_blank",',
      'rel: "noopener noreferrer",',
      'children: [',
      '/* @__PURE__ */ w(E, { size: 18 }),',
      '"Материалы",',
      '/* @__PURE__ */ w(le, { size: 15 })',
      ']',
      '}) : /* @__PURE__ */ T("button", {',
      'className: "materials-link",',
      'onClick: () => P("settings"),',
      'children: [/* @__PURE__ */ w(E, { size: 18 }), "Прикрепить материалы"]',
      '})',
    ],
    to: ['})'],
  },
  {
    id: 'catalog-hero-teacher',
    note: 'Герой: имя преподавателя Белоусов Д. И., без должности и кафедры.',
    file: 'lecture-engine.js',
    from: [
      '/* @__PURE__ */ w("span", { children: "Преподаватель" }),',
      '/* @__PURE__ */ w("strong", { children: j.fullName || "Ваше имя на каждой лекции" }),',
      '/* @__PURE__ */ w("small", { children: j.position || "Заполните данные перед занятием" }),',
      'j.department && /* @__PURE__ */ w("small", { children: j.department })',
    ],
    to: [
      '/* @__PURE__ */ w("span", { children: "Преподаватель" }),',
      '/* @__PURE__ */ w("strong", { children: "Белоусов Д. И." })',
    ],
  },
  {
    id: 'catalog-hero-no-semesters',
    note: 'Герой: убрать «5 и 6 семестры», оставить год.',
    file: 'lecture-engine.js',
    from: [
      'className: "eyebrow",',
      'children: [',
      'e.semesters.join(" и "),',
      '" семестры · ",',
      'e.year',
      ']',
    ],
    to: ['className: "eyebrow",', 'children: e.year'],
  },
  {
    id: 'catalog-header-no-tools',
    note: 'Убрать из верхней панели «Инструменты курса», «Вход» и «Настройка перед занятием».',
    file: 'lecture-engine.js',
    from: [
      '}), /* @__PURE__ */ T("nav", { children: [',
      '/* @__PURE__ */ w("button", {',
      'className: "button ghost",',
      'onClick: () => P("tools"),',
      'children: "Инструменты курса"',
      '}),',
      '/* @__PURE__ */ w("button", {',
      'className: "button ghost",',
      'onClick: () => P("login"),',
      'children: "Вход"',
      '}),',
      '/* @__PURE__ */ T("button", {',
      'className: "button ghost settings-button",',
      'onClick: () => P("settings"),',
      'children: [/* @__PURE__ */ w(k, { size: 19 }), /* @__PURE__ */ w("span", { children: "Настройка перед занятием" })]',
      '}),',
      '$,',
    ],
    to: ['}), /* @__PURE__ */ T("nav", { children: [', '$,'],
  },

  // ── Лекция ────────────────────────────────────────────────────────────────
  {
    id: 'deck-toolbar-no-semester',
    note: 'В шапке лекции убрать подпись семестра рядом с названием.',
    file: 'lecture-engine.js',
    from: [
      'children: [/* @__PURE__ */ w("strong", { children: K.title }), /* @__PURE__ */ T("span", { children: [K.semester, " семестр"] })]',
    ],
    to: ['children: [/* @__PURE__ */ w("strong", { children: K.title })]'],
  },
  {
    id: 'deck-toolbar-no-tools',
    note: 'Сверху справа в лекции убрать «Инструменты», «Настройка перед занятием» и «Начать занятие в двух окнах».',
    file: 'lecture-engine.js',
    from: [
      'children: [',
      '/* @__PURE__ */ w("button", {',
      'className: "button ghost",',
      'onClick: () => P("tools"),',
      'children: "Инструменты"',
      '}),',
      '!n && Q("Результаты самопроверки", /* @__PURE__ */ w(ce, { size: 19 }), () => P("results")),',
      'Q(R ? "Отключить анимацию" : "Включить анимацию", w(R ? ee : ne, { size: 19 }), () => we(!R), R),',
      'Q("Повторить анимацию", /* @__PURE__ */ w(pe, { size: 19 }), () => Te(z + 1)),',
      'Q("Настройка перед занятием", /* @__PURE__ */ w(k, { size: 19 }), () => P("settings")),',
      'Q("Начать занятие в двух окнах", /* @__PURE__ */ w(ae, { size: 19 }), je),',
      'Q("Открыть содержание", /* @__PURE__ */ w(ue, { size: 19 }), () => {',
    ],
    to: [
      'children: [',
      '!n && Q("Результаты самопроверки", /* @__PURE__ */ w(ce, { size: 19 }), () => P("results")),',
      'Q(R ? "Отключить анимацию" : "Включить анимацию", w(R ? ee : ne, { size: 19 }), () => we(!R), R),',
      'Q("Повторить анимацию", /* @__PURE__ */ w(pe, { size: 19 }), () => Te(z + 1)),',
      'Q("Открыть содержание", /* @__PURE__ */ w(ue, { size: 19 }), () => {',
    ],
  },
  {
    id: 'deck-toolbar-no-guide-pointer',
    note: 'Сверху справа в лекции убрать кнопки «Как пользоваться сайтом» и «Указка».',
    file: 'lecture-engine.js',
    from: [
      '/* @__PURE__ */ w("a", {',
      'className: "icon-button",',
      'href: u("guide.html", t),',
      'target: "_blank",',
      'rel: "noopener noreferrer",',
      'title: "Как пользоваться сайтом",',
      '"aria-label": "Как пользоваться сайтом",',
      'children: /* @__PURE__ */ w(D, { size: 19 })',
      '}),',
      'Q("Указка", /* @__PURE__ */ w(ie, { size: 19 }), () => {',
      'Ee(!B), H(null);',
      '}, B),',
    ],
    to: [],
  },
]

export const ENGINE_DIR = new URL('../node_modules/@olgakraven/lecture-engine/lib/', import.meta.url)

export function installExtraFiles() {
  const installed = []
  for (const item of extraFiles) {
    const source = new URL(item.source, import.meta.url)
    const target = new URL(item.target, ENGINE_DIR)
    const contents = readFileSync(source, 'utf8')
    if (readIfExists(target) === contents) continue
    writeFileSync(target, contents, 'utf8')
    installed.push(item.target)
  }
  return installed
}

function readIfExists(url) {
  try {
    return readFileSync(url, 'utf8')
  } catch {
    return null
  }
}

export function applyEdits() {
  const byFile = new Map()
  for (const edit of edits) {
    if (!byFile.has(edit.file)) byFile.set(edit.file, [])
    byFile.get(edit.file).push(edit)
  }

  const applied = []
  for (const [file, list] of byFile) {
    const url = new URL(file, ENGINE_DIR)
    let source
    try {
      source = readFileSync(url, 'utf8')
    } catch {
      throw new Error(`Движок не установлен: нет ${file}. Выполните npm install.`)
    }
    let lines = source.split('\n')

    // Что уже применено, помнит маркер в конце файла. Проверять «похожесть»
    // готового результата нельзя: короткие замены вроде `})]` совпадают
    // с чужими строками и дают ложное «уже применено».
    const done = new Set(readMarker(lines).split(',').map((id) => id.trim()).filter(Boolean))

    // Снизу вверх, чтобы номера строк не смещались.
    const ordered = [...list].reverse()
    for (const edit of ordered) {
      if (done.has(edit.id)) {
        applied.push(`${edit.id} (уже применена)`)
        continue
      }
      const start = findRegion(lines, edit)
      if (start < 0) {
        throw new Error(`Правка ${edit.id} не найдена: ${edit.note}\nФайл: ${file}\nОжидалась первая строка: ${edit.from[0]}`)
      }
      lines = [...lines.slice(0, start), ...edit.to, ...lines.slice(start + edit.from.length)]
      done.add(edit.id)
      applied.push(edit.id)
    }

    writeFileSync(url, writeMarker(lines, [...done]).join('\n'), 'utf8')
  }
  return applied
}

const MARKER_PREFIX = '// pidis3-engine-patches:'

function readMarker(lines) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim().startsWith(MARKER_PREFIX)) return lines[i].trim().slice(MARKER_PREFIX.length)
  }
  return ''
}

function writeMarker(lines, ids) {
  const body = lines.filter((line) => !line.trim().startsWith(MARKER_PREFIX))
  while (body.length && body[body.length - 1].trim() === '') body.pop()
  return [...body, `${MARKER_PREFIX} ${ids.join(', ')}`]
}

export function pendingEdits() {
  const byFile = new Map()
  for (const edit of edits) {
    if (!byFile.has(edit.file)) byFile.set(edit.file, [])
    byFile.get(edit.file).push(edit)
  }
  const pending = []
  for (const [file, list] of byFile) {
    let lines
    try {
      lines = readFileSync(new URL(file, ENGINE_DIR), 'utf8').split('\n')
    } catch {
      for (const edit of list) pending.push(`${edit.id} (движок не установлен)`)
      continue
    }
    const done = new Set(readMarker(lines).split(',').map((id) => id.trim()).filter(Boolean))
    for (const edit of list) if (!done.has(edit.id)) pending.push(edit.id)
  }
  return pending
}

function findRegion(lines, edit) {
  for (let i = 0; i + edit.from.length <= lines.length; i += 1) {
    if (lines[i].trim() !== edit.from[0].trim()) continue
    if (edit.from.every((text, offset) => lines[i + offset].trim() === text.trim())) return i
  }
  return -1
}