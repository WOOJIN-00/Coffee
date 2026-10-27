/*
 * 1장 (SQL Injection) 라우터 — 피킹 스테이지
 *   GET /ch1/:no/play   문제 페이지 (게임의 문제보기 창에 바로 뜸)
 *   검사 봇은 필요 없다. 숨긴 FLAG 를 추출하면 그 결과가 화면에 그대로 나타난다.
 */
const express = require('express');
const path = require('path');
const problems = require('./problems');
const db = require('./db');
const { page, esc } = require('./view');

const router = express.Router();
router.use('/static', express.static(path.join(__dirname, 'public')));
router.use(express.urlencoded({ extended: false, limit: '4kb' }));

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
function foundBanner() {
  return '<div class="found">🍒 황금 체리를 찾았습니다! 아래에 나온 <b>COFFEE{...}</b> 값이 FLAG입니다. 게임 입력칸에 그대로 넣으세요.</div>';
}
function containsFlag(text, flag) { return flag && String(text).includes(flag); }

// 간단한 쿠키 읽기 (8번: 참가자별 프로필 구분용)
function readCookie(req, name) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function randomId() { return require('crypto').randomBytes(8).toString('hex'); }

/* ========== 1번: UNION SELECT 열매 검색대 ========== */
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
        const flag = db.flagAt(1);
        if (r.values.some(row => row.some(cell => containsFlag(cell, flag)))) result += foundBanner();
        result += resultTable(r);
      }
    } catch (e) {
      result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
    }
  }
  const body = '<p class="desk">커피 나무 열매 검색대 — 품종 이름으로 체리를 찾습니다. (검색어가 비면 전체 목록)</p>' +
    '<form class="search" method="get"><input name="q" value="' + esc(q) + '" placeholder="예: 예가체프" autocomplete="off" autofocus><button>검색</button></form>' + result;
  res.send(page(p, body));
});

/* ========== 2번: 에러 기반 로그인 ========== */
router.get('/2/play', (req, res) => {
  const p = problems[1];
  const user = typeof req.query.user === 'string' ? req.query.user : '';
  const pass = typeof req.query.pass === 'string' ? req.query.pass : '';
  let result = '';
  if (user || pass) {
    if (!db.isReady()) {
      result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
    } else {
      try {
        const ok = db.login2(user, pass);
        result = '<p class="' + (ok ? 'saved' : 'empty') + '">' + (ok ? '로그인 성공' : '아이디 또는 비밀번호가 올바르지 않습니다.') + '</p>';
      } catch (e) {
        const flag = db.flagAt(2);
        if (containsFlag(e.message, flag)) result = foundBanner() + '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
        else result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
      }
    }
  }
  const body = '<p class="desk">농장 직원 전용 로그인입니다.</p>' +
    '<form class="search" method="get">' +
    '<input name="user" value="' + esc(user) + '" placeholder="아이디" autocomplete="off" autofocus>' +
    '<input name="pass" value="' + esc(pass) + '" placeholder="비밀번호" autocomplete="off">' +
    '<button>로그인</button></form>' + result;
  res.send(page(p, body));
});

/* ========== 3번: ' OR '1'='1 인증 우회 ========== */
router.get('/3/play', (req, res) => {
  const p = problems[2];
  const user = typeof req.query.user === 'string' ? req.query.user : '';
  const pass = typeof req.query.pass === 'string' ? req.query.pass : '';
  let result = '';
  if (user || pass) {
    if (!db.isReady()) {
      result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
    } else {
      try {
        const rows = db.login3(user, pass);
        if (!rows.length) result = '<p class="empty">아이디 또는 비밀번호가 올바르지 않습니다.</p>';
        else {
          result = '<div class="found">🔓 관리문이 열렸습니다! 아래 FLAG를 게임 입력칸에 넣으세요.</div>' +
            resultTable({ columns: ['id', 'user', 'role', 'secret'], values: rows });
        }
      } catch (e) {
        result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
      }
    }
  }
  const body = '<p class="desk">농장 관리문 — 관리자 아이디/비밀번호로만 열립니다.</p>' +
    '<form class="search" method="get">' +
    '<input name="user" value="' + esc(user) + '" placeholder="아이디" autocomplete="off" autofocus>' +
    '<input name="pass" value="' + esc(pass) + '" placeholder="비밀번호" autocomplete="off">' +
    '<button>열기</button></form>' + result;
  res.send(page(p, body));
});

/* ========== 4번: 블라인드 불리언 ========== */
router.get('/4/play', (req, res) => {
  const p = problems[3];
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  let result = '';
  if (q) {
    if (!db.isReady()) result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
    else {
      const truthy = db.blind4(q);
      result = truthy
        ? '<div class="found" style="font-size:15px">🍃 잎이 떨린다 — <b>참</b>입니다.</div>'
        : '<p class="empty">나무가 가만히 있다 — <b>거짓</b>입니다.</p>';
    }
  }
  const body = '<p class="desk">나무를 살짝 흔들어 조건의 참/거짓만 확인합니다. 결과값 자체는 보여 주지 않습니다.</p>' +
    '<form class="search" method="get"><input name="q" value="' + esc(q) + '" placeholder="예: 1=1" autocomplete="off" autofocus><button>흔들어 보기</button></form>' + result;
  res.send(page(p, body));
});

/* ========== 5번: 블라인드 타임베이스 ========== */
router.get('/5/play', (req, res) => {
  const p = problems[4];
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  let result = '';
  if (q) {
    if (!db.isReady()) result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
    else {
      const ms = db.blind5(q);
      result = '<p class="saved">응답 시간: <b>' + ms + 'ms</b></p>';
    }
  }
  const body = '<p class="desk">조건이 참이면 sleep() 으로 응답이 늦어집니다 (최대 5초로 제한). 지연 시간을 재서 값을 복원하세요.</p>' +
    '<form class="search" method="get"><input name="q" value="' + esc(q) + '" placeholder="예: 1=1" autocomplete="off" autofocus><button>요청</button></form>' + result;
  res.send(page(p, body));
});

/* ========== 6번: 방문 기록 (헤더 인젝션 + 스택 삽입) ========== */
router.get('/6/play', (req, res) => {
  const p = problems[5];
  const ua = String(req.get('user-agent') || '').slice(0, 300);
  let result = '';
  if (!db.isReady()) {
    result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
  } else {
    try { db.logVisit(ua); } catch (e) { /* 저장 실패해도 목록은 계속 보여 준다 */ }
    const r = db.listVisits();
    const flag = db.flagAt(6);
    if (r.values.some(row => row.some(cell => containsFlag(cell, flag)))) result += foundBanner();
    result += resultTable(r);
  }
  const body = '<p class="desk">최근 방문 기록 — 접속할 때 보낸 User-Agent 헤더를 그대로 기록합니다. 이 페이지엔 따로 입력칸이 없습니다.</p>' +
    '<p class="tip">지금 보낸 내 User-Agent: <code>' + esc(ua) + '</code></p>' + result;
  res.send(page(p, body));
});

/* ========== 7번: NoSQL 식 로그인 ========== */
router.get('/7/play', (req, res) => {
  const p = problems[6];
  const user = req.query.username;
  const pass = req.query.password;
  let result = '';
  if (user !== undefined || pass !== undefined) {
    const ok = db.login7(user, pass);
    result = ok
      ? '<div class="found">🔓 인증을 우회했습니다! FLAG: ' + esc(db.nosqlSecret()) + '</div>'
      : '<p class="empty">인증 실패.</p>';
  }
  const body = '<p class="desk">NoSQL 식 로그인 — username/password 파라미터를 그대로 비교에 씁니다.</p>' +
    '<form class="search" method="get"><input name="username" value="' + esc(typeof user === 'string' ? user : '') + '" placeholder="아이디" autocomplete="off" autofocus>' +
    '<input name="password" value="' + esc(typeof pass === 'string' ? pass : '') + '" placeholder="비밀번호" autocomplete="off"><button>로그인</button></form>' +
    '<p class="tip">주소창에 <code>?username[$ne]=1&password[$ne]=1</code> 처럼 대괄호를 써서 직접 보낼 수도 있습니다.</p>' + result;
  res.send(page(p, body));
});

/* ========== 8번: 2차(Second-Order) 주입 ========== */
function ensureProfileId(req, res) {
  let id = readCookie(req, 'profile8');
  if (!/^[0-9a-f]{16}$/.test(id)) { id = randomId(); res.setHeader('Set-Cookie', 'profile8=' + id + '; Path=/ch1/8; SameSite=Lax'); }
  return id;
}
router.get('/8/play', (req, res) => {
  const p = problems[7];
  const idKey = ensureProfileId(req, res);
  const name = db.isReady() ? db.getProfileName(idKey) : '';
  const body = '<p class="desk">선별 프로필 등록 — 이름을 등록해 두면, 나중에 "내 프로필 보기"에서 그 이름으로 다시 검색합니다.</p>' +
    '<form class="search" method="post" action="/ch1/8/register"><input name="name" placeholder="이름" autocomplete="off" autofocus><button>등록</button></form>' +
    (name ? '<p class="saved">등록된 이름: ' + esc(name) + '</p>' : '<p class="empty">아직 등록한 이름이 없습니다.</p>') +
    '<p><a href="/ch1/8/view">내 프로필 보기 →</a></p>';
  res.send(page(p, body));
});
router.post('/8/register', (req, res) => {
  const idKey = ensureProfileId(req, res);
  const name = String((req.body && req.body.name) || '').slice(0, 300);
  if (db.isReady() && name) db.saveProfile(idKey, name);
  res.redirect('/ch1/8/play');
});
router.get('/8/view', (req, res) => {
  const p = problems[7];
  const idKey = ensureProfileId(req, res);
  let result = '';
  if (!db.isReady()) {
    result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
  } else {
    const name = db.getProfileName(idKey);
    if (!name) result = '<p class="empty">먼저 이름을 등록해 주세요.</p>';
    else {
      try {
        const r = db.viewProfile(name); // 의도된 취약점: 저장해 둔 raw 문자열을 새 쿼리에 그대로 이어 붙인다
        const flag = db.flagAt(8);
        if (r.values.some(row => row.some(cell => containsFlag(cell, flag)))) result += foundBanner();
        result += r.values.length ? resultTable(r) : '<p class="empty">일치하는 프로필이 없습니다.</p>';
      } catch (e) {
        result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
      }
    }
  }
  const body = '<p class="desk">내 프로필 보기 — 등록해 둔 이름으로 프로필을 다시 찾습니다.</p>' + result +
    '<p><a href="/ch1/8/play">← 등록 화면으로</a></p>';
  res.send(page(p, body));
});

/* ========== 9번: 스택 쿼리 ========== */
router.get('/9/play', (req, res) => {
  const p = problems[8];
  if (!db.isReady()) {
    return res.send(page(p, '<p class="empty">데이터베이스를 준비하는 중입니다.</p>'));
  }
  const r = db.listNotes();
  const flag = db.flagAt(9);
  let result = '';
  if (r.values.some(row => row.some(cell => containsFlag(cell, flag)))) result += foundBanner();
  result += r.values.length ? resultTable(r) : '<p class="empty">아직 쪽지가 없습니다.</p>';
  const body = '<p class="desk">쪽지함 — 남긴 내용이 그대로 저장 쿼리에 들어갑니다.</p>' +
    '<form class="search" method="post" action="/ch1/9/note"><input name="text" placeholder="쪽지 내용" autocomplete="off" autofocus><button>남기기</button></form>' + result;
  res.send(page(p, body));
});
router.post('/9/note', (req, res) => {
  const text = String((req.body && req.body.text) || '').slice(0, 300);
  if (db.isReady() && text) { try { db.saveNote(text); } catch (e) { /* 잘못된 구문이면 조용히 무시 */ } }
  res.redirect('/ch1/9/play');
});

/* ========== 10번: WAF 우회 SQLi ========== */
// 의도된 "엉성한" 블랙리스트: 대문자+띄어쓰기가 정확히 일치하는 "UNION SELECT" 만 막는다
// (대소문자를 바꾸거나 공백을 주석으로 바꾸면 바로 통과한다 — 난이도를 낮추기 위해 OR/= 차단은 두지 않는다).
function wafBlocked(q) {
  if (/UNION\s+SELECT/.test(q)) return 'UNION SELECT';
  return null;
}
router.get('/10/play', (req, res) => {
  const p = problems[9];
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  let result = '';
  const blocked = q ? wafBlocked(q) : null;
  if (blocked) {
    result = '<p class="sqlerr"><b>WAF 차단</b> 금지된 패턴(' + esc(blocked) + ')이 감지되었습니다.</p>';
  } else if (q || req.query.q === '') {
    if (!db.isReady()) result = '<p class="empty">데이터베이스를 준비하는 중입니다.</p>';
    else {
      try {
        const r = db.search10(q);
        if (!r.values.length) result = '<p class="empty">‘' + esc(q) + '’ 와(과) 맞는 체리가 없습니다.</p>';
        else {
          const flag = db.flagAt(10);
          if (r.values.some(row => row.some(cell => containsFlag(cell, flag)))) result += foundBanner();
          result += resultTable(r);
        }
      } catch (e) {
        result = '<p class="sqlerr"><b>DB 오류</b> ' + esc(e.message) + '</p>';
      }
    }
  }
  const body = '<p class="desk">열매 검색대 (WAF 적용) — UNION SELECT · OR · = 을 그대로 쓰면 차단됩니다.</p>' +
    '<form class="search" method="get"><input name="q" value="' + esc(q) + '" placeholder="예: 예가체프" autocomplete="off" autofocus><button>검색</button></form>' + result;
  res.send(page(p, body));
});

// 아직 만들지 않은 문제: 안내 띠 + 준비 중 표시
router.get('/:no/play', find, (req, res) => {
  res.send(page(req.problem, '<p class="empty">아직 준비 중인 문제입니다. 문제 설명은 게임의 문제 카드에서 볼 수 있습니다.</p>'));
});

module.exports = router;
