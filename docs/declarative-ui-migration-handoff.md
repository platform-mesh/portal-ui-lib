# Handoff: Migrate generic-form / generic-table → declarative-form / declarative-table

## Goal

Replace internal `pm-generic-form` and `pm-generic-table` components with
`mfp-declarative-form` and `mfp-declarative-table` from `@openmfp/ngx`
(the webcomponents repo Angular library). This aligns the UI layer with the
OpenMFP platform standard.

---

## Progress

| Task | Status |
|---|---|
| Add `trackByPath` string input to `DeclarativeTable` in webcomponents | ✅ |
| Build and yalc-link `@openmfp/ngx` into portal-ui-lib-1 | ✅ |
| Replace `GenericTable` → `DeclarativeTable` in `list-view` | ✅ |
| Replace `GenericForm` → `DeclarativeForm` in `create-resource-modal` | ✅ |
| Export types from `@openmfp/ngx` (`UiSettings`, `FieldDefinition`, etc.) | ✅ |
| Fix `ui-definition.ts` in portal-ui-lib-1 (dedup, re-export from `@openmfp/ngx`) | ✅ |
| Update e2e helpers in helm-charts (field test-ids: underscore → dot notation) | ✅ |
| Browser smoke test at `http://sub.localhost:4300` | ✅ |

---

## Pending Tasks

### 1. Fix unit tests

`create-resource-modal.component.spec.ts` is written and logically correct but
cannot run due to two issues:

**Issue A — JIT compiler not available in Vitest**

```
The component 'Bar' needs to be compiled using the JIT compiler,
but '@angular/compiler' is not available.
```

`@fundamental-ngx/ui5-webcomponents` in `node_modules` ships components with
`templateUrl` that require the Angular JIT compiler. Vitest does not load
`@angular/compiler` automatically.

Fix requires updating `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-stubs/setup.ts'],
    server: {
      deps: {
        inline: [/@openmfp\/ngx/],
      },
    },
  },
  resolve: {
    dedupe: ['@angular/core', '@angular/common', '@angular/compiler'],
    alias: [
      { find: /^@ui5\/webcomponents-icons(\/.+)?$/, replacement: '/test-stubs/empty.js' },
      { find: /^@ui5\/webcomponents-fiori(\/.+)?$/, replacement: '/test-stubs/empty.js' },
      { find: /^@fundamental-ngx\/ui5-webcomponents-fiori(\/.+)?$/, replacement: '/test-stubs/empty.js' },
      { find: /^gridstack(\/.+)?$/, replacement: '/test-stubs/empty.js' },
      { find: /^@apollo\/client(\/.+)?$/, replacement: '/test-stubs/empty.js' },
    ],
  },
});
```

`test-stubs/setup.ts` (file already exists):

```ts
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
```

**Issue B — `onFormSubmit` type mismatch in spec**

The linter narrowed `onFormSubmit(value: Resource)` — the spec passes a flat
dot-notation object `{ 'metadata.name': 'new-res' }` which does not satisfy
`Resource`. Fix: revert the signature to `value: Record<string, unknown>` with
`as Resource` at the emit call sites, or cast in the spec with `as any`.

---

### 2. Delete dead components

`generic-form/` and `generic-table/` are no longer imported anywhere but still
exist in the repo:

```
projects/wc/src/app/components/generic-ui/generic-form/
projects/wc/src/app/components/generic-ui/generic-table/
```

---

### 3. Publish `@openmfp/ngx` to npm

The new `trackByPath` input and type exports are currently only available via
`yalc`. Once the changes in the webcomponents repo are merged, publish a new
version to npm and replace the yalc link:

```bash
# Remove yalc link
yalc remove @openmfp/ngx

# Install published version
npm install @openmfp/ngx@<new-version>
```

---

## Key Design Decisions

### Host-owned validation

`DeclarativeForm` has no built-in validation logic. Validation is owned by
`CreateResourceModal`:

- `validateField(name, value)` — switch-based, runs only for the changed field
- `fieldErrors` signal — passed as `[fieldErrors]` input to `mfp-declarative-form`
- `isFormValid` computed — `true` when `fieldErrors` has no entries
- `validation: 'onChange'` on required fields — tells the form component when
  to display errors (after first user interaction, not on open)

### Namespace prefetch

`DeclarativeForm` has no `loadValues` concept. For namespaced resources the
namespace dropdown options are prefetched in `open()` before the dialog becomes
visible, stored as `values: string[]` on `FormFieldDefinition`.

### Type ownership

`FieldDefinition` in `portal-ui-lib-1/models` extends `@openmfp/ngx`'s base
`FieldDefinition` with portal-specific fields (`required`, `values`, `group`,
`dynamicValuesDefinition`). Identical types (`UiSettings`, `PropertyField`,
`ButtonSettings`, etc.) are re-exported from `@openmfp/ngx` to avoid
duplication.

### Field name format

Form field names use dot notation (`metadata.name`, `spec.type`) — no
sanitization to underscores. This changes e2e test-ids:
`generic-form-field-metadata_name` → `generic-form-field-metadata.name`.
