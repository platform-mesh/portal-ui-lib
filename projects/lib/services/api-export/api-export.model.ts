export interface ApiExport {
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  spec?: {
    permissionClaims?: { group?: string; resource: string; all?: boolean }[];
  };
  status?: {
    identityHash?: string;
    conditions?: { type: string; status: string; message?: string }[];
  };
  enabled: boolean;
}

export interface ApiExportListResponse {
  items: ApiExport[];
}
