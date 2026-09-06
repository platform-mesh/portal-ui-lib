/**
 * Action performed inside a modal, reported back on close.
 *
 * Extend this union when new modal outcomes are introduced (e.g. `'update'`,
 * `'delete'`). Consumers pass the action through `goBackContext` so the host
 * (e.g. a table) can react accordingly.
 */
export type ModalResultAction = 'create' | 'navigate' | 'loadTableData';

/**
 * How the modal was closed.
 *
 * - `'submit'` — the user completed the modal; `action`/`resource` are honored.
 * - `'cancelled'` — the modal was dismissed; the host performs no action.
 */
export type ModalResultStatus = 'submit' | 'cancelled';

/**
 * Context passed to `LuigiClient.linkManager().goBack(context)` when a modal
 * opened via `openAsModal` (button action `'openInModal'`) is closed. The
 * `openAsModal` promise resolves with this value.
 *
 * This is the documented contract consumers use to tell the host what happened
 * inside the modal — for example, that a resource was created and a table
 * should reload its data.
 *
 * When `status` is `'cancelled'` (or absent), the host performs no action,
 * regardless of `action` or `resource`.
 *
 * The interface is intentionally extensible: new outcomes are added to
 * `ModalResultAction`, and `resource` is generic so the affected resource can
 * be typed by the consumer.
 *
 * @typeParam T - Type of the affected resource.
 */
export interface ModalResultContext<T = unknown> {
  /** How the modal was closed. Treated as `'cancelled'` when omitted. */
  status?: ModalResultStatus;

  /** Action performed inside the modal (applied only when `status` is `'submit'`). */
  action?: ModalResultAction;

  /** Resource affected by the action (e.g. the created resource). May be undefined. */
  resource?: T;
}

/**
 * Value the `openAsModal` promise resolves with. Luigi wraps the
 * `goBackContext` passed to `LuigiClient.linkManager().goBack(context)` in a
 * `{ data }` envelope.
 *
 * The whole value may be `undefined` when the modal is closed without a
 * `goBack` context (e.g. dismissed via the close button or ESC).
 *
 * @typeParam T - Type of the affected resource.
 */
export interface ModalResult<T = unknown> {
  /** The `goBackContext` provided when closing the modal. */
  data?: ModalResultContext<T>;
}

