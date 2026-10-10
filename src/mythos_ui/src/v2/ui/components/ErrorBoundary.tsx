// Mythos 2.0 — keeps one broken screen from taking down the whole app.
import { Component, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Rendered instead of the children after an error; `reset` re-mounts them. */
  fallback: (error: Error, reset: () => void) => ReactNode
  /** Changing this key clears the error (e.g. the screen key). */
  resetKey?: string
}

interface State {
  error: Error | null
  key?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { key: props.resetKey, error: null }
    return null
  }

  override componentDidCatch(error: Error): void {
    console.error('[mythos2] screen error', error)
  }

  reset = (): void => this.setState({ error: null })

  override render(): ReactNode {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset)
    return this.props.children
  }
}
