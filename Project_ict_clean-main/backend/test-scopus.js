const axios = require('axios');
require('dotenv').config();

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY;
const BASE_URL = 'https://api.elsevier.com/content';

const commonHeaders = {
  'Accept': 'application/json',
  'X-ELS-APIKey': SCOPUS_API_KEY
};

async function testAuthorAPI(scopusId) {
  console.log(`\n=========================================`);
  console.log(`[TEST] Author API - Scopus ID: ${scopusId}`);
  console.log(`=========================================\n`);

  try {
    const res = await axios.get(`${BASE_URL}/author/${scopusId}`, {
      headers: commonHeaders,
      timeout: 15000
    });

    const data = res.data;
    const author = data['author-retrieval-response'];

    if (!author) {
      console.log('[TEST] ไม่พบข้อมูล author-retrieval-response ใน response');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      return null;
    }

    const metrics = {
      displayName: author['preferred-name']?.['@_display-name'] || author['preferred-name']?.display_name || 'N/A',
      hIndex: author['h-index'] || 'N/A',
      citedByCount: author['citation-count'] || 'N/A',
      documentCount: author['document-count'] || 'N/A',
      affiliation: author['affiliation-current']?.['affiliation-name'] || 
                    (Array.isArray(author['affiliation-current']) ? author['affiliation-current'][0]?.['affiliation-name'] : null) || 'N/A',
      currentAffiliation: author['affiliation-current']?.['affiliation-name'] || 'N/A',
      subjectAreas: author['subject-areas']?.['subject-area']?.map(sa => sa['@_code'] + ': ' + sa['@_abbrev']) || []
    };

    console.log('✅ ดึงข้อมูล Author Metrics สำเร็จ:');
    console.log(`   ชื่อ: ${metrics.displayName}`);
    console.log(`   h-index: ${metrics.hIndex}`);
    console.log(`   Total Citations: ${metrics.citedByCount}`);
    console.log(`   Document Count: ${metrics.documentCount}`);
    console.log(`   สังกัดปัจจุบัน: ${metrics.currentAffiliation}`);
    console.log(`   สาขาวิชา: ${metrics.subjectAreas.join(', ') || 'N/A'}`);

    return metrics;
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.error('[TEST] HTTP 429 - Rate Limit Exceeded. กรุณาลองใหม่อีกรอบ');
    } else if (err.response && err.response.status === 404) {
      console.error(`[TEST] HTTP 404 - ไม่พบ Scopus ID: ${scopusId}`);
    } else if (err.response) {
      console.error(`[TEST] HTTP ${err.response.status}: ${err.message}`);
    } else {
      console.error(`[TEST] Network Error: ${err.message}`);
    }
    return null;
  }
}

async function testSearchAPI(scopusId) {
  console.log(`\n=========================================`);
  console.log(`[TEST] Search API - AU-ID(${scopusId})`);
  console.log(`=========================================\n`);

  try {
    const res = await axios.get(`${BASE_URL}/search/scopus`, {
      headers: commonHeaders,
      params: {
        query: `AU-ID(${scopusId})`,
        start: 0,
        count: 5
      },
      timeout: 15000
    });

    const data = res.data;
    const searchResults = data['search-results'];

    if (!searchResults) {
      console.log('[TEST] ไม่พบ search-results ใน response');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
      return null;
    }

    const resultList = searchResults['entry'] || [];
    const entries = Array.isArray(resultList) ? resultList : [resultList];

    console.log(`✅ พบ ${entries.length} ผลงาน:`);

    for (const entry of entries) {
      const eidRaw = entry['dc:identifier'] || 'N/A';
      const eid = eidRaw.replace(/SCOPUS_ID:|^SCOPUS_ID:/, '') || null;
      const title = entry['dc:title'] || 'N/A';
      const journal = entry['prism:publicationName'] || 'N/A';
      const coverDate = entry['prism:coverDate'] || 'N/A';
      const doi = entry['prism:doi'] || 'N/A';
      const citedBy = entry['citedby-count'] || 'N/A';
      const docType = entry['subtypeDescription'] || 'N/A';

      // Extract authors
      const authorEntries = entry['author'] || [];
      const authors = Array.isArray(authorEntries) ? authorEntries : [authorEntries];
      const authorList = authors.map(a => ({
        name: a['ce:given-name'] ? `${a['ce:given-name']} ${a['ce:surname']}` : (a['ce:surname'] || 'Unknown'),
        scopusId: a['author-id'] || 'N/A'
      }));

      console.log(`\n  📄 ${title}`);
      console.log(`     EID: ${eid}`);
      console.log(`     Journal: ${journal} (${docType})`);
      console.log(`     Date: ${coverDate}`);
      console.log(`     DOI: ${doi}`);
      console.log(`     Citations: ${citedBy}`);
      console.log(`     Authors: ${authorList.map(a => a.name).join(', ')}`);
      if (authorList.some(a => a.scopusId !== 'N/A')) {
        console.log(`     Co-author Scopus IDs: ${authorList.map(a => a.scopusId).join(', ')}`);
      }
    }

    // Pagination info
    const totalResults = searchResults['opensearch:totalResults'] || entries.length;
    console.log(`\n  ผลลัพธ์ทั้งหมด: ${totalResults} รายการ`);

    return { entries, totalResults: parseInt(totalResults) };
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.error('[TEST] HTTP 429 - Rate Limit Exceeded. กรุณาลองใหม่อีกรอบ');
    } else if (err.response && err.response.status === 404) {
      console.error('[TEST] HTTP 404 - ไม่พบผลการค้นหา');
    } else if (err.response) {
      console.error(`[TEST] HTTP ${err.response.status}: ${err.message}`);
    } else {
      console.error(`[TEST] Network Error: ${err.message}`);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Scopus API Proof of Concept Test');
  console.log(`   API Key: ${SCOPUS_API_KEY ? SCOPUS_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);

  if (!SCOPUS_API_KEY) {
    console.error('❌ กรุณาตั้งค่า SCOPUS_API_KEY ใน .env');
    process.exit(1);
  }

  // Test with a known Scopus ID from the database
  const testScopusIds = [
    '57202949045',  // Ratanapat Suchat
    '57223964502',  // Wisoot Kaenmueang
  ];

  for (const scopusId of testScopusIds) {
    await testAuthorAPI(scopusId);
    await testSearchAPI(scopusId);
    // Pause between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=========================================');
  console.log('✅ ทดสอบ Scopus API เสร็จสิ้น');
  console.log('=========================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
