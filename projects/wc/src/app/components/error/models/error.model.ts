export interface ErrorConfig {
  scene: string;
  illustratedMessageTitle: string;
  illustratedMessageText: string;
  buttons: ButtonConfig[];
}

export interface ButtonConfig {
  url?: string;
  label?: string;
  route?: {
    context: string;
  };
}
