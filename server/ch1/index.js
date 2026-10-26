/*
 * 1장 (SQL Injection) 라우터
 *   GET /ch1/:no/play   문제 페이지 (게임의 문제보기 창에 바로 뜸)
 *   1번(UNION SELECT): 열매 검색대. 검색어를 쿼리에 그대로 이어 붙여(의도된 취약점) UNION 주입이 가능하다.
 *                      숨긴 금고(vault)의 황금 체리(FLAG)를 꺼내면 결과 표에 그대로 나타난다. 검사 봇은 필요 없다.
 */
const express = require('express');
const path = require('path');
const config = require('../config');
const problems = require('./problems');
const db = require('./db');
const { page, esc } = require('./view');

const router = express.Router();
router.use('/static', express.static(path.join(__dirname, 'public')));

function find(req, res, next) {
  const p = problems.find(x => String(x.no) === req.params.no);
  if (!p) return res.status(404).send('없는 문제입니다.');
  req.problem = p;
  next();
}

// /ch1/1, /ch1/1/ → 문제 페이지로
router.get('/:no', (req, res) => res.redirect(req.baseUrl + '/' + encodeURIComponent(req.params.no) + '/play'));

function resultTable(r) {
  return '<table class="rows"><tr>' + r.columns.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr>' +
    r.values.map(row => '<tr>' + row.map(cell => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</table>';
}

// 1번: UNION SELECT 열매 검색대
router.get('/1/play', (req, res) => {
  const p = problems[0];
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  let result = '';
  if (!db.isReady()) {
    result = '<p class="empty">데이터베이스를 준비하는 중입니다. 잠시 뒤 다시 검색해 주세요.</p>';
  } else {
    try {
      const r = db.search1(q);
      if (!r.values.length) {
        result = '<p class="empty">‘' + esc(q) + '’ 와(과) 맞는 체리가 없습니다.</p>';
      } else {
        const flag = db.flag1();
        const found = flag && r.values.some(row => row.some(cell => String(cell).includes(flag)));
        if (found) result += '<div class="found">🍒 황금 체리를 찾았습니다! 아래 표에 나온 <b>COFFEE{...}</b> 값이 FLAG입니다. 게임 입력칸에 그대로 넣으세요.</div>';
        result += resultTable(r);
      }
    } catch (e) {
      // 의도된 노출: SQL 오류 메시지를 보여 준다 (컬럼 수 맞추기 등 디버깅에 쓰인다)
      result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
    }
  }
  const body =
    '<p class="desk">커피 나무 열매 검색대 — 품종 이름으로 체리를 찾습니다. (검색어가 비면 전체 목록)</p>' +
    '<form class="search" method="get"><input name="q" value="' + esc(q) + '" placeholder="예: 예가체프" autocomplete="off" autofocus><button>검색</button></form>' +
    result;
  res.send(page(p, body));
});

// 아직 만들지 않은 문제: 안내 띠 + 준비 중 표시
router.get('/:no/play', find, (req, res) => {
  res.send(page(req.problem, '<p class="empty">아직 준비 중인 문제입니다. 문제 설명은 게임의 문제 카드에서 볼 수 있습니다.</p>'));
});

module.exports = router;
