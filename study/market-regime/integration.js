// US data is independently refreshed; KR/CN remain isolated source snapshots.
(() => {
  const daily = DATA.us.mode === 'eg-us-regime-v1';
  const meta = document.getElementById('meta');
  const snapshot = document.createElement('span');
  snapshot.className = 'chip snapshot-chip';
  snapshot.textContent = daily ? '미국 자동 갱신 · 한국/중국 원본 스냅샷' : '원본 스냅샷 · 미국 자동 갱신 대기';
  meta.appendChild(snapshot);

  const note = document.createElement('p');
  note.className = 'snapshot-note';
  note.textContent = daily
    ? '미국은 공개된 화면 산식을 기준으로 EG에서 독립 재산출합니다. 원본의 수집·백테스트 코드는 제공되지 않아 원본과 수치가 일치하는 복원은 아닙니다. 한국·중국은 원본 저장값이며 자동 갱신하지 않습니다.'
    : '원본 수집·백테스트 코드가 없는 저장값입니다. 미국 독립 수집의 첫 검증 완료 전에는 원본 기준일을 유지합니다.';
  if (daily) {
    document.getElementById('limits').innerHTML = `<ul>
      <li><b>미국 데이터</b> — S&P500 구성종목 ${DATA.us.n_universe}개, SPY·QQQ, GICS 11개 섹터 ETF. Yahoo Finance / yfinance의 분할 조정 일봉 종가·고가·저가·거래량을 수집합니다. 배당 재투자는 포함하지 않습니다. 당일 Breadth 50DMA 유효 표본 ${DATA.us.latest.n_breadth}개.</li>
      <li><b>갱신 일정</b> — 미국 월~금 장에 대응하는 KST 화~토 05:05 예약. 일·월요일 및 NYSE 휴장일 제외. 겨울에는 06:05 KST까지 마감 대기하며, 조기폐장은 거래소 캘린더를 따릅니다. GitHub 대기열·제공처 지연으로 실제 게시 시각은 늦어질 수 있습니다.</li>
      <li><b>품질 검사</b> — 기준 ETF 전체와 구성종목 98% 이상이 목표 거래일에 도달해야 게시합니다. 누락된 시세는 전일 값으로 메우지 않고 해당 표본에서 제외합니다. 거래량 또는 고가·저가가 없는 봉은 유효 봉으로 취급하지 않습니다.</li>
      <li><b>④⑥ 평가 시점</b> — 신호일 종가 → 5거래일 뒤 종가. 수익률이 0보다 크면 성공으로 정의하며, 평가 완료일 기준 최근 21거래일을 집계합니다. 20건 미만이면 63거래일, 그래도 8건 미만이면 N/A. 종목별 5거래일 내 중복을 제거합니다. 비용·슬리피지는 미포함입니다.</li>
      <li><b>재현 기준</b> — 돌파는 직전 50일의 일중 고가, 거래량 기준은 당일을 제외한 직전 50일 평균. 스윙은 120일 범위에서 좌우 5봉으로 확인된 고가·저가만 사용합니다. ⑤ 분산은 모집단 표준편차이며 누적 중앙값은 수집한 4년 구간부터 계산합니다.</li>
      <li><b>해석</b> — ④⑥의 5점은 성공률 50%·평균수익률 0% 조합의 기준점입니다. 합성점수이므로 점수만으로 실제 손익 부호를 단정할 수 없습니다. 성공률과 평균수익률을 함께 확인해야 합니다.</li>
      <li><b>역사와 백분위</b> — 미국 1년 차트는 같은 EG 산식으로 전 구간 재계산합니다. p는 최대 과거 500거래일 기준이며 60개 관측 전에는 표시하지 않습니다. 현재 구성종목을 사용하므로 생존편향이 있습니다. 원본 연구의 승률·백테스트 수치는 새 수집 자료로 재검증하지 않았습니다.</li>
      <li><b>국가별 구분</b> — 미국 ${DATA.us.asof}, 한국 ${DATA.kr.asof}, 중국 ${DATA.cn.asof}. 한국·중국은 원본 스냅샷이며 최신 미국 결과와 동일 날짜·동일 수집원으로 비교한 결과가 아닙니다.</li>
    </ul>`;
    document.querySelectorAll('#method .diff, #method .cau').forEach(block => {
      const label = document.createElement('div');
      label.className = 'snapshot-note';
      label.textContent = '원본 연구 참고 · EG 신규 데이터로 미재검증';
      block.prepend(label);
    });
  }
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
