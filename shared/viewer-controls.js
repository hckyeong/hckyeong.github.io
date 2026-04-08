(function () {
  const SCALE_KEY = 'dsv_viewer_scale';
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

  function getScale() {
    const raw = window.localStorage.getItem(SCALE_KEY);
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

  function findByText(regex) {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"]'));
    return buttons.find((el) => regex.test((el.textContent || el.value || '').trim())) || null;
  }

  function clickTarget(target) {
    if (!target || target.disabled) return false;
    target.click();
    return true;
  }

  function getNextTarget() {
    return (
      findByIds(['next', 'bn', 'nb', 'btn-next']) ||
      findByText(/다음|next/i)
    );
  }

  function getPrevTarget() {
    return (
      findByIds(['prev', 'bp', 'pb', 'btn-prev']) ||
      findByText(/이전|prev/i)
    );
  }

  function getResetTarget() {
    return (
      findByIds(['reset', 'btn-reset']) ||
      findByText(/처음|초기화|reset/i)
    );
  }

  function getPlayTarget() {
    return (
      findByIds(['play', 'auto-btn']) ||
      findByText(/자동|재생|일시정지|play|pause/i)
    );
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
    window.localStorage.setItem(SCALE_KEY, String(scale));
    const label = document.querySelector('#viewer-hotkeys .vh-scale');
    if (label) label.textContent = `${Math.round(scale * 100)}%`;
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

  function injectOverlay() {
    if (document.getElementById('viewer-hotkeys')) return;

    const wrap = document.createElement('div');
    wrap.id = 'viewer-hotkeys';
    wrap.innerHTML = [
      '<div class="vh-row vh-nav-row">',
      '<button class="vh-btn vh-nav-btn" type="button" data-action="prev">← 이전</button>',
      '<button class="vh-btn vh-nav-btn" type="button" data-action="next">다음 →</button>',
      '</div>',
      '<div class="vh-row vh-scale-row">',
      '<button class="vh-btn" type="button" data-scale="-1">A-</button>',
      '<div class="vh-scale">100%</div>',
      '<button class="vh-btn" type="button" data-scale="1">A+</button>',
      '</div>',
      '<div class="vh-hint">←/→ 이동 · Home 처음 · Space 재생</div>'
    ].join('');
    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (event) {
      const actionButton = event.target.closest('[data-action]');
      if (actionButton) {
        const action = actionButton.getAttribute('data-action');
        if (action === 'prev') goPrev();
        if (action === 'next') goNext();
        window.setTimeout(syncOverlayButtons, 0);
        return;
      }

      const scaleButton = event.target.closest('[data-scale]');
      if (!scaleButton) return;
      const dir = parseInt(scaleButton.getAttribute('data-scale'), 10);
      if (!Number.isFinite(dir)) return;
      applyScale(scale + dir * STEP);
    });

    window.setTimeout(syncOverlayButtons, 0);
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

  document.addEventListener('click', function () {
    window.setTimeout(syncOverlayButtons, 0);
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    applyScale(scale);
    injectOverlay();
  });
})();
