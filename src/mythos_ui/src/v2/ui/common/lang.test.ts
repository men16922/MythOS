import assert from 'node:assert/strict'
import { test } from 'node:test'
import { langFromSearch } from './lang.ts'

test('langFromSearch: only en / ko from the link', () => {
  assert.equal(langFromSearch('?lang=en'), 'en')
  assert.equal(langFromSearch('?mute=1&lang=KO'), 'ko')
  assert.equal(langFromSearch('?lang=fr'), null)
  assert.equal(langFromSearch(''), null)
})
