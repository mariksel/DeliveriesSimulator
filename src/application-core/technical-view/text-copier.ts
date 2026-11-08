/** Copies text for the person using the simulator. The clipboard is outside the core. */
export abstract class TextCopier {
    /** Copies the text. Says whether that worked. */
    abstract copy(text: string): Promise<boolean>;
}
