/** The most marks of one kind a place shows before they become one badge (FND-90). */
export const MOST_MARKS = 5;

/**
 * The marks of one kind at a place, such as a restaurant's orders: each as a mark when there are
 * up to five, or one badge with their count beyond, which lists them all (FND-90).
 */
export interface IMarkGroup {
    /** The marks drawn one by one: all of them, or none behind a badge. */
    readonly marks: readonly string[];
    /** The count on the badge, or null when the marks are drawn one by one. */
    readonly badge: number | null;
    /** Every one, as the badge's list shows them. */
    readonly all: readonly string[];
}

/** The marks of one kind at a place, drawn one by one, or as a badge past five. */
export function markGroup(ids: readonly string[]): IMarkGroup {
    const isBadge = ids.length > MOST_MARKS;
    return { marks: isBadge ? [] : ids, badge: isBadge ? ids.length : null, all: ids };
}
