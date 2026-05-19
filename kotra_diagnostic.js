/**
 * KOTRA Vue 데이터 구조 진단 스크립트
 * 목적: 채용공고 세부 데이터가 어떤 필드에 있는지 파악
 *
 * 실행 위치: https://jffis.kotra.or.kr/fairOnline.do?...#/
 * 1. allow pasting → Enter
 * 2. 이 스크립트 붙여넣기 → Enter
 * 3. 출력된 내용 복사해서 공유해 주세요
 */
(async function() {
  function findVueRoot() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.__vue__ && node.__vue__.$router) return node.__vue__.$root;
    }
    return null;
  }

  function findCorpDetailComp(vm) {
    if (!vm) return null;
    if (vm.$data && vm.$data.corpDetail) return vm;
    for (const child of (vm.$children || [])) {
      const found = findCorpDetailComp(child);
      if (found) return found;
    }
    return null;
  }

  const app = findVueRoot();
  if (!app) { console.error('❌ Vue 앱 없음. 올바른 페이지에서 실행하세요.'); return; }

  // 데이원컴퍼니 (CORP_IDX=266121) 로 이동
  app.$router.push({ path: '/detail', query: { CORP_IDX: '266121', TYPE: 'corp', SYSTEM_IDX: '64' } });

  console.log('⏳ 데이터 로딩 대기 중...');
  const comp = await new Promise((resolve) => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      const c = findCorpDetailComp(app);
      if (c && c.$data.corpDetail && c.$data.corpDetail.corp_idx) { clearInterval(t); resolve(c); }
      else if (n > 30) { clearInterval(t); resolve(null); }
    }, 500);
  });

  if (!comp) { console.error('❌ 컴포넌트 로드 실패'); return; }

  // ── $data 의 모든 키와 타입/값 출력 ──
  console.log('\n===== $data 키 목록 =====');
  Object.entries(comp.$data).forEach(([k, v]) => {
    const t = Array.isArray(v) ? `Array(${v.length})` : typeof v;
    const preview = Array.isArray(v) && v.length > 0
      ? JSON.stringify(v[0]).substring(0, 120)
      : (typeof v === 'object' && v ? JSON.stringify(v).substring(0, 120) : String(v).substring(0, 80));
    console.log(`  [${t}] ${k}: ${preview}`);
  });

  // ── corpDetail 키 전체 ──
  console.log('\n===== corpDetail 키 목록 =====');
  Object.keys(comp.$data.corpDetail).forEach(k => {
    const v = comp.$data.corpDetail[k];
    if (v !== null && v !== '' && v !== undefined) {
      console.log(`  ${k}: ${JSON.stringify(v).substring(0, 100)}`);
    }
  });

  // ── Array 타입 데이터 상세 출력 (채용공고 관련) ──
  console.log('\n===== Array 데이터 상세 =====');
  Object.entries(comp.$data).forEach(([k, v]) => {
    if (Array.isArray(v) && v.length > 0) {
      console.log(`\n-- ${k} (${v.length}개) --`);
      console.log(JSON.stringify(v[0], null, 2).substring(0, 800));
    }
  });

  console.log('\n✅ 진단 완료! 위 내용을 복사해서 공유해 주세요.');
})();
