/*
 * 1장 (SQL Injection) 문제 목록 — 피킹 스테이지
 *   무대: 커피 나무 몬스터가 지키는 열매 데이터베이스.
 *   ready:true 인 문제만 실제 풀이 페이지(/ch1/:no/play)가 동작한다. 나머지는 "준비 중" 표시.
 *   문구는 "커피 나무 몬스터 - 피킹 스테이지 SQL Injection 워게임.pdf" 의 문제 카드 기준.
 */
module.exports = [
  {
    no: 1, category: 'UNION SELECT', step: '검색', tier: '초급',
    flavor: '열매 바구니를 통째로 쏟아내라',
    situation: "커피 나무가 자랑하는 열매 검색대. 손님이 원하는 체리를 찾아주는 척하지만, 뒤편 금고에는 농장주만 아는 '황금 체리'가 숨겨져 있다.",
    mission: '상품 검색 파라미터에 UNION SELECT 구문을 이어 붙여, 원래 결과 바구니에 숨겨진 금고(vault) 테이블의 행을 함께 쏟아내라. 보이는 컬럼은 3개(품종·농장·당도)다.',
    hint: '먼저 ORDER BY 로 컬럼 개수를 알아내고, 부족한 자리는 NULL 로 채워 자료형을 맞춘 뒤 금고 테이블의 컬럼을 끼워 넣는다.',
    ready: true
  },
  { no: 2, category: 'Error-based', step: '에러 염탐', tier: '초급', ready: false },
  { no: 3, category: "' OR '1'='1", step: '인증 우회', tier: '초급', ready: false },
  { no: 4, category: 'Boolean Blind', step: '불리언 추출', tier: '중급', ready: false },
  { no: 5, category: 'Time Blind', step: '타임베이스', tier: '중급', ready: false },
  { no: 6, category: 'Header Injection', step: '헤더 주입', tier: '중급', ready: false },
  { no: 7, category: 'NoSQL Bypass', step: 'NoSQL 우회', tier: '중급', ready: false },
  { no: 8, category: 'Second-Order', step: '2차 주입', tier: '고급', ready: false },
  { no: 9, category: 'Stacked Query', step: '스택 쿼리', tier: '고급', ready: false },
  { no: 10, category: 'WAF Bypass', step: 'WAF 우회', tier: '고급', ready: false }
];
