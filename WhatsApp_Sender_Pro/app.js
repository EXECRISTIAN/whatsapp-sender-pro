import { applyAppearance, loadAppearance } from './shared.js';

async function refresh(){
  const { settings, bg } = await loadAppearance();
  applyAppearance(settings, bg);
}

chrome.storage.onChanged.addListener(refresh);
refresh();

// Pass #import (from the popup's Import button) on to the embedded popup
const frame = document.querySelector('.window-frame');
frame.src = `popup.html${location.hash}`;

// Remember the window size and position for next time
let saveTimer;
function saveBounds(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set({
    wa_window: { width: window.outerWidth, height: window.outerHeight, left: window.screenX, top: window.screenY }
  }), 300);
}
window.addEventListener('resize', saveBounds);
// Moving a window fires no event: check the position now and then
let lastPos = `${window.screenX},${window.screenY}`;
setInterval(() => {
  const pos = `${window.screenX},${window.screenY}`;
  if (pos !== lastPos) { lastPos = pos; saveBounds(); }
}, 1000);
