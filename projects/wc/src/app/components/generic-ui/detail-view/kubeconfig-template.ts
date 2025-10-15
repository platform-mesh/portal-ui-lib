export const kubeConfigTemplate = `
    apiVersion: v1
    kind: Config
    clusters:
    - name: <cluster-name>
      cluster:
        certificate-authority-data: <ca-data>
        server: <server-url>
    contexts:
    - name: <cluster-name>
      context:
        cluster: <cluster-name>
        user: <cluster-name>
    current-context: <cluster-name>
    users:
    - name: <cluster-name>
      user:
        exec:
          apiVersion: client.authentication.k8s.io/v1beta1
          args:
          - oidc-login
          - get-token
          - --oidc-issuer-url=<oidc-issuer-url>
          - --oidc-client-id=kubectl
          - --oidc-extra-scope=email
          command: kubectl
          env: null
          interactiveMode: IfAvailable
`;
