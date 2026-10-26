/* 1장 (SQL Injection) 문제 페이지 공통 틀 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/*
 * 문제 페이지 틀: 위쪽 안내 띠(장·문제·상황·미션·힌트·목표) + 아래 데이터베이스 화면(body)
 *   XSS(2장)와 달리 검사 봇이 필요 없다. 숨긴 플래그를 추출하면 화면에 바로 나타난다.
 */
function page(p, body) {
  const who = p.no === 10 ? '최종 관문' : p.no + '번 관문';
  let brief = '';
  if (p.situation) brief += '<p><b>상황</b> ' + esc(p.situation) + '</p>';
  if (p.mission) brief += '<p><b>미션</b> ' + esc(p.mission) + '</p>';
  if (p.hint) brief += '<details class="hint"><summary>공략 힌트 보기</summary><p>' + esc(p.hint) + '</p></details>';
  const banner = '<header class="banner">' +
    '<p class="eyebrow">1장 커피나무 · ' + who + ' · ' + esc(p.step || '') + ' · ' + esc(p.category || '') + '</p>' +
    (p.flavor ? '<h2 class="flavor">' + esc(p.flavor) + '</h2>' : '') +
    (brief ? '<div class="brief">' + brief + '</div>' : '') +
    '<p class="goal"><b>목표</b> 나무가 숨긴 <b>황금 체리(FLAG)</b>를 꺼내면 이 화면에 그대로 나타납니다. 그 FLAG를 게임 입력칸에 넣어 도끼질하세요.' +
    ' <a href="" target="_blank" rel="noopener" class="newwin">새 창에서 보기</a></p>' +
    '</header>';
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(p.category || '문제') + ' · 커피 나무 열매 데이터베이스</title>' +
    '<link rel="stylesheet" href="/ch1/static/forest.css"></head>' +
    '<body>' + banner + '<main>' + body + '</main></body></html>';
}

module.exports = { esc, page };
