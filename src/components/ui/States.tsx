import { Component, type ErrorInfo, type ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Empty + error states                                                        */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  icon = '📊',
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-2xl">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-ink-100">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-ink-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Could not load this section',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-negative/25 bg-negative/[0.06] px-6 py-12 text-center"
    >
      <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-negative/12 text-xl text-negative">
        !
      </span>
      <h3 className="text-base font-semibold text-ink-100">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-400">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-2">
          Try again
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error boundary                                                              */
/* -------------------------------------------------------------------------- */

interface BoundaryProps {
  children: ReactNode;
  /** Shown instead of the default panel when the subtree throws. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Changing this value resets the boundary — pass the active videoId/tab. */
  resetKey?: unknown;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Keeps a thrown chart or tab from taking down the whole dashboard. Resets
 * automatically when `resetKey` changes, so navigating away clears the error.
 */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  override componentDidUpdate(prevProps: BoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Wire this to your telemetry sink (Sentry, Datadog, ...) in production.
    console.error('[LumaVision] render error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <ErrorState
        title="This section hit an unexpected error"
        message={error.message || 'An unknown rendering error occurred.'}
        onRetry={this.reset}
      />
    );
  }
}
