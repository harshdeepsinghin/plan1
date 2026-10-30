import { describe, expect, it } from 'vitest'
import { profileUpdateSchema } from './profile'

describe('profileUpdateSchema', () => {
  it('accepts an empty update', () => {
    expect(profileUpdateSchema.parse({})).toEqual({ full_name: '' })
  })

  it('trims the display name and accepts https avatars', () => {
    const parsed = profileUpdateSchema.parse({
      full_name: '  Ada Lovelace  ',
      avatar_url: 'https://cdn.example.com/ada.png',
    })
    expect(parsed.full_name).toBe('Ada Lovelace')
    expect(parsed.avatar_url).toBe('https://cdn.example.com/ada.png')
  })

  it('rejects non-https or malformed avatar URLs', () => {
    expect(profileUpdateSchema.safeParse({ avatar_url: 'http://insecure.example' }).success).toBe(
      false
    )
    expect(profileUpdateSchema.safeParse({ avatar_url: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('caps the display name at 100 characters', () => {
    expect(profileUpdateSchema.safeParse({ full_name: 'a'.repeat(101) }).success).toBe(false)
  })
})
