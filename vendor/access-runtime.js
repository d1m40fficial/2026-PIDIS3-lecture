// Доступ к лекциям по коду и подпись результата самопроверки.
//
// Файл кладётся в вендорный движок pisid3-lecture из scripts/apply-engine-patches.mjs
// и импортируется и из lecture-engine.js (гейт при открытии лекции), и из
// SlideView (блок «Результат для преподавателя»).
//
// Два решения продиктованы тем, что файл попадает в node_modules, а движок
// импортируют и браузер, и Node-скрипты проверки:
// JSX не используется, вместо него createElement; и createElement берётся из
// «react», а не из «react/jsx-runtime» — вторую в Node нельзя разобрать на
// именованный импорт, она CommonJS без читаемых экспортов.

import { Fragment, createElement as h, useEffect, useState } from 'react'

// Базовый адрес читаем лениво: в Node import.meta.env отсутствует, а модуль
// всё равно импортируется проверочными скриптами через движок.
const baseUrl = () => import.meta.env?.BASE_URL || '/'
const accessUrl = () => `${baseUrl()}access-codes.json`

const WEEK = 7 * 24 * 60 * 60 * 1000
const accessKey = () => `pidis3-access:${baseUrl()}`
const identityKey = () => `pidis3-identity:${baseUrl()}`

let file = null
let inflight = null

/** SHA-256 в нижнем регистре. Бросает, если браузер без WebCrypto. */
export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Код вводят без учёта регистра и пробелов; кириллица и латиница — разные. */
export function normalizeCode(value) {
  return String(value).trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
}

export async function loadAccessFile() {
  if (file) return file
  if (!inflight) {
    inflight = fetch(accessUrl(), { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : Promise.reject(Error(String(response.status)))))
      .then((value) => (file = value))
      .catch(() => (file = null))
  }
  await inflight
  inflight = null
  return file
}

const hashesFor = (access, lectureId) => access?.lectures?.[lectureId] || []

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(accessKey()) || '{}')
  } catch {
    return {}
  }
}

function prune(store) {
  const now = Date.now()
  for (const [id, record] of Object.entries(store)) {
    if (!record || record.expiresAt <= now) delete store[id]
  }
  return store
}

function writeStore(store) {
  try {
    localStorage.setItem(accessKey(), JSON.stringify(store))
  } catch {
    /* приватный режим: доступ просто не запомнится */
  }
}

export function unlockedRecords() {
  const store = prune(readStore())
  writeStore(store)
  return store
}

export function isLectureUnlocked(lectureId) {
  return Boolean(unlockedRecords()[lectureId])
}

/** Отпечаток кода — четыре знака от SHA-256 введённого кода. */
export function fingerprintOf(access, lectureId) {
  return unlockedRecords()[lectureId]?.fingerprint || '----'
}

export async function grantLecture(access, lectureId, code) {
  if (!hashesFor(access, lectureId).length) return false
  const hash = await sha256Hex(normalizeCode(code))
  if (!hashesFor(access, lectureId).includes(hash)) return false
  const store = unlockedRecords()
  store[lectureId] = { expiresAt: Date.now() + WEEK, fingerprint: hash.slice(0, 4) }
  writeStore(store)
  return true
}

/** Мастер-код снимает доступ и сохранённое ФИО на устройстве. */
export async function releaseAccess(access, code) {
  if (!access?.releaseHash) return false
  if ((await sha256Hex(normalizeCode(code))) !== access.releaseHash) return false
  try {
    localStorage.removeItem(accessKey())
    localStorage.removeItem(identityKey())
  } catch {
    /* ничего */
  }
  return true
}

export function readIdentity() {
  try {
    return localStorage.getItem(identityKey()) || ''
  } catch {
    return ''
  }
}

async function signPayload(access, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(access.certificateKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Подписывает результат самопроверки. Полезная нагрузка намеренно включает
 * отпечаток кода: получить отпечаток чужого кода, не зная сам код, нельзя.
 */
export async function signResult(access, { lectureId, score, total, name }) {
  const stamp = new Date().toISOString()
  const fingerprint = fingerprintOf(access, lectureId)
  const payload = [
    'pidis3-certificate-v1',
    name.trim(),
    lectureId,
    String(score),
    String(total),
    fingerprint,
    stamp,
    access.contentVersion || '',
  ].join('|')
  const signature = await signPayload(access, payload)
  return {
    name: name.trim(),
    lectureId,
    score,
    total,
    fingerprint,
    stamp,
    contentVersion: access.contentVersion || '',
    signature,
  }
}

// ── Гейт при открытии лекции ────────────────────────────────────────────────

export function useLectureGate(lectureId) {
  const [state, setState] = useState({ ready: false, locked: false })

  useEffect(() => {
    let alive = true
    loadAccessFile().then((access) => {
      if (!alive || !lectureId) return
      setState({ ready: true, locked: hashesFor(access, lectureId).length > 0 && !isLectureUnlocked(lectureId) })
    })
    return () => {
      alive = false
    }
  }, [lectureId])

  const gate = state.locked
    ? h(GateDialog, {
        lectureId,
        onUnlock: () => setState({ ready: true, locked: false }),
        onRelease: () => setState({ ready: true, locked: false }),
      })
    : null

  return { locked: state.locked, gate }
}

function GateDialog({ lectureId, onUnlock, onRelease }) {
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('code')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const access = await loadAccessFile()
      if (mode === 'release') {
        if (!(await releaseAccess(access, code))) setError('Мастер-код не подходит.')
        else {
          setDone('Доступ снят. Введите код лекции заново.')
          setMode('code')
          setCode('')
          onRelease()
        }
      } else if (await grantLecture(access, lectureId, code)) {
        onUnlock()
      } else {
        setError('Код не подходит. Проверьте раскладку и попробуйте ещё раз.')
      }
    } catch (e) {
      setError(`Проверка не выполнена: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return h(
    'div',
    { className: 'access-gate' },
    h(
      'form',
      { className: 'access-gate-card', onSubmit: submit },
      h('p', { className: 'eyebrow' }, 'Доступ по коду'),
      h('h1', null, mode === 'release' ? 'Сброс доступа' : 'Лекция закрыта'),
      h(
        'p',
        { className: 'lead' },
        mode === 'release'
          ? 'Мастер-код снимает доступ и сохранённое ФИО на этом устройстве.'
          : 'Введите код, который выдал преподаватель. Код вводится один раз и запоминается на неделю.',
      ),
      done ? h('p', { className: 'access-done', role: 'status' }, done) : null,
      h(
        'label',
        { className: 'access-field' },
        mode === 'release' ? 'Мастер-код' : 'Код лекции',
        h('input', {
          value: code,
          autoComplete: 'off',
          spellCheck: false,
          autoFocus: true,
          onChange: (event) => setCode(event.target.value),
        }),
      ),
      error ? h('p', { className: 'access-error', role: 'alert' }, error) : null,
      h(
        'div',
        { className: 'access-actions' },
        h('button', { className: 'button primary', type: 'submit', disabled: busy || !code.trim() }, busy ? 'Проверяем…' : 'Открыть'),
        h(
          'button',
          {
            className: 'button ghost',
            type: 'button',
            onClick: () => {
              setMode(mode === 'release' ? 'code' : 'release')
              setCode('')
              setError('')
            },
          },
          mode === 'release' ? 'Назад к коду лекции' : 'Сбросить доступ мастер-кодом',
        ),
      ),
    ),
  )
}

// ── Блок «Результат для преподавателя» ──────────────────────────────────────

export function CertificatePanel({ lectureId, score, total }) {
  const [access, setAccess] = useState(null)
  const [name, setName] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    loadAccessFile().then((value) => {
      if (!alive) return
      setAccess(value)
      setName(readIdentity())
      try {
        const saved = JSON.parse(localStorage.getItem(`${identityKey()}:cert`) || 'null')
        if (saved && saved.lectureId === lectureId) setCertificate(saved)
      } catch {
        /* ничего */
      }
    })
    return () => {
      alive = false
    }
  }, [lectureId])

  if (!access?.certificateKey) return null

  const sign = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await signResult(access, { lectureId, score, total, name })
      try {
        localStorage.setItem(identityKey(), result.name)
        localStorage.setItem(`${identityKey()}:cert`, JSON.stringify(result))
      } catch {
        /* приватный режим */
      }
      setCertificate(result)
    } catch (e) {
      setError(`Подпись не собрана: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `pidis3-${lectureId}-${(certificate.name || 'result').replace(/\s+/g, '-')}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(href), 5000)
  }

  return h(
    'section',
    { className: 'certificate-panel' },
    h('h3', null, 'Результат для преподавателя'),
    certificate
      ? h(
          Fragment,
          null,
          h(
            'dl',
            { className: 'certificate-facts' },
            h('div', null, h('dt', null, 'ФИО'), h('dd', null, certificate.name)),
            h('div', null, h('dt', null, 'Баллы'), h('dd', null, `${certificate.score} из ${certificate.total}`)),
            h('div', null, h('dt', null, 'Отпечаток кода'), h('dd', null, certificate.fingerprint)),
            h('div', null, h('dt', null, 'Подпись'), h('dd', null, h('code', null, certificate.signature))),
            h('div', null, h('dt', null, 'Время'), h('dd', null, new Date(certificate.stamp).toLocaleString('ru-RU'))),
          ),
          h('button', { className: 'button ghost', type: 'button', onClick: download }, 'Сохранить файл результата'),
        )
      : h(
          Fragment,
          null,
          h('p', { className: 'certificate-lead' }, 'Введите ФИО один раз и подпишите результат. Подпись связывает имя, баллы и отпечаток кода лекции.'),
          h(
            'form',
            { className: 'certificate-form', onSubmit: sign },
            h(
              'label',
              { className: 'access-field' },
              'ФИО обучающегося',
              h('input', { value: name, autoComplete: 'name', onChange: (event) => setName(event.target.value) }),
            ),
            error ? h('p', { className: 'access-error', role: 'alert' }, error) : null,
            h('button', { className: 'button primary', type: 'submit', disabled: busy || !name.trim() }, busy ? 'Подписываем…' : 'Подписать результат'),
          ),
        ),
  )
}