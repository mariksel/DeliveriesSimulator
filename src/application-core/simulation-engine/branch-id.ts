/**
 * Identifies one branch of a run. With a commit's ID it names that commit across the whole
 * run, as commit numbers count along each branch's own line of commits (FND-87).
 */
export type BranchId = string & { readonly brand: 'BranchId' };
/** Makes a {@link BranchId} from a string. */
export const toBranchId = (value: string): BranchId => value as BranchId;

/** The first branch of every run. */
export const MAIN_BRANCH = toBranchId('main');
