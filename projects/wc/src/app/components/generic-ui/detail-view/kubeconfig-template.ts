export interface KubeConfigTemplateProps {
  clusterName: string;
  serverUrl: string;
  kcpCA: string;
  oidcIssuerUrl: string;
  oidcKubectlClientId: string;
}

export const kubeConfigTemplate = (
  kubeconfigProps: KubeConfigTemplateProps,
) => `
    apiVersion: v1
    kind: Config
    clusters:
    - name: ${kubeconfigProps.clusterName}
      cluster:
        certificate-authority-data: ${kubeconfigProps.kcpCA}
        server: ${kubeconfigProps.serverUrl}
    contexts:
    - name: ${kubeconfigProps.clusterName}
      context:
        cluster: ${kubeconfigProps.clusterName}
        user: ${kubeconfigProps.clusterName}
    current-context: ${kubeconfigProps.clusterName}
    users:
    - name: ${kubeconfigProps.clusterName}
      user:
        exec:
          apiVersion: client.authentication.k8s.io/v1beta1
          args:
          - oidc-login
          - get-token
          - --oidc-issuer-url=${kubeconfigProps.oidcIssuerUrl}
          - --oidc-client-id=${kubeconfigProps.oidcKubectlClientId}
          - --oidc-extra-scope=email
          command: kubectl
          env: null
          interactiveMode: IfAvailable
`;
