import type { Routes } from '@angular/router';

import { RUNS_PATH, SECTIONS_TO_COME } from './sections';

/** Each section loads only when it is opened. */
export const ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: RUNS_PATH },
    {
        path: RUNS_PATH,
        pathMatch: 'full',
        loadComponent: () => import('../runs/runs-page/runs-page').then((page) => page.RunsPage),
    },
    {
        path: `${RUNS_PATH}/live`,
        loadComponent: () =>
            import('../workspace/run-workspace/run-workspace').then((page) => page.RunWorkspace),
    },
    ...SECTIONS_TO_COME.map(({ path, title, summary }) => ({
        path,
        data: { sectionTitle: title, summary },
        loadComponent: () =>
            import('./empty-section/empty-section').then((page) => page.EmptySection),
    })),
    { path: '**', redirectTo: RUNS_PATH },
];
