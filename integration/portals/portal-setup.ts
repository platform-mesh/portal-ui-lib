export interface StaticMount {
  urlPath: string;
  directory: string;
}

export interface PortalSetup {
  name: string;
  angularProject: string;
  port: number;
  testDir: string;
  staticMounts: StaticMount[];
}
