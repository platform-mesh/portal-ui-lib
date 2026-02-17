//workarround as https://docs.luigi-project.io/docs/luigi-client-api?section=addcoresearchparams doesn't work with wc microfrontedns
export const addSearchParams = (params: Record<string, string | undefined>) => {
  (window as any).Luigi.routing().addSearchParams(params);
};
