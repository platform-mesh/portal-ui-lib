import { gql } from 'apollo-angular';

export const queryLoginCluster = gql`
  {
    core_kcp_io {
      v1alpha1 {
        LogicalCluster(name: "cluster") {
          status {
            phase
          }
        }
      }
    }
  }
`;
