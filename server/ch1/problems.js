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
  {
    no: 2, category: 'Error-based', step: '에러 염탐', tier: '초급',
    flavor: '나무의 비명에서 약점을 읽어라',
    situation: '나무 몬스터를 톡 건드리면 아파서 비명을 지른다. 그 비명 소리(에러 메시지) 속에 줄기 속살 — 직원 전용 메모가 그대로 묻어난다.',
    mission: "로그인 폼(아이디·비밀번호)에 깨진 구문을 흘려 넣어 SQL 에러를 유발하고, 출력되는 에러 메시지에서 숨긴 메모(FLAG)를 읽어내라. extractvalue(), updatexml(), concat() 함수를 쓸 수 있다. (이 환경은 SQLite 기반이다. 보통의 구문 에러는 SQLite 식 메시지로 뜨고, extractvalue()/updatexml() 만 MySQL 식 에러 함수를 흉내 낸 것이다.)",
    hint: "extractvalue() 나 updatexml() 에 일부러 이상한 XPATH 를 주면, 그 XPATH 자리에 넣은 서브쿼리 결과가 에러 메시지에 그대로 실려 나온다. 단, AND 로 이으면 앞 조건이 거짓일 때 뒤가 평가되지 않아 에러 자체가 안 날 수 있다 — 반드시 평가되도록 연결 방식을 바꿔 보라.",
    ready: true
  },
  {
    no: 3, category: "' OR '1'='1", step: '인증 우회', tier: '초급',
    flavor: '거짓 열쇠로 나무 문을 연다',
    situation: "농장 관리문은 암호가 맞아야만 열린다. 하지만 나무는 '참이기만 하면' 문을 열어주는 순진한 경비다. 관리자 비밀번호는 아무도 모르는 무작위 값이다.",
    mission: "비밀번호(또는 아이디) 입력란에 ' OR '1'='1 같은 패턴을 넣어 조건식을 항상 참으로 만들고, 암호 검증을 통째로 우회해 관리자로 로그인하라.",
    hint: '핵심은 뒤따르는 비밀번호 조건을 주석(-- 뒤 공백, 또는 #)으로 잘라내 무력화하는 것.',
    ready: true
  },
  {
    no: 4, category: 'Boolean Blind', step: '불리언 추출', tier: '중급',
    flavor: '흔들어 보고 참·거짓을 가린다',
    situation: '이 나무는 비명도, 결과도 보여주지 않는다. 다만 흔들면 잎이 떨리거나(참) / 가만히 있거나(거짓) — 그 미세한 반응만이 유일한 신호다.',
    mission: '조건식(q)을 넣으면 그 조건이 참인지 거짓인지만 알려 준다. SUBSTRING 과 ASCII 비교로 숨긴 FLAG 를 한 글자씩 이진 탐색으로 추출하라.',
    hint: 'SUBSTRING() 과 ASCII() 로 한 글자를 집고, 참/거짓 응답을 이진 탐색하면 요청 수를 크게 줄일 수 있다.',
    ready: true
  },
  {
    no: 5, category: 'Time Blind', step: '타임베이스', tier: '중급',
    flavor: '수액이 흐르는 시간을 재라',
    situation: "떨림조차 숨긴 나무. 그러나 수액이 도는 데는 시간이 걸린다. 반응이 늦어지는 그 몇 초의 침묵이 곧 '참'이다.",
    mission: '조건식(q)을 넣으면 참일 때만 sleep() 으로 응답이 지연된다(최대 5초로 제한됨). 지연 시간을 측정해 FLAG 를 한 글자씩 복원하라.',
    hint: 'IF(조건, SLEEP(n), 0) 패턴을 쓴다. 네트워크 지연과 구분되게 지연값을 주고 여러 번 측정하라.',
    ready: true
  },
  {
    no: 6, category: 'Header Injection', step: '헤더 주입', tier: '중급',
    flavor: '바람(헤더)에 쿼리를 실어 보낸다',
    situation: '정문만 지키면 안전할 줄 알았던 나무. 하지만 뒷마당으로 부는 바람 — 눈에 안 보이는 User-Agent 헤더는 아무도 검문하지 않았다.',
    mission: '이 페이지엔 입력칸이 없다. 접속할 때 보내는 User-Agent 헤더 값이 방문 기록 저장 쿼리에 그대로 들어간다. 헤더를 조작해 숨긴 FLAG 를 방문 기록에 나타나게 하라.',
    hint: '서버가 헤더 값을 로그 테이블에 INSERT 하는 지점을 찾아, 세미콜론으로 그 저장 쿼리 뒤에 새 쿼리를 이어 붙인다.',
    ready: true
  },
  {
    no: 7, category: 'NoSQL Bypass', step: 'NoSQL 우회', tier: '중급',
    flavor: '다른 품종 나무엔 다른 낫질',
    situation: '이 나무는 흙부터 다르다. SQL 토양이 아닌 NoSQL 토양에 뿌리내린 품종 — 익숙한 따옴표 낫은 통하지 않는다. 관리자 비밀번호는 무작위 값이라 맞힐 수 없다.',
    mission: "username/password 파라미터를 문자열이 아니라 배열/객체로 보내 $ne · $regex 연산자를 주입하고, 비교 로직을 '무엇과도 같지 않음/무엇이든 매칭'으로 바꿔 인증을 우회하라.",
    hint: "주소창에 username[$ne]=1&password[$ne]=1 처럼 대괄호를 붙이면 그 파라미터가 문자열이 아니라 객체로 전달된다.",
    ready: true
  },
  {
    no: 8, category: 'Second-Order', step: '2차 주입', tier: '고급',
    flavor: '지금 심은 씨앗이 나중에 터진다',
    situation: '등록 때 심어 둔 작은 씨앗(저장값)은 당장은 조용하다. 그러나 나무가 그 값을 다시 꺼내 쓰는 순간, 싹이 터 쿼리가 된다.',
    mission: '이름을 등록해 두면(저장은 안전하게 처리됨) "내 프로필 보기"를 누를 때 그 저장값을 새 쿼리에 그대로 이어 붙여 다시 조회한다. 등록 단계에 악성 구문을 심어, 조회 단계에서 터지게 하라.',
    hint: '저장 시엔 안전하지만 꺼내 쓸 때 재이스케이프하지 않는 경로가 급소다. 등록 → 조회 순서로 두 단계를 거쳐야 발동한다.',
    ready: true
  },
  {
    no: 9, category: 'Stacked Query', step: '스택 쿼리', tier: '고급',
    flavor: '한 번의 도끼질로 두 번 벤다',
    situation: '나무의 몸통은 이미 갈라지기 직전. 세미콜론 한 번이면 두 개의 명령이 연달아 줄기를 가른다.',
    mission: '쪽지를 남기면 그 내용이 INSERT 쿼리에 그대로 들어간다. 세미콜론(;)으로 원래 쿼리 뒤에 새 INSERT 를 이어 실행시켜, 숨긴 FLAG 를 쪽지함에 나타나게 하라.',
    hint: "원래 문장을 '); 로 깔끔히 닫고 새 INSERT 문을 이어 붙인 뒤, 뒤에 남는 구문은 -- 로 주석 처리한다.",
    ready: true
  },
  {
    no: 10, category: 'WAF Bypass', step: 'WAF 우회', tier: '고급',
    flavor: '가시덤불(WAF)을 비틀어 통과한다',
    situation: '쓰러지기 직전, 나무는 마지막 가시덤불(WAF)을 둘렀다. 뻔한 공격은 모두 걸러진다. 비틀고, 쪼개고, 바꿔 입혀야만 가시 사이를 지난다.',
    mission: '1번과 같은 열매 검색대지만 필터가 걸려 있다. 주석·대소문자 변형·공백 치환·연산자 치환을 조합해 필터링을 회피하고 금고(secret10)를 꺼내라.',
    hint: 'SELECT→SeLeCt, 공백→/**/, =→LIKE, OR→||. 블랙리스트는 정확히 대문자·띄어쓰기·등호만 본다.',
    ready: true
  }
];
