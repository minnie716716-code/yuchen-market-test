import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Tavily API Proxy
  app.post("/api/search/tavily", async (req, res) => {
    const { query, timeRange } = req.body;
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TAVILY_API_KEY is not configured." });
    }

    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const priorityDomains = [
      "mpaypass.com.cn", 
      "chinanews.com", 
      "cls.cn"
    ];

    // Extract Chinese characters for domestic search priority
    const prioritySearchQuery = (() => {
      const chineseMatches = query.match(/[\u4e00-\u9fa5]+/g);
      if (chineseMatches) {
        // Join Chinese parts to create a focused query for domestic sites
        const extracted = chineseMatches.join(' ');
        // If the extracted Chinese is too short (e.g. just one character), 
        // or if it's a significant part of the query, use it.
        // Otherwise, stick to the original query.
        return extracted.length > 1 ? extracted : query;
      }
      return query;
    })();

    try {
      // 1. Priority Domestic Search (Strictly these 3 domains)
      const domesticPromise = fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: prioritySearchQuery,
          search_depth: "advanced",
          max_results: 6,
          topic: "news",
          days: days,
          include_domains: priorityDomains
        }),
      }).then(r => r.json()).catch(() => ({ results: [] }));

      // 2. Global Search
      const globalPromise = fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "advanced",
          max_results: 6,
          topic: "news",
          days: days
          // No include/exclude domains for pure global search as requested
        }),
      }).then(r => r.json()).catch(() => ({ results: [] }));

      const [domesticData, globalData] = await Promise.all([domesticPromise, globalPromise]);

      res.json({ 
        priorityResults: domesticData.results || [],
        globalResults: globalData.results || []
      });
    } catch (error) {
      console.error("Tavily proxy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
