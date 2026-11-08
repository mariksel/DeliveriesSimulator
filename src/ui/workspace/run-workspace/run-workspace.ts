import { CdkDrag } from '@angular/cdk/drag-drop';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    linkedSignal,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventList } from '../../technical-view/event-list/event-list';
import type {
    IBreakpointSwitch,
    INewBreakpoint,
} from '../../simulation-engine/breakpoints-panel/breakpoints-panel';
import { BreakpointsPanel } from '../../simulation-engine/breakpoints-panel/breakpoints-panel';
import { OutboxInboxInspector } from '../../technical-view/outbox-inbox-inspector/outbox-inbox-inspector';
import { PayloadViewer } from '../../technical-view/payload-viewer/payload-viewer';
import { TraceDiagram } from '../../technical-view/trace-diagram/trace-diagram';
import { RulesPanel } from '../../business-rules/rules-panel/rules-panel';
import { ForkIcon } from '../../shell/icons/fork-icon';
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { IBranchRename, INodeToggle } from '../../run-history/timeline-panel/timeline-panel';
import { TimelinePanel } from '../../run-history/timeline-panel/timeline-panel';
import { IndirectEffectForm } from '../../run-history/indirect-effect-form/indirect-effect-form';
import type { IndirectStatement } from '../../../application-core/simulation-engine/indirect-effect';
import type { RowMode } from '../../run-history/timeline-grid';
import type { TimelineZoom } from '../../run-history/timeline-view';
import type { BranchId } from '../../../application-core/simulation-engine/branch-id';
import type { IRuleEdit } from '../../business-rules/rules-view';
import { StepSize } from '../../../application-core/simulation-engine/run-places';

import type { ClockSpeed } from '../../../application/scenarios/live-scenario-run';
import { MAX_SPEED } from '../../../application/scenarios/live-scenario-run';
import { ARROW_STEP_PX, resized } from '../panel-size';
import { parseSpeed, SPEED_PRESETS, speedLabel } from '../run-view';
import { shortcutFor, ShortcutKind } from '../shortcuts';
import type { ITimelineChoice } from '../watched-run-store';
import { DetailTab, MainTab, WatchedRunStore } from '../watched-run-store';

const START_DETAIL_PX = 320;
const START_TIMELINE_PX = 200;

/**
 * The run workspace in its first form: the run's controls, a main area, its timeline, and a detail
 * panel.
 */
@Component({
    selector: 'app-run-workspace',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        BreakpointsPanel,
        CdkDrag,
        EventList,
        ForkIcon,
        IndirectEffectForm,
        OutboxInboxInspector,
        PayloadViewer,
        RouterLink,
        RulesPanel,
        TimelinePanel,
        Tooltip,
        TraceDiagram,
    ],
    templateUrl: './run-workspace.html',
    styleUrl: './run-workspace.css',
    host: { '(document:keydown)': 'useShortcut($event)' },
})
export class RunWorkspace {
    private readonly store = inject(WatchedRunStore);
    private readonly detailPx = signal(START_DETAIL_PX);
    private readonly timelinePx = signal(START_TIMELINE_PX);
    private dragStartPx = 0;
    protected readonly view = this.store.view;
    protected readonly entries = this.store.entries;
    protected readonly allEntries = this.store.allEntries;
    protected readonly stepSize = this.store.stepSize;
    protected readonly stepSizes = StepSize;
    protected readonly selected = this.store.selected;
    protected readonly selectedEntry = this.store.selectedEntry;
    protected readonly tab = this.store.tab;
    protected readonly tabs = DetailTab;
    protected readonly mainTab = this.store.mainTab;
    protected readonly mainTabs = MainTab;
    protected readonly timelineSize = this.timelinePx;
    protected readonly inspectorMode = this.store.inspectorMode;
    protected readonly warnings = this.store.warnings;
    protected readonly rules = this.store.rules;
    protected readonly timelineHeadings = this.store.timelineHeadings;
    protected readonly timelineRows = this.store.timelineRows;
    protected readonly rowMode = this.store.rowMode;
    protected readonly zoom = this.store.zoom;
    protected readonly breakpoints = this.store.breakpoints;
    protected readonly lastHit = this.store.lastHit;
    protected readonly loggedKinds = this.store.loggedKinds;
    protected readonly names = this.store.names;
    /** Whether the form to state an indirect effect is open. */
    protected readonly isStatingIndirect = signal(false);
    protected readonly kindsPausedAt = this.store.kindsPausedAt;
    protected readonly ruleProblem = this.store.ruleProblem;
    protected readonly presets = SPEED_PRESETS;
    protected readonly label = speedLabel;
    protected readonly isSpeedInvalid = signal(false);
    /**
     * What the speed box shows: the typed speed in use, until someone types over it or chooses a
     * preset.
     */
    protected readonly typedSpeedText = linkedSignal(() => this.view()?.customSpeed ?? '');
    protected readonly detailWidth = computed(() => `${this.detailPx()}px`);
    protected readonly timelineHeight = computed(() => `${this.timelinePx()}px`);

    constructor() {
        this.store.comeBack();
        inject(DestroyRef).onDestroy(() => {
            this.store.leave();
        });
    }

    protected back(): void {
        this.store.back();
    }

    protected forward(): void {
        this.store.forward();
    }

    protected chooseStepSize(size: StepSize): void {
        this.stepSize.set(size);
    }

    protected showPlace(text: string): void {
        const place = Number(text);
        this.store.showPlace(place);
    }

    protected showLatest(): void {
        this.store.showLatest();
    }

    protected repeatFromHere(): void {
        this.store.repeatFromHere();
    }

    protected forkHere(): void {
        this.store.forkHere();
    }

    protected toggleIndirectForm(): void {
        this.isStatingIndirect.update((isOpen) => !isOpen);
    }

    protected stateIndirect(statement: IndirectStatement): void {
        this.store.stateIndirect(statement);
        this.isStatingIndirect.set(false);
    }

    protected forkAtCommit(choice: ITimelineChoice): void {
        this.store.forkAtCommit(choice);
    }

    protected watchBranch(id: BranchId): void {
        this.store.watchBranch(id);
    }

    protected renameBranch(rename: IBranchRename): void {
        this.store.renameBranch(rename.id, rename.name);
    }

    protected toggleNode(toggle: INodeToggle): void {
        this.store.toggleNode(toggle.key, toggle.isOpen);
    }

    protected chooseRowMode(mode: RowMode): void {
        this.store.chooseRowMode(mode);
    }

    protected addBreakpoint(breakpoint: INewBreakpoint): void {
        this.store.addBreakpoint(breakpoint.kind, breakpoint.source, breakpoint.order);
    }

    protected switchBreakpoint(change: IBreakpointSwitch): void {
        this.store.switchBreakpoint(change.id, change.isOn);
    }

    protected removeBreakpoint(id: number): void {
        this.store.removeBreakpoint(id);
    }

    protected toggleKindBreakpoint(kind: string): void {
        this.store.toggleKindBreakpoint(kind);
    }

    protected chooseZoom(zoom: TimelineZoom): void {
        this.store.chooseZoom(zoom);
    }

    protected chooseOnTimeline(choice: ITimelineChoice): void {
        this.store.chooseOnTimeline(choice);
    }

    protected select(sequence: number): void {
        this.store.select(sequence);
    }

    protected showTab(tab: DetailTab): void {
        this.store.showTab(tab);
    }

    protected changeRule(edit: IRuleEdit): void {
        this.store.changeRule(edit);
    }

    protected showMainTab(tab: MainTab): void {
        this.store.showMainTab(tab);
    }

    protected startOrPause(): void {
        this.store.startOrPause();
    }

    protected step(): void {
        this.store.step();
    }

    protected chooseSpeed(speed: ClockSpeed): void {
        this.isSpeedInvalid.set(false);
        this.typedSpeedText.set('');
        this.store.setSpeed(speed);
    }

    protected editTypedSpeed(text: string): void {
        this.isSpeedInvalid.set(false);
        this.typedSpeedText.set(text);
    }

    protected chooseTypedSpeed(text: string): void {
        const speed = parseSpeed(text);
        this.isSpeedInvalid.set(speed === null);
        if (speed !== null) {
            this.store.setSpeed(speed);
        }
    }

    protected runOn(): void {
        this.store.runOnPastTheEnd();
    }

    protected runAgain(): void {
        this.store.runAgain();
    }

    protected useShortcut(event: KeyboardEvent): void {
        const focusTag = event.target instanceof Element ? event.target.tagName : '';
        const shortcut = shortcutFor(event.key, focusTag);
        if (shortcut === null) {
            return;
        }
        event.preventDefault();
        if (shortcut.kind === ShortcutKind.Speed) {
            this.chooseSpeed(SPEED_PRESETS[shortcut.preset] ?? MAX_SPEED);
        } else if (shortcut.kind === ShortcutKind.Step) {
            this.step();
        } else {
            this.startOrPause();
        }
    }

    protected startDetailDrag(): void {
        this.dragStartPx = this.detailPx();
    }

    protected dragDetail(distanceX: number): void {
        const secondResized = resized(this.dragStartPx, -distanceX);
        this.detailPx.set(secondResized);
    }

    protected startTimelineDrag(): void {
        this.dragStartPx = this.timelinePx();
    }

    protected dragTimeline(distanceY: number): void {
        const secondResized = resized(this.dragStartPx, -distanceY);
        this.timelinePx.set(secondResized);
    }

    protected nudgeDetail(direction: number): void {
        this.detailPx.update((size) => resized(size, direction * ARROW_STEP_PX));
    }

    protected nudgeTimeline(direction: number): void {
        this.timelinePx.update((size) => resized(size, direction * ARROW_STEP_PX));
    }
}
