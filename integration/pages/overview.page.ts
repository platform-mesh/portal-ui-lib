import type { NavigationNode } from './portal-shell.ts';

export class OverviewPage {
  static readonly path = '/home/overview';
  static readonly homeBreadcrumbLabel = 'Home';
  static readonly navigation: NavigationNode = {
    pathSegment: 'overview',
    label: 'Overview',
  };
}
