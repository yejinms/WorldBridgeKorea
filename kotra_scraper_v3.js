/**
 * KOTRA 2026 외국인유학생 채용관 - 완전 자동화 최종 버전
 *
 * - 전체 기업 목록 자동 수집 (101개, 7페이지)
 * - 각 기업별 채용공고 상세 정보 완전 추출
 *
 * 실행 위치: https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/
 * allow pasting → Enter → 붙여넣기 → Enter
 */
(async function() {

  // ── 유틸: Vue 루트 찾기 ──────────────────────────────────────
  function findVueRoot() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let nd;
    while ((nd = w.nextNode()))
      if (nd.__vue__ && nd.__vue__.$router) return nd.__vue__.$root;
    return null;
  }

  // Vue 컴포넌트 탐색 (조건 함수)
  function findComp(vm, predicate) {
    if (!vm) return null;
    if (predicate(vm)) return vm;
    for (const c of (vm.$children || [])) {
      const r = findComp(c, predicate);
      if (r) return r;
    }
    return null;
  }

  const app = findVueRoot();
  if (!app) {
    console.error('❌ Vue 앱 없음. 목록 페이지(#/)에서 실행하세요.');
    return;
  }

  // ── STEP 1: 전체 기업 목록 수집 ─────────────────────────────
  console.log('📋 전체 기업 목록 수집 중...');

  // 목록 컴포넌트 찾기
  const listComp = findComp(app, v => v.$data && v.$data.corpList && v.$data.pagesJson);
  if (!listComp) {
    console.error('❌ 목록 컴포넌트 없음. #/ 목록 페이지에서 실행하세요.');
    return;
  }

  const totalRows = listComp.$data.pagesJson.totalRows;
  const numOfRows = listComp.$data.pagesJson.numOfRows || 16;
  const totalPages = Math.ceil(totalRows / numOfRows);
  console.log(`총 ${totalRows}개 기업, ${totalPages}페이지`);

  // 전체 기업 corp_idx 수집
  const allCorps = [];

  // 현재 페이지(1) 데이터 먼저 추가
  for (const c of listComp.$data.corpList) {
    if (c.corp_idx) allCorps.push({ idx: String(c.corp_idx), name: c.in2_corp_nm_kor || c.corp_nm_kor || '' });
  }
  console.log(`  페이지 1: ${listComp.$data.corpList.length}개`);

  // 나머지 페이지 순차 로드
  for (let page = 2; page <= totalPages; page++) {
    // Vue Router로 페이지 이동
    try {
      app.$router.push({ path: '/', query: { selPageNo: page } });
    } catch(e) {}

    // corpList가 새 페이지 데이터로 업데이트될 때까지 대기
    await new Promise(resolve => {
      let n = 0;
      const t = setInterval(() => {
        n++;
        const lc = findComp(app, v => v.$data && v.$data.corpList && v.$data.pagesJson);
        const currentPage = lc && lc.$data.pagesJson && (lc.$data.selPageNo || lc.$data.pagesJson.selPageNo);
        // 리스트가 업데이트됐는지 확인 (첫 항목 corp_idx 변화 또는 일정 시간 후)
        if (n > 6) { clearInterval(t); resolve(); }
        else if (lc && lc.$data.isLoading === false && n > 2) { clearInterval(t); resolve(); }
      }, 800);
    });

    const lc = findComp(app, v => v.$data && v.$data.corpList);
    if (lc && lc.$data.corpList) {
      for (const c of lc.$data.corpList) {
        if (c.corp_idx && !allCorps.find(x => x.idx === String(c.corp_idx))) {
          allCorps.push({ idx: String(c.corp_idx), name: c.in2_corp_nm_kor || '' });
        }
      }
      console.log(`  페이지 ${page}: ${lc.$data.corpList.length}개 (누적 ${allCorps.length}개)`);
    }
  }

  console.log(`\n✅ 전체 기업 수집 완료: ${allCorps.length}개\n`);

  // ── STEP 2: 각 기업 상세 정보 수집 ──────────────────────────
  function findCorpDetailComp(vm) {
    return findComp(vm, v => v.$data && v.$data.corpDetail && v.$data.corpDetail.corp_idx);
  }

  const results = [];
  const TOTAL = allCorps.length;

  for (let i = 0; i < TOTAL; i++) {
    const corp = allCorps[i];
    console.log(`[${i+1}/${TOTAL}] ${corp.name} (${corp.idx})`);

    // 상세 페이지로 이동
    try {
      app.$router.push({ path: '/detail', query: { CORP_IDX: corp.idx, TYPE: 'corp', SYSTEM_IDX: '64' } });
    } catch(e) {}

    // corpDetail 로드 대기
    const comp = await new Promise(resolve => {
      let n = 0;
      const t = setInterval(() => {
        n++;
        const c = findCorpDetailComp(app);
        if (c && c.$data.corpDetail.corp_idx === corp.idx) { clearInterval(t); resolve(c); }
        else if (n >= 20) { clearInterval(t); resolve(null); }
      }, 600);
    });

    if (!comp) {
      console.warn(`  ⚠️ 타임아웃`);
      results.push({ no: i+1, company: corp.name, error: 'timeout' });
      continue;
    }

    const d = comp.$data.corpDetail;
    const jobList = d.in2_job_list || [];

    if (jobList.length === 0) {
      results.push({
        no: i+1,
        company: d.in2_corp_nm_kor || corp.name,
        companyEng: d.in2_corp_nm_eng || '',
        website: d.in2_corp_homepage || '',
        industry: d.in2_corp_category || '',
        companyType: d.in2_corp_scale || '',
        employees: d.in2_corp_mem_cnt || '',
        established: d.in2_corp_since || '',
        positionKor:'', positionEng:'', jobCategory:'', jobCategoryDetail:'', jobCategoryDetailEng:'',
        employmentTypeKor:'', employmentTypeEng:'', salary:'',
        location:'', locationDetail:'', locationDetailEng:'',
        nationality:'', nationalityEng:'', language:'', languageEng:'',
        education:'', educationEng:'', experience:'', major:'', majorEng:'',
        jobDetailKor:'', jobDetailEng:'', benefits:'', benefitsEng:'',
      });
      console.log(`  ✅ 공고 없음`);
      continue;
    }

    for (const job of jobList) {
      const nationality    = [job.in2_job_country1, job.in2_job_country2, job.in2_job_country3].filter(Boolean).join(', ');
      const nationalityEng = [job.in2_job_country1_eng, job.in2_job_country2_eng, job.in2_job_country3_eng].filter(Boolean).join(', ');
      const language       = [job.in2_job_lang1, job.in2_job_lang2, job.in2_job_lang3].filter(Boolean).join(', ');
      const languageEng    = [job.in2_job_lang1_eng, job.in2_job_lang2_eng, job.in2_job_lang3_eng].filter(Boolean).join(', ');

      results.push({
        no: i+1,
        company: d.in2_corp_nm_kor || corp.name,
        companyEng: d.in2_corp_nm_eng || '',
        website: d.in2_corp_homepage || '',
        industry: d.in2_corp_category || '',
        companyType: d.in2_corp_scale || '',
        employees: d.in2_corp_mem_cnt || '',
        established: d.in2_corp_since || '',
        positionKor: job.in2_job_title || '',
        positionEng: job.in2_job_title_eng || '',
        jobCategory: job.in2_job_duty_json || '',
        jobCategoryDetail: job.in2_job_duty_detail || '',
        jobCategoryDetailEng: job.in2_job_duty_detail_eng || '',
        employmentTypeKor: job.in2_job_permanental || '',
        employmentTypeEng: job.in2_job_permanental_eng || '',
        salary: job.in2_job_salary_range || '',
        location: job.in2_job_area || '',
        locationDetail: job.in2_job_area_detail || '',
        locationDetailEng: job.in2_job_area_detail_eng || '',
        nationality, nationalityEng, language, languageEng,
        education: job.in2_job_academic || '',
        educationEng: job.in2_job_academic_eng || '',
        experience: job.in2_job_career || '',
        major: job.in2_job_major || '',
        majorEng: job.in2_job_major_eng || '',
        jobDetailKor: (job.in2_job_intro_detail || '').replace(/\r?\n/g, ' | '),
        jobDetailEng: (job.in2_job_intro_detail_eng || '').replace(/\r?\n/g, ' | '),
        benefits: (job.in2_job_welfare || '').replace(/\r?\n/g, ' | '),
        benefitsEng: (job.in2_job_welfare_eng || '').replace(/\r?\n/g, ' | '),
      });
    }

    const isIntern = jobList.some(j => (j.in2_job_permanental_eng||'').toLowerCase().includes('intern'));
    console.log(`  ✅ 공고 ${jobList.length}개${isIntern ? ' 🎯인턴십' : ''}`);
    await new Promise(r => setTimeout(r, 400));
  }

  // ── STEP 3: CSV 다운로드 ────────────────────────────────────
  const headers = [
    'No','Company (KOR)','Company (ENG)','Website','Industry','Company Type','Employees','Established',
    'Job Title (KOR)','Job Title (ENG)','Job Category','Job Detail KOR','Job Detail (ENG)',
    'Employment Type (KOR)','Employment Type (ENG)',
    'Nationality','Nationality (ENG)','Language','Language (ENG)',
    'Education','Experience','Salary (USD)','Major',
    'Location','Location Detail','Location Detail (ENG)',
    'Benefits (KOR)','Benefits (ENG)'
  ];

  const csvRows = results.map(r => [
    r.no, r.company, r.companyEng, r.website, r.industry, r.companyType, r.employees, r.established,
    r.positionKor, r.positionEng, r.jobCategory, r.jobDetailKor, r.jobDetailEng,
    r.employmentTypeKor, r.employmentTypeEng,
    r.nationality, r.nationalityEng, r.language, r.languageEng,
    r.education, r.experience, r.salary, r.major,
    r.location, r.locationDetail, r.locationDetailEng,
    r.benefits, r.benefitsEng
  ].map(v => `"${String(v||'').replace(/"/g,'""').replace(/\r?\n/g,' ')}"`).join(','));

  const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kotra_all_companies.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const internships = results.filter(r => (r.employmentTypeEng||'').toLowerCase().includes('intern'));
  console.log(`\n🎉 완료! kotra_all_companies.csv 다운로드됨`);
  console.log(`총 ${TOTAL}개 기업 / ${results.length}개 공고행 / 인턴십 ${internships.length}개`);
  if (internships.length) {
    console.log('\n🎯 인턴십 공고:');
    internships.forEach(r => console.log(`  - ${r.company}: ${r.positionKor} (${r.employmentTypeEng}) | 연봉 ${r.salary} USD | 국적 ${r.nationality}`));
  }
  return results;
})();
