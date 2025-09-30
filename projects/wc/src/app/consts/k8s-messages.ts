export const k8sMessages = {
  RFC_1035: {
    href: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names',
    message: 'Invalid resource name accrording to RFC 1035',
    type: 'error',
  },
  RFC_1034_1123: {
    href: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names',
    message:
      'Organization name is not valid for subdomain usage, accrording to RFC 1034/1123.',
    type: 'error',
  },
} as const;
