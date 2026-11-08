import type { List } from 'immutable';

import type { IViolation } from './criterion';
import { Criterion } from './criterion';
import { exactlyOnceEffect } from './exactly-once-effect';
import { modulesAgree } from './modules-agree';
import { outboxForEveryEvent } from './outbox-for-every-event';
import type { IRunRecord } from './run-record';
import { validFinalState } from './valid-final-state';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';

/** How a run did on one criterion. */
export interface ICriterionResult {
    readonly criterion: Criterion;
    readonly violations: List<IViolation>;
}

/** How a run did on every criterion. It passes when none is violated. */
export interface IRunCheck {
    readonly isPassed: boolean;
    readonly results: readonly ICriterionResult[];
    /** How many orders the log shows. With none, a pass says only that nothing went wrong. */
    readonly ordersJudged: Count;
}

/** Judges a run on the correctness criteria, from what its event log says it did. */
export function checkRunRecord(run: IRunRecord): IRunCheck {
    const results: readonly ICriterionResult[] = [
        { criterion: Criterion.ValidFinalState, violations: validFinalState(run) },
        { criterion: Criterion.ModulesAgree, violations: modulesAgree(run) },
        { criterion: Criterion.ExactlyOnceEffect, violations: exactlyOnceEffect(run) },
        { criterion: Criterion.OutboxForEveryEvent, violations: outboxForEveryEvent(run) },
    ];
    return {
        isPassed: results.every((result) => result.violations.isEmpty()),
        results,
        ordersJudged: toCount(run.statuses.size),
    };
}
