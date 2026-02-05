import { ObjectMeta } from 'kubernetes-types/meta/v1';

export interface AccountInfo {
  metadata: ObjectMeta;
  spec: {
    account: {
      originClusterId: string;
    };
    clusterInfo: { ca: string };
    organization: { originClusterId: string; name: string };
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
