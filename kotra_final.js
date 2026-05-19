/**
 * KOTRA 2026 외국인유학생 채용관 - 최종 버전 (API 직접 호출)
 *
 * 실행 위치: jffis.kotra.or.kr 아무 페이지 (로그인 상태)
 * allow pasting → Enter → 이 스크립트 붙여넣기 → Enter
 */
(async function() {
  const CORPS = [
    {idx: '265890', name: 'FLYINGSPARKS'},
    {idx: '265112', name: 'HK연우'},
    {idx: '270067', name: '건우하우징랜드(주)'},
    {idx: '265018', name: '(주)경인양행'},
    {idx: '265165', name: '주식회사 고피자'},
    {idx: '265083', name: '(주) 그라비티'},
    {idx: '265330', name: '글로벌머니익스프레스'},
    {idx: '266108', name: '주식회사 글로벌인테크'},
    {idx: '265123', name: '나와'},
    {idx: '266544', name: '(주)나인벨'},
    {idx: '266360', name: '(주)네패스'},
    {idx: '265432', name: '(주)넥스틴'},
    {idx: '265770', name: '(주)노루페인트'},
    {idx: '264944', name: '(주)다인정공'},
    {idx: '270882', name: '대진기계공업(주)'},
    {idx: '266121', name: '데이원컴퍼니'}
  ];

  const EX_IDX = '495';
  const rows = [];

  for (let i = 0; i < CORPS.length; i++) {
    const corp = CORPS[i];
    console.log(`[${i+1}/${CORPS.length}] ${corp.name} 로딩 중...`);

    let detail;
    try {
      const params = new URLSearchParams({
        selAction: 'get-corp-detail',
        CORP_GUBUN: 'E',
        SYSTEM_IDX: '64',
        type: 'corp',
        PROD_IDX: corp.idx,
        EX_IDX: EX_IDX,
        hl: 'KOR'
      });
      const res = await fetch('/fairOnline.do', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: params.toString(),
        credentials: 'include'
      });
      const json = await res.json();
      detail = json.corpDetail || json;
    } catch(e) {
      console.error(`  ❌ ${corp.name} API 오류:`, e.message);
      rows.push({ no: i+1, company: corp.name, error: e.message });
      continue;
    }

    if (!detail || !detail.corp_idx) {
      console.warn(`  ⚠️ ${corp.name}: 데이터 없음`);
      rows.push({ no: i+1, company: corp.name, error: 'no data' });
      continue;
    }

    const jobList = detail.in2_job_list || [];

    if (jobList.length === 0) {
      // 채용공고가 없는 경우도 기업 정보는 저장
      rows.push({
        no: i+1,
        companyKor: detail.in2_corp_nm_kor || corp.name,
        companyEng: detail.in2_corp_nm_eng || '',
        website: detail.in2_corp_homepage || '',
        industry: detail.in2_corp_category || '',
        companyType: detail.in2_corp_scale || '',
        employees: detail.in2_corp_mem_cnt || '',
        established: detail.in2_corp_since || '',
        jobTitle: '',
        jobCategory: '',
        jobCategoryDetail: '',
        employType: '',
        workPlace: '',
        workPlaceDetail: '',
        nationality: '',
        language: '',
        education: '',
        experience: '',
        salary: '',
        major: '',
        jobDetailKor: '',
        jobDetailEng: '',
        benefits: '',
      });
    } else {
      for (const job of jobList) {
        rows.push({
          no: i+1,
          companyKor: detail.in2_corp_nm_kor || corp.name,
          companyEng: detail.in2_corp_nm_eng || '',
          website: detail.in2_corp_homepage || '',
          industry: detail.in2_corp_category || '',
          companyType: detail.in2_corp_scale || '',
          employees: detail.in2_corp_mem_cnt || '',
          established: detail.in2_corp_since || '',
          jobTitle: job.in2_job_title || '',
          jobCategory: job.in2_job_duty_json || '',
          jobCategoryDetail: job.in2_job_duty_detail || '',
          employType: job.in2_employ_type || job.employ_type || '',
          workPlace: job.in2_work_place || job.work_place || '',
          workPlaceDetail: job.in2_work_place_detail || job.work_place_detail || '',
          nationality: job.in2_nationality || job.nationality || '',
          language: job.in2_language || job.language || '',
          education: job.in2_education || job.education || '',
          experience: job.in2_experience || job.experience || '',
          salary: job.in2_salary || job.salary || '',
          major: job.in2_major || job.major || '',
          jobDetailKor: (job.in2_job_detail || job.job_detail || '').replace(/\n/g, ' | '),
          jobDetailEng: (job.in2_job_detail_eng || job.job_detail_eng || '').replace(/\n/g, ' | '),
          benefits: (job.in2_benefit || job.benefit || '').replace(/\n/g, ' | '),
        });
      }
    }

    console.log(`  ✅ ${detail.in2_corp_nm_kor || corp.name}: 공고 ${jobList.length}개`);
    await new Promise(r => setTimeout(r, 300));
  }

  // ── CSV 생성 ──
  const headers = [
    'No', 'Company (KOR)', 'Company (ENG)', 'Website', 'Industry', 'Company Type',
    'Employees', 'Established',
    'Job Title', 'Job Category', 'Job Category Detail',
    'Employment Type', 'Work Place', 'Work Place Detail',
    'Nationality', 'Language', 'Education', 'Experience', 'Salary (USD)', 'Major',
    'Job Detail (KOR)', 'Job Detail (ENG)', 'Benefits'
  ];

  const csvRows = rows.map(r => [
    r.no, r.companyKor, r.companyEng, r.website, r.industry, r.companyType,
    r.employees, r.established,
    r.jobTitle, r.jobCategory, r.jobCategoryDetail,
    r.employType, r.workPlace, r.workPlaceDetail,
    r.nationality, r.language, r.education, r.experience, r.salary, r.major,
    r.jobDetailKor, r.jobDetailEng, r.benefits
  ].map(v => `"${String(v||'').replace(/"/g, '""').trim()}"`).join(','));

  const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kotra_internship_final.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log('\n🎉 완료! kotra_internship_final.csv 다운로드됨');
  console.log(`총 ${rows.length}행 (${CORPS.length}개 기업)`);

  // 인턴십 공고만 필터 요약
  const internships = rows.filter(r => r.employType && r.employType.toLowerCase().includes('intern'));
  console.log(`\n인턴십 공고: ${internships.length}개`);
  internships.forEach(r => console.log(`  - ${r.companyKor}: ${r.jobTitle}`));

  return rows;
})();
