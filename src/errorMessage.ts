/** The message to show for a refused operation, such as a data-layer rule. */
export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
