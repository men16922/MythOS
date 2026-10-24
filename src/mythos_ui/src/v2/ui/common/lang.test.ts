import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserLang, firstVisitLang, langFromSearch } from './lang.ts'

test('langFromSearch: only en / ko from the link', () => {
  assert.equal(langFromSearch('?lang=en'), 'en')
  assert.equal(langFromSearch('?mute=1&lang=KO'), 'ko')
  assert.equal(langFromSearch('?lang=fr'), null)
  assert.equal(langFromSearch(''), null)
})

test('browserLang: Korean browsers start in Korean, every other one in English; unknown stays Korean', () => {
  assert.equal(browserLang(['ko-KR', 'en-US']), 'ko')
  assert.equal(browserLang(['en-US']), 'en')
  assert.equal(browserLang(['ja-JP', 'ko-KR']), 'en')
  assert.equal(browserLang([]), 'ko')
  assert.equal(browserLang(undefined), 'ko')
})

test('firstVisitLang: a remembered choice wins, then legacy devices keep Korean, then the browser', () => {
  assert.equal(firstVisitLang('en', true, ['ko-KR']), 'en')
  assert.equal(firstVisitLang(null, true, ['en-US']), 'ko')
  assert.equal(firstVisitLang(null, false, ['en-US']), 'en')
  assert.equal(firstVisitLang('xx', false, ['ko-KR']), 'ko')
})
