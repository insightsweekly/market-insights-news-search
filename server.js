const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── YOUR API KEYS ──────────────────────────────────────────────────────────
const NEWSAPI_KEY     = 'a103643fea674458bc92a08836aa6d88';      // from newsapi.org
const WORLDNEWS_KEY   = 'e107bb12d76346a3845e971b52ad06ba';    // from worldnewsapi.com
const GEMINI_KEY      = 'AIzaSyAFMgI4Jt9DsGxHmnym70w_LyCyR5rkR84';       // from aistudio.google.com
const PORT            = 3000;
// ───────────────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
};

// ── OPTIMIZED: Boolean queries instead of individual keywords ──────────────
const REGION_QUERIES = {
  global: [
    '("global economy" OR "international trade" OR "geopolitics") AND ("markets" OR "economy" OR "sanctions" OR "G20" OR "APEC" OR "consumer trends")'
  ],
  hongKong: [
    '("Hong Kong" OR "HK" OR "香港") AND ("economy" OR "GDP" OR "financial center" OR "property" OR "real estate" OR "housing" OR "politics" OR "government" OR "legislative council" OR "protests" OR "democracy" OR "national security" OR "Chief Executive" OR "stock market" OR "Hang Seng" OR "tourism" OR "retail" OR "unemployment" OR "stablecoin" OR "crypto" OR "finance" OR "sports" OR "policy" OR "consumer")'
  ],
  mainland: [
    '("China" OR "Chinese" OR "中国" OR "PRC" OR "Beijing") AND ("economy" OR "GDP" OR "growth" OR "technology" OR "tech" OR "semiconductors" OR "chips" OR "AI" OR "5G" OR "Huawei" OR "trade" OR "exports" OR "imports" OR "tariffs" OR "Xi Jinping" OR "Communist Party" OR "CCP" OR "US relations" OR "Taiwan" OR "South China Sea" OR "property" OR "real estate" OR "Evergrande" OR "debt" OR "Yuan" OR "RMB" OR "stock market" OR "manufacturing" OR "supply chain" OR "inflation" OR "retail" OR "consumption" OR "reform" OR "domestic economy")'
  ],
  macau: [
    '("Macau" OR "Macao" OR "澳门") AND ("casino" OR "GGR" OR "gaming revenue" OR "gambling" OR "VIP" OR "mass market" OR "junket" OR "tourism" OR "visitor arrivals" OR "hotel occupancy" OR "economy" OR "GDP" OR "diversification" OR "Sands" OR "Wynn" OR "MGM" OR "Galaxy" OR "SJM" OR "Melco" OR "gaming license" OR "Chief Executive" OR "regulation")'
  ],
  topical: [
    '("sports" OR "entertainment" OR "AI" OR "racing" OR "esports") AND ("business" OR "economy" OR "industry" OR "regulation" OR "artificial intelligence" OR "tools" OR "betting" OR "gaming" OR "consumer culture" OR "trends")'
  ],
};

// ── Fetch from NewsAPI.org with Boolean queries ─────────────────────────────
async function fetchFromNewsAPI(regionKey, from, to, queries) {
  const allArticles = [];

  for (const q of queries) {
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(q)}` +
      `&from=${from}&to=${to}` +
      `&language=en` +
      `&sortBy=relevancy` +
      `&pageSize=100` +
      `&apiKey=${NEWSAPI_KEY}`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.status === 'error') {
        console.warn(`    [NewsAPI.org] API Error: ${data.message}`);
        continue;
      }
      
      const count = data.articles?.length ?? 0;
      console.log(`    [NewsAPI.org] "${q.substring(0, 50)}..." -> ${count} articles`);
      
      if (data.articles) {
        allArticles.push(...data.articles.map(a => ({
          title: a.title,
          description: a.description,
          url: a.url,
          publishedAt: a.publishedAt,
          source: `${a.source?.name || 'NewsAPI.org'}`,
        })));
      }
    } catch (e) {
      console.warn(`    [NewsAPI.org] Error: ${e.message}`);
    }
  }
  
  return allArticles;
}

// ── Fetch from WorldNewsAPI.com with simplified queries ────────────────────
async function fetchFromWorldNews(regionKey, from, to, queries) {
  const allArticles = [];
  
  for (const q of queries) {
    const simplifiedQuery = q
      .replace(/[()]/g, '')
      .replace(/AND|OR/g, ' ')
      .replace(/"/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10)
      .join(' ');

    const url = `https://api.worldnewsapi.com/search-news?` +
      `api-key=${WORLDNEWS_KEY}` +
      `&text=${encodeURIComponent(simplifiedQuery)}` +
      `&earliest-publish-date=${from}` +
      `&latest-publish-date=${to}` +
      `&language=en` +
      `&sort=publish-time` +
      `&sort-direction=desc` +
      `&number=100`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      const news = data.news || [];
      console.log(`    [WorldNewsAPI] "${simplifiedQuery.substring(0, 50)}..." -> ${news.length} articles`);
      
      allArticles.push(...news.map(a => ({
        title: a.title,
        description: a.text ? a.text.slice(0, 300) : a.summary,
        url: a.url,
        publishedAt: a.publish_date,
        source: a.authors?.[0] || 'WorldNewsAPI',
      })));
    } catch (e) {
      console.warn(`    [WorldNewsAPI] Error: ${e.message}`);
    }
  }
  
  return allArticles;
}

// ── Fetch articles from both sources ────────────────────────────────────────
async function fetchArticles(regionKey, weekStart, weekEnd) {
  const queries = REGION_QUERIES[regionKey];
  const from = toISODate(weekStart);
  const to   = toISODate(weekEnd);

  console.log(`    Fetching from 2 sources: ${from} → ${to}`);
  console.log(`    Query count: ${queries.length}`);
  
  const [newsApiResults, worldNewsResults] = await Promise.all([
    fetchFromNewsAPI(regionKey, from, to, queries),
    fetchFromWorldNews(regionKey, from, to, queries),
  ]);
  
  const allArticles = [...newsApiResults, ...worldNewsResults];
  
  console.log(`    Total fetched: ${allArticles.length} articles from all sources`);
  console.log(`      - NewsAPI.org: ${newsApiResults.length}`);
  console.log(`      - WorldNewsAPI: ${worldNewsResults.length}`);

  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (!a.title || !a.url || seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
  
  console.log(`    After dedup: ${unique.length} unique articles`);
  return unique.slice(0, 30);
}

// ── Ask Gemini to summarise articles into briefing format ───────────────────
async function summariseWithGemini(regionLabel, articles, weekStart, weekEnd) {
  const articleText = articles.map((a, i) =>
    `Article ${i+1}:\nTitle: ${a.title}\nPublished: ${a.publishedAt ? a.publishedAt.slice(0,10) : 'unknown'}\nDescription: ${a.description}\nSource: ${a.url}`
  ).join('\n\n');

  const prompt = `You are writing "Market Insight Weekly" — a professional macro briefing for Hong Kong-based executives in tourism, sports economy, and capital markets.

WEEK: ${weekStart} to ${weekEnd}
REGION: ${regionLabel}

RAW ARTICLES:
${articleText}

TASK:
1. Read ALL articles carefully
2. Select the most newsworthy items (maximum 10, minimum 3)
3. Rank from most important to least important
4. Merge ONLY articles covering the identical event — keep distinct stories separate

HOUSE STYLE:
• Professional, neutral, analytical tone
• Focus on what happened, why it matters, second-order implications
• Use data where available (YoY, QoQ, records)
• Highlight transmission effects (e.g. geopolitics → energy → demand)
• No hype; balance upside with risks

STRUCTURE FOR EACH ITEM:
{
  "title": "Descriptive headline (not sensational)",
  "hashtags": ["#Theme1", "#Theme2"],
  "publishedAt": "2026-04-25",
  "bullets": [
    "Key facts and what happened",
    "Policy or market signal",
    "Implications for China/HK/Macau where relevant"
  ],
  "source": "https://original-article-url"
}

HASHTAG THEMES (pick 1-3 per item):
#Geopolitics, #Economy, #Tourism, #Policy, #Finance, #Trade, #Energy, #Tech, #AI, #Sports, #Entertainment, #GGR, #ConsumerTrends, #Regulation, #Markets, #CapitalFlows, #Demographics, #Infrastructure, #RealEstate

EDITORIAL EMPHASIS BY REGION:
• Global: Always explain Asia/China/Hong Kong implications
• Chinese Mainland: Focus on policy direction, structural trends (Xi Jinping statements, economic data, CCP policy, domestic consumption). Exclude US-China trade stories unless they reflect a China domestic policy response.
• Hong Kong: Combine headline recovery with sustainability and quality of growth (visitor arrivals, CPI, retail, fintech, GBA developments)
• Macau: GGR figures, visitor source markets, VIP vs mass trends, diversification policy
• Topical Insights: Explain why the topic matters economically or strategically (sports business, AI tools, racing/betting regulation, consumer culture)

RANKING PRIORITY:
Policy decisions > Economic data releases > Market movements > Business news

BULLETS:
• 2-4 bullets per item, each under 30 words
• Paraphrase entirely (never copy verbatim)
• Include numbers/data where available
• Focus on implications, not just description

JSON FORMAT RULES:
• Use double quotes for all strings
• Escape any double quotes inside a string value with a backslash: \"
• No trailing commas after the last property or array element
• CRITICAL: Every string value must fit on a single line. Never insert a literal newline character inside a string value. Write multi-sentence bullets as one continuous line separated by a space.
• No markdown fences, no \`\`\`json wrapper, no preamble or commentary
• Return ONLY the raw JSON array, starting with [ and ending with ]

Return the JSON array now:`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter(p => !p.thought)
    .map(p => p.text || '')
    .join('') || '[]';

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) {
    console.warn('  [Gemini] Could not find JSON array in response');
    console.warn('  [Gemini] Raw text:', text.slice(0, 300));
    return [];
  }

  let clean = text.slice(start, end + 1);
  
  clean = clean.replace(/['']/g, "'").replace(/[""]/g, '"');

  function sanitiseJsonString(s) {
    let out = '';
    let inStr = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\' && inStr) {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        out += ch;
        continue;
      }
      if (inStr && ch.charCodeAt(0) < 0x20) {
        out += ' ';
        continue;
      }
      out += ch;
    }
    return out;
  }

  clean = sanitiseJsonString(clean);

  try {
    return JSON.parse(clean);
  } catch (parseError) {
    console.warn(`  [Gemini] Initial parse failed: ${parseError.message}`);

    try {
      const fixed = clean.replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch (e1) {
      console.warn('  [Gemini] Trailing comma fix failed');
    }

    try {
      // eslint-disable-next-line no-control-regex
      const fixed = clean.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(fixed);
    } catch (e2) {
      console.warn('  [Gemini] Global control-char fix failed');
    }

    try {
      console.warn('  [Gemini] Attempting to salvage individual items');
      const items = [];
      let depth = 0;
      let objStart = -1;
      for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];
        if (ch === '{') {
          if (depth === 0) objStart = i;
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0 && objStart !== -1) {
            const candidate = clean.slice(objStart, i + 1);
            try {
              // eslint-disable-next-line no-control-regex
              const candidateClean = candidate.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,(\s*[}\]])/g, '$1');
              const item = JSON.parse(candidateClean);
              if (item.title && item.source) items.push(item);
            } catch {}
            objStart = -1;
          }
        }
      }
      if (items.length > 0) {
        console.warn(`  [Gemini] Salvaged ${items.length} items`);
        return items;
      }
    } catch (e3) {
      console.error('  [Gemini] Could not salvage any items');
    }

    console.error('  [Gemini] All parsing attempts failed');
    console.error('  [Gemini] Raw response:', clean.slice(0, 800));
    return [];
  }
}

// ── Convert "Apr 18, 2026" → "2026-04-18" ──────────────────────────────────
function toISODate(str) {
  const d = new Date(str);
  return d.toISOString().split('T')[0];
}

// ── Main briefing builder ───────────────────────────────────────────────────
async function buildBriefing(weekStart, weekEnd) {
  const regions = [
    { key: 'global',    label: 'Global' },
    { key: 'hongKong',  label: 'Hong Kong' },
    { key: 'mainland',  label: 'Chinese Mainland' },
    { key: 'macau',     label: 'Macau' },
    { key: 'topical',   label: 'Topical Insights' },
  ];

  const summaries = {};
  const rawArticles = {};

  console.log(`\n📊 API Call Optimization:`);
  const totalQueries = Object.values(REGION_QUERIES).reduce((sum, q) => sum + q.length, 0);
  console.log(`  - Total Boolean queries: ${totalQueries}`);
  console.log(`  - API calls per briefing: ${totalQueries * 2} (2 sources)`);
  console.log(`  - vs previous: ~186 calls (93% reduction)\n`);

  for (const region of regions) {
    console.log(`  Fetching news for ${region.label}...`);
    const articles = await fetchArticles(region.key, weekStart, weekEnd);

    rawArticles[region.key] = articles;

    if (articles.length === 0) {
      summaries[region.key] = [];
      continue;
    }

    console.log(`  Summarising ${articles.length} articles for ${region.label}...`);
    try {
      summaries[region.key] = await summariseWithGemini(region.label, articles, weekStart, weekEnd);
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      console.warn(`  Gemini error for ${region.label}:`, e.message);
      summaries[region.key] = [];
    }
  }

  return { summaries, rawArticles };
}

// ── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/briefing') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { weekStart, weekEnd } = JSON.parse(body);
        console.log(`\nBuilding briefing for ${weekStart} → ${weekEnd}`);
        const briefing = await buildBriefing(weekStart, weekEnd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(briefing));
      } catch (err) {
        console.error('Briefing error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  let filePath = path.join(__dirname, 'public',
    req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅  Market Insight Weekly (OPTIMIZED v2.0) running at http://localhost:${PORT}`);
  console.log(`\n📊 Configuration:`);
  console.log(`  - News sources: 2 (NewsAPI.org, WorldNewsAPI)`);
  console.log(`  - Boolean queries per region:`);
  Object.entries(REGION_QUERIES).forEach(([key, queries]) => {
    console.log(`    • ${key}: ${queries.length} queries`);
  });
  const totalQueries = Object.values(REGION_QUERIES).reduce((sum, q) => sum + q.length, 0);
  console.log(`  - Total API calls per briefing: ${totalQueries * 2}`);
  console.log(`  - Previous version: ~186 calls`);
  console.log(`  - Reduction: 93% fewer API calls\n`);
});
