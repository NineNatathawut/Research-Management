const axios = require('axios');
require('dotenv').config();

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY;
const BASE_URL = 'https://api.elsevier.com/content';

const commonHeaders = {
  'Accept': 'application/json',
  'X-ELS-APIKey': SCOPUS_API_KEY
};

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { ...options, timeout: 20000 });
      return res;
    } catch (err) {
      if (err.response && err.response.status === 429 && i < retries) {
        const delay = 1000 * Math.pow(2, i);
        console.warn(`[Scopus Service] [Rate Limit] รอ ${delay}ms ก่อนลองใหม่ครั้งที่ ${i + 1}...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

function computeMetricsFromPapers(papers) {
  if (!papers || papers.length === 0) return null;

  const citedByCounts = papers.map(p => p.citedBy || 0).sort((a, b) => b - a);
  let hIndex = 0;
  for (let i = 0; i < citedByCounts.length; i++) {
    if (citedByCounts[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  const totalCitations = citedByCounts.reduce((sum, c) => sum + c, 0);

  return {
    hIndex,
    citedByCount: totalCitations,
    documentCount: papers.length
  };
}

async function getAuthorMetrics(scopusId) {
  if (!scopusId) return null;

  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/author/${scopusId}`,
      { headers: commonHeaders }
    );

    const data = res.data;
    const author = data['author-retrieval-response'];

    if (!author) return null;

    const preferredName = author['preferred-name'];
    const displayName = preferredName?.['@_display-name'] || preferredName?.display_name || 'N/A';

    const affiliationCurrent = author['affiliation-current'];
    const currentAffiliation = affiliationCurrent
      ? (Array.isArray(affiliationCurrent) ? affiliationCurrent[0]?.['affiliation-name'] : affiliationCurrent['affiliation-name']) || 'N/A'
      : 'N/A';

    return {
      displayName,
      hIndex: parseInt(author['h-index'], 10) || 0,
      citedByCount: parseInt(author['citation-count'], 10) || 0,
      documentCount: parseInt(author['document-count'], 10) || 0,
      currentAffiliation,
      scopusId
    };
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 405)) {
      console.warn(`[Scopus Service] Author API ไม่พร้อมใช้งานสำหรับ Scopus ID: ${scopusId} (status ${err.response.status})`);
      return null;
    }
    console.error(`[Scopus Service] getAuthorMetrics error for ${scopusId}:`, err.message);
    return null;
  }
}

async function getAuthorPapers(scopusId) {
  if (!scopusId) return [];

  const papers = [];
  let start = 0;
  const count = 25;
  let totalResults = null;

  try {
    do {
      const res = await fetchWithRetry(
        `${BASE_URL}/search/scopus`,
        {
          headers: commonHeaders,
          params: {
            query: `AU-ID(${scopusId})`,
            start,
            count
          }
        }
      );

      const data = res.data;
      const searchResults = data['search-results'];

      if (!searchResults) break;

      if (totalResults === null) {
        totalResults = parseInt(searchResults['opensearch:totalResults'], 10) || 0;
      }

      const entryList = searchResults['entry'] || [];
      const entries = Array.isArray(entryList) ? entryList : [entryList];

      for (const entry of entries) {
        const eidRaw = entry['dc:identifier'] || null;
        const eid = eidRaw ? eidRaw.replace(/SCOPUS_ID:/, '') : null;
        const title = entry['dc:title'] || null;
        const journal = entry['prism:publicationName'] || null;
        const coverDate = entry['prism:coverDate'] || null;
        const doi = entry['prism:doi'] || null;
        const citedBy = parseInt(entry['citedby-count'], 10) || 0;
        const subtype = entry['subtype'] || null;
        const subtypeDesc = entry['subtypeDescription'] || null;
        const docType = subtypeDesc ? subtypeDesc.replace(subtype || '', '').trim() || subtypeDesc : 'Article';

        const year = coverDate ? coverDate.substring(0, 4) : null;

        const authorEntries = entry['author'] || [];
        const authors = Array.isArray(authorEntries) ? authorEntries : [authorEntries];
        const authorList = authors.map(a => ({
          name: a['ce:given-name'] ? `${a['ce:given-name']} ${a['ce:surname']}` : (a['ce:surname'] || 'Unknown'),
          scopusId: a['author-id'] || null,
          order: parseInt(a['@_seq'] || a['seq'] || '0', 10)
        })).sort((a, b) => a.order - b.order);

        papers.push({
          title,
          journal,
          docType: subtypeDesc || 'Article',
          coverDate: year,
          doi,
          eid,
          citedBy,
          authors: authorList,
          source: 'scopus'
        });
      }

      start += count;
    } while (start < totalResults);

    console.log(`[Scopus Service] ดึงผลงานทั้งหมด ${papers.length} รายการ สำหรับ Scopus ID: ${scopusId}`);
    return papers;
  } catch (err) {
    console.error(`[Scopus Service] getAuthorPapers error for ${scopusId}:`, err.message);
    throw err;
  }
}

module.exports = {
  getAuthorMetrics,
  getAuthorPapers,
  computeMetricsFromPapers,
  fetchWithRetry
};
