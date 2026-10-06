const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/study-calendar-data.js'), 'utf8'), dataContext);
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const element = () => ({ innerHTML: '', classList: { add() {}, remove() {} } });
const overview = element();
const context = vm.createContext({
  studyCalendarData: dataContext.window.studyCalendarData,
  usOverviewRoot: overview, companyGrid: element(), destroyCharts() {},
  renderPlaceholderOverview() { throw Error('Unexpected empty calendar'); },
  escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char])); },
});
for (const name of ['createStudyCalendarDates', 'formatStudyCalendarDayNumber', 'renderStudyCalendarOverview']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
vm.runInContext('renderStudyCalendarOverview()', context);
assert.equal((overview.innerHTML.match(/class="study-calendar-day(?: |")/g) || []).length, 28);
assert.ok(overview.innerHTML.includes('실적 일정 점검'));
assert.ok(overview.innerHTML.includes('Yahoo'));
assert.ok(overview.innerHTML.includes('미확인'));
assert.ok(!overview.innerHTML.includes('undefined'));
console.log('PASS: 4-week calendar rendering and source/coverage audit.');
