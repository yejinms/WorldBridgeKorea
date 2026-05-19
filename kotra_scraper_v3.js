/**
 * KOTRA 2026 외국인유학생 채용관 - Vue Router 직접 조작 방식 v3
 *
 * 실행 전 확인사항:
 * 반드시 아래 URL 페이지에서 실행할 것:
 * https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/
 *
 * 콘솔에서: allow pasting 입력 후 Enter → 스크립트 붙여넣기 → Enter
 */
(async function() {
  const CORP_IDS = [
    {id: '265890', name: 'FLYINGSPARKS'},
    {id: '265112', name: 'HK연우'},
    {id: '270067', name: '건우하우징랜드(주)'},
    {id: '265018', name: '(주)경인양행'},
    {id: '265165', name: '주식회사 고피자'},
    {id: '265083', name: '(주) 그라비티'},
    {id: '265330', name: '글로벌머니익스프레스'},
    {id: '266108', name: '주식회사 글로벌인테크'},
    {id: '265123', name: '나와'},
    {id: '266544', name: '(주)나인벨'},
    {id: '266360', name: '(주)네패스'},
    {id: '265432', name: '(주)넥스틴'},
    {id: '265770', name: '(주)노루페인트'},
    {id: '264944', name: '(주)다인정공'},
    {id: '270882', name: '대진기계공업(주)'},
    {id: '266121', name: '데이원컴퍼니'}
  ];

  // ── Step 1: Vue 루트 인스턴스 탐색 ──────────────────────────
  function findVueRoot() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.__vue__ && node.__vue__.$router) return node.__vue__.$root;
    }
    return null;
  }

  // corpDetail 데이터를 가진 Vue 컴포넌트 탐색
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
  if (!app) {
    console.error('❌ Vue 앱을 찾을 수 없습니다.');
    console.error('👉 https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/ 페이지에서 실행해 주세요.');
    return;
  }
  console.log('✅ Vue 앱 발견:', app.$options.name || '(root)');

  // ── Step 2: 각 기업 순회 ────────────────────────────────────
  const results = [];

  for (let i = 0; i < CORP_IDS.length; i++) {
    const corp = CORP_IDS[i];
    console.log(`\n[${i+1}/${CORP_IDS.length}] ${corp.name} 로딩 중...`);

    // Vue Router로 해당 기업 상세 페이지 이동
    try {
      app.$router.push({
        path: '/detail',
        query: { CORP_IDX: corp.id, TYPE: 'corp', SYSTEM_IDX: '64' }
      });
    } catch(e) {
      // NavigationDuplicated 등 무시
    }

    // Vue 렌더링 + API 응답 대기 (corpDetail 데이터가 채워질 때까지 폴링)
    const comp = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        const c = findCorpDetailComp(app);
        if (c && c.$data.corpDetail && c.$data.corpDetail.corp_idx) {
          clearInterval(timer);
          resolve(c);
        } else if (attempts >= 24) { // 최대 12초
          clearInterval(timer);
          resolve(null);
        }
      }, 500);
    });

    if (!comp) {
      console.warn(`  ⚠️ ${corp.name}: 데이터 로드 실패 (타임아웃)`);
      results.push({ no: i+1, company: corp.name, error: 'timeout' });
      continue;
    }

    const d = comp.$data.corpDetail;

    // 채용공고 배열: corpDetail.in2_job_list 에 있음 (진단으로 확인)
    const jobList = d.in2_job_list || [];
    const jobs = jobList.length > 0 ? jobList : [{}];

    for (const job of jobs) {
      const nationality = [job.in2_job_country1, job.in2_job_country2, job.in2_job_country3]
        .filter(Boolean).join(', ');
      const language = [job.in2_job_lang1, job.in2_job_lang2, job.in2_job_lang3]
        .filter(Boolean).join(', ');
      const nationalityEng = [job.in2_job_country1_eng, job.in2_job_country2_eng, job.in2_job_country3_eng]
        .filter(Boolean).join(', ');
      const languageEng = [job.in2_job_lang1_eng, job.in2_job_lang2_eng, job.in2_job_lang3_eng]
        .filter(Boolean).join(', ');

      results.push({
        no: i + 1,
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
        nationality,
        nationalityEng,
        language,
        languageEng,
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

    const isIntern = jobs.some(j => (j.in2_job_permanental_eng||'').toLowerCase().includes('intern'));
    console.log(`  ✅ ${d.in2_corp_nm_kor || corp.name}: 공고 ${jobList.length}개${isIntern ? ' 🎯인턴십' : ''}`);
    await new Promise(r => setTimeout(r, 800));
  }

  // ── Step 3: CSV 생성 및 다운로드 ────────────────────────────
  const headers = [
    'No','Company (KOR)','Company (ENG)','Website','Industry','Company Type','Employees','Established',
    'Job Title (KOR)','Job Title (ENG)','Job Category','Job Detail (KOR)','Job Detail (ENG)',
    'Employment Type (KOR)','Employment Type (ENG)',
    'Nationality','Nationality (ENG)','Language','Language (ENG)',
    'Education','Experience','Salary (USD)','Major',
    'Location','Location Detail','Location Detail (ENG)',
    'Benefits (KOR)','Benefits (ENG)'
  ];

  const rows = results.map(r => [
    r.no, r.company, r.companyEng, r.website, r.industry, r.companyType, r.employees, r.established,
    r.positionKor, r.positionEng, r.jobCategory, r.jobDetailKor, r.jobDetailEng,
    r.employmentTypeKor, r.employmentTypeEng,
    r.nationality, r.nationalityEng, r.language, r.languageEng,
    r.education, r.experience, r.salary, r.major,
    r.location, r.locationDetail, r.locationDetailEng,
    r.benefits, r.benefitsEng
  ].map(v => `"${String(v||'').replace(/"/g,'""').replace(/\r?\n/g,' ')}"`).join(','));

  const csv = '﻿' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kotra_internship_v5.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const internships = results.filter(r => (r.employmentTypeEng||'').toLowerCase().includes('intern'));
  console.log('\n🎉 완료! kotra_internship_v5.csv 다운로드됨');
  console.log(`총 ${results.length}행 | 인턴십 공고: ${internships.length}개`);
  internships.forEach(r => console.log(`  🎯 ${r.company}: ${r.positionKor} (${r.employmentTypeEng})`));
  console.table(results.map(r => ({No:r.no, Company:r.company, Position:r.positionKor, '고용형태':r.employmentTypeKor, '연봉(USD)':r.salary})));

  return results;
})();
