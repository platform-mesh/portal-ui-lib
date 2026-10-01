import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  framework: '@storybook/angular-vite',
  stories: ['./stories/**/*.stories.ts'],
  addons: [],
};

export default config;
