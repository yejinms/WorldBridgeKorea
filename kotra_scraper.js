/**
 * KOTRA 2026 외국인유학생 채용관 - 기업 정보 자동 추출 스크립트
 * 사용법: KOTRA 사이트(로그인 상태)에서 브라우저 콘솔(F12)에 붙여넣고 실행
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

  function extractText(el) {
    return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
  }

  function getAfterLabel(container, label) {
    const items = container.querySelectorAll('*');
    for (let i = 0; i < items.length; i++) {
      if (items[i].innerText && items[i].innerText.trim().includes(label)) {
        const next = items[i].nextElementSibling;
        if (next) return extractText(next);
        // try same row
        const parent = items[i].parentElement;
        if (parent) {
          const texts = extractText(parent).replace(label, '').trim();
          if (texts) return texts;
        }
      }
    }
    return '';
  }

  function findByKeyword(text, keyword) {
    const regex = new RegExp(keyword + '[\\s:：]*(.*?)(?=\\n|$)', 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  const results = [];
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;';
  document.body.appendChild(iframe);

  for (let i = 0; i < CORP_IDS.length; i++) {
    const corp = CORP_IDS[i];
    console.log(`[${i+1}/${CORP_IDS.length}] 로딩 중: ${corp.name}`);

    await new Promise((resolve) => {
      const url = `https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/detail?CORP_IDX=${corp.id}&TYPE=corp&SYSTEM_IDX=64`;
      iframe.src = url;
      iframe.onload = () => setTimeout(resolve, 3000); // Vue 렌더링 대기
    });

    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const body = doc.body;
      const text = body ? body.innerText : '';

      // 핵심 정보 추출
      const nameKor = (body.querySelector('.company-name-kor, .corp-name, h2, h1') || {}).innerText || corp.name;
      const website = findByKeyword(text, '홈페이지') || findByKeyword(text, 'Website');
      const industry = findByKeyword(text, '업종');
      const position = findByKeyword(text, '채용공고') || findByKeyword(text, 'Job Opening');
      const employmentType = findByKeyword(text, '정규직 여부') || findByKeyword(text, 'Employment Type');
      const salary = findByKeyword(text, '연봉 범위') || findByKeyword(text, 'Annual Salary');
      const location = findByKeyword(text, '근무지 상세') || findByKeyword(text, 'Place Details');
      const nationality = findByKeyword(text, '국적') || findByKeyword(text, 'Nationality');
      const language = findByKeyword(text, '구사언어') || findByKeyword(text, 'Language');
      const education = findByKeyword(text, '학력') || findByKeyword(text, 'Degree');
      const email = (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [''])[0];
      const phone = (text.match(/0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}/) || [''])[0];

      results.push({
        no: i + 1,
        company: corp.name,
        website: website,
        industry: industry,
        position: position,
        internship: employmentType.toLowerCase().includes('intern') ? 'Yes' : employmentType,
        nationality: nationality,
        language: language,
        education: education,
        salary: salary,
        location: location,
        email: email,
        phone: phone,
        raw: text.substring(0, 2000)
      });

      console.log(`✅ ${corp.name}: ${position} | ${website}`);
    } catch(e) {
      console.error(`❌ ${corp.name} 오류:`, e.message);
      results.push({ no: i+1, company: corp.name, error: e.message });
    }
  }

  iframe.remove();

  // CSV 생성
  const headers = ['No','Company','Website','Industry','Internship Position','Internship?','Nationality','Language','Education','Salary(USD)','Location','Email','Phone'];
  const rows = results.map(r => [
    r.no, r.company, r.website||'', r.industry||'', r.position||'',
    r.internship||'', r.nationality||'', r.language||'', r.education||'',
    r.salary||'', r.location||'', r.email||'', r.phone||''
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  // 다운로드
  const blob = new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kotra_internship_companies.csv';
  a.click();

  console.log('🎉 완료! CSV 파일이 다운로드되었습니다.');
  console.log('결과:', results);
  return results;
})();
