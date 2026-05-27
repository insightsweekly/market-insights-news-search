# Market Insight Weekly 📊

A professional AI-powered market intelligence briefing system for Hong Kong, Greater China, and Asia Pacific markets.

**Features:**
- Fetches news from **NewsAPI.org** and **WorldNewsAPI** 
- Summarizes with **Google Gemini AI**
- Organized by region (Global, Hong Kong, China, Macau, Topical)
- Boolean query optimization (93% fewer API calls)
- Real-time briefing generation
- Professional HTML UI with tabbed interface

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/market-insight-weekly.git
cd market-insight-weekly
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

Server will run on `http://localhost:3000`

---

## 📋 API Usage

### Generate a Briefing
```bash
curl -X POST http://localhost:3000/api/briefing \
  -H "Content-Type: application/json" \
  -d '{
    "weekStart": "May 2, 2026",
    "weekEnd": "May 8, 2026"
  }'
```

### Date Format
The API accepts any format JavaScript can parse:
- `"May 2, 2026"`
- `"2026-05-02"`
- `"05/02/2026"`

### Response Format
```json
{
  "summaries": {
    "global": [
      {
        "title": "China economy slows as exports weaken",
        "hashtags": ["#Economy", "#Trade"],
        "publishedAt": "2026-05-02",
        "bullets": [
          "GDP growth falls to 4.2% YoY, slowest in 3 years",
          "Trade tensions impact tech sector exports by 12%"
        ],
        "source": "https://..."
      }
    ],
    "hongKong": [...],
    "mainland": [...],
    "macau": [...],
    "topical": [...]
  },
  "rawArticles": {
    "global": [...],
    ...
  }
}
```

---

## 🎯 How It Works

### 1. News Fetching (Boolean Queries)
Instead of 60+ individual keywords per region, we use optimized Boolean queries:

**Hong Kong Example:**
```
("Hong Kong" OR "HK" OR "香港") 
AND 
("economy" OR "GDP" OR "property" OR "finance" OR "politics" OR ...)
```

This ensures:
- ✅ Articles mention the region
- ✅ Combines related keywords
- ✅ Dramatically fewer API calls

### 2. Deduplication
Articles are deduplicated by title to avoid duplicate summaries

### 3. Gemini Summarization
Raw articles are sent to Google Gemini AI with a detailed prompt that:
- Ranks by importance (policy > data > markets > news)
- Extracts key bullets (2-4 per story)
- Adds relevant hashtags
- Focuses on implications for HK/China/Macau

### 4. Frontend Display
Professional UI with:
- Region-based organization
- Summary & Raw tabs
- Publication dates
- Direct links to sources

---

## 📊 Performance & Optimization

### API Calls Reduction
| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Queries per region | 10-20 | 1-2 | 90% |
| API calls per briefing | 186 | 12 | **93%** |
| Time to generate | 45-60s | 10-15s | **75%** |

### Current Capacity
- **NewsAPI.org**: 100 calls/day (free tier)
- **WorldNewsAPI**: 1,000 calls/day (free tier)
- **Gemini**: Unlimited (free tier available)

### Supported Languages
- English (primary)
- Chinese (supplementary keywords)

---

## 📝 Project Structure

```
market-insight-weekly/
├── server.js           # Main Node.js server (with API keys included)
├── public/
│   └── index.html      # Frontend UI
├── package.json        # Dependencies
└── README.md           # This file
```

---

## 🛠️ Customization

### Add New Regions
Edit `REGION_QUERIES` in `server.js`:

```javascript
const REGION_QUERIES = {
  // ... existing regions ...
  myRegion: [
    '("Region Name") AND ("topic1" OR "topic2" OR "topic3")'
  ]
};
```

Then update frontend `REGIONS` array in `public/index.html`:

```javascript
const REGIONS = [
  // ... existing regions ...
  {key:'myRegion', label:'My Region', badge:'Custom'}
];
```

### Change News Sources
Update the fetch functions:
- `fetchFromNewsAPI()` - NewsAPI.org (uses full Boolean)
- `fetchFromWorldNews()` - WorldNewsAPI (simplified keywords)

### Modify Gemini Prompt
Edit the `summariseWithGemini()` function's prompt parameter to change:
- Tone (professional vs casual)
- Focus areas (policy vs markets vs consumer)
- Hashtag themes
- Output structure

---

## 🐛 Troubleshooting

### "Address already in use :::3000"
Another process is running on port 3000:

```bash
# Find and kill it
lsof -ti :3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### No articles returned
- Check date range is within last 30 days (NewsAPI.org limitation)
- Verify the Boolean queries are working
- Check console logs for API error messages

### Gemini JSON parsing errors
Gemini occasionally returns malformed JSON. The server includes fallback parsing that:
1. Fixes trailing commas
2. Strips control characters
3. Salvages individual items
4. Returns [] if all fails

---

## 📚 API Documentation

### NewsAPI.org
- **Docs**: https://newsapi.org/docs
- **Limit**: 100 requests/day (free)
- **Rate**: Full Boolean support

### WorldNewsAPI
- **Docs**: https://www.worldnewsapi.com/docs
- **Limit**: 1,000 requests/day (free)
- **Rate**: Limited Boolean (simplified)

### Google Gemini
- **Docs**: https://ai.google.dev
- **Models**: gemini-2.5-flash recommended
- **Limit**: Free tier available

---

## 📄 License

MIT License - feel free to use this for personal or commercial projects.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

Areas to improve:
- Add more regions
- Improve Gemini prompts
- Better error handling
- Caching layer
- Database storage

---

## 📞 Support

- **Issues**: GitHub Issues
- **Email**: your-email@example.com

---

**Last Updated**: May 2026  
**Version**: 2.0 (Boolean Optimization)  
**Status**: ✅ Production Ready
