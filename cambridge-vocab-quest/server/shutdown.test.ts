import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { installShutdownHandlers } from './shutdown.js'

function fakeProcess() {
  return new EventEmitter() as EventEmitter & Pick<NodeJS.Process, 'on' | 'off'>
}

describe('installShutdownHandlers', () => {
  it('exits 0 after SIGTERM so Railway sleep/redeploy is not a crash', async () => {
    const signals = fakeProcess()
    const close = vi.fn().mockResolvedValue(undefined)
    const exit = vi.fn()

    installShutdownHandlers(close, { exit, signals: signals as unknown as NodeJS.Process })
    signals.emit('SIGTERM')

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))
    expect(close).toHaveBeenCalledOnce()
  })

  it('ignores a second signal while shutdown is already running', async () => {
    const signals = fakeProcess()
    let resolveClose: () => void = () => undefined
    const close = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveClose = resolve
    }))
    const exit = vi.fn()

    installShutdownHandlers(close, { exit, signals: signals as unknown as NodeJS.Process })
    signals.emit('SIGTERM')
    signals.emit('SIGINT')
    resolveClose()

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))
    expect(close).toHaveBeenCalledOnce()
  })
})
