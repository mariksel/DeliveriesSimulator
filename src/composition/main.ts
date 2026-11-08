import { bootstrapApplication } from '@angular/platform-browser';

import { App } from '../ui/shell/app/app';
import { APP_CONFIG } from './app.config';

bootstrapApplication(App, APP_CONFIG).catch((error: unknown) => {
    console.error(error);
});
