import { applicationConfig, moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { ResourceFormModal } from '../../projects/wc/src/app/components/generic-ui/resource-form-modal/resource-form-modal.component';
import {
  CANNED_CLUSTER_RESOURCE,
  FAKE_ERROR_HANDLER_SERVICE,
  makeDefaultResourceServiceStub,
} from './showcase-mocks';
import { CLUSTERS_CONTEXT } from './showcase-presets';
import { Component, ViewChild, AfterViewInit, signal } from '@angular/core';
import {
  DeleteConfirmationDialog,
  DeleteResourceConfirmationConfig,
} from '@openmfp/ngx';
import {
  ErrorHandlerService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';

// Fields mirroring CLUSTERS_DEFINITION.ui.createView.fields so the create/edit
// form renders realistic controls.
const CREATE_EDIT_FIELDS = [
  { property: 'metadata.name', label: 'Name', required: true },
  { property: 'spec.displayName', label: 'Display Name' },
  {
    property: 'spec.region',
    label: 'Region',
    values: ['eu-west-1', 'us-east-1'],
  },
  { property: 'spec.description', label: 'Description' },
] as any;

// Mirrors DetailView.deleteConfig so the Storybook delete modal matches
// exactly what production renders.
const DELETE_CONFIG: DeleteResourceConfirmationConfig = {
  title: 'Delete my-cluster',
  message: `<p>Are you sure you want to delete Cluster <b>my-cluster</b>?</p>
        <p class="dialog__message--critical">This action <b>cannot</b> be undone.</p>
        <p>Please type <b>my-cluster</b> to confirm:</p>`,
  confirmationText: 'my-cluster',
  confirmationPlaceholder: 'Type name',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
};

const providers = [
  { provide: ErrorHandlerService, useValue: FAKE_ERROR_HANDLER_SERVICE },
  {
    provide: ResourceService,
    useValue: makeDefaultResourceServiceStub([CANNED_CLUSTER_RESOURCE]),
  },
];

// ---------------------------------------------------------------------------
// Create modal host — opens the facade in create mode on init.
// ---------------------------------------------------------------------------
@Component({
  selector: 'pm-create-modal-host',
  standalone: true,
  imports: [ResourceFormModal],
  template: `<pm-resource-form-modal
    #modal
    [context]="context"
    [fields]="fields"
  />`,
})
class CreateModalHost implements AfterViewInit {
  @ViewChild('modal') modal!: ResourceFormModal;
  context = CLUSTERS_CONTEXT;
  fields = CREATE_EDIT_FIELDS;
  async ngAfterViewInit() {
    await this.modal.open();
  }
}

// ---------------------------------------------------------------------------
// Edit modal host — opens the facade in edit mode (with a resource).
// ---------------------------------------------------------------------------
@Component({
  selector: 'pm-edit-modal-host',
  standalone: true,
  imports: [ResourceFormModal],
  template: `<pm-resource-form-modal
    #modal
    [context]="context"
    [fields]="fields"
  />`,
})
class EditModalHost implements AfterViewInit {
  @ViewChild('modal') modal!: ResourceFormModal;
  context = CLUSTERS_CONTEXT;
  fields = CREATE_EDIT_FIELDS;
  async ngAfterViewInit() {
    await this.modal.open(CANNED_CLUSTER_RESOURCE);
  }
}

// ---------------------------------------------------------------------------
// Delete modal host — opens the inline ngx delete dialog, driven by a signal
// exactly like DetailView does.
// ---------------------------------------------------------------------------
@Component({
  selector: 'pm-delete-modal-host',
  standalone: true,
  imports: [DeleteConfirmationDialog],
  template: `<mfp-delete-confirmation-dialog
    [open]="open()"
    [config]="config"
  />`,
})
class DeleteModalHost {
  open = signal(true);
  config = DELETE_CONFIG;
}

const meta: Meta = {
  title: 'Generic UI / Modals',
  decorators: [applicationConfig({ providers }), moduleMetadata({})],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Create: Story = {
  render: () => ({
    template: `<pm-create-modal-host />`,
    moduleMetadata: { imports: [CreateModalHost] },
  }),
};

export const Edit: Story = {
  render: () => ({
    template: `<pm-edit-modal-host />`,
    moduleMetadata: { imports: [EditModalHost] },
  }),
};

export const Delete: Story = {
  render: () => ({
    template: `<pm-delete-modal-host />`,
    moduleMetadata: { imports: [DeleteModalHost] },
  }),
};
