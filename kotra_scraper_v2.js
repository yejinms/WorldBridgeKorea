/**
 * KOTRA 2026 외국인유학생 채용관 - API 직접 호출 방식 v2
 * 사용법: KOTRA 사이트(로그인 상태) 콘솔에서 실행
 * 'allow pasting' 입력 후 Enter → 이 스크립트 붙여넣기 → Enter
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

  // Step 1: 네트워크 요청 인터셉트로 API 파라미터 자동 탐지
  console.log('🔍 API 파라미터 탐지 중... 잠시 기다려주세요');

  const capturedRequests = [];
  const origFetch = window.fetch;
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;

  // fetch 인터셉트
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    const clone = res.clone();
    try {
      const text = await clone.text();
      if (String(args[0]).includes('fairOnline') || String(args[0]).includes('corp')) {
        capturedRequests.push({type: 'fetch', url: args[0], body: args[1]?.body, response: text});
      }
    } catch(e) {}
    return res;
  };

  // XHR 인터셉트
  XMLHttpRequest.prototype.open = function(m, url, ...rest) {
    this._capUrl = url; this._capMethod = m;
    return origXHROpen.apply(this, [m, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', function() {
      if (this._capUrl && (this._capUrl.includes('fairOnline') || this._capUrl.includes('corp'))) {
        capturedRequests.push({type: 'xhr', url: this._capUrl, body: body, response: this.responseText});
      }
    });
    return origXHRSend.apply(this, [body]);
  };

  // Step 2: 첫 번째 기업 상세 페이지 로드해서 API 패턴 캡처
  const testIframe = document.createElement('iframe');
  testIframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;';
  testIframe.src = `https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/detail?CORP_IDX=265330&TYPE=corp&SYSTEM_IDX=64`;
  document.body.appendChild(testIframe);

  await new Promise(r => setTimeout(r, 6000));
  testIframe.remove();

  console.log('캡처된 요청 수:', capturedRequests.length);
  if (capturedRequests.length > 0) {
    console.log('샘플 요청:', capturedRequests[0]);
  }

  // Step 3: 인터셉트 복원
  window.fetch = origFetch;
  XMLHttpRequest.prototype.open = origXHROpen;
  XMLHttpRequest.prototype.send = origXHRSend;

  // Step 4: 캡처된 API 패턴으로 직접 호출 또는 DOM 파싱 방식으로 폴백
  const results = [];

  // API 직접 호출 시도
  async function fetchCorpData(corpIdx) {
    // 방법 A: 캡처된 요청에서 같은 corp_idx 응답 찾기
    const captured = capturedRequests.find(r => r.response && r.response.includes(corpIdx));
    if (captured) {
      try { return JSON.parse(captured.response); } catch(e) {}
    }

    // 방법 B: 공통 KOTRA API 패턴으로 직접 POST
    const paramSets = [
      new URLSearchParams({selAction:'corp_view', CORP_IDX: corpIdx, SYSTEM_IDX: 64, fairGubunVal:'in2'}),
      new URLSearchParams({selAction:'getDtl', CORP_IDX: corpIdx, SYSTEM_IDX: 64}),
      new URLSearchParams({selAction:'view', CORP_IDX: corpIdx, SYSTEM_IDX: 64, fairGubunVal:'in2'}),
    ];

    for (const params of paramSets) {
      try {
        const res = await origFetch('/fairOnline.do', {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'},
          body: params.toString(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data && (data.corpDetail || data.corp_nm_kor || data.result)) return data;
      } catch(e) {}
    }
    return null;
  }

  // DOM 파싱 방식 (폴백)
  async function fetchCorpDOM(corpIdx, fallbackName) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:#fff;';
      iframe.src = `https://jffis.kotra.or.kr/fairOnline.do?selAction=single_page&SYSTEM_IDX=64&hl=KOR&fairGubunVal=in2&FAIRMENU_IDX=14629#/detail?CORP_IDX=${corpIdx}&TYPE=corp&SYSTEM_IDX=64`;
      document.body.appendChild(iframe);

      let resolved = false;
      function tryExtract() {
        if (resolved) return;
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (!doc || !doc.body) return;

          // Vue 렌더링 확인: job-detail 섹션이 있는지
          const jobDetail = doc.querySelector('.job-detail, .nor-info, .introduce');
          if (!jobDetail) return; // 아직 렌더링 안됨

          const getNext = (labelText) => {
            const h4s = doc.querySelectorAll('h4, dt, th, strong, label');
            for (const el of h4s) {
              if (el.innerText && el.innerText.replace(/\s/g,'').includes(labelText.replace(/\s/g,''))) {
                const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
                if (next) return next.innerText.trim();
              }
            }
            return '';
          };

          const getText = (selector) => {
            const el = doc.querySelector(selector);
            return el ? el.innerText.trim() : '';
          };

          // 전체 텍스트에서 패턴 추출
          const allText = doc.body.innerText;
          const between = (a, b) => {
            const ia = allText.indexOf(a), ib = allText.indexOf(b, ia + a.length);
            return ia !== -1 && ib !== -1 ? allText.slice(ia + a.length, ib).trim() : '';
          };
          const lineAfter = (keyword) => {
            const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
            const idx = lines.findIndex(l => l.includes(keyword));
            return idx !== -1 && idx + 1 < lines.length ? lines[idx + 1] : '';
          };

          const companyH3 = doc.querySelector('.nor-info h3, .corp-name, .company-name');
          const companyName = companyH3 ? companyH3.innerText.replace(/\n/g, ' ').trim() : fallbackName;

          // 채용공고 섹션
          const jobSections = doc.querySelectorAll('.job-posting-item, .job-item, [class*="job"]');

          const result = {
            company: companyName,
            website: lineAfter('홈페이지 / Website') || lineAfter('Website'),
            industry: lineAfter('업종') || getNext('업종'),
            companyType: lineAfter('기업형태') || getNext('기업형태'),
            position: lineAfter('채용공고 / Job Opening') || lineAfter('Job Opening'),
            employmentType: lineAfter('정규직 여부') || lineAfter('Employment Type'),
            salary: lineAfter('연봉 범위(USD 기준)') || lineAfter('Annual Salary(USD)'),
            location: lineAfter('근무지 상세') || lineAfter('Place Details'),
            nationality: lineAfter('국적') || lineAfter('Nationality'),
            language: lineAfter('구사언어') || lineAfter('Language'),
            education: lineAfter('학력') || lineAfter('Degree'),
            email: (allText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/) || [''])[0],
            phone: (allText.match(/0\d{1,2}[-. ]\d{3,4}[-. ]\d{4}/) || [''])[0],
          };

          resolved = true;
          clearInterval(poll);
          setTimeout(() => { iframe.remove(); }, 300);
          resolve(result);
        } catch(e) {}
      }

      const poll = setInterval(tryExtract, 800);
      // 최대 12초 대기
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(poll);
          iframe.remove();
          resolve({ company: fallbackName, error: 'timeout' });
        }
      }, 12000);
    });
  }

  // Step 5: 모든 기업 순차 처리
  console.log('\n📋 기업 정보 수집 시작...\n');

  for (let i = 0; i < CORP_IDS.length; i++) {
    const corp = CORP_IDS[i];
    console.log(`[${i+1}/${CORP_IDS.length}] ${corp.name} 처리 중...`);

    // API 직접 호출 먼저 시도
    let data = await fetchCorpData(corp.id);
    let result;

    if (data) {
      const d = data.corpDetail || data;
      result = {
        no: i + 1,
        company: corp.name,
        website: d.corp_homepage || d.homepage || '',
        industry: d.corp_category || d.in2_corp_category || '',
        position: d.in2_job_title || d.job_title || '',
        employmentType: d.in2_employ_type || d.employ_type || '',
        nationality: d.in2_nationality || d.nationality || '',
        language: d.in2_language || d.language || '',
        education: d.in2_education || d.education || '',
        salary: d.in2_salary || d.salary || '',
        location: d.in2_work_place_detail || d.work_place_detail || '',
        email: d.manager_email || d.email || '',
        phone: d.manager_phone || d.phone || '',
      };
      console.log(`  ✅ API 방식: ${result.position || '직무 미확인'} | ${result.website || '웹사이트 미확인'}`);
    } else {
      // DOM 파싱 폴백
      result = await fetchCorpDOM(corp.id, corp.name);
      result.no = i + 1;
      console.log(`  ✅ DOM 방식: ${result.position || '직무 미확인'} | ${result.website || '웹사이트 미확인'}`);
    }

    results.push(result);
    // 서버 부하 방지
    if (i < CORP_IDS.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  // Step 6: CSV 생성 및 다운로드
  const headers = ['No','Company','Website','Industry','Company Type','Internship Position','Employment Type','Nationality','Language','Education','Salary(USD)','Location','Email','Phone'];
  const rows = results.map(r => [
    r.no||'', r.company||'', r.website||'', r.industry||'', r.companyType||'',
    r.position||'', r.employmentType||'', r.nationality||'', r.language||'',
    r.education||'', r.salary||'', r.location||'', r.email||'', r.phone||''
  ].map(v => `"${String(v).replace(/"/g,'""').replace(/\n/g,' ')}"`).join(','));

  const csv = '﻿' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kotra_internship_companies_v2.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log('\n🎉 완료! kotra_internship_companies_v2.csv 다운로드됨');
  console.table(results.map(r => ({No: r.no, Company: r.company, Position: r.position, Website: r.website})));
  return results;
})();
