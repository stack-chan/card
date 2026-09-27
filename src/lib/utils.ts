/** A deliberately small class-name helper for the local shadcn-derived primitives.
 *  Keep explicit variants in the component/CSS rather than conflicting utilities.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
