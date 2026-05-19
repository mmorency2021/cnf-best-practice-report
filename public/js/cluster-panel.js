function renderClusterPanel(clusterData) {
  const panel = document.getElementById('cluster-panel');
  const layout = document.getElementById('dashboard-layout');

  if (!clusterData || clusterData.error) {
    panel.style.display = 'none';
    layout.classList.remove('has-cluster');
    return;
  }

  panel.style.display = 'block';
  layout.classList.add('has-cluster');
  panel.innerHTML = '';

  // Topology
  if (clusterData.topology) {
    const topo = clusterData.topology;
    const topoDiv = document.createElement('div');
    topoDiv.className = 'cluster-topology';

    let label = '';
    if (topo.isSNO) {
      label = 'Single Node OpenShift';
    } else {
      label = `${topo.controlPlane} Control Plane + ${topo.workers} Worker Nodes`;
    }

    topoDiv.innerHTML = `
      <div class="topology-card">
        <div class="topo-count">${topo.total}</div>
        <div class="topo-label">${label}</div>
      </div>`;

    // Node list
    if (clusterData.nodes && clusterData.nodes.length > 0) {
      const nodeList = document.createElement('ul');
      nodeList.className = 'node-list';
      for (const node of clusterData.nodes) {
        const li = document.createElement('li');
        const roleClass = node.role === 'control-plane' ? 'role-cp' : 'role-worker';
        const roleLabel = node.role === 'control-plane' ? 'CP' : 'W';
        li.innerHTML = `<span class="node-role ${roleClass}">${roleLabel}</span> ${escapeHtml(node.name)}`;
        nodeList.appendChild(li);
      }
      topoDiv.appendChild(nodeList);
    }

    panel.appendChild(topoDiv);
  }

  // Pods by namespace
  if (clusterData.podsByNamespace) {
    const nsTitle = document.createElement('h4');
    nsTitle.textContent = 'Pods';
    nsTitle.style.cssText = 'font-size:0.85rem;margin:0.75rem 0 0.5rem;';
    panel.appendChild(nsTitle);

    const namespaces = Object.keys(clusterData.podsByNamespace).sort();
    for (const ns of namespaces) {
      const pods = clusterData.podsByNamespace[ns];
      const nsSection = document.createElement('div');
      nsSection.className = 'ns-section';

      const nsHeader = document.createElement('div');
      nsHeader.className = 'ns-header';
      nsHeader.innerHTML = `<span>${escapeHtml(ns)}</span> <span style="font-size:0.7rem;color:var(--rh-grey);">${pods.length}</span>`;

      const podList = document.createElement('ul');
      podList.className = 'pod-list';
      podList.style.display = 'none';

      nsHeader.addEventListener('click', () => {
        podList.style.display = podList.style.display === 'none' ? '' : 'none';
      });

      for (const pod of pods) {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = pod.name || 'unnamed';
        nameSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;';

        const yamlBtn = document.createElement('button');
        yamlBtn.className = 'btn-yaml';
        yamlBtn.textContent = 'YAML';
        yamlBtn.addEventListener('click', e => {
          e.stopPropagation();
          downloadPodYaml(pod);
        });

        li.appendChild(nameSpan);
        li.appendChild(yamlBtn);
        podList.appendChild(li);
      }

      nsSection.appendChild(nsHeader);
      nsSection.appendChild(podList);
      panel.appendChild(nsSection);
    }
  }
}

function downloadPodYaml(pod) {
  const yaml = podToYaml(pod);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pod.name || 'pod'}.yaml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function podToYaml(pod) {
  const lines = [];
  lines.push('apiVersion: v1');
  lines.push('kind: Pod');
  lines.push('metadata:');
  lines.push(`  name: ${pod.name || 'unnamed'}`);
  if (pod.namespace) lines.push(`  namespace: ${pod.namespace}`);
  if (pod.labels) {
    lines.push('  labels:');
    for (const [k, v] of Object.entries(pod.labels)) {
      lines.push(`    ${k}: "${v}"`);
    }
  }
  if (pod.spec) {
    lines.push('spec:');
    lines.push(yamlIndent(pod.spec, 2));
  }
  return lines.join('\n');
}

function yamlIndent(obj, depth) {
  const indent = ' '.repeat(depth);
  const lines = [];
  if (typeof obj !== 'object' || obj === null) {
    return `${indent}${JSON.stringify(obj)}`;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        const entries = Object.entries(item);
        if (entries.length > 0) {
          lines.push(`${indent}- ${entries[0][0]}: ${formatYamlValue(entries[0][1])}`);
          for (let i = 1; i < entries.length; i++) {
            lines.push(`${indent}  ${entries[i][0]}: ${formatYamlValue(entries[i][1])}`);
          }
        } else {
          lines.push(`${indent}- {}`);
        }
      } else {
        lines.push(`${indent}- ${formatYamlValue(item)}`);
      }
    }
  } else {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null) {
        lines.push(`${indent}${k}:`);
        lines.push(yamlIndent(v, depth + 2));
      } else {
        lines.push(`${indent}${k}: ${formatYamlValue(v)}`);
      }
    }
  }
  return lines.join('\n');
}

function formatYamlValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v.includes('\n') || v.includes(':') || v.includes('#')) return `"${v}"`;
    return v;
  }
  return JSON.stringify(v);
}
