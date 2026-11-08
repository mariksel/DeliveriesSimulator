import { Injectable, signal } from '@angular/core';

const NO_WIDTHS: ReadonlyMap<string, number> = new Map();
const NO_GROUPS: ReadonlyMap<string, ReadonlyMap<string, number>> = new Map();

/**
 * The widths of resized columns, by table group. They last while the app stays open, and a reload
 * resets them.
 */
@Injectable({ providedIn: 'root' })
export class ColumnWidthStore {
    private readonly groups = signal(NO_GROUPS);

    widthsIn(group: string): ReadonlyMap<string, number> {
        return this.groups().get(group) ?? NO_WIDTHS;
    }

    setWidth(group: string, key: string, px: number): void {
        this.groups.update(
            (groups) =>
                new Map([...groups, [group, new Map([...this.widthsIn(group), [key, px]])]]),
        );
    }
}
