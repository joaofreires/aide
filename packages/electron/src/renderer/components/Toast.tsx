import { useToast } from '../hooks/useToast.js'

export function Toast() {
  const { state } = useToast()
  return (
    <div
      id="toast"
      className={state.type}
      style={{ display: state.visible ? 'block' : 'none' }}
    >
      {state.msg}
    </div>
  )
}
