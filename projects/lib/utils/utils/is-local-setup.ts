export const isLocalSetup = () => {
  return window.location.hostname.includes('localhost') || window.location.hostname.includes('portal.dev.local');
};
