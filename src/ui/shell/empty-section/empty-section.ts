import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A section not built yet: it says what will go there. */
@Component({
    selector: 'app-empty-section',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './empty-section.html',
    styleUrl: './empty-section.css',
})
export class EmptySection {
    readonly sectionTitle = input.required<string>();
    readonly summary = input.required<string>();
}
