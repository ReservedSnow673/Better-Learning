import { describe, expect, it } from 'vitest'
import { decryptBundle, encryptBundle } from '../lib/crypto'

describe('credential encryption', () => {
  it('encrypts and decrypts a provider bundle with the passphrase', async () => {
    const source = { provider: 'openai', model: 'gpt-5-mini', keys: { ai: 'secret-key', fal: 'fal-key' } }
    const encrypted = await encryptBundle(source, 'a useful passphrase')
    expect(encrypted.ciphertext).not.toContain('secret-key')
    await expect(decryptBundle(encrypted, 'a useful passphrase')).resolves.toEqual(source)
    await expect(decryptBundle(encrypted, 'wrong passphrase')).rejects.toBeDefined()
  })
})
