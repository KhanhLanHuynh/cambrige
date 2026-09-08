type CloseFn = () => Promise<void>

export function installShutdownHandlers(
  close: CloseFn,
  options: {
    exit?: (code: number) => void
    signals?: NodeJS.Process
    timeoutMs?: number
  } = {},
): () => void {
  const exit = options.exit ?? ((code: number) => process.exit(code))
  const signals = options.signals ?? process
  const timeoutMs = options.timeoutMs ?? 8_000
  let stopping = false

  const onSignal = (signal: NodeJS.Signals) => {
    if (stopping) return
    stopping = true
    console.log(`Received ${signal}, shutting down`)
    const timer = setTimeout(() => exit(0), timeoutMs)
    timer.unref()
    void close()
      .catch((error) => console.error(error))
      .finally(() => exit(0))
  }

  signals.on('SIGTERM', onSignal)
  signals.on('SIGINT', onSignal)
  return () => {
    signals.off('SIGTERM', onSignal)
    signals.off('SIGINT', onSignal)
  }
}
