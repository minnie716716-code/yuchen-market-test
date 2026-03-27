import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NewsArticle {
  titleEn: string;
  titleZh: string;
  url: string;
  source: string;
  analysis: string;
}

export interface SearchResult {
  summary: string;
  articles: NewsArticle[];
}

export type TimeRange = 'day' | 'week' | 'month';

export async function searchPaymentNews(query: string, timeRange: TimeRange = 'week'): Promise<SearchResult> {
  const timePrompt = {
    day: "past 24 hours",
    week: "past 7 days",
    month: "past 30 days"
  }[timeRange];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for the latest news related to: "${query}" from the ${timePrompt}. 
      
      For each relevant news item found, provide:
      1. Original English Title (if available, otherwise translate to English)
      2. Accurate Chinese Title
      3. A concise summary and professional analysis (one paragraph)
      
      Also provide an overall executive summary of the situation.
      Focus on the payment industry, regulatory implications, and strategic impact.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a senior financial news analyst. Your output must be structured and professional.
        Return the results in a clear format. For each article, clearly separate the English Title, Chinese Title, and the Summary+Analysis.
        Language: Chinese (Simplified) for the analysis and titles.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Overall executive summary of the search results." },
            articles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  titleEn: { type: Type.STRING },
                  titleZh: { type: Type.STRING },
                  url: { type: Type.STRING },
                  source: { type: Type.STRING },
                  analysis: { type: Type.STRING, description: "One paragraph summary and professional analysis." }
                },
                required: ["titleEn", "titleZh", "url", "analysis"]
              }
            }
          },
          required: ["summary", "articles"]
        }
      },
    });

    const data = JSON.parse(response.text);
    
    // Enrich with source information from grounding metadata if possible
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && data.articles) {
      data.articles = data.articles.map((article: any, index: number) => {
        // Try to find a matching URL in grounding chunks if the model didn't provide a good one
        if (!article.url || article.url.startsWith('http')) {
          const chunk = groundingChunks.find((c: any) => c.web && (c.web.title?.includes(article.titleEn) || c.web.title?.includes(article.titleZh)));
          if (chunk?.web) {
            article.url = chunk.web.uri;
            article.source = new URL(chunk.web.uri).hostname;
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
