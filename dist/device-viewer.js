const watched = new WeakSet();
function connectViewers() {
  document.querySelectorAll('model-viewer').forEach(viewer => {
    if (watched.has(viewer)) return;
    watched.add(viewer);
    const stage = viewer.closest('.model-stage');
    const status = stage.querySelector('.model-status');
    const ready = () => {
      stage.dataset.viewerState = 'ready';
      status.textContent = 'Interactive 3D device ready';
    };
    const fallback = () => {
      stage.dataset.viewerState = 'error';
      status.textContent = '3D unavailable · showing device reference';
    };
    viewer.addEventListener('load', ready);
    viewer.addEventListener('error', fallback);
    if (viewer.loaded) ready();
    if (stage.dataset.viewerState !== 'ready') {
      setTimeout(() => { if (viewer.isConnected && !viewer.loaded) fallback(); }, 20000);
    }
  });
}
try {
  await import('./assets/vendor/model-viewer.min.js');
  connectViewers();
  new MutationObserver(connectViewers).observe(document.getElementById('app'), { childList: true, subtree: true });
} catch {
  const fallbackAll = () => document.querySelectorAll('.model-stage').forEach(stage => {
    if (stage.dataset.viewerState === 'error') return;
    stage.dataset.viewerState = 'error';
    stage.querySelector('.model-status').textContent = '3D unavailable · showing device reference';
  });
  fallbackAll();
  new MutationObserver(fallbackAll).observe(document.getElementById('app'), { childList: true, subtree: true });
}
