import { applicationConfig, type Preview } from '@storybook/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import '../projects/wc/src/app/utils/ui5-configuration';
import '@angular/localize/init';

// Give ui5-dynamic-page a full-viewport flex context.
// The previous fix gave #storybook-root a real height (813px) but
// ui5-dynamic-page itself stayed at 152px because neither the component host
// nor the dynamic-page element stretched to fill it. The additional rules below
// make the host (pm-search-list-dynamic-page) and ui5-dynamic-page flex-grow to
// fill the available height. Works together with parameters.layout:'fullscreen'
// already set on the search-list stories.
const globalStyle = document.createElement('style');
globalStyle.textContent = `
  html, body { height: 100%; margin: 0; padding: 0; }
  #storybook-root { height: 100%; display: flex; flex-direction: column; }
  .sb-show-main.sb-main-fullscreen #storybook-root { height: 100vh; }
  pm-search-list-dynamic-page { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
  pm-search-list-dynamic-page ui5-dynamic-page { flex: 1 1 auto; min-height: 0; height: 100%; }
`;
document.head.appendChild(globalStyle);

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
