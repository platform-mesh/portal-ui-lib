/**
 * Navigates to a path via Luigi Core by posting a `luigi.navigation.open` message directly,
 * bypassing the public `LuigiCoreService.navigation().navigate()` API.
 *
 * This is intentional: the public API always calls `history.pushState`, with no way to
 * request `replaceState` instead. Luigi's internal `preventHistoryEntry` flag is read by
 * the Svelte shell and results in `history.replaceState`, but it is not exposed through
 * `linkManager.navigate()`. Posting the message directly lets us set that flag until
 * Luigi exposes it as a first-class option in its public navigation API.
 */
export function luigiNavigateTo(path: string, replaceHistory = false): void {
  window.postMessage(
    {
      msg: 'luigi.navigation.open',
      params: {
        link: path,
        relative: false,
        preserveView: false,
        nodeParams: {},
        errorSkipNavigation: false,
        fromContext: null,
        fromParent: false,
        fromClosestContext: false,
        preventHistoryEntry: replaceHistory,
      },
    },
    '*',
  );
}
