import { useState, type SetStateAction } from 'react'

/** Tab-local presentation choices, isolated by the published data slice. */
const choices = new Map<string, unknown>()
export function useReadingState<T>(
  key: string | undefined,
  initial: T,
): [T, (next: SetStateAction<T>) => void] {
  const [state, setState] = useState<{ key: string | undefined; value: T }>(() => ({
    key,
    value: key !== undefined && choices.has(key) ? (choices.get(key!) as T) : initial,
  }))
  const value =
    state.key === key
      ? state.value
      : key !== undefined && choices.has(key)
        ? (choices.get(key!) as T)
        : initial
  return [
    value,
    (next) => {
      const updated = typeof next === 'function' ? (next as (previous: T) => T)(value) : next
      if (key !== undefined) choices.set(key, updated)
      setState({ key, value: updated })
    },
  ]
}
