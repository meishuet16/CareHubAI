const criticalAction = document.querySelector('#critical-action');
const responseCopy = document.querySelector('#response-copy');

function applyStableCopy(detail = {}) {
  if (detail.level !== 'Stable') return;
  if (criticalAction) criticalAction.textContent = 'Continue routine bedside monitoring';
  if (responseCopy) responseCopy.textContent = 'Continue routine bedside monitoring';
}

document.addEventListener('carehub:bed-rendered', (event) => applyStableCopy(event.detail));

if (document.querySelector('#critical-status')?.textContent?.trim() === 'Stable') {
  applyStableCopy({ level: 'Stable' });
}
