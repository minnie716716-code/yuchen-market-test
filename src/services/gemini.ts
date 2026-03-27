import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsArticle {
  titleEn: string;
  titleZh: string;
  url: string;
  source: string;
  analysis: string;
  category: 'priority' | 'global';
}

export interface SearchResult {
  summary: string;
  articles: NewsArticle[];
}

export type TimeRange = 'day' | 'week' | 'month';

async function fetchTavilyNews(query: string, timeRange: TimeRange): Promise<{ priorityResults: any[], globalResults: any[] }> {
  try {
    const response = await fetch("/api/search/tavily", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        timeRange: timeRange
      }),
    });

    if (!response.ok) {
      console.error("Tavily API error:", await response.text());
      return { priorityResults: [], globalResults: [] };
    }

    const data = await response.json();
    return {
      priorityResults: data.priorityResults || [],
      globalResults: data.globalResults || []
    };
  } catch (error) {
    console.error("Error fetching from Tavily:", error);
    return { priorityResults: [], globalResults: [] };
  }
}

export async function searchPaymentNews(query: string, timeRange: TimeRange = 'week'): Promise<SearchResult> {
  const timePrompt = {
    day: "past 24 hours",
    week: "past 7 days",
    month: "past 30 days"
  }[timeRange];

  // 1. Fetch raw news from Tavily (Categorized)
  const { priorityResults, globalResults } = await fetchTavilyNews(query, timeRange);
  
  // 2. Remove duplicates from global results if they are in priority results
  const priorityUrls = new Set(priorityResults.map(r => r.url));
  const uniqueGlobalResults = globalResults.filter(r => !priorityUrls.has(r.url));

  // 3. Prepare context for Gemini
  const context = `
    Current Date: ${new Date().toISOString().split('T')[0]}
    
    Here are the news results for "${query}" from two sources:
    
    [PRIORITY SOURCES (mpaypass.com.cn, chinanews.com, cls.cn)]:
    ${priorityResults.map((r, i) => `[P${i+1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n')}
    
    [GLOBAL SOURCES]:
    ${uniqueGlobalResults.map((r, i) => `[G${i+1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${context}
      
      Based on the above information, provide a structured analysis:
      1. For each news item, provide:
         - Original English Title
         - Accurate Chinese Title
         - The direct URL
         - A concise summary and professional analysis (one paragraph)
         - The CATEGORY: MUST be 'priority' if it came from the priority list, or 'global' if it came from the global list.
      
      2. Provide an overall executive summary.
      
      STRICT REQUIREMENTS:
      - TIME RANGE: ONLY include news from the ${timePrompt} (Current date: ${new Date().toISOString().split('T')[0]}). DISCARD any results older than this range.
      - CATEGORIZATION: You MUST correctly assign the 'category' field for each article.
      - DUPLICATES: Ensure there are no duplicate articles by URL.
      
      Language: Chinese (Simplified) for the analysis and titles.`,
      config: {
        systemInstruction: `You are a senior financial news analyst specializing in the Chinese and global payment industry. 
        Your task is to analyze news and provide structured intelligence.
        Language: Chinese (Simplified) for the analysis and titles.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Overall executive summary." },
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  titleEn: { type: Type.STRING },
                  titleZh: { type: Type.STRING },
                  url: { type: Type.STRING },
                  source: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['priority', 'global'] }
                },
                required: ["titleEn", "titleZh", "url", "analysis", "category"]
              }
            }
          },
          required: ["summary", "articles"]
        }
      },
    });

    const data = JSON.parse(response.text);
    
    // Enrich with source information
    if (data.articles) {
      data.articles = data.articles.map((article: any) => {
        if (article.url && article.url.startsWith('http') && !article.source) {
          try {
            article.source = new URL(article.url).hostname.replace('www.', '');
          } catch (e) {
            article.source = "News Source";
          }
        }
        return article;
      });
    }

    return data as SearchResult;
  } catch (error) {
    console.error("Error searching news:", error);
    throw error;
  }
}
