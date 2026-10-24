import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCheckoutClient } from '../lib/supabase/checkout.ts'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://checkout-test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key'

function authMock({ token = 'token-cajero-original', userId = 'cajero-1', invalid = false, missing = false } = {}) {
  return {
    auth: {
      getSession: async () => ({ data: { session: missing ? null : { access_token: token } }, error: null }),
      getUser: async (jwt) => {
        assert.equal(jwt, token)
        return { data: { user: invalid ? null : { id: userId } }, error: invalid ? new Error('expired') : null }
      },
    },
  }
}

test('rechaza sesión ausente, inválida y cuenta distinta antes de escribir', async () => {
  await assert.rejects(createCheckoutClient(authMock({ missing: true }), 'cajero-1'), /sesión/)
  await assert.rejects(createCheckoutClient(authMock({ invalid: true }), 'cajero-1'), /sesión/)
  await assert.rejects(createCheckoutClient(authMock({ userId: 'cajero-2' }), 'cajero-1'), /cuenta cambió/)
})

test('mantiene el JWT verificado en venta y detalles aunque cambie la sesión compartida', async () => {
  const auth = authMock()
  const { client, user } = await createCheckoutClient(auth, 'cajero-1')
  assert.equal(user.id, 'cajero-1')
  auth.auth.getSession = async () => ({ data: { session: { access_token: 'token-otra-cuenta' } }, error: null })

  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), token: new Headers(options.headers).get('authorization') })
    return new Response(JSON.stringify([{ id: 'venta-1' }]), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const venta = await client.from('ventas').insert({ cajero_id: user.id }).select('id')
    const detalle = await client.from('detalle_ventas').insert({ venta_id: 'venta-1' })
    assert.equal(venta.error, null)
    assert.equal(detalle.error, null)
    assert.equal(requests.length, 2)
    assert.ok(requests.every(r => r.token === 'Bearer token-cajero-original'))
  } finally {
    globalThis.fetch = originalFetch
  }
})
