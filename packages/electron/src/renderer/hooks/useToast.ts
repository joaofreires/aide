import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastState {
  msg: string
  type: ToastType
  visible: boolean
}

export interface ToastContextValue {
  toast: (msg: string, type?: ToastType) => void
  state: ToastState
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/** Call this once in App to create toast state + setter. */
export function useToastState(): ToastContextValue {
  const [state, setState] = useState<ToastState>({ msg: '', type: 'success', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((msg: string, type: ToastType = 'success') => {
    setState({ msg, type, visible: true })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setState(s => ({ ...s, visible: false })), 3500)
  }, [])

  return { toast, state }
}

/** Call this in any child component to access toast. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastContext.Provider')
  return ctx
}
