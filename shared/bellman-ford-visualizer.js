(function () {
  const PAGE = window.BELLMAN_FORD_PAGE_CONFIG;
  if (!PAGE) return;

  const DEFAULT_CODE = [
    'constexpr double kInf = numeric_limits<double>::infinity();',
    'vector<double> dist(V, kInf);',
    'vector<int> prev(V, -1);',
    'int s = 0;',
    'dist[s] = 0.0;',
    'Print(dist);',
    'for (int vertex = 1; vertex < V; vertex++) {',
    '    for (auto e : edges) {',
    '        if (dist[e.From()] + e.weight < dist[e.To()]) {',
    '            dist[e.To()] = dist[e.From()] + e.weight;',
    '            prev[e.To()] = e.From();',
    '        }',
    '    }',
    '    Print(dist);',
    '}',
    'for (auto e : edges) {',
    '    if (dist[e.From()] + e.weight < dist[e.To()]) {',
    '        cout << "Negative cycle was found." << endl;',
    '        return -1;',
    '    }',
    '}',
    'cout << "Negative cycle was not found." << endl;',
    'PrintPaths(prev);'
  ];

  const legendItems = [
    { label: 'source', fill: 'rgba(156,220,254,.12)', stroke: '#9cdcfe' },
    { label: 'current edge / vertex', fill: 'rgba(247,178,103,.16)', stroke: '#f7b267' },
    { label: 'updated this step', fill: 'rgba(197,134,192,.18)', stroke: '#c586c0' },
    { label: 'current path', fill: 'rgba(78,201,176,.16)', stroke: '#4ec9b0' },
    { label: 'negative cycle witness', fill: 'rgba(244,71,71,.16)', stroke: '#f44747' }
  ];

  const NODE_RADIUS = 24;
  const ARROW_LENGTH = 12;
  const ARROW_WIDTH = 8;

  const refs = {
    pageTabs: document.getElementById('page-tabs'),
    title: document.getElementById('page-title'),
    note: document.getElementById('page-note'),
    scenarioTabs: document.getElementById('scenario-tabs'),
    stepCounter: document.getElementById('step-counter'),
    stepDesc: document.getElementById('step-desc'),
    legend: document.getElementById('legend'),
    graph: document.getElementById('gsvg'),
    graphNote: document.getElementById('graph-note'),
    edgeGroup: document.getElementById('edge-group'),
    weightGroup: document.getElementById('weight-group'),
    nodeGroup: document.getElementById('node-group'),
    distLabelGroup: document.getElementById('dist-label-group'),
    sourceVal: document.getElementById('source-val'),
    passVal: document.getElementById('pass-val'),
    edgeVal: document.getElementById('edge-val'),
    resultVal: document.getElementById('result-val'),
    stateSub: document.getElementById('state-sub'),
    edgeList: document.getElementById('edge-list'),
    distGrid: document.getElementById('dist-grid'),
    prevGrid: document.getElementById('prev-grid'),
    formulaBox: document.getElementById('formula-box'),
    printLog: document.getElementById('print-log'),
    pathList: document.getElementById('path-list'),
    codeTitle: document.getElementById('code-title'),
    codeBody: document.getElementById('code-body'),
    progressBar: document.getElementById('progress-bar'),
    prevButton: document.getElementById('prev'),
    nextButton: document.getElementById('next'),
    resetButton: document.getElementById('reset'),
    lastButton: document.getElementById('last'),
    autoButton: document.getElementById('auto-btn')
  };

  const pages = PAGE.pages || [{
    title: PAGE.title,
    tabLabel: PAGE.tabLabel || PAGE.title,
    note: PAGE.note || '',
    codeTitle: PAGE.codeTitle,
    codeLines: PAGE.codeLines,
    scenarios: PAGE.scenarios || []
  }];

  let pageIndex = 0;
  let page = null;
  let scenarioIndex = 0;
  let scenario = null;
  let steps = [];
  let current = 0;
  let autoplay = null;
  let edgeRefs = [];
  let nodeRefs = [];

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syntaxHighlight(text) {
    return esc(text)
      .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
      .replace(/\b(int|double|constexpr|const|for|if|return|void|auto)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(vector|numeric_limits)\b/g, '<span class="tp">$1</span>')
      .replace(/\b(Print|PrintPaths|PrintPathHelper|Edge|From|To)\b/g, '<span class="fn">$1</span>')
      .replace(/\b(dist|prev|edges|weight|vertex|kInf|s|V|e|j)\b/g, '<span class="id">$1</span>')
      .replace(/\b(-?\d+(\.\d+)?)\b/g, '<span class="num">$1</span>');
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return 'INF';
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-9) return String(rounded);
    return value.toFixed(1).replace(/\.0$/, '');
  }

  function formatWeight(value) {
    return value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);
  }

  function formatPrintRow(dist) {
    return dist.map((value) => formatNumber(value).padStart(6, ' ')).join('');
  }

  function cloneArray(values) {
    return values.slice();
  }

  function buildPath(prev, dist, target) {
    if (!Number.isFinite(dist[target])) return [];
    const path = [];
    let cursor = target;
    let guard = 0;
    while (cursor !== -1 && guard < prev.length + 2) {
      path.push(cursor);
      cursor = prev[cursor];
      guard += 1;
    }
    path.reverse();
    return path;
  }

  function buildPathEdgeKeys(path) {
    const keys = new Set();
    for (let i = 0; i < path.length - 1; i += 1) {
      keys.add(`${path[i]}-${path[i + 1]}`);
    }
    return keys;
  }

  function normalize(dx, dy) {
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  function offsetPoint(point, direction, distance) {
    return {
      x: point.x + direction.x * distance,
      y: point.y + direction.y * distance
    };
  }

  function resolveCurve(edge, startNode, endNode) {
    const key = `${edge.from}-${edge.to}`;
    const reverseKey = `${edge.to}-${edge.from}`;
    const explicitCurve = (scenario.curves || {})[key];
    if (explicitCurve) return explicitCurve;

    const reverseExplicitCurve = (scenario.curves || {})[reverseKey];
    if (reverseExplicitCurve) return null;

    const hasReverseEdge = scenario.edges.some((item) => item.from === edge.to && item.to === edge.from);
    if (!hasReverseEdge) return null;

    const low = Math.min(edge.from, edge.to);
    const high = Math.max(edge.from, edge.to);
    const lowPoint = scenario.positions[low];
    const highPoint = scenario.positions[high];
    const canonicalDir = normalize(highPoint.x - lowPoint.x, highPoint.y - lowPoint.y);
    const canonicalNormal = { x: -canonicalDir.y, y: canonicalDir.x };
    const sign = edge.from === low ? 1 : -1;
    const bend = scenario.bidirectionalBend === undefined ? 38 : scenario.bidirectionalBend;

    return {
      cx: (startNode.x + endNode.x) / 2 + canonicalNormal.x * bend * sign,
      cy: (startNode.y + endNode.y) / 2 + canonicalNormal.y * bend * sign
    };
  }

  function computeEdgeGeometry(edge) {
    const key = `${edge.from}-${edge.to}`;
    const startNode = scenario.positions[edge.from];
    const endNode = scenario.positions[edge.to];
    const curve = resolveCurve(edge, startNode, endNode);
    let start;
    let end;
    let tangent;
    let labelPoint;
    let pathData;

    if (curve) {
      const control = { x: curve.cx, y: curve.cy };
      const startDir = normalize(control.x - startNode.x, control.y - startNode.y);
      const endDir = normalize(endNode.x - control.x, endNode.y - control.y);
      start = offsetPoint(startNode, startDir, NODE_RADIUS);
      end = offsetPoint(endNode, endDir, -(NODE_RADIUS + 1));
      tangent = { x: end.x - control.x, y: end.y - control.y };
      labelPoint = {
        x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
        y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y
      };
      pathData = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
    } else {
      const dir = normalize(endNode.x - startNode.x, endNode.y - startNode.y);
      start = offsetPoint(startNode, dir, NODE_RADIUS);
      end = offsetPoint(endNode, dir, -(NODE_RADIUS + 1));
      tangent = { x: end.x - start.x, y: end.y - start.y };
      labelPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      };
      pathData = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const normal = normalize(-tangent.y, tangent.x);
    const labelOffset = (scenario.edgeLabelOffsets || {})[key] || {};
    const labelNormal = labelOffset.normal === undefined ? 14 : labelOffset.normal;
    labelPoint = {
      x: labelPoint.x + normal.x * labelNormal + (labelOffset.dx || 0),
      y: labelPoint.y + normal.y * labelNormal + (labelOffset.dy || 0)
    };

    const arrowDir = normalize(tangent.x, tangent.y);
    const base = offsetPoint(end, arrowDir, -ARROW_LENGTH);
    const perp = { x: -arrowDir.y, y: arrowDir.x };
    const left = { x: base.x + perp.x * (ARROW_WIDTH / 2), y: base.y + perp.y * (ARROW_WIDTH / 2) };
    const right = { x: base.x - perp.x * (ARROW_WIDTH / 2), y: base.y - perp.y * (ARROW_WIDTH / 2) };

    return {
      key,
      pathData,
      arrowPoints: `${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`,
      labelPoint
    };
  }

  function renderLegend() {
    refs.legend.innerHTML = legendItems.map((item) => `
      <div class="leg">
        <div class="leg-c" style="background:${item.fill};border-color:${item.stroke}"></div>${esc(item.label)}
      </div>
    `).join('');
  }

  function renderCode() {
    const lines = page.codeLines || PAGE.codeLines || DEFAULT_CODE;
    refs.codeTitle.textContent = page.codeTitle || PAGE.codeTitle || 'Bellman-Ford / PrintPaths';
    refs.codeBody.innerHTML = lines.map((line, index) => {
      const indent = Math.floor((line.match(/^\s*/)[0] || '').length / 4);
      const trimmed = line.trimStart();
      return `<div class="cline" data-line="${index + 1}"><div class="lnum">${index + 1}</div><div class="lcode" style="--indent:${indent}">${trimmed ? syntaxHighlight(trimmed) : '&nbsp;'}</div></div>`;
    }).join('');
  }

  function highlightCode(lines) {
    document.querySelectorAll('.cline').forEach((row) => row.classList.remove('hl'));
    (lines || []).forEach((lineNo) => {
      const row = document.querySelector(`.cline[data-line="${lineNo}"]`);
      if (row) row.classList.add('hl');
    });
  }

  function currentScenarios() {
    return (page && page.scenarios && page.scenarios.length ? page.scenarios : (PAGE.scenarios || []));
  }

  function setPageTabs() {
    if (!refs.pageTabs) return;
    if (pages.length <= 1) {
      refs.pageTabs.hidden = true;
      return;
    }

    refs.pageTabs.hidden = false;
    refs.pageTabs.innerHTML = pages.map((item, index) => {
      const active = index === pageIndex ? ' active' : '';
      return `<button type="button" class="page-btn${active}" data-index="${index}">${esc(item.tabLabel || item.title || `page ${index + 1}`)}</button>`;
    }).join('');

    refs.pageTabs.querySelectorAll('.page-btn').forEach((button) => {
      button.addEventListener('click', () => {
        loadPage(Number(button.getAttribute('data-index')));
      });
    });
  }

  function setScenarioTabs() {
    const scenarios = currentScenarios();
    if (!refs.scenarioTabs) return;
    if (scenarios.length <= 1) {
      refs.scenarioTabs.hidden = true;
      return;
    }

    refs.scenarioTabs.hidden = false;
    refs.scenarioTabs.innerHTML = scenarios.map((item, index) => {
      const active = index === scenarioIndex ? ' active' : '';
      return `<button type="button" class="scenario-btn${active}" data-index="${index}">${esc(item.label)}</button>`;
    }).join('');

    refs.scenarioTabs.querySelectorAll('.scenario-btn').forEach((button) => {
      button.addEventListener('click', () => {
        loadScenario(Number(button.getAttribute('data-index')));
      });
    });
  }

  function buildGraph() {
    edgeRefs = [];
    nodeRefs = [];
    refs.edgeGroup.innerHTML = '';
    refs.weightGroup.innerHTML = '';
    refs.nodeGroup.innerHTML = '';
    refs.distLabelGroup.innerHTML = '';
    refs.graph.setAttribute('viewBox', scenario.viewBox || '0 0 780 430');

    const SVG_NS = 'http://www.w3.org/2000/svg';

    scenario.edges.forEach((edge, index) => {
      const geometry = computeEdgeGeometry(edge);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', geometry.pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '1.8');
      refs.edgeGroup.appendChild(path);

      const arrow = document.createElementNS(SVG_NS, 'polygon');
      arrow.setAttribute('points', geometry.arrowPoints);
      refs.edgeGroup.appendChild(arrow);

      const weight = document.createElementNS(SVG_NS, 'text');
      weight.setAttribute('x', geometry.labelPoint.x);
      weight.setAttribute('y', geometry.labelPoint.y);
      weight.setAttribute('text-anchor', 'middle');
      weight.setAttribute('dominant-baseline', 'central');
      weight.setAttribute('font-size', '12');
      weight.setAttribute('font-family', 'Consolas, monospace');
      weight.textContent = formatNumber(edge.weight);
      refs.weightGroup.appendChild(weight);

      edgeRefs.push({ path, arrow, weight, edge, index, key: geometry.key });
    });

    scenario.nodes.forEach((nodeId) => {
      const pos = scenario.positions[nodeId];
      const group = document.createElementNS(SVG_NS, 'g');

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', NODE_RADIUS);
      circle.setAttribute('stroke-width', '1.6');
      group.appendChild(circle);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', pos.x);
      label.setAttribute('y', pos.y - 1);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', '14');
      label.setAttribute('font-weight', '700');
      label.setAttribute('font-family', 'Consolas, monospace');
      label.textContent = String(nodeId);
      group.appendChild(label);

      refs.nodeGroup.appendChild(group);

      const distText = document.createElementNS(SVG_NS, 'text');
      const offset = (scenario.distLabelOffsets || {})[nodeId] || { dx: 0, dy: 40 };
      distText.setAttribute('x', pos.x + (offset.dx || 0));
      distText.setAttribute('y', pos.y + (offset.dy || 0));
      distText.setAttribute('text-anchor', offset.anchor || 'middle');
      distText.setAttribute('dominant-baseline', offset.baseline || 'central');
      distText.setAttribute('font-size', '11');
      distText.setAttribute('font-weight', '700');
      distText.setAttribute('font-family', 'Consolas, monospace');
      distText.setAttribute('paint-order', 'stroke');
      distText.setAttribute('stroke', '#1e1e1e');
      distText.setAttribute('stroke-width', '3');
      distText.setAttribute('stroke-linejoin', 'round');
      refs.distLabelGroup.appendChild(distText);

      nodeRefs.push({ id: nodeId, circle, label, distText });
    });
  }

  function buildSteps() {
    const dist = Array(scenario.V).fill(Number.POSITIVE_INFINITY);
    const prev = Array(scenario.V).fill(-1);
    const printRows = [];
    const builtSteps = [];

    function pushStep(partial) {
      builtSteps.push({
        phase: partial.phase,
        desc: partial.desc,
        formulaLines: partial.formulaLines || [],
        hl: partial.hl || [],
        pass: partial.pass || 0,
        passLabel: partial.passLabel || '',
        activeEdgeIndex: partial.activeEdgeIndex === undefined ? null : partial.activeEdgeIndex,
        activeEdge: partial.activeEdge || null,
        updated: !!partial.updated,
        updatedVertex: partial.updatedVertex === undefined ? null : partial.updatedVertex,
        checkResult: partial.checkResult || '',
        resultLabel: partial.resultLabel || '',
        printRows: printRows.map((entry) => ({ ...entry })),
        dist: cloneArray(dist),
        prev: cloneArray(prev),
        negativeFound: !!partial.negativeFound,
        cycleEdgeIndex: partial.cycleEdgeIndex === undefined ? null : partial.cycleEdgeIndex,
        cycleNodes: partial.cycleNodes ? partial.cycleNodes.slice() : [],
        currentPath: partial.currentPath ? partial.currentPath.slice() : [],
        currentPathTarget: partial.currentPathTarget === undefined ? null : partial.currentPathTarget,
        pathsReady: !!partial.pathsReady
      });
    }

    pushStep({
      phase: 'prepare',
      desc: `간선 ${scenario.edges.length}개와 정점 ${scenario.V}개를 준비한다. edge order 는 입력 코드 그대로 유지한다.`,
      formulaLines: [`V = ${scenario.V}`, `E = ${scenario.edges.length}`, `source = ${scenario.source}`],
      hl: [1, 2, 3]
    });

    pushStep({
      phase: 'init',
      desc: 'dist 배열을 INF로, prev 배열을 -1로 초기화한다.',
      formulaLines: ['dist[*] = INF', 'prev[*] = -1'],
      hl: [1, 2, 3]
    });

    dist[scenario.source] = 0;
    pushStep({
      phase: 'source',
      desc: `시작 정점 s = ${scenario.source} 의 거리를 0으로 둔다.`,
      formulaLines: [`dist[${scenario.source}] = 0`],
      hl: [4, 5],
      resultLabel: 'source seeded'
    });

    printRows.push({ label: 'init', text: formatPrintRow(dist) });
    pushStep({
      phase: 'print',
      desc: '초기 dist 배열을 출력한다.',
      formulaLines: [`Print(dist) = ${formatPrintRow(dist)}`],
      hl: [6],
      resultLabel: 'initial print'
    });

    for (let pass = 1; pass < scenario.V; pass += 1) {
      pushStep({
        phase: 'pass-start',
        desc: `${pass}번째 pass 를 시작한다. 간선을 처음부터 끝까지 같은 순서로 검사한다.`,
        formulaLines: [`pass ${pass} / ${scenario.V - 1}`, 'scan edges in fixed order'],
        hl: [7, 8],
        pass,
        passLabel: `pass ${pass}`,
        resultLabel: 'start pass'
      });

      for (let index = 0; index < scenario.edges.length; index += 1) {
        const edge = scenario.edges[index];
        const fromDist = dist[edge.from];
        const oldToDist = dist[edge.to];
        const candidate = Number.isFinite(fromDist) ? fromDist + edge.weight : Number.POSITIVE_INFINITY;
        const updated = Number.isFinite(candidate) && candidate < oldToDist;
        const compareText = Number.isFinite(fromDist)
          ? `${formatNumber(candidate)} ${updated ? '<' : '>='} ${formatNumber(oldToDist)}`
          : `dist[${edge.from}] = INF`;

        if (updated) {
          dist[edge.to] = candidate;
          prev[edge.to] = edge.from;
        }

        const formulaLines = Number.isFinite(fromDist)
          ? [
              `candidate = dist[${edge.from}] + (${formatWeight(edge.weight)})`,
              `${formatNumber(fromDist)} + ${formatNumber(edge.weight)} = ${formatNumber(candidate)}`,
              `compare with dist[${edge.to}] = ${formatNumber(oldToDist)} -> ${compareText}`,
              updated
                ? `update dist[${edge.to}] = ${formatNumber(candidate)}, prev[${edge.to}] = ${edge.from}`
                : 'no change'
            ]
          : [
              `candidate = dist[${edge.from}] + (${formatWeight(edge.weight)})`,
              `dist[${edge.from}] is INF, so edge ${edge.from} -> ${edge.to} cannot relax`,
              'no change'
            ];

        pushStep({
          phase: 'relax',
          desc: updated
            ? `pass ${pass}, edge #${index + 1} (${edge.from} -> ${edge.to}, w=${formatNumber(edge.weight)}) 로 relax 성공.`
            : `pass ${pass}, edge #${index + 1} (${edge.from} -> ${edge.to}, w=${formatNumber(edge.weight)}) 는 변화가 없다.`,
          formulaLines,
          hl: updated ? [8, 9, 10, 11] : [8, 9],
          pass,
          passLabel: `pass ${pass}`,
          activeEdgeIndex: index,
          activeEdge: edge,
          updated,
          updatedVertex: updated ? edge.to : null,
          checkResult: updated ? 'updated' : 'no change',
          resultLabel: updated ? 'updated' : 'no change'
        });
      }

      printRows.push({ label: `pass ${pass}`, text: formatPrintRow(dist) });
      pushStep({
        phase: 'print',
        desc: `${pass}번째 pass 가 끝나서 dist 배열을 출력한다.`,
        formulaLines: [`Print(dist) = ${formatPrintRow(dist)}`],
        hl: [14],
        pass,
        passLabel: `pass ${pass}`,
        resultLabel: 'print dist'
      });
    }

    pushStep({
      phase: 'cycle-start',
      desc: '이제 한 번 더 간선을 검사해 음수 사이클이 있는지 확인한다.',
      formulaLines: ['negative-cycle check begins'],
      hl: [16],
      resultLabel: 'cycle check'
    });

    let cycleFound = false;

    for (let index = 0; index < scenario.edges.length; index += 1) {
      const edge = scenario.edges[index];
      const fromDist = dist[edge.from];
      const toDist = dist[edge.to];
      const candidate = Number.isFinite(fromDist) ? fromDist + edge.weight : Number.POSITIVE_INFINITY;
      const relaxable = Number.isFinite(candidate) && candidate < toDist;

      pushStep({
        phase: 'cycle-check',
        desc: relaxable
          ? `간선 #${index + 1} (${edge.from} -> ${edge.to}, w=${formatNumber(edge.weight)}) 는 아직도 더 줄일 수 있다. reachable negative cycle 로 판단한다.`
          : `간선 #${index + 1} (${edge.from} -> ${edge.to}, w=${formatNumber(edge.weight)}) 는 더 줄일 수 없다.`,
        formulaLines: Number.isFinite(fromDist)
          ? [
              `dist[${edge.from}] + (${formatWeight(edge.weight)}) = ${formatNumber(candidate)}`,
              `compare with dist[${edge.to}] = ${formatNumber(toDist)}`,
              relaxable ? 'still relaxable -> negative cycle' : 'not relaxable'
            ]
          : [
              `dist[${edge.from}] is INF`,
              'unreachable edge does not prove a cycle'
            ],
        hl: relaxable ? [17, 18, 19] : [17],
        activeEdgeIndex: index,
        activeEdge: edge,
        resultLabel: relaxable ? 'negative cycle found' : 'cycle check',
        negativeFound: relaxable,
        cycleEdgeIndex: relaxable ? index : null,
        cycleNodes: relaxable ? [edge.from, edge.to] : []
      });

      if (relaxable) {
        cycleFound = true;
        break;
      }
    }

    if (cycleFound) {
      pushStep({
        phase: 'cycle-found',
        desc: '코드는 "Negative cycle was found." 를 출력하고 종료한다. 이 경우 PrintPaths(prev)는 신뢰할 수 없다.',
        formulaLines: ['Negative cycle was found.', 'paths are invalid because a reachable negative cycle exists'],
        hl: [18, 19],
        resultLabel: 'terminate with cycle',
        negativeFound: true,
        cycleEdgeIndex: builtSteps[builtSteps.length - 1].cycleEdgeIndex,
        cycleNodes: builtSteps[builtSteps.length - 1].cycleNodes
      });
      return builtSteps;
    }

    pushStep({
      phase: 'cycle-clear',
      desc: '모든 간선이 더 줄어들지 않았으므로 reachable negative cycle 은 없다.',
      formulaLines: ['Negative cycle was not found.'],
      hl: [22],
      resultLabel: 'cycle clear',
      pathsReady: true
    });

    for (let target = 0; target < scenario.V; target += 1) {
      const path = buildPath(prev, dist, target);
      pushStep({
        phase: 'path',
        desc: `PrintPaths(prev) 에서 정점 ${target} 의 경로를 복원한다.`,
        formulaLines: Number.isFinite(dist[target])
          ? [`path(${target}) = ${path.join(' -> ')}`, `distance = ${formatNumber(dist[target])}`]
          : [`path(${target}) = unreachable`, 'distance = INF'],
        hl: [23],
        resultLabel: `print path ${target}`,
        currentPath: path,
        currentPathTarget: target,
        pathsReady: true
      });
    }

    pushStep({
      phase: 'final',
      desc: 'Bellman-Ford 실행이 끝났다. dist, prev, 그리고 source 0에서의 경로가 모두 확정되었다.',
      formulaLines: ['Bellman-Ford completed', `final dist = ${formatPrintRow(dist)}`],
      hl: [23],
      resultLabel: 'done',
      pathsReady: true
    });

    return builtSteps;
  }

  function updateMeta(step) {
    refs.sourceVal.textContent = `s = ${scenario.source}`;
    refs.passVal.textContent = step.passLabel || step.phase;

    if (step.activeEdge) {
      refs.edgeVal.textContent = `#${step.activeEdgeIndex + 1} ${step.activeEdge.from} -> ${step.activeEdge.to}`;
      refs.stateSub.textContent = `w = ${formatNumber(step.activeEdge.weight)}`;
    } else {
      refs.edgeVal.textContent = '-';
      refs.stateSub.textContent = step.phase;
    }

    refs.resultVal.textContent = step.resultLabel || '-';
  }

  function renderEdgeList(step) {
    refs.edgeList.innerHTML = scenario.edges.map((edge, index) => {
      const classes = ['edge-item'];
      if ((step.phase === 'relax' || step.phase === 'cycle-check') && index < step.activeEdgeIndex) classes.push('done');
      if (step.phase === 'cycle-found' && step.cycleEdgeIndex !== null && index < step.cycleEdgeIndex) classes.push('done');
      if (step.activeEdgeIndex === index) classes.push(step.updated ? 'updated' : 'current');
      if (step.cycleEdgeIndex === index) classes.push('danger');
      return `<div class="${classes.join(' ')}">
        <div class="edge-no">#${index + 1}</div>
        <div class="edge-main">${edge.from} -> ${edge.to}</div>
        <div class="edge-sub">w = ${formatNumber(edge.weight)}</div>
      </div>`;
    }).join('');
  }

  function renderArray(container, prefix, values, step) {
    container.innerHTML = values.map((value, index) => {
      const classes = ['arr-cell'];
      const pathHasIndex = step.currentPath && step.currentPath.includes(index);
      const cycleHasIndex = step.cycleNodes && step.cycleNodes.includes(index);
      const edgeTouchesIndex = step.activeEdge && (step.activeEdge.from === index || step.activeEdge.to === index);
      if (pathHasIndex) classes.push('done');
      else if (cycleHasIndex) classes.push('danger');
      else if (step.updated && step.updatedVertex === index) classes.push('updated');
      else if (edgeTouchesIndex) classes.push('current');
      else if (index === scenario.source) classes.push('source');
      if (prefix === 'dist' && !Number.isFinite(value) && classes.length === 1) classes.push('idle');

      const sub = prefix === 'dist'
        ? (index === scenario.source ? 'source' : (Number.isFinite(value) ? 'reachable' : 'INF'))
        : (value === -1 ? 'nil' : `from ${value}`);

      return `<div class="${classes.join(' ')}">
        <div class="arr-label">${prefix}[${index}]</div>
        <div class="arr-main">${prefix === 'dist' ? formatNumber(value) : value}</div>
        <div class="arr-sub">${sub}</div>
      </div>`;
    }).join('');
  }

  function renderFormula(step) {
    refs.formulaBox.innerHTML = step.formulaLines.map((line, index) => {
      return `<div class="${index === step.formulaLines.length - 1 ? 'muted' : ''}">${esc(line)}</div>`;
    }).join('');
  }

  function renderPrintLog(step) {
    if (!step.printRows.length) {
      refs.printLog.innerHTML = '<div class="log-line">Print(dist) output will appear here.</div>';
      return;
    }

    const currentLabel = step.phase === 'print' ? step.printRows[step.printRows.length - 1].label : '';
    refs.printLog.innerHTML = step.printRows.map((entry) => {
      const focus = entry.label === currentLabel ? ' focus' : '';
      return `<div class="log-line${focus}">${esc(`${entry.label}: ${entry.text}`)}</div>`;
    }).join('');
  }

  function renderPathList(step) {
    if (step.negativeFound) {
      refs.pathList.innerHTML = '<div class="path-card danger"><div class="path-head">negative cycle</div><div class="path-body">reachable negative cycle was found, so shortest paths are not well-defined.</div></div>';
      return;
    }

    if (!step.pathsReady) {
      refs.pathList.innerHTML = '<div class="path-card"><div class="path-head">waiting</div><div class="path-body">negative-cycle check must finish before PrintPaths(prev).</div></div>';
      return;
    }

    refs.pathList.innerHTML = scenario.nodes.map((target) => {
      const path = buildPath(step.prev, step.dist, target);
      const current = step.currentPathTarget === target ? ' current' : '';
      const done = step.phase === 'final' ? ' done' : '';
      const body = Number.isFinite(step.dist[target])
        ? `${path.join(' -> ')} (dist = ${formatNumber(step.dist[target])})`
        : 'unreachable';
      return `<div class="path-card${current}${done}">
        <div class="path-head">target ${target}</div>
        <div class="path-body">${esc(body)}</div>
      </div>`;
    }).join('');
  }

  function nodeColors(state) {
    if (state === 'source') return { fill: 'rgba(156,220,254,.12)', stroke: '#9cdcfe', text: '#d9f4ff' };
    if (state === 'current') return { fill: 'rgba(247,178,103,.16)', stroke: '#f7b267', text: '#ffe4b8' };
    if (state === 'updated') return { fill: 'rgba(197,134,192,.18)', stroke: '#c586c0', text: '#f4d7f0' };
    if (state === 'done') return { fill: 'rgba(78,201,176,.16)', stroke: '#4ec9b0', text: '#cffff2' };
    if (state === 'danger') return { fill: 'rgba(244,71,71,.16)', stroke: '#f44747', text: '#ffc6c6' };
    return { fill: 'rgba(55,55,55,.55)', stroke: '#555', text: '#777' };
  }

  function edgeColors(state) {
    if (state === 'current') return { stroke: '#f7b267', text: '#ffe4b8' };
    if (state === 'updated') return { stroke: '#c586c0', text: '#f4d7f0' };
    if (state === 'done') return { stroke: '#4ec9b0', text: '#cffff2' };
    if (state === 'danger') return { stroke: '#f44747', text: '#ffc6c6' };
    return { stroke: '#5f5f66', text: '#9a9a9a' };
  }

  function renderGraph(step) {
    const pathKeys = buildPathEdgeKeys(step.currentPath || []);

    edgeRefs.forEach((ref) => {
      let state = 'idle';
      if (step.cycleEdgeIndex === ref.index) state = 'danger';
      else if (pathKeys.has(ref.key)) state = 'done';
      else if (step.activeEdgeIndex === ref.index) state = step.updated ? 'updated' : 'current';
      const colors = edgeColors(state);
      ref.path.setAttribute('stroke', colors.stroke);
      ref.path.setAttribute('opacity', state === 'idle' ? '0.55' : '1');
      ref.arrow.setAttribute('fill', colors.stroke);
      ref.arrow.setAttribute('opacity', state === 'idle' ? '0.55' : '1');
      ref.weight.setAttribute('fill', colors.text);
      ref.weight.setAttribute('font-weight', state === 'idle' ? '500' : '700');
    });

    nodeRefs.forEach((ref) => {
      let state = 'idle';
      if (step.cycleNodes && step.cycleNodes.includes(ref.id)) state = 'danger';
      else if (step.currentPath && step.currentPath.includes(ref.id)) state = 'done';
      else if (step.updated && step.updatedVertex === ref.id) state = 'updated';
      else if (step.activeEdge && (step.activeEdge.from === ref.id || step.activeEdge.to === ref.id)) state = 'current';
      else if (ref.id === scenario.source) state = 'source';
      const colors = nodeColors(state);
      ref.circle.setAttribute('fill', colors.fill);
      ref.circle.setAttribute('stroke', colors.stroke);
      ref.label.setAttribute('fill', colors.text);
      ref.distText.setAttribute('fill', Number.isFinite(step.dist[ref.id]) ? '#9cdcfe' : '#666');
      ref.distText.textContent = `d=${formatNumber(step.dist[ref.id])}`;
    });
  }

  function lockStepDescHeight() {
    if (!refs.stepDesc || !steps.length) return;
    const probe = refs.stepDesc.cloneNode(false);
    probe.removeAttribute('id');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.left = '-99999px';
    probe.style.top = '0';
    probe.style.height = 'auto';
    probe.style.minHeight = '0';
    probe.style.maxHeight = 'none';
    probe.style.width = `${refs.stepDesc.getBoundingClientRect().width}px`;
    document.body.appendChild(probe);

    let maxHeight = 0;
    steps.forEach((step) => {
      probe.innerHTML = `<div class="desc-main">${esc(step.desc)}</div><div class="desc-formula">${esc(step.formulaLines[0] || '')}</div>`;
      maxHeight = Math.max(maxHeight, Math.ceil(probe.scrollHeight));
    });

    probe.remove();
    refs.stepDesc.style.height = 'auto';
    if (maxHeight > 0) refs.stepDesc.style.minHeight = `${maxHeight}px`;
  }

  function buildStepsAndGraph() {
    steps = buildSteps();
    buildGraph();
    render();
    lockStepDescHeight();
  }

  function loadPage(nextPageIndex) {
    stopAuto();
    pageIndex = Math.max(0, Math.min(pages.length - 1, nextPageIndex));
    page = pages[pageIndex];
    scenarioIndex = 0;
    setPageTabs();
    renderCode();
    loadScenario(0);
  }

  function loadScenario(nextIndex) {
    stopAuto();
    scenarioIndex = nextIndex;
    scenario = currentScenarios()[scenarioIndex];
    current = 0;
    refs.title.textContent = currentScenarios().length > 1 ? `${page.title} / ${scenario.label}` : page.title;
    refs.note.textContent = page.note || PAGE.note || '';
    refs.graphNote.textContent = scenario.note || '';
    refs.sourceVal.textContent = `s = ${scenario.source}`;
    setPageTabs();
    setScenarioTabs();
    buildStepsAndGraph();
  }

  function render() {
    const step = steps[current];
    refs.stepCounter.textContent = `step ${current + 1} / ${steps.length}`;
    refs.stepDesc.innerHTML = `<div class="desc-main">${esc(step.desc)}</div><div class="desc-formula">${esc(step.formulaLines[0] || '')}</div>`;
    refs.progressBar.style.width = `${(current / Math.max(steps.length - 1, 1)) * 100}%`;
    updateMeta(step);
    renderEdgeList(step);
    renderArray(refs.distGrid, 'dist', step.dist, step);
    renderArray(refs.prevGrid, 'prev', step.prev, step);
    renderFormula(step);
    renderPrintLog(step);
    renderPathList(step);
    renderGraph(step);
    highlightCode(step.hl);
    refs.prevButton.disabled = current === 0;
    refs.nextButton.disabled = current === steps.length - 1;
    refs.resetButton.disabled = current === 0;
    refs.lastButton.disabled = current === steps.length - 1;
    refs.autoButton.textContent = autoplay ? 'Pause' : 'Play';
  }

  function stopAuto() {
    if (autoplay) {
      window.clearInterval(autoplay);
      autoplay = null;
    }
  }

  function toggleAuto() {
    if (autoplay) {
      stopAuto();
      render();
      return;
    }

    autoplay = window.setInterval(() => {
      if (current >= steps.length - 1) {
        stopAuto();
        render();
        return;
      }
      current += 1;
      render();
    }, 900);

    render();
  }

  function jump(index) {
    stopAuto();
    current = Math.max(0, Math.min(steps.length - 1, index));
    render();
  }

  function go(delta) {
    jump(current + delta);
  }

  document.addEventListener('keydown', (event) => {
    const tag = (event.target && event.target.tagName || '').toLowerCase();
    const editable = tag === 'input' || tag === 'textarea' || tag === 'select' || (event.target && event.target.isContentEditable);
    if (editable || event.altKey || event.metaKey) return;
    if (event.key === 'PageDown' && pages.length > 1) {
      loadPage(pageIndex + 1);
      event.preventDefault();
      return;
    }
    if (event.key === 'PageUp' && pages.length > 1) {
      loadPage(pageIndex - 1);
      event.preventDefault();
      return;
    }
    if (event.key === 'End') {
      jump(steps.length - 1);
      event.preventDefault();
    }
  });

  refs.prevButton.addEventListener('click', () => go(-1));
  refs.nextButton.addEventListener('click', () => go(1));
  refs.resetButton.addEventListener('click', () => jump(0));
  refs.lastButton.addEventListener('click', () => jump(steps.length - 1));
  refs.autoButton.addEventListener('click', () => toggleAuto());

  renderLegend();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadPage(0);
      window.addEventListener('resize', lockStepDescHeight);
    });
  } else {
    loadPage(0);
    window.addEventListener('resize', lockStepDescHeight);
  }

  window.loadPage = loadPage;
  window.go = go;
  window.jump = jump;
  window.toggleAuto = toggleAuto;
})();
