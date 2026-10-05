import type { Locator, Page } from '@playwright/test';

export type ErrorPageCode = 403 | 404;

interface ErrorIllustration {
  scene: string;
  drawingId: string;
}

export class ErrorPage {
  static readonly viewName = 'error-component';
  static readonly titles: Record<ErrorPageCode, string> = {
    403: 'You are not authorized to access this content.',
    404: "The content you specified can't be found",
  };
  static readonly illustrations: Record<ErrorPageCode, ErrorIllustration> = {
    403: {
      scene: 'tnt/UnsuccessfulAuth',
      drawingId: 'tnt-Scene-UnsuccessfulAuth',
    },
    404: { scene: 'NoEntries', drawingId: 'sapIllus-Scene-NoEntries' },
  };

  readonly title: Locator;
  private readonly illustratedMessage: Locator;

  constructor(page: Page) {
    this.title = page.getByTestId('error-view-title');
    this.illustratedMessage = page.getByTestId('error-view-illustration');
  }

  static path(code: ErrorPageCode): string {
    return `/error/${code}`;
  }

  illustration(code: ErrorPageCode): Locator {
    return this.illustratedMessage.getByRole('img', {
      name: ErrorPage.illustrations[code].scene,
      exact: true,
    });
  }

  illustrationDrawing(code: ErrorPageCode): Locator {
    return this.illustration(code).locator(
      `svg#${ErrorPage.illustrations[code].drawingId}`,
    );
  }
}
