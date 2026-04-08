(function () {
  const MIN_SCALE = 0.7;
  const MAX_SCALE = 1.8;
  const STEP = 0.1;

  function isEditable(target) {
    if (!target) return false;
    const tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function clampScale(value) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(value * 100) / 100));
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function getScale() {
    const raw = readStorage('dsv_viewer_scale');
    const parsed = raw ? parseFloat(raw) : 1;
    return Number.isFinite(parsed) ? clampScale(parsed) : 1;
  }

  function findByIds(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function findByAsciiText(regex) {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"]'));
    return buttons.find((el) => regex.test((el.textContent || el.value || '').trim())) || null;
  }

  function clickTarget(target) {
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }

  function getNextTarget() {
    return findByIds(['next', 'bn', 'nb', 'btn-next', 'vxnb']) || findByAsciiText(/\bnext\b/i);
  }

  function getPrevTarget() {
    return findByIds(['prev', 'bp', 'pb', 'btn-prev', 'vxpb']) || findByAsciiText(/\bprev\b/i);
  }

  function getResetTarget() {
    return findByIds(['reset', 'btn-reset']) || findByAsciiText(/\breset\b/i);
  }

  function getPlayTarget() {
    return findByIds(['play', 'auto-btn']) || findByAsciiText(/\b(play|pause|auto)\b/i);
  }

  function goNext() {
    return clickTarget(getNextTarget());
  }

  function goPrev() {
    return clickTarget(getPrevTarget());
  }

  function goReset() {
    return clickTarget(getResetTarget());
  }

  function togglePlay() {
    return clickTarget(getPlayTarget());
  }

  let scale = getScale();

  function applyScale(nextScale) {
    scale = clampScale(nextScale);
    document.documentElement.style.setProperty('--viewer-scale', String(scale));
    writeStorage('dsv_viewer_scale', String(scale));
  }

  function syncOverlayButtons() {
    const wrap = document.getElementById('viewer-hotkeys');
    if (!wrap) return;

    const prevButton = wrap.querySelector('[data-action="prev"]');
    const nextButton = wrap.querySelector('[data-action="next"]');

    const prevTarget = getPrevTarget();
    const nextTarget = getNextTarget();

    if (prevButton) prevButton.disabled = !prevTarget || !!prevTarget.disabled;
    if (nextButton) nextButton.disabled = !nextTarget || !!nextTarget.disabled;
  }

  function makeButton(className, text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', function () {
      onClick();
      window.setTimeout(syncOverlayButtons, 0);
    });
    return button;
  }

  function injectOverlay() {
    if (document.getElementById('viewer-hotkeys')) return;

    const wrap = document.createElement('div');
    wrap.id = 'viewer-hotkeys';

    const navRow = document.createElement('div');
    navRow.className = 'vh-row vh-nav-row';

    const prevButton = makeButton('vh-btn vh-nav-btn', 'Prev / 이전', goPrev);
    prevButton.setAttribute('data-action', 'prev');

    const nextButton = makeButton('vh-btn vh-nav-btn', 'Next / 다음', goNext);
    nextButton.setAttribute('data-action', 'next');

    navRow.appendChild(prevButton);
    navRow.appendChild(nextButton);

    const hint = document.createElement('div');
    hint.className = 'vh-hint';
    hint.textContent = 'Arrow 이동 · Home 처음 · Space 재생';

    wrap.appendChild(navRow);
    wrap.appendChild(hint);
    document.body.appendChild(wrap);

    window.setTimeout(syncOverlayButtons, 0);
  }

  function init() {
    applyScale(scale);
    injectOverlay();
  }

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || isEditable(event.target) || event.altKey || event.metaKey) return;

    if (event.key === 'ArrowRight') {
      if (goNext()) {
        event.preventDefault();
        window.setTimeout(syncOverlayButtons, 0);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (goPrev()) {
        event.preventDefault();
        window.setTimeout(syncOverlayButtons, 0);
      }
      return;
    }

    if (event.key === 'Home') {
      if (goReset()) {
        event.preventDefault();
        window.setTimeout(syncOverlayButtons, 0);
      }
      return;
    }

    if (event.code === 'Space') {
      if (togglePlay()) {
        event.preventDefault();
        window.setTimeout(syncOverlayButtons, 0);
      }
      return;
    }

    if (!event.ctrlKey) {
      if (event.key === '+' || event.key === '=') {
        applyScale(scale + STEP);
        event.preventDefault();
        return;
      }

      if (event.key === '-' || event.key === '_') {
        applyScale(scale - STEP);
        event.preventDefault();
        return;
      }

      if (event.key === '0') {
        applyScale(1);
        event.preventDefault();
      }
    }
  });

  document.addEventListener(
    'click',
    function () {
      window.setTimeout(syncOverlayButtons, 0);
    },
    true
  );

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
