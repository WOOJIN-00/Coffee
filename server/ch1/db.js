/*
 * 1장 (SQL Injection) 데이터베이스
 *   - sql.js(WASM SQLite)로 실제 SQLite 엔진을 띄운다. 네이티브 빌드가 없어 Docker(node:20)에서도 그대로 돈다.
 *   - 읽기 전용 문제라 서버가 켜질 때 한 번만 테이블을 만들고 값을 채운다.
 *   - 숨긴 플래그("황금 체리")는 config.flags.ch1 에서 가져와 vault 테이블에 넣는다. 평문 플래그는 저장소에 두지 않는다.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const config = require('../config');

let db = null;

// 열매 검색대에 보이는 평범한 체리들
const CHERRIES = [
  [1, '예가체프', '이르가체페 농장', '18.5'],
  [2, '시다모', '시다모 협동조합', '17.2'],
  [3, '안티구아', '안티구아 고원', '19.1'],
  [4, '수프리모', '우일라 농장', '16.8'],
  [5, '코나', '코나 해안 농장', '20.3']
];

function flag1() {
  return (config.flags.ch1 && config.flags.ch1[0]) || 'COFFEE{flags_json_에_ch1_플래그를_넣어주세요}';
}

const ready = initSqlJs({ locateFile: f => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) })
  .then(SQL => {
    db = new SQL.Database();
    db.run('CREATE TABLE cherries(id INTEGER PRIMARY KEY, name TEXT, origin TEXT, brix TEXT);');
    const ins = db.prepare('INSERT INTO cherries VALUES (?,?,?,?)');
    CHERRIES.forEach(r => ins.run(r));
    ins.free();
    // 농장주만 아는 금고. 평범한 검색으로는 안 보이고, UNION 주입으로만 꺼낼 수 있다.
    db.run('CREATE TABLE vault(id INTEGER PRIMARY KEY, label TEXT, secret TEXT);');
    const v = db.prepare('INSERT INTO vault VALUES (1, ?, ?)');
    v.run(['황금 체리 (농장주 전용)', flag1()]);
    v.free();
    return db;
  })
  .catch(e => { console.error('[ch1/db] 초기화 실패:', e.message); throw e; });

/*
 * 1번 문제의 취약한 검색 쿼리.
 *   의도된 취약점: 입력(q)을 SQL 문자열에 그대로 이어 붙인다 → UNION SELECT 등으로 다른 테이블을 합칠 수 있다.
 *   표시 컬럼은 3개(품종·농장·당도)라서 UNION 도 3개 컬럼으로 맞춰야 한다.
 */
function search1(q) {
  const sql = "SELECT name AS '품종', origin AS '농장', brix AS '당도(Brix)' FROM cherries WHERE name LIKE '%" + q + "%'";
  const res = db.exec(sql); // SQL 오류가 나면 예외를 던진다 (화면에 메시지로 보여 준다)
  if (!res.length) return { columns: ['품종', '농장', '당도(Brix)'], values: [] };
  return { columns: res[0].columns, values: res[0].values };
}

module.exports = { ready, search1, isReady: () => !!db, flag1 };
