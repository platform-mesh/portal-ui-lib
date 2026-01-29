import { ObjectMeta } from 'kubernetes-types/meta/v1';

export interface AccountInfo {
  metadata: ObjectMeta;
  spec: {
    clusterInfo: { ca: string };
    organization: { originClusterId: string };
    oidc: {
      issuerUrl: string;
      clients: {
        kubectl: {
          clientId: string;
        };
      };
    };
  };
}
