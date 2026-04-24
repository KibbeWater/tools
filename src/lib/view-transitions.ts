export const supportsViewTransitions = (): boolean =>
  typeof document !== 'undefined' && typeof (document as any).startViewTransition === 'function';

/**
 * Run a state update inside `document.startViewTransition` if available,
 * otherwise run it synchronously. Respects `prefers-reduced-motion` at the
 * CSS layer (durations are collapsed), but we don't block the transition here.
 */
export function withViewTransition(update: () => void | Promise<void>): void {
  if (!supportsViewTransitions()) {
    void update();
    return;
  }
  (document as any).startViewTransition(async () => {
    await update();
  });
}
