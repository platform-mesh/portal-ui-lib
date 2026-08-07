export interface Permission {
  actions: string[];
  resource: string;
}

export interface InstancePermission extends Permission {
  namespace?: string;
  name?: string;
}
