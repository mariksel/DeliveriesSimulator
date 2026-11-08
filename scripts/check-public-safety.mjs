// Fails when a file git would publish holds text that looks like private identity (FND-23,
// FND-63). It finds patterns only: it cannot recognise the real service's name, so it is not
// enough on its own.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PATTERNS = [
    ['email address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/],
    ['Windows drive path', /\b[A-Za-z]:[\\/][A-Za-z0-9._-]/],
    ['home folder path', /\/(?:Users|home)\/[A-Za-z0-9._-]+/],
    ['file URL', /file:\/\//i],
];

/** Each line that looks private. The matched text is left out, so a report never repeats it. */
export function findPrivateText(text) {
    return text.split('\n').flatMap((line, index) =>
        PATTERNS.filter(([, pattern]) => pattern.test(line)).map(([kind]) => ({
            line: index + 1,
            kind,
        })),
    );
}

function main() {
    const listed = execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        {
            encoding: 'utf8',
        },
    );
    // Git still lists a tracked file that has been moved or deleted but not committed.
    const files = listed.split('\0').filter((file) => file && existsSync(file));
    const findings = files.flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return text.includes('\0')
            ? []
            : findPrivateText(text).map((found) => ({ file, ...found }));
    });

    for (const { file, line, kind } of findings) {
        console.error(`${file}:${line}: ${kind}`);
    }
    console.log(
        `Public safety: ${files.length} files, ${findings.length} findings. Patterns only; see FND-63.`,
    );
    process.exitCode = findings.length > 0 ? 1 : 0;
}

if (import.meta.main) {
    main();
}
