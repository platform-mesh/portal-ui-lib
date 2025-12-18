import { appConfig } from './app/app.config';
import './app/utils/ui5-configuration';
import '@angular/localize/init';
import { createApplication } from '@angular/platform-browser';

createApplication(appConfig).catch((err) => console.error(err));
