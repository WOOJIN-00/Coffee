/*
 * 게임 데이터
 * - 장 4개, 장마다 몬스터 HP 10 = 문제 10개
 * - 문제 내용은 아직 미정이라 빈 슬롯으로 둔다.
 * - flagHash 가 null 인 문제는 테스트 플래그(test)로 통과한다.
 * - 실제 플래그 해시: node -e "console.log(require('crypto').createHash('sha256').update('플래그').digest('hex'))"
 */
window.GAME_DATA = {
  brand: 'KLOAD',
  maxHp: 10,
  testFlagHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // "test"

  chapters: [
    {
      id: 1,
      name: '커피나무',
      goal: '길을 따라 올라가며 숲의 수호자에게서 열매를 빼앗아 보세요',
      monster: '숲의 수호자',
      art: 'tree',
      portrait: 'assets/ch1-portrait.webp',
      intro: '숲의 수호자 커피나무가 나타났다!',
      hitLine: '나무에 칼집이 하나 늘었다.',
      clearLine: '커피나무가 쓰러지며 열매를 떨어뜨렸다!'
    },
    {
      id: 2,
      name: '열매 군단',
      goal: '열매 군단 10명을 한 명씩 물리쳐 생두를 얻어 보세요',
      monster: '커피 열매 군단',
      art: 'berries',
      intro: '커피 열매 군단이 길을 막아섰다!',
      hitLine: '열매 병사 하나가 쓰러졌다.',
      clearLine: '열매 군단을 물리치고 생두를 얻었다!'
    },
    {
      id: 3,
      name: '로스팅',
      goal: '불을 키워 생두를 노릇한 원두로 볶아 보세요',
      monster: '불판 위의 생두',
      art: 'greenbean',
      intro: '생두가 불판 위에서 버티고 있다!',
      hitLine: '불길이 한층 더 거세졌다.',
      clearLine: '생두가 노릇하게 볶아져 원두가 되었다!'
    },
    {
      id: 4,
      name: '추출',
      goal: '원두를 새까맣게 물들여 커피로 만들어 보세요',
      monster: '고집 센 원두',
      art: 'roastbean',
      intro: '원두가 마지막으로 저항한다!',
      hitLine: '원두가 더 검게 물들었다.',
      clearLine: '원두가 새까만 커피로 변했다!'
    }
  ],

  // 장별 문제 10개 (빈 슬롯). 문제가 정해지면 title, desc, flagHash 를 채운다. url 에 http(s) 주소를 넣으면 '문제보기' 창 안에 문제 페이지가 열린다.
  problems: [1, 2, 3, 4].map(function (ch) {
    var list = [];
    for (var i = 1; i <= 10; i++) {
      list.push({ ch: ch, no: i, title: '', desc: '', url: '', flagHash: null });
    }
    return list;
  })
};

/*
 * 1장 커피나무: SQL Injection 문제 10개 (피킹 스테이지).
 * - 출처: "커피 나무 몬스터 - 피킹 스테이지 SQL Injection 워게임.pdf" 의 문제 카드 10장.
 * - 1장은 아직 전용 문제 서버가 없어 url 은 비우고, 문제보기 창에 카드(상황·미션·힌트)를 보여준다.
 * - 난이도/데미지는 PDF 카드의 테마값(초급 10·중급 20·고급 30)을 그대로 표기한다. 실제 진행은 장 공통 규칙(정답 1개 = HP -1)을 따른다.
 * - flagHash 는 COFFEE{...} 플래그의 SHA-256. 평문 플래그는 저장소에 두지 않는다(PDF 안에만 있음).
 */
(function () {
  // 게임과 문제를 한 서버에서 내보내므로 접속한 주소를 그대로 쓴다 (파일로 직접 열었을 때만 로컬 서버 주소)
  var CH1_SERVER = (/^https?:/.test(location.protocol) ? location.origin : 'http://localhost:3000') + '/ch1/';
  // 실제 풀이 페이지(server/ch1)가 준비된 문제 번호. 준비된 문제만 '문제보기'에 페이지를 띄운다.
  var CH1_READY = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true };
  // [카테고리, 공격명(제목), 난이도, 데미지, 한 줄 도발, 상황, 미션, 공략 힌트, 플래그 해시]
  var CH1 = [
    ['UNION SELECT', '검색창 UNION 탈취', '초급', 10,
      '열매 바구니를 통째로 쏟아내라',
      "커피 나무가 자랑하는 열매 검색대. 손님이 원하는 체리를 찾아주는 척하지만, 뒤편 금고에는 농장주만 아는 '황금 체리'가 숨겨져 있다.",
      '상품 검색 파라미터에 UNION SELECT 구문을 이어 붙여, 원래 결과 바구니에 관리자(농장주) 테이블의 행을 함께 쏟아내라. 컬럼 수와 자료형을 맞추는 것이 열쇠다.',
      '먼저 ORDER BY 로 컬럼 개수를 알아내고, 부족한 자리는 NULL 로 채워 자료형을 맞춘 뒤 관리자 테이블의 컬럼을 끼워 넣는다.',
      '09851c23eacd29c6335fd2b314033ec301bc0dddf4eac2b1f77ee9a5ab1a1584'],
    ['Error-based', '에러 메시지 염탐', '초급', 10,
      '나무의 비명에서 약점을 읽어라',
      '나무 몬스터를 톡 건드리면 아파서 비명을 지른다. 그 비명 소리(에러 메시지) 속에 줄기 속살 — DB 버전과 구조가 그대로 묻어난다.',
      '로그인 폼에 깨진 구문을 흘려 넣어 SQL 에러를 유발하고, 출력되는 메시지에서 숨긴 값을 읽어내라. (이 환경은 SQLite 기반이다. 보통의 구문 에러는 SQLite 식 메시지로 뜨고, extractvalue()/updatexml() 만 MySQL 식 에러 함수를 흉내 낸 것이다.)',
      'extractvalue() 나 updatexml() 로 일부러 XML 오류를 내면, 에러 메시지에 쿼리 결과가 실려 함께 출력된다. 단, AND 로 이으면 앞 조건이 거짓일 때 뒤가 평가되지 않아 에러 자체가 안 날 수 있다 — 반드시 평가되도록 연결 방식을 바꿔 보라.',
      '562a67137ec79b59e835c1917c9ab04a3bb55af95c24a8127d1c035e5cdf694b'],
    ['Auth Bypass', '로그인 인증 우회', '초급', 10,
      '거짓 열쇠로 나무 문을 연다',
      "농장 관리문은 암호가 맞아야만 열린다. 하지만 나무는 '참이기만 하면' 문을 열어주는 순진한 경비다.",
      '비밀번호 입력란에 조건식을 항상 참으로 만드는 구문을 넣어, 암호 검증을 통째로 우회해 관리자로 로그인하라. 1·2번에서 연습한 따옴표 닫기, AND/OR 의 차이를 조합해 보라.',
      '조건을 항상 참으로 만드는 연산자가 무엇이었는지 떠올려 보라. 그리고 뒤따르는 비밀번호 조건은 주석으로 잘라내 무력화할 수 있다.',
      'd5cbae727abd8d9cb03eb6f7c741f72269d8e7c98775598e582ef0ae5b445d5a'],
    ['Boolean Blind', '블라인드 불리언 추출', '중급', 20,
      '흔들어 보고 참·거짓을 가린다',
      '이 나무는 비명도, 결과도 보여주지 않는다. 다만 흔들면 잎이 떨리거나(참) / 가만히 있거나(거짓) — 그 미세한 반응만이 유일한 신호다.',
      '참/거짓에 따라 달라지는 응답 차이를 이용해, 플래그를 한 글자씩 이진 탐색으로 추출하라. SUBSTR 과 unicode 비교가 손끝의 감각이 된다.',
      'SUBSTR() 과 unicode() 로 한 글자를 집고, 참/거짓 응답을 이진 탐색하면 요청 수를 크게 줄일 수 있다. (이 환경은 SQLite 라 SUBSTRING()/ASCII() 가 아니라 SUBSTR()/unicode() 를 쓴다.)',
      '70d0ffdc006bef585a5a1ea848351fd15d4a63df6663d03733837d545960148a'],
    ['Time Blind', '블라인드 타임베이스 추출', '중급', 20,
      '수액이 흐르는 시간을 재라',
      "떨림조차 숨긴 나무. 그러나 수액이 도는 데는 시간이 걸린다. 반응이 늦어지는 그 몇 초의 침묵이 곧 '참'이다.",
      '조건이 참일 때만 sleep() 로 응답을 지연시키게 만들고, 지연 시간을 측정해 데이터를 한 글자씩 복원하라. 숨긴 FLAG 는 secret5 테이블의 secret 컬럼에 있다.',
      "조건과 sleep() 을 AND 로 묶으면 조건이 거짓일 때는 sleep 이 실행되지 않는다. 예: 1=1 AND sleep(2)=0 은 지연되고, 1=2 AND sleep(2)=0 은 바로 응답한다. 한 글자씩 확인할 땐 substr((select secret from secret5),자리,1) 과 unicode() 를 조건식에 넣어 비교하면 된다.",
      '36472a9d38a6535c3dcd7574df5e60d478eb2a79766eca5838826ba52e9d1997'],
    ['Header Injection', 'HTTP 헤더 인젝션', '중급', 20,
      '바람(헤더)에 쿼리를 실어 보낸다',
      '정문만 지키면 안전할 줄 알았던 나무. 하지만 뒷마당으로 부는 바람 — 눈에 안 보이는 HTTP 헤더는 아무도 검문하지 않았다.',
      "User-Agent 헤더 값이 INSERT INTO visits(ua, at) VALUES ('헤더값', datetime('now')) 에 그대로 들어간다. 숨긴 FLAG 는 secret6 테이블의 secret 컬럼에 있다.",
      "User-Agent 를 '값1', datetime('now')); INSERT INTO visits(ua, at) SELECT secret, datetime('now') FROM secret6; -- 형태로 보내라. 원래 INSERT 를 ua·at 두 값으로 제대로 닫지 않으면 전체가 실패한다.",
      'f3a0ce67d191cdf655be17b102eb64710fd3a3837d3a173676143d67b9ae8fca'],
    ['NoSQL Bypass', 'NoSQL 연산자 우회', '중급', 20,
      '다른 품종 나무엔 다른 낫질',
      '이 나무는 흙부터 다르다. SQL 토양이 아닌 NoSQL 토양에 뿌리내린 품종 — 익숙한 따옴표 낫은 통하지 않는다.',
      "MongoDB의 $ne · $regex 연산자를 JSON 파라미터로 밀어 넣어, 비밀번호 비교 로직을 '무엇과도 같지 않음/무엇이든 매칭'으로 바꿔 인증을 우회하라.",
      "주소 끝에 ?username[$ne]=1&password[$ne]=1 을 그대로 붙여서 열면 된다. 대괄호가 붙은 파라미터는 { $ne: '1' } 같은 객체로 전달되어 거의 항상 참이 된다.",
      '09b1f7655c31db7b2593df603a96c806e02cea7c110b712dec71c40215c409d5'],
    ['Second-Order', '2차(Second-Order) SQLi', '고급', 30,
      '지금 심은 씨앗이 나중에 터진다',
      '회원가입 때 심어 둔 작은 씨앗(저장값)은 당장은 조용하다. 그러나 나무가 그 값을 다시 꺼내 쓰는 순간, 싹이 터 쿼리가 된다.',
      "등록해 둔 이름은 SELECT id, name, bio FROM profiles WHERE name = '저장값' 형태로 재조회된다(컬럼 3개). 숨긴 FLAG 는 secret8 테이블의 secret 컬럼에 있다.",
      "등록할 때 x' UNION SELECT id, secret, 'x' FROM secret8-- 형태의 이름을 저장하고, 반드시 '내 프로필 보기'를 한 번 더 눌러야 터진다. 등록만으로는 아무 일도 안 일어난다.",
      '328eb7b7b5b14b070b8664d756befe3c6cbfd35b8223afe0282d93468958e222'],
    ['Stacked Query', '스택 쿼리 실행', '고급', 30,
      '한 번의 도끼질로 두 번 벤다',
      '나무의 몸통은 이미 갈라지기 직전. 세미콜론 한 번이면 두 개의 명령이 연달아 줄기를 가른다.',
      "쪽지 내용이 INSERT INTO notes(text, at) VALUES ('쪽지내용', datetime('now')) 에 그대로 들어간다. 숨긴 FLAG 는 secret9 테이블의 secret 컬럼에 있다.",
      "쪽지를 x', datetime('now')); INSERT INTO notes(text, at) SELECT secret, datetime('now') FROM secret9; -- 형태로 남겨라. 원래 INSERT 를 text·at 두 값으로 제대로 닫아야 한다.",
      '59a3da2773465b3cab726a7696b804df7a6de141036b32f629c6881dc6ff0e10'],
    ['WAF Bypass', 'WAF 우회 SQLi', '고급', 30,
      '가시덤불(WAF)을 비틀어 통과한다',
      '쓰러지기 직전, 나무는 마지막 가시덤불(WAF)을 둘렀다. 뻔한 공격은 모두 걸러진다. 비틀고, 쪼개고, 바꿔 입혀야만 가시 사이를 지난다.',
      '1번과 똑같은 UNION SELECT 수법이지만, 대소문자·띄어쓰기가 정확히 일치하는 "UNION SELECT" 문자열만 막는 허술한 필터가 하나 걸려 있다. 숨긴 FLAG 는 secret10 테이블의 secret 컬럼에 있다.',
      '대문자 UNION SELECT (띄어쓰기 포함) 그대로 쓰면 막힌다. 대소문자를 하나라도 바꾸거나(SeLeCt), 사이 공백을 /**/ 로 바꾸면 통과한다. 나머지는 1번과 완전히 같다.',
      '86f312574ee523ff055d7220866d89303cec9abf30bd947177514ec65021ba6f']
  ];
  window.GAME_DATA.problems[0].forEach(function (p, i) {
    var q = CH1[i];
    p.category = q[0];
    p.title = p.no + '번 · ' + q[1];
    p.tier = q[2];
    p.dmg = q[3];
    p.flavor = q[4];
    p.situation = q[5];
    p.mission = q[6];
    p.hint = q[7];
    p.desc = q[4] + ' — ' + q[5];
    // 준비된 문제는 문제보기 창에 실제 풀이 페이지를 띄운다. 아직 준비 안 된 문제는 설명 카드만 보여 준다.
    p.url = CH1_READY[p.no] ? CH1_SERVER + p.no + '/play' : '';
    p.flagHash = q[8];
  });
})();

/*
 * 2장 열매 군단: XSS 문제 10개. 무대는 열매 군단 선별장 (딴 열매를 골라내 생두로)
 * url 은 2장 문제 서버의 문제 페이지 (server/ch2). 배포할 때 서버 주소로 바꾼다.
 * flagHash 가 null 인 문제는 아직 테스트 플래그(test)로 통과한다.
 */
(function () {
  // 게임과 문제를 한 서버에서 내보내므로 접속한 주소를 그대로 쓴다 (파일로 직접 열었을 때만 로컬 서버 주소)
  var CH2_SERVER = (/^https?:/.test(location.protocol) ? location.origin : 'http://localhost:3000') + '/ch2/';
  // [대사 상자 제목, 선별 단계, 지키는 기능, 플래그 해시]
  var CH2 = [
    ['1번 병사 · 반입 담당', '반입', '반입 기록 검색', 'fca2f2c16de42751bb024966a281c71a9fe6fe056c8682fcdb98265e2de65ebb'],
    ['2번 병사 · 등급 관리인', '등급 조회', '열매 등급 조회', '0b54df8482d82bac7e5315383dc8b42d4d41083024cfec26e1895ec10e2eaf7c'],
    ['3번 병사 · 색 선별공', '색 선별', '선별 메모', '41c2e4395425ace55d091c729d9506daf349da1ae1a175e1a60168efdf389433'],
    ['4번 병사 · 신고 접수원', '불량 신고', '불량 열매 신고', 'da3d3d0ed5eff06b616594492dda67833469b2a0a5b13fe795e7d0a317b85640'],
    ['5번 병사 · 명예 관리인', '선별왕', '선별왕 명예의 전당', '83726701d6ce0e97eee00f9892879be2a1bb43550af0249b4f3e51656529f998'],
    ['6번 병사 · 기록 담당', '최근 기록', '최근 확인한 선별대', 'db3cb94e881e22ecae4c43e51320503e2c1e3cf3623e498264bfc3afa9a81236'],
    ['7번 병사 · 바구니지기', '바구니 조회', '바구니 번호 자동완성', '0f62a62bb7130588e8e3ffd5cd5ee1fd086ea3e917a809f3dc379dbe664eb2e7'],
    ['8번 병사 · 보고 담당', '보고서', '선별 보고서 꾸미기', 'c74aad86f7d021a3c6015f2c562ed55a703420b5252538e337612ff6be5e6fdd'],
    ['9번 병사 · 검수관', '사진 검수', '불량 열매 사진', '513fd20231d13e6483406c27e90fe8442d49525e78b697acc85ddbe6df757ffe'],
    ['대장 · 최종 관문의 주인', '최종 통과', '최종 통과 위젯', 'bae58b0777ff76bee0f19cdce90362467f0f3bda95a90c9d9263448fd7d84c2b']
  ];
  window.GAME_DATA.problems[1].forEach(function (p, i) {
    p.title = CH2[i][0];
    p.desc = '열매 군단 선별장의 ' + CH2[i][1] + ' 단계. 병사가 "' + CH2[i][2] + '" 기능을 지키고 있다. 아래 선별장 페이지에서 목표한 알림창을 띄우면 그 자리에 플래그가 나온다.';
    p.url = CH2_SERVER + p.no + '/play';
    p.flagHash = CH2[i][3];
  });
})();
