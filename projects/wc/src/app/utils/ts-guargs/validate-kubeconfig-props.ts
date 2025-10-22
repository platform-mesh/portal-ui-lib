function validateKubeconfigProps(props: any): asserts props is {
  accountId: string;
  organization: string;
  kcpCA: string;
  token: string;
  kcpWorkspaceUrl: string;
} {
  Object.entries(props).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Failed to download kubeconfig: ${key} is not defined in the context`);
    }
  });
}
