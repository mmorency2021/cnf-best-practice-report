const fs = require('fs');
const path = require('path');

let catalogData = null;

const PRIORITY_MAP = {
  'access-control-bpf-capability-check': 1,
  'access-control-cluster-role-bindings': 1,
  'access-control-container-host-port': 1,
  'access-control-crd-roles': 2,
  'access-control-ipc-lock-capability-check': 1,
  'access-control-namespace': 2,
  'access-control-namespace-resource-quota': 2,
  'access-control-net-admin-capability-check': 1,
  'access-control-net-raw-capability-check': 1,
  'access-control-no-1337-uid': 1,
  'access-control-one-process-per-container': 3,
  'access-control-pod-automount-service-account-token': 1,
  'access-control-pod-host-ipc': 1,
  'access-control-pod-host-network': 1,
  'access-control-pod-host-path': 1,
  'access-control-pod-host-pid': 1,
  'access-control-pod-role-bindings': 2,
  'access-control-pod-service-account': 1,
  'access-control-requests': 2,
  'access-control-security-context': 2,
  'access-control-security-context-non-root-user-id-check': 0,
  'access-control-security-context-privilege-escalation': 1,
  'access-control-security-context-read-only-file-system': 1,
  'access-control-service-type': 1,
  'access-control-ssh-daemons': 1,
  'access-control-sys-admin-capability-check': 1,
  'access-control-sys-nice-realtime-capability': 1,
  'access-control-sys-ptrace-capability': 1,
  'affiliated-certification-container-is-certified-digest': 4,
  'affiliated-certification-helm-version': 2,
  'affiliated-certification-helmchart-is-certified': 4,
  'affiliated-certification-operator-is-certified': 4,
  'lifecycle-affinity-required-pods': 3,
  'lifecycle-container-poststart': 2,
  'lifecycle-container-prestop': 2,
  'lifecycle-cpu-isolation': 2,
  'lifecycle-crd-scaling': 2,
  'lifecycle-deployment-scaling': 2,
  'lifecycle-image-pull-policy': 1,
  'lifecycle-liveness-probe': 2,
  'lifecycle-persistent-volume-reclaim-policy': 1,
  'lifecycle-pod-high-availability': 2,
  'lifecycle-pod-owner-type': 2,
  'lifecycle-pod-recreation': 2,
  'lifecycle-pod-scheduling': 2,
  'lifecycle-pod-toleration-bypass': 2,
  'lifecycle-readiness-probe': 2,
  'lifecycle-startup-probe': 2,
  'lifecycle-statefulset-scaling': 2,
  'lifecycle-storage-provisioner': 2,
  'lifecycle-topology-spread-constraint': 2,
  'manageability-container-port-name-format': 2,
  'manageability-containers-image-tag': 2,
  'networking-dual-stack-service': 3,
  'networking-icmpv4-connectivity': 3,
  'networking-icmpv4-connectivity-multus': 4,
  'networking-icmpv6-connectivity': 4,
  'networking-icmpv6-connectivity-multus': 4,
  'networking-network-attachment-definition-sriov-mtu': 3,
  'networking-network-policy-deny-all': 2,
  'networking-ocp-reserved-ports-usage': 1,
  'networking-reserved-partner-ports': 2,
  'networking-restart-on-reboot-sriov-pod': 2,
  'networking-undeclared-container-ports-usage': 2,
  'observability-compatibility-with-next-ocp-release': 2,
  'observability-container-logging': 2,
  'observability-crd-status': 3,
  'observability-pod-disruption-budget': 3,
  'observability-termination-policy': 2,
  'operator-catalogsource-bundle-count': 2,
  'operator-crd-openapi-schema': 2,
  'operator-crd-versioning': 2,
  'operator-install-source': 2,
  'operator-install-status-no-privileges': 2,
  'operator-install-status-succeeded': 2,
  'operator-multiple-same-operators': 2,
  'operator-olm-skip-range': 2,
  'operator-pods-no-hugepages': 2,
  'operator-semantic-versioning': 2,
  'operator-single-crd-owner': 2,
  'operator-single-or-multi-namespaced-allowed-in-tenant-namespaces': 2,
  'performance-cpu-pinning-no-exec-probes': 2,
  'performance-exclusive-cpu-pool': 2,
  'performance-exclusive-cpu-pool-rt-scheduling-policy': 2,
  'performance-isolated-cpu-pool-rt-scheduling-policy': 2,
  'performance-max-resources-exec-probes': 2,
  'performance-rt-apps-no-exec-probes': 2,
  'performance-shared-cpu-pool-non-rt-scheduling-policy': 2,
  'platform-alteration-base-image': 2,
  'platform-alteration-boot-params': 2,
  'platform-alteration-cluster-operator-health': 2,
  'platform-alteration-hugepages-1g-only': 2,
  'platform-alteration-hugepages-2m-only': 2,
  'platform-alteration-hugepages-config': 2,
  'platform-alteration-hyperthread-enable': 2,
  'platform-alteration-is-selinux-enforcing': 2,
  'platform-alteration-isredhat-release': 2,
  'platform-alteration-ocp-lifecycle': 2,
  'platform-alteration-ocp-node-os-lifecycle': 2,
  'platform-alteration-service-mesh-usage': 2,
  'platform-alteration-sysctl-config': 2,
  'platform-alteration-tainted-node-kernel': 1
};

function load() {
  if (catalogData) return catalogData;
  const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
  try {
    catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  } catch {
    catalogData = {};
  }
  return catalogData;
}

function assignPriority(testId, overrides) {
  if (overrides && overrides[testId] !== undefined) return overrides[testId];
  if (PRIORITY_MAP[testId] !== undefined) return PRIORITY_MAP[testId];
  return 2;
}

function stripExceptionText(text) {
  if (!text) return '';
  return text
    .split(/(?<=[.;])\s+|(?:^|\s+)(?=No exceptions?\b)/i)
    .filter(s => !/\bexceptions?\b/i.test(s))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function enrich(results, priorityOverrides) {
  const catalog = load();
  return results.map(result => {
    const catalogEntry = catalog[result.id] || {};
    return {
      ...result,
      description: result.description || catalogEntry.description || '',
      remediation: stripExceptionText(result.remediation || catalogEntry.remediation || ''),
      bestPracticeRef: result.bestPracticeRef || catalogEntry.bestPracticeReference || '',
      impact: catalogEntry.impact || '',
      tags: result.tags || catalogEntry.tags || '',
      scenarios: catalogEntry.scenarios || result.categoryClassification || {},
      priority: assignPriority(result.id, priorityOverrides)
    };
  });
}

function getScenarioClassification(testId) {
  const catalog = load();
  const entry = catalog[testId];
  if (!entry) return {};
  return entry.scenarios || {};
}

module.exports = { load, enrich, assignPriority, getScenarioClassification };
