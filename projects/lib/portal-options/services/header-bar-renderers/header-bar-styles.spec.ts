import { ensureHeaderBarStyles } from './header-bar-styles';

describe('ensureHeaderBarStyles', () => {
  beforeEach(() => {
    document.getElementById('pm-header-bar-styles')?.remove();
  });

  it('adds the header bar styles to the page', () => {
    // when
    ensureHeaderBarStyles();

    // then
    const style = document.getElementById('pm-header-bar-styles');
    expect(style?.textContent).toContain('.pm-breadcrumbs');
  });

  it('adds the styles only once', () => {
    // when
    ensureHeaderBarStyles();
    ensureHeaderBarStyles();

    // then
    expect(document.querySelectorAll('#pm-header-bar-styles').length).toBe(1);
  });
});
