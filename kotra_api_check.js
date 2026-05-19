// API 응답 형식 진단 - 콘솔에서 실행
(async function() {
  const corpIdx = '266121';
  const EX_IDX = '495';

  // 방법 1: URLSearchParams (form-encoded)
  console.log('=== 방법1: form-encoded ===');
  const r1 = await fetch('/fairOnline.do', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'},
    body: new URLSearchParams({selAction:'get-corp-detail', CORP_GUBUN:'E', SYSTEM_IDX:'64', type:'corp', PROD_IDX:corpIdx, EX_IDX, hl:'KOR'}).toString(),
    credentials: 'include'
  });
  console.log('Status:', r1.status, '| Content-Type:', r1.headers.get('content-type'));
  const t1 = await r1.text();
  console.log('Response (300자):', t1.substring(0, 300));

  // 방법 2: JSON body
  console.log('\n=== 방법2: JSON body ===');
  const r2 = await fetch('/fairOnline.do', {
    method: 'POST',
    headers: {'Content-Type': 'application/json; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'},
    body: JSON.stringify({selAction:'get-corp-detail', CORP_GUBUN:'E', SYSTEM_IDX:'64', type:'corp', PROD_IDX:corpIdx, EX_IDX, hl:'KOR'}),
    credentials: 'include'
  });
  console.log('Status:', r2.status, '| Content-Type:', r2.headers.get('content-type'));
  const t2 = await r2.text();
  console.log('Response (300자):', t2.substring(0, 300));

  // 방법 3: axios가 실제로 사용하는 방식 (기존 axios 인스턴스 사용)
  console.log('\n=== 방법3: 기존 axios 직접 호출 ===');
  try {
    const r3 = await axios({
      method: 'POST', url: '/fairOnline.do', dataType: 'json',
      data: {selAction:'get-corp-detail', CORP_GUBUN:'E', SYSTEM_IDX:'64', type:'corp', PROD_IDX:corpIdx, EX_IDX, hl:'KOR'}
    });
    console.log('axios 응답 keys:', Object.keys(r3.data || {}));
    console.log('axios 응답 (300자):', JSON.stringify(r3.data).substring(0, 300));
  } catch(e) { console.error('axios 오류:', e.message); }
})();
