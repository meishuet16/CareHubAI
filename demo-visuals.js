const pressureRoot = document.querySelector('#pressure-map');
const ivVisual = document.querySelector('.iv-visual');
const ivLine = document.querySelector('.iv-line');
const prototypeFlow = document.querySelector('#prototype-flow');
const acknowledgeButton = document.querySelector('#acknowledge-selected');

let lastZoneValues = [20, 30, 40, 30];
let flowStep = 0;

function inferPosture(values) {
  const [head, back, hip, leg] = values;
  const lower = hip + leg;
  const upper = head + back;
  if (Math.abs(lower - upper) < 28) return 'Supine';
  // Demo inference only until the real pressure model provides posture output.
  return hip > leg + 8 ? 'Left side' : leg > hip + 8 ? 'Right side' : 'Supine';
}

function expandZonesToMatrix(values) {
  const [head, back, hip, leg] = values;
  const anchors = [head, back, hip, leg];
  const rows = [];
  for (let r = 0; r < 8; r += 1) {
    const segment = Math.min(3, Math.floor(r / 2));
    const base = anchors[segment] ?? 0;
    const row = [];
    for (let c = 0; c < 8; c += 1) {
      const centreWeight = 1 - Math.abs(c - 3.5) / 5.2;
      const shoulderBias = segment === 1 ? (c === 2 || c === 5 ? 7 : 0) : 0;
      const hipBias = segment === 2 ? (c >= 2 && c <= 5 ? 9 : 0) : 0;
      const variation = ((r * 11 + c * 7) % 9) - 4;
      row.push(Math.max(0, Math.min(100, Math.round(base * centreWeight + shoulderBias + hipBias + variation))));
    }
    rows.push(...row);
  }
  return rows;
}

function enhancePressureMap() {
  if (!pressureRoot) return;
  const oldZones = [...pressureRoot.querySelectorAll('.pressure-zone')];
  if (!oldZones.length) return;
  const values = oldZones.map((zone) => Number(zone.querySelector('strong')?.textContent || 0));
  if (values.length >= 4) lastZoneValues = values.slice(0, 4);
  const matrix = expandZonesToMatrix(lastZoneValues);
  const posture = inferPosture(lastZoneValues);
  const max = Math.max(...matrix);

  const shell = document.createElement('div');
  shell.className = 'demo-pressure-shell';
  const mattress = document.createElement('div');
  mattress.className = 'pressure-mattress';
  mattress.setAttribute('aria-label', 'Animated 8 by 8 pressure sensor visualization');
  const grid = document.createElement('div');
  grid.className = 'pressure-grid-8';

  matrix.forEach((value) => {
    const cell = document.createElement('span');
    const level = value >= 68 ? 'high' : value >= 42 ? 'medium' : 'low';
    cell.className = `pressure-cell ${level}${value >= max - 3 && max >= 68 ? ' peak' : ''}`;
    cell.title = `Relative pressure ${value}`;
    cell.style.opacity = String(Math.max(.38, Math.min(1, .38 + value / 115)));
    grid.append(cell);
  });
  mattress.append(grid);

  const postureCard = document.createElement('aside');
  postureCard.className = 'posture-card';
  const postureClass = posture.startsWith('Left') ? 'left' : posture.startsWith('Right') ? 'right' : 'supine';
  postureCard.innerHTML = `
    <div class="posture-figure"><div class="posture-body ${postureClass}" aria-hidden="true"></div></div>
    <div class="posture-meta">
      <span>Pressure pattern</span>
      <strong>${posture}</strong>
      <small>Prototype visualization. Replace this heuristic label with the trained pressure-model output when available.</small>
    </div>`;
  shell.append(mattress, postureCard);
  pressureRoot.replaceChildren(shell);

  const legend = document.createElement('div');
  legend.className = 'demo-legend';
  legend.innerHTML = '<span><i></i>Lower</span><span class="med"><i></i>Elevated</span><span class="high"><i></i>Higher relative pressure</span>';
  pressureRoot.append(legend);
}

function enhanceIv() {
  if (!ivVisual || !ivLine) return;
  if (!ivVisual.querySelector('.iv-drip-chamber')) {
    const chamber = document.createElement('div');
    chamber.className = 'iv-drip-chamber';
    chamber.innerHTML = '<span class="iv-drop"></span>';
    ivLine.before(chamber);
  }
  const fill = document.querySelector('#iv-fill');
  ivVisual.classList.toggle('abnormal', fill?.classList.contains('abnormal'));
}

function enhancePipeline() {
  if (!prototypeFlow) return;
  const nodes = [...prototypeFlow.querySelectorAll('article')];
  if (!nodes.length || prototypeFlow.dataset.enhanced === 'true') return;
  prototypeFlow.dataset.enhanced = 'true';
  prototypeFlow.classList.add('live-flow');
  nodes.forEach((node) => node.classList.add('live-flow-node'));
  nodes[0]?.classList.add('active');
}

function tickPipeline() {
  const nodes = [...document.querySelectorAll('#prototype-flow .live-flow-node')];
  if (!nodes.length) return;
  nodes.forEach((node) => node.classList.remove('active'));
  nodes[flowStep % nodes.length]?.classList.add('active');
  flowStep += 1;
}

const pressureObserver = new MutationObserver(() => {
  if (pressureRoot?.querySelector('.pressure-zone')) queueMicrotask(enhancePressureMap);
});
if (pressureRoot) pressureObserver.observe(pressureRoot, { childList: true });

const ivObserver = new MutationObserver(enhanceIv);
const ivFill = document.querySelector('#iv-fill');
if (ivFill) ivObserver.observe(ivFill, { attributes: true, attributeFilter: ['class', 'style'] });

const flowObserver = new MutationObserver(() => {
  if (prototypeFlow?.querySelector('article')) queueMicrotask(enhancePipeline);
});
if (prototypeFlow) flowObserver.observe(prototypeFlow, { childList: true });

acknowledgeButton?.addEventListener('click', () => {
  const card = document.querySelector('.primary-card');
  card?.classList.remove('ack-flash');
  requestAnimationFrame(() => card?.classList.add('ack-flash'));
});

enhancePressureMap();
enhanceIv();
enhancePipeline();
setInterval(tickPipeline, 1150);
