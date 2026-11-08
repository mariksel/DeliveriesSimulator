import { TextCopier } from '../../application-core/technical-view/text-copier';

/** Copies text to the browser's clipboard. A browser may refuse, which is not a bug. */
export class BrowserTextCopier extends TextCopier {
    async copy(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }
}
