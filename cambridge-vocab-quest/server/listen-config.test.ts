import { describe, expect, it } from 'vitest'
import { resolveListenHost, resolvePort } from './listen-config.js'

describe('resolvePort', () => {
  it('uses PORT when it is a positive integer', () => {
    expect(resolvePort({ PORT: '8080' })).toBe(8080)
  })

  it('falls back to Render production port 10000', () => {
    expect(resolvePort({ NODE_ENV: 'production' })).toBe(10000)
  })

  it('falls back to local API port 3001', () => {
    expect(resolvePort({})).toBe(3001)
  })
})

describe('resolveListenHost', () => {
  it('binds dual-stack in production even when HOST is 0.0.0.0', () => {
    expect(resolveListenHost({ NODE_ENV: 'production', HOST: '0.0.0.0' })).toBe('::')
    expect(resolveListenHost({ NODE_ENV: 'production' })).toBe('::')
  })

  it('strips copied table whitespace such as a leading tab', () => {
    expect(resolveListenHost({ NODE_ENV: 'production', HOST: '\t0.0.0.0' })).toBe('::')
    expect(resolveListenHost({ HOST: '  0.0.0.0\n' })).toBe('0.0.0.0')
  })

  it('keeps IPv4 all-interfaces for local development', () => {
    expect(resolveListenHost({ HOST: '0.0.0.0' })).toBe('0.0.0.0')
    expect(resolveListenHost({})).toBe('0.0.0.0')
  })

  it('rejects loopback so the process is reachable outside itself', () => {
    expect(resolveListenHost({ HOST: '127.0.0.1' })).toBe('0.0.0.0')
    expect(resolveListenHost({ HOST: 'localhost', NODE_ENV: 'production' })).toBe('0.0.0.0')
  })
})
