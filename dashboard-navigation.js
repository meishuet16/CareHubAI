const dashboard = document.querySelector(".dashboard");
const pageHeader = document.querySelector(".page-header");
const summaryRow = document.querySelector(".summary-row");
const focusGrid = document.querySelector(".focus-grid");
const lowerGrid = document.querySelector(".lower-grid");
const bedMap = document.querySelector("#bed-map");
const priorityList = document.querySelector("#priority-list");
const criticalTitle = document.querySelector("#critical-title");
const criticalStatus = document.querySelector("#critical-status");

if (!dashboard || !pageHeader || !summaryRow || !focusGrid || !lowerGrid || !bedMap || !priorityList) {
  throw new Error("CareHub navigation shell could not find the expected dashboard structure.");
}

const wardPanel = bedMap.closest(".panel");
const queuePanel = priorityList.closest(".panel");
const eventPanel = document.querySelector("#event-log")?.closest(".panel");
const flowPanel = document.querySelector("#prototype-flow")?.closest(".panel");
const explainPanel = document.querySelector("#ai-breakdown")?.closest(".panel");
const demoConsole = pageHeader.querySelector(".demo-console");
const headerCopy = pageHeader.querySelector(":scope > div");
const headerEyebrow = headerCopy?.querySelector(".eyebrow");
const headerTitle = headerCopy?.querySelector("h1");
const headerSubtitle = headerCopy?.querySelector(".subtitle");
const wardContext = headerCopy?.querySelector(".ward-context");

const shellNav = document.createElement("nav");
shellNav.className = "view-switcher";
shellNav.setAttribute("aria-label", "Dashboard views");
shellNav.innerHTML = `
  <button type="button" class="view-switcher__button active" data-view="ward">
    <span>Ward Overview</span><small>4 monitored beds</small>
  </button>
  <button type="button" class="view-switcher__button" data-view="bed">
    <span>Bed Detail</span><small id="view-bed-label">Selected bed</small>
  </button>
`;
pageHeader.insertAdjacentElement("afterend", shellNav);

const wardView = document.createElement("section");
wardView.id = "ward-overview-view";
wardView.className = "app-view ward-view active";
wardView.setAttribute("aria-label", "Ward overview");

const wardIntro = document.createElement("section");
wardIntro.className = "ward-overview-heading";
wardIntro.innerHTML = `
  <div>
    <p class="eyebrow">Ward A · Live spatial monitoring</p>
    <h2>Ward at a glance</h2>
    <p>Scan bedside attention states first, then open a bed for pressure, IV and context detail.</p>
  </div>
  <div class="ward-overview-legend" aria-label="Attention state legend">
    <span><i class="legend-dot urgent"></i>High attention</span>
    <span><i class="legend-dot monitor"></i>Review / watch</span>
    <span><i class="legend-dot stable"></i>Stable</span>
  </div>
`;

const wardGrid = document.createElement("div");
wardGrid.className = "ward-command-grid";
const wardPrimary = document.createElement("div");
wardPrimary.className = "ward-command-primary";
const wardRail = document.createElement("aside");
wardRail.className = "ward-command-rail";

wardView.append(summaryRow, wardIntro, wardGrid);
wardGrid.append(wardPrimary, wardRail);
if (wardPanel) wardPrimary.append(wardPanel);
if (queuePanel) wardRail.append(queuePanel);
if (eventPanel) wardRail.append(eventPanel);
if (flowPanel) wardPrimary.append(flowPanel);

const detailView = document.createElement("section");
detailView.id = "bed-detail-view";
detailView.className = "app-view bed-detail-view";
detailView.setAttribute("aria-label", "Selected bed detail");

const detailToolbar = document.createElement("div");
detailToolbar.className = "detail-toolbar";
detailToolbar.innerHTML = `
  <button type="button" class="back-to-ward" aria-label="Back to Ward A overview">
    <span aria-hidden="true">←</span>
    <span><small>Ward A</small><strong>Back to overview</strong></span>
  </button>
  <div class="detail-toolbar__identity">
    <span class="detail-toolbar__label">Selected bed</span>
    <strong id="detail-bed-identity">Bed detail</strong>
    <span id="detail-bed-state" class="detail-toolbar__state">Monitoring</span>
  </div>
`;

detailView.append(detailToolbar, focusGrid);
if (explainPanel) {
  const detailSide = focusGrid.querySelector(".side-stack");
  if (detailSide && !detailSide.contains(explainPanel)) detailSide.prepend(explainPanel);
}

dashboard.insertBefore(wardView, document.querySelector(".footer-note"));
dashboard.insertBefore(detailView, document.querySelector(".footer-note"));
lowerGrid.remove();

function selectedBedCopy() {
  const text = criticalTitle?.textContent?.trim() || "Selected bed";
  const [bed = "Selected bed", patient = ""] = text.split(" · ");
  return { text, bed, patient };
}

function updateDetailIdentity() {
  const { text, bed, patient } = selectedBedCopy();
  const label = document.querySelector("#view-bed-label");
  const identity = document.querySelector("#detail-bed-identity");
  const state = document.querySelector("#detail-bed-state");
  if (label) label.textContent = bed;
  if (identity) identity.textContent = text;
  if (state) {
    state.textContent = criticalStatus?.textContent || "Monitoring";
    state.className = `detail-toolbar__state ${criticalStatus?.classList.contains("urgent") ? "urgent" : criticalStatus?.classList.contains("monitor") ? "monitor" : "stable"}`;
  }

  if (detailView.classList.contains("active") && headerTitle) {
    headerTitle.textContent = patient ? `${bed} · ${patient}` : bed;
  }
}

function setHeader(view) {
  const { bed, patient } = selectedBedCopy();
  if (view === "bed") {
    if (headerEyebrow) headerEyebrow.textContent = "Ward A / Bed detail · Live monitoring";
    if (headerTitle) headerTitle.textContent = patient ? `${bed} · ${patient}` : bed;
    if (headerSubtitle) headerSubtitle.textContent = "Pressure, IV and patient context combined into explainable bedside attention support for nurse review.";
    if (wardContext) wardContext.innerHTML = `<span>Ward A</span><span>${bed}</span><span>Human-in-the-loop</span>`;
  } else {
    if (headerEyebrow) headerEyebrow.textContent = "Ward overview · Explainable attention support";
    if (headerTitle) headerTitle.textContent = "Ward A Monitoring";
    if (headerSubtitle) headerSubtitle.textContent = "See the whole ward first. Open a monitored bed only when you need pressure, IV and context detail.";
    if (wardContext) wardContext.innerHTML = `<span>Ward A</span><span>4 monitored beds</span><span>Human-in-the-loop</span>`;
  }
}

function showView(view, { updateHistory = true } = {}) {
  const isBed = view === "bed";
  wardView.classList.toggle("active", !isBed);
  detailView.classList.toggle("active", isBed);
  shellNav.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  setHeader(view);
  updateDetailIdentity();

  if (updateHistory) {
    const { bed } = selectedBedCopy();
    const hash = isBed ? `#${bed.toLowerCase().replace(/\s+/g, "-")}` : "#ward";
    history.replaceState({ carehubView: view }, "", hash);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

shellNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  showView(button.dataset.view);
});

detailToolbar.querySelector(".back-to-ward").addEventListener("click", () => showView("ward"));

document.addEventListener("click", (event) => {
  const selectedControl = event.target.closest("[data-select]");
  if (!selectedControl) return;
  queueMicrotask(() => {
    updateDetailIdentity();
    showView("bed");
  });
});

const identityObserver = new MutationObserver(updateDetailIdentity);
if (criticalTitle) identityObserver.observe(criticalTitle, { childList: true, characterData: true, subtree: true });
if (criticalStatus) identityObserver.observe(criticalStatus, { childList: true, characterData: true, subtree: true, attributes: true });

window.addEventListener("hashchange", () => {
  showView(location.hash.startsWith("#bed-") ? "bed" : "ward", { updateHistory: false });
});

if (demoConsole) demoConsole.classList.add("demo-console--shell");
updateDetailIdentity();
showView(location.hash.startsWith("#bed-") ? "bed" : "ward", { updateHistory: false });
