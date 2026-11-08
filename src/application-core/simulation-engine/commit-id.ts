/** Identifies a commit along its branch's line of commits. */
export type CommitId = string & { readonly brand: 'CommitId' };
/** Makes a {@link CommitId} from a string. */
export const toCommitId = (value: string): CommitId => value as CommitId;
