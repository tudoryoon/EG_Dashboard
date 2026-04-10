# US & Taiwan Revenue Dashboard

미국/대만 기업 월간 대시보드를 위한 GitHub Pages 스타터입니다.

## 포함 내용

- 상단 검색창
- 통화 토글 `NT$ / USD / KRW`
- 섹터 필터 칩
- 기업별 카드 그리드
- 카드 내부 월별 매출 막대 + YoY/MoM 차트
- 연도별 YoY 비교 차트
- `data/companies.js` 기반 데이터 분리

## 파일 구조

- `index.html`: 대시보드 레이아웃
- `styles.css`: 라이트 UI 스타일
- `script.js`: 필터링 및 Chart.js 렌더링
- `data/companies.js`: 회사별 데이터 입력 파일

## 데이터 넣는 방법

1. `data/companies.js`를 엽니다.
2. 회사 한 개는 객체 한 개입니다.
3. `currency`, `mom`, `yoy`, `bars`, `yoyLine`, `momLine`, `yearly.series` 값을 실제 숫자로 바꾸면 됩니다.
4. 같은 형식으로 회사를 추가하면 카드가 자동으로 늘어납니다.

## 다음 단계 추천

1. 기업 데이터를 `data/companies.json`으로 분리
2. 미국 기업과 대만 기업의 실제 월별 매출 데이터 매핑
3. GitHub Actions로 데이터 수집 및 정적 배포 자동화
4. 카드 클릭 시 상세 페이지 또는 모달 확장
