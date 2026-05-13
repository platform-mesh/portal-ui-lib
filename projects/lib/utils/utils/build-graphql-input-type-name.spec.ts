import { buildGraphQLInputTypeName } from './build-graphql-input-type-name';

describe('buildGraphQLInputTypeName', () => {
  describe('core API types (empty group)', () => {
    it('should produce V1Kind_Input for core v1 types', () => {
      expect(buildGraphQLInputTypeName(undefined, 'v1', 'ConfigMap')).toBe(
        'V1ConfigMap_Input',
      );
      expect(buildGraphQLInputTypeName(undefined, 'v1', 'Pod')).toBe(
        'V1Pod_Input',
      );
      expect(buildGraphQLInputTypeName(undefined, 'v1', 'Secret')).toBe(
        'V1Secret_Input',
      );
      expect(buildGraphQLInputTypeName(undefined, 'v1', 'Service')).toBe(
        'V1Service_Input',
      );
      expect(buildGraphQLInputTypeName(undefined, 'v1', 'Namespace')).toBe(
        'V1Namespace_Input',
      );
    });

    it('should handle empty string group as no group', () => {
      expect(buildGraphQLInputTypeName('', 'v1', 'ConfigMap')).toBe(
        'V1ConfigMap_Input',
      );
    });
  });

  describe('apps group', () => {
    it('should produce AppsV1Kind_Input for apps/v1 types', () => {
      expect(buildGraphQLInputTypeName('apps', 'v1', 'Deployment')).toBe(
        'AppsV1Deployment_Input',
      );
      expect(buildGraphQLInputTypeName('apps', 'v1', 'StatefulSet')).toBe(
        'AppsV1StatefulSet_Input',
      );
      expect(buildGraphQLInputTypeName('apps', 'v1', 'DaemonSet')).toBe(
        'AppsV1DaemonSet_Input',
      );
      expect(buildGraphQLInputTypeName('apps', 'v1', 'ReplicaSet')).toBe(
        'AppsV1ReplicaSet_Input',
      );
    });
  });

  describe('networking.k8s.io group', () => {
    it('should produce NetworkingK8sIoV1Kind_Input', () => {
      expect(
        buildGraphQLInputTypeName('networking.k8s.io', 'v1', 'Ingress'),
      ).toBe('NetworkingK8sIoV1Ingress_Input');
      expect(
        buildGraphQLInputTypeName('networking.k8s.io', 'v1', 'NetworkPolicy'),
      ).toBe('NetworkingK8sIoV1NetworkPolicy_Input');
    });
  });

  describe('batch group', () => {
    it('should produce BatchV1Kind_Input', () => {
      expect(buildGraphQLInputTypeName('batch', 'v1', 'Job')).toBe(
        'BatchV1Job_Input',
      );
      expect(buildGraphQLInputTypeName('batch', 'v1', 'CronJob')).toBe(
        'BatchV1CronJob_Input',
      );
    });
  });

  describe('autoscaling group', () => {
    it('should produce AutoscalingV1Kind_Input', () => {
      expect(
        buildGraphQLInputTypeName(
          'autoscaling',
          'v1',
          'HorizontalPodAutoscaler',
        ),
      ).toBe('AutoscalingV1HorizontalPodAutoscaler_Input');
    });
  });

  describe('custom CRD groups', () => {
    it('should handle custom.io group', () => {
      expect(buildGraphQLInputTypeName('custom.io', 'v1', 'Component')).toBe(
        'CustomIoV1Component_Input',
      );
    });

    it('should handle groups with hyphens', () => {
      expect(
        buildGraphQLInputTypeName('my-custom.example.io', 'v1beta1', 'Widget'),
      ).toBe('MyCustomExampleIoV1beta1Widget_Input');
    });

    it('should handle groups starting with a digit', () => {
      expect(
        buildGraphQLInputTypeName('3scale.net', 'v1', 'APIProduct'),
      ).toBe('3scaleNetV1APIProduct_Input');
    });
  });

  describe('edge cases', () => {
    it('should handle version without group', () => {
      expect(buildGraphQLInputTypeName(undefined, 'v1alpha1', 'TestKind')).toBe(
        'V1alpha1TestKind_Input',
      );
    });

    it('should handle group without version', () => {
      expect(buildGraphQLInputTypeName('apps', undefined, 'Deployment')).toBe(
        'AppsDeployment_Input',
      );
    });

    it('should handle neither group nor version', () => {
      expect(buildGraphQLInputTypeName(undefined, undefined, 'TestKind')).toBe(
        'TestKind_Input',
      );
    });

    it('should handle core_platform_mesh_io style groups', () => {
      expect(
        buildGraphQLInputTypeName(
          'core_platform_mesh_io',
          'v1alpha1',
          'AccountInfo',
        ),
      ).toBe('CorePlatformMeshIoV1alpha1AccountInfo_Input');
    });

    it('should handle core_kcp_io style groups', () => {
      expect(
        buildGraphQLInputTypeName('core_kcp_io', 'v1alpha1', 'LogicalCluster'),
      ).toBe('CoreKcpIoV1alpha1LogicalCluster_Input');
    });
  });
});
