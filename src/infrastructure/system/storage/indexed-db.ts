/*
 * Small helpers over IndexedDB's requests and transactions, which every repository in browser
 * storage shares (FND-15).
 */

/** A request's result, once it succeeds, as storage gave it: checked before it is used. */
export function settled(request: IDBRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
        request.onsuccess = (): void => {
            const result: unknown = request.result;
            resolve(result);
        };
        request.onerror = (): void => {
            reject(request.error ?? new Error('A browser storage request failed.'));
        };
    });
}

/** Once a transaction has committed, or why it did not. */
export function committed(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = (): void => {
            resolve();
        };
        transaction.onerror = (): void => {
            reject(transaction.error ?? new Error('A browser storage transaction failed.'));
        };
        transaction.onabort = (): void => {
            reject(transaction.error ?? new Error('A browser storage transaction was aborted.'));
        };
    });
}

/** Opens a database at a version, making its stores with `upgrade` on the first open. */
export function opened(
    factory: IDBFactory,
    name: string,
    version: number,
    upgrade: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = factory.open(name, version);
        request.onupgradeneeded = (): void => {
            upgrade(request.result);
        };
        request.onsuccess = (): void => {
            resolve(request.result);
        };
        request.onerror = (): void => {
            reject(request.error ?? new Error('Browser storage could not be opened.'));
        };
    });
}

/** Whether a value is a plain record, as storage gives one back. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/** Whether storage refused something for want of room: a quota exceeded (FND-81). */
export const isQuotaExceeded = (error: unknown): boolean =>
    isRecord(error) && error['name'] === 'QuotaExceededError';
