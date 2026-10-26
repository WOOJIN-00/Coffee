/*
 * 1장 (SQL Injection) 데이터베이스
 *   - sql.js(WASM SQLite)로 실제 SQLite 엔진을 띄운다. 네이티브 빌드가 없어 Docker(node:20)에서도 그대로 돈다.
 *   - 읽기 전용 문제가 대부분이라 서버가 켜질 때 한 번만 테이블을 만들고 값을 채운다.
 *   - 문제마다 숨긴 플래그를 담는 테이블을 따로 둔다 (교차 유출 방지: 1번 문제에서 5번 플래그가 같이 새지 않도록).
 *   - 평문 플래그는 저장소에 두지 않는다. config.flags.ch1[n-1] 이 없으면 예시 문구로 대신한다.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const config = require('../config');

let db = null;

// 열매 검색대에 보이는 평범한 체리들 (1번, 10번이 함께 쓴다)
const CHERRIES = [
  [1, '예가체프', '이르가체페 농장', '18.5'],
  [2, '시다모', '시다모 협동조합', '17.2'],
  [3, '안티구아', '안티구아 고원', '19.1'],
  [4, '수프리모', '우일라 농장', '16.8'],
  [5, '코나', '코나 해안 농장', '20.3']
];

function flagAt(n) {
  return (config.flags.ch1 && config.flags.ch1[n - 1]) || ('COFFEE{flags_json_에_ch1_' + n + '번_플래그를_넣어주세요}');
}

/*
 * 2번(Error-based)용 커스텀 함수: MySQL 의 extractvalue()/updatexml() 흉내.
 *   MySQL 은 잘못된 XPATH 를 넘기면 그 XPATH 문자열을 에러 메시지에 그대로 실어 던진다.
 *   그 성질을 이용해 서브쿼리 결과를 XPATH 자리에 넣으면 결과가 에러 메시지로 새어 나온다.
 *   sql.js 커스텀 함수는 Error 객체를 던지면 메시지가 사라지므로(엔진 특성) 반드시 "문자열"을 던진다.
 */
function extractvalueFn(doc, xpath) {
  throw "XPATH syntax error: '" + String(xpath) + "'";
}
function updatexmlFn(doc, xpath, repl) {
  throw "XPATH syntax error: '" + String(xpath) + "'";
}
// MySQL 식 concat(a, b) — SQLite 에는 없어 직접 만든다 (PDF 힌트의 concat() 과 같은 역할)
function concatFn(a, b) { return String(a == null ? '' : a) + String(b == null ? '' : b); }

// 5번(Time-based Blind)용: SLEEP(초). 데모/저사양 서버 보호를 위해 최대 5초로 자른다(busy-wait, 단일 스레드 blocking).
function sleepFn(sec) {
  const ms = Math.max(0, Math.min(Number(sec) || 0, 5)) * 1000;
  const until = Date.now() + ms;
  while (Date.now() < until) { /* 의도된 지연 */ }
  return 0;
}

const ready = initSqlJs({ locateFile: f => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) })
  .then(SQL => {
    db = new SQL.Database();
    db.create_function('extractvalue', extractvalueFn);
    db.create_function('updatexml', updatexmlFn);
    db.create_function('concat', concatFn);
    db.create_function('sleep', sleepFn);

    // 1·10번: 열매 검색대
    db.run('CREATE TABLE cherries(id INTEGER PRIMARY KEY, name TEXT, origin TEXT, brix TEXT);');
    let ins = db.prepare('INSERT INTO cherries VALUES (?,?,?,?)');
    CHERRIES.forEach(r => ins.run(r)); ins.free();

    // 1번: 농장주만 아는 금고
    db.run('CREATE TABLE vault(id INTEGER PRIMARY KEY, label TEXT, secret TEXT);');
    db.run('INSERT INTO vault VALUES (1, ?, ?)', ['황금 체리 (농장주 전용)', flagAt(1)]);

    // 2번: 직원 메모 (에러 메시지로만 새어 나온다)
    db.run('CREATE TABLE staff_note(id INTEGER PRIMARY KEY, label TEXT, secret TEXT);');
    db.run('INSERT INTO staff_note VALUES (1, ?, ?)', ['관리자 비밀 메모', flagAt(2)]);

    // 3번: 관리문 — 비밀번호는 아무도 모르는 랜덤값. 조건을 항상 참으로 만들어야만 열린다.
    db.run('CREATE TABLE staff(id INTEGER PRIMARY KEY, user TEXT, pass TEXT, role TEXT, secret TEXT);');
    const rndPass = require('crypto').randomBytes(12).toString('hex');
    db.run('INSERT INTO staff VALUES (1, ?, ?, ?, ?)', ['admin', rndPass, 'admin', flagAt(3)]);

    // 4번: 블라인드 불리언 — 참/거짓만 알려 준다
    db.run('CREATE TABLE secret4(id INTEGER PRIMARY KEY, secret TEXT);');
    db.run('INSERT INTO secret4 VALUES (1, ?)', [flagAt(4)]);

    // 5번: 블라인드 타임베이스
    db.run('CREATE TABLE secret5(id INTEGER PRIMARY KEY, secret TEXT);');
    db.run('INSERT INTO secret5 VALUES (1, ?)', [flagAt(5)]);

    // 6번: 방문 기록 (헤더 인젝션 + 스택 삽입으로 발동) / 숨긴 값
    db.run('CREATE TABLE visits(id INTEGER PRIMARY KEY AUTOINCREMENT, ua TEXT, at TEXT);');
    db.run('CREATE TABLE secret6(id INTEGER PRIMARY KEY, secret TEXT);');
    db.run('INSERT INTO secret6 VALUES (1, ?)', [flagAt(6)]);

    // 8번: 선별 프로필 (2차 주입) / 숨긴 값. id 는 참가자별 쿠키 값(16자리 16진수 문자열)이라 TEXT 로 둔다.
    db.run('CREATE TABLE profiles(id TEXT PRIMARY KEY, name TEXT, bio TEXT);');
    db.run('CREATE TABLE secret8(id INTEGER PRIMARY KEY, secret TEXT);');
    db.run('INSERT INTO secret8 VALUES (1, ?)', [flagAt(8)]);

    // 9번: 쪽지함 (스택 쿼리) / 숨긴 값
    db.run('CREATE TABLE notes(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, at TEXT);');
    db.run('CREATE TABLE secret9(id INTEGER PRIMARY KEY, secret TEXT);');
    db.run('INSERT INTO secret9 VALUES (1, ?)', [flagAt(9)]);

    // 10번: WAF 우회용 전용 금고 (1번과 값이 섞이지 않도록 따로 둔다)
    db.run('CREATE TABLE secret10(id INTEGER PRIMARY KEY, label TEXT, secret TEXT);');
    db.run('INSERT INTO secret10 VALUES (1, ?, ?)', ['최종 금고', flagAt(10)]);

    return db;
  })
  .catch(e => { console.error('[ch1/db] 초기화 실패:', e.message); throw e; });

function columnsOf(res) { return res.length ? res[0].columns : []; }
function valuesOf(res) { return res.length ? res[0].values : []; }

/* ---------- 1번: UNION SELECT 열매 검색대 ---------- */
// 의도된 취약점: 입력(q)을 SQL 문자열에 그대로 이어 붙인다 → UNION SELECT 등으로 다른 테이블을 합칠 수 있다.
function search1(q) {
  const sql = "SELECT name AS '품종', origin AS '농장', brix AS '당도(Brix)' FROM cherries WHERE name LIKE '%" + q + "%'";
  const res = db.exec(sql); // SQL 오류가 나면 예외를 던진다 (화면에 메시지로 보여 준다)
  return { columns: columnsOf(res).length ? columnsOf(res) : ['품종', '농장', '당도(Brix)'], values: valuesOf(res) };
}

/* ---------- 2번: 에러 기반 로그인 ---------- */
// 의도된 취약점: user/pass 를 쿼리 문자열에 그대로 이어 붙인다. extractvalue()/updatexml() 로 에러를 내면 결과가 메시지에 실려 나온다.
function login2(user, pass) {
  const sql = "SELECT id FROM staff WHERE user = '" + user + "' AND pass = '" + pass + "'";
  const res = db.exec(sql); // 에러가 나면 예외(e.message)에 추출값이 담긴다
  return valuesOf(res).length > 0;
}

/* ---------- 3번: ' OR '1'='1 인증 우회 ---------- */
// 의도된 취약점: 위와 같은 방식으로 이어 붙인다. 조건을 항상 참으로 만들면 비밀번호를 몰라도 행이 반환된다.
function login3(user, pass) {
  const sql = "SELECT id, user, role, secret FROM staff WHERE user = '" + user + "' AND pass = '" + pass + "'";
  const res = db.exec(sql);
  return valuesOf(res); // [[id,user,role,secret], ...] — 한 행이라도 나오면 우회 성공
}

/* ---------- 4번: 블라인드 불리언 ---------- */
// 의도된 취약점: 조건(q)을 WHERE 절에 그대로 이어 붙인다. 참/거짓만 알려 주고 값은 보여 주지 않는다.
function blind4(q) {
  try {
    const res = db.exec("SELECT 1 FROM secret4 WHERE id = 1 AND (" + q + ")");
    return valuesOf(res).length > 0;
  } catch (e) {
    return false; // 에러도 '거짓' 취급 (에러 메시지를 보여 주면 블라인드가 아니게 된다)
  }
}

/* ---------- 5번: 블라인드 타임베이스 ---------- */
// 의도된 취약점: 위와 같되, 참일 때 sleep() 을 만나면 응답이 늦어진다. 걸린 시간(ms)을 돌려준다.
function blind5(q) {
  const t0 = Date.now();
  try { db.exec("SELECT 1 FROM secret5 WHERE id = 1 AND (" + q + ")"); } catch (e) { /* 무시: 시간만 본다 */ }
  return Date.now() - t0;
}

/* ---------- 6번: 방문 기록 (스택 삽입) ---------- */
// 의도된 취약점: User-Agent 헤더 값을 INSERT 문에 그대로 이어 붙인다. sql.js 는 세미콜론으로 여러 문장을 한 번에 실행할 수 있어
//   헤더에 세미콜론을 넣으면 원래 INSERT 뒤에 다른 문장(예: secret6 를 그대로 복사하는 INSERT)을 이어 실행시킬 수 있다.
function logVisit(ua) {
  const sql = "INSERT INTO visits(ua, at) VALUES ('" + ua + "', datetime('now'))";
  db.run(sql); // 에러가 나도 방문 기록 화면 자체는 계속 보여 준다 (조용히 무시)
}
function listVisits() {
  const res = db.exec('SELECT id, ua, at FROM visits ORDER BY id DESC LIMIT 20');
  return { columns: ['번호', 'User-Agent', '시각'], values: valuesOf(res) };
}

/* ---------- 7번: NoSQL 식 로그인 (SQL 엔진을 쓰지 않는다) ---------- */
const NOSQL_USER = { username: 'admin', password: require('crypto').randomBytes(12).toString('hex'), secret: flagAt(7) };
// 의도된 취약점: 참가자가 보낸 값이 문자열이 아니라 객체($ne, $regex 등)일 때도 그대로 비교에 쓴다.
function matchField(stored, input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if (Object.prototype.hasOwnProperty.call(input, '$ne')) return stored !== input.$ne;
    if (Object.prototype.hasOwnProperty.call(input, '$regex')) {
      try { return new RegExp(input.$regex).test(stored); } catch (e) { return false; }
    }
    return false;
  }
  return stored === input;
}
function login7(username, password) {
  return matchField(NOSQL_USER.username, username) && matchField(NOSQL_USER.password, password);
}
function nosqlSecret() { return NOSQL_USER.secret; }

/* ---------- 8번: 2차(Second-Order) 주입 ---------- */
// 저장 자체는 안전(바인딩)하다. 문제는 "나중에 그 값을 다시 꺼내 쓸 때" 재이스케이프 없이 문자열로 잇는다.
function saveProfile(id, name) {
  db.run('DELETE FROM profiles WHERE id = ?', [id]);
  db.run('INSERT INTO profiles(id, name, bio) VALUES (?, ?, ?)', [id, name, '']);
}
function getProfileName(id) {
  // id 는 서버가 만든 16진수 쿠키 값(바인딩 변수로 안전하게 조회) — 2차 주입 지점은 아래 viewProfile() 뿐이다
  const stmt = db.prepare('SELECT name FROM profiles WHERE id = ?');
  stmt.bind([id]);
  const name = stmt.step() ? stmt.get()[0] : '';
  stmt.free();
  return name || '';
}
// 의도된 취약점: 저장해 둔 raw 문자열(name)을 새 쿼리에 그대로 이어 붙여 다시 조회한다.
function viewProfile(name) {
  const sql = "SELECT id, name, bio FROM profiles WHERE name = '" + name + "'";
  const res = db.exec(sql);
  return { columns: ['id', 'name', 'bio'], values: valuesOf(res) };
}

/* ---------- 9번: 스택 쿼리 ---------- */
// 의도된 취약점: 쪽지 내용을 INSERT 문에 그대로 이어 붙인다. 세미콜론으로 두 번째 문장(예: secret9 복사)을 이어 실행시킬 수 있다.
function saveNote(text) {
  const sql = "INSERT INTO notes(text, at) VALUES ('" + text + "', datetime('now'))";
  db.run(sql);
}
function listNotes() {
  const res = db.exec('SELECT id, text, at FROM notes ORDER BY id DESC LIMIT 20');
  return { columns: ['번호', '내용', '시각'], values: valuesOf(res) };
}

/* ---------- 10번: WAF 우회 (1번과 같은 검색, 다른 금고) ---------- */
function search10(q) {
  const sql = "SELECT name AS '품종', origin AS '농장', brix AS '당도(Brix)' FROM cherries WHERE name LIKE '%" + q + "%'";
  const res = db.exec(sql);
  return { columns: columnsOf(res).length ? columnsOf(res) : ['품종', '농장', '당도(Brix)'], values: valuesOf(res) };
}

module.exports = {
  ready, isReady: () => !!db, flagAt,
  search1, login2, login3, blind4, blind5,
  logVisit, listVisits,
  login7, nosqlSecret,
  saveProfile, getProfileName, viewProfile,
  saveNote, listNotes,
  search10
};
