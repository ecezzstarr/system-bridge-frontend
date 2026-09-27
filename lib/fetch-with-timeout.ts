export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000,
) {
  const controller = new AbortController()
  const upstream = init.signal
  const relayAbort = () => controller.abort()

  if (upstream?.aborted) controller.abort()
  else upstream?.addEventListener('abort', relayAbort, { once: true })

  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted && !upstream?.aborted) {
      throw new Error('Request timed out. Check the connection and try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
    upstream?.removeEventListener('abort', relayAbort)
  }
}
