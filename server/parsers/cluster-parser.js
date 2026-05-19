const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function parse(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');

  let data;
  if (ext === '.yaml' || ext === '.yml') {
    data = yaml.load(content);
  } else {
    data = JSON.parse(content);
  }

  if (!data) return null;

  // Kubernetes List format
  if (data.kind === 'List' && Array.isArray(data.items)) {
    return parseK8sList(data.items);
  }

  // Flat format with top-level nodes/pods
  if (data.nodes || data.pods) {
    return parseFlatFormat(data);
  }

  // Single resource
  if (data.kind === 'Node') {
    return parseK8sList([data]);
  }

  // Try to detect structure
  if (Array.isArray(data)) {
    return parseK8sList(data);
  }

  return null;
}

function parseK8sList(items) {
  const nodes = [];
  const podsByNamespace = {};

  for (const item of items) {
    if (item.kind === 'Node') {
      nodes.push(extractNode(item));
    } else if (item.kind === 'Pod') {
      const ns = item.metadata?.namespace || 'default';
      if (!podsByNamespace[ns]) podsByNamespace[ns] = [];
      podsByNamespace[ns].push(extractPod(item));
    }
  }

  return buildResult(nodes, podsByNamespace);
}

function parseFlatFormat(data) {
  const nodes = (data.nodes || []).map(n => ({
    name: n.name || n.metadata?.name || '',
    role: detectRole(n.role || '', n.labels || n.metadata?.labels || {}),
    labels: n.labels || n.metadata?.labels || {},
    addresses: n.addresses || n.status?.addresses || []
  }));

  const podsByNamespace = {};
  for (const pod of (data.pods || [])) {
    const ns = pod.namespace || pod.metadata?.namespace || 'default';
    if (!podsByNamespace[ns]) podsByNamespace[ns] = [];
    podsByNamespace[ns].push({
      name: pod.name || pod.metadata?.name || '',
      namespace: ns,
      spec: pod.spec || {},
      containers: extractContainers(pod.spec || pod)
    });
  }

  return buildResult(nodes, podsByNamespace);
}

function extractNode(item) {
  const labels = item.metadata?.labels || {};
  return {
    name: item.metadata?.name || '',
    role: detectRole('', labels),
    labels,
    addresses: item.status?.addresses || []
  };
}

function detectRole(explicitRole, labels) {
  if (explicitRole) return explicitRole;
  const labelKeys = Object.keys(labels);
  if (labelKeys.some(k => k.includes('control-plane') || k.includes('master'))) return 'control-plane';
  if (labelKeys.some(k => k.includes('worker'))) return 'worker';
  return 'unknown';
}

function extractPod(item) {
  return {
    name: item.metadata?.name || '',
    namespace: item.metadata?.namespace || 'default',
    spec: item.spec || {},
    containers: extractContainers(item.spec || {})
  };
}

function extractContainers(spec) {
  return (spec.containers || []).map(c => ({
    name: c.name || '',
    image: c.image || ''
  }));
}

function buildResult(nodes, podsByNamespace) {
  const controlPlane = nodes.filter(n => n.role === 'control-plane' || n.role === 'master').length;
  const workers = nodes.filter(n => n.role === 'worker').length;

  return {
    topology: {
      controlPlane,
      workers,
      total: nodes.length,
      isSNO: nodes.length === 1
    },
    nodes,
    podsByNamespace
  };
}

module.exports = { parse };
