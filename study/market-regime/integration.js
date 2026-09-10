// The imported scorecard is an isolated, local snapshot, not a live Claude embed.
(() => {
  const meta = document.getElementById('meta');
  const snapshot = document.createElement('span');
  snapshot.className = 'chip snapshot-chip';
  snapshot.textContent = '원본 스냅샷 · 자동 갱신 미연결';
  meta.appendChild(snapshot);

  const note = document.createElement('p');
  note.className = 'snapshot-note';
  note.textContent = '제공된 아티팩트의 화면 코드와 저장된 산출값을 옮긴 자료입니다. 아래 설명의 수집 시각은 EG Dashboard의 자동 갱신 일정이 아닙니다. 원시 시세 수집·백테스트 코드는 원본에 포함되지 않아, 해당 결과는 독립 재산출·검증하지 않았습니다.';
  document.getElementById('limits').prepend(note);

  const tabs = document.getElementById('tabs');
  function syncTabs() {
    tabs.querySelectorAll('[role=tab]').forEach(button => {
      const key = button.dataset.k;
      button.id = `tab_${key}`;
      button.tabIndex = button.getAttribute('aria-selected') === 'true' ? 0 : -1;
      button.setAttribute('aria-controls', `pane_${key}`);
      document.getElementById(`pane_${key}`).setAttribute('aria-labelledby', button.id);
    });
  }
  tabs.addEventListener('click', syncTabs);
  tabs.addEventListener('keydown', event => {
    const buttons = [...tabs.querySelectorAll('[role=tab]')];
    let index = buttons.indexOf(event.target);
    if (index < 0) return;
    if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') index = (index + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[index].click();
    buttons[index].focus();
  });
  syncTabs();

  let pending = 0, lastHeight = 0;
  const reportSize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const height = Math.ceil(document.querySelector('.wrap').getBoundingClientRect().height) + 8;
      if (height === lastHeight) return;
      lastHeight = height;
      if (window.parent !== window) window.parent.postMessage({type:'eg-market-regime-size',height}, '*');
    });
  };
  new ResizeObserver(reportSize).observe(document.querySelector('.wrap'));
  document.fonts.ready.then(reportSize);
  reportSize();
})();
