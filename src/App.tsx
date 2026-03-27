/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Loader2, ExternalLink, TrendingUp, ShieldAlert, Building2, ChevronRight, RefreshCw, Calendar, AlertTriangle } from 'lucide-react';
import Markdown from 'react-markdown';
import { searchPaymentNews, SearchResult, TimeRange } from './services/gemini';
import { cn } from './lib/utils';

interface Category {
  id: string;
  name: string;
  items: string[] | { name: string; query: string }[];
}

const CATEGORIES: Category[] = [
  {
    id: 'company',
    name: '第一类：公司层面（品牌主词）',
    items: ["Visa / VISA / 维萨", "全球数字支付公司"]
  },
  {
    id: 'business',
    name: '第二类：Visa商务卡及资金流业务',
    items: [
      "Visa 商务卡", "Visa 商务支付", "Visa Direct", "Visa B2B Connect", 
      "Visa Commercial Pay", "Visa Cross-Border Solutions", 
      "Visa 企业差旅和公务接待（T&E）", "Visa 企业采购", "Visa 供应链支付"
    ]
  },
  {
    id: 'vas',
    name: '第三类：Visa增值服务（VAS）',
    items: [
      "Visa Consulting + Analytics", "Visa分析平台/支付洞察", 
      "Visa商务数据服务", "品牌出海Visa定制", "Visa消费洞察/客群画像"
    ]
  },
  {
    id: 'marketing',
    name: '第四类：赞助、营销与品牌活动',
    items: [
      "Visa奥运合作伙伴", "Visa赞助", "Visa奥运会", "Visa时尚", 
      "Visa上海时装周", "Visa F1", "Visa Blackpink", "Visa链博会"
    ]
  },
  {
    id: 'corp_comm',
    name: '第五类：企业传播与形象词',
    items: [
      "Visa企业社会责任", "Visa ESG", "Visa创新中心", "Visa高管", 
      "Visa大中华区总裁", "Visa中国区总裁", "Visa张文祥", "Visa尹小龙", 
      "Visa专访", "Visa在华发展"
    ]
  },
  {
    id: 'competitors',
    name: '第六类：竞品关键词（Competitor）',
    items: [
      "Mastercard/万事达卡", "American Express/美国运通", "银联/China UnionPay/银联国际", 
      "支付宝/Alipay", "微信支付/Wechat pay", "数字人民币/e-CNY", 
      "PingPong", "Airwallex", "连连支付", "Stripe", "Paypal中国"
    ]
  },
  {
    id: 'industry',
    name: '第七类：行业关键词',
    items: [
      { name: "金融监管政策", query: "金融监管政策 (跨境支付监管、外汇管理、反洗钱、数据出境、个人信息保护法、支付条例、知识产权)" },
      { name: "经贸与地缘政治", query: "经贸与地缘政治 (中美关系、外资在华、支付安全)" },
      { name: "行业趋势与机遇", query: "行业趋势与机遇 (金融普惠、金融教育、稳定币、数字货币 CBDC、跨境电商、人民币结算、支付行业开放)" },
      { name: "行业风险", query: "行业风险 (国家安全、垄断调查、消费者保护运动)" }
    ]
  },
  {
    id: 'alerts',
    name: '第八类：系统预警',
    items: [
      { 
        name: "Visa/维萨 负面风险监测", 
        query: "Visa/维萨 (抵制、反对、担忧、损失、限制、盗刷、垄断、监管、牌照、中国市场、支付清算、货币转换费、倒退、叫停、强制、隐形收费、投诉、诱导、误导、停发、政策、违规、泄露、套路、不满、虚假风险、漏洞、退出市场、降级、过时、欺诈、欺骗、欺瞒、隐瞒、催收、不审慎、黑产、泄漏隐私、被罚、私自开通、冒用身份、夸大、缩水、停止、诈骗、伪卡交易、数据泄露、系统漏洞、黑客攻击、高额年费、隐藏费用、乱扣费、服务态度恶劣、客服不作、投诉无果、高利贷、利率飙升、利率欺诈、还款难、逾期罚息、催收骚扰、信用降级、信用污点、影响征信、政策陷阱、政策突变、限制消费、交易失败、无法支付、系统瘫痪、法律诉讼、法律纠纷、侵权纠纷、被起诉、拒批、拒绝提现、服务受限、口碑下滑、用户不满、虚假宣传、征信黑点、黑榜、违规办理、办卡套路、私自扣费、强行扣费、被分期、恶意扣费、投诉量、隐患)" 
      },
      {
        name: "Visa + 银行 + 双标/双币 监测",
        query: "Visa (招行、招商银行、交行、交通银行、中行、中国银行、农行、中国农业银行、民生、民生银行、工行、工商银行、光大、光大银行、广发银行、广发、华夏银行、建设银行、建行、平安银行、浦发、浦发银行、兴业、兴业银行、中信、中信银行) (双标、双币)"
      }
    ]
  }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchPaymentNews(searchTerm, timeRange);
      setResult(data);
    } catch (err) {
      setError("搜索失败，请稍后重试。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onKeywordClick = (item: string | { name: string; query: string }) => {
    const q = typeof item === 'string' ? item : item.query;
    setQuery(q);
    handleSearch(q);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 p-6 flex justify-between items-center bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-visa-blue flex items-center justify-center text-white font-serif font-bold text-xl">V</div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-visa-blue">Visa MarketSentinel</h1>
            <p className="text-[10px] text-visa-blue font-bold uppercase tracking-widest mt-0.5">Global Intelligence & Risk Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 gap-2 rounded-md">
            <Calendar className="w-4 h-4 text-visa-blue opacity-60" />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="text-xs font-semibold focus:outline-none bg-transparent cursor-pointer text-slate-700"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search custom keywords..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-visa-blue focus:ring-1 focus:ring-visa-blue transition-all w-64 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            />
          </div>
          <button 
            onClick={() => handleSearch(query)}
            disabled={loading || !query}
            className="px-6 py-2 bg-visa-blue text-white text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-30 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Independent Scroll */}
        <aside className="w-96 border-r border-slate-200 overflow-y-auto p-6 bg-white shrink-0">
          <div className="space-y-8">
            {CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  {cat.id === 'alerts' ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Building2 className="w-4 h-4 text-visa-blue opacity-60" />}
                  <h2 className="text-[11px] font-bold text-visa-blue uppercase tracking-wider">{cat.name}</h2>
                </div>
                <div className="space-y-0.5">
                  {cat.items.map((item, idx) => {
                    const label = typeof item === 'string' ? item : item.name;
                    return (
                      <button
                        key={idx}
                        onClick={() => onKeywordClick(item)}
                        className="w-full text-left px-3 py-2 text-[13px] text-slate-600 hover:bg-visa-blue/5 hover:text-visa-blue rounded-md transition-all flex justify-between items-center group"
                      >
                        <span className="truncate">{label}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-visa-blue opacity-60" />
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intelligence Status</h2>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              <p>ENGINE: GEMINI-3-FLASH</p>
              <p>SEARCH: TAVILY NEWS API</p>
              <p>THEME: BLUE_WHITE_PROFESSIONAL</p>
            </div>
          </div>
        </aside>

        {/* Content Area - Independent Scroll */}
        <section className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {!result && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Search className="w-10 h-10 text-visa-blue" />
              </div>
              <h3 className="text-2xl font-serif italic text-visa-blue">Select a monitoring category</h3>
              <p className="text-sm mt-2 text-slate-600">Tracking global footprint and industry dynamics</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="relative w-16 h-16 mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-visa-blue opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-visa-blue rounded-full animate-ping" />
                </div>
              </div>
              <h3 className="text-2xl font-serif italic text-visa-blue animate-pulse">Scanning global sources...</h3>
              <p className="text-sm mt-2 text-slate-500">Performing deep search and structured analysis</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center text-center text-red-600">
              <ShieldAlert className="w-16 h-16 mb-6 opacity-30" />
              <h3 className="text-2xl font-serif italic">{error}</h3>
              <button 
                onClick={() => handleSearch(query)}
                className="mt-6 px-6 py-2 bg-red-50 text-red-600 rounded-md text-sm font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            </div>
          )}

          {result && !loading && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-xs font-bold text-visa-blue uppercase tracking-widest">Executive Summary</h2>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Range: {timeRange}</span>
                </div>
                <div className="markdown-body text-lg leading-relaxed text-slate-800">
                  <Markdown>{result.summary}</Markdown>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-xs font-bold text-visa-blue uppercase tracking-widest">Detailed Intelligence</h2>
                  <span className="text-[10px] font-mono text-slate-400">{result.articles.length} REPORTS FOUND</span>
                </div>
                
                <div className="space-y-8">
                  {result.articles
                    .sort((a, b) => (a.category === 'priority' ? -1 : 1))
                    .map((article, idx) => (
                    <div key={idx} className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-visa-blue/30 transition-all">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              article.category === 'priority' 
                                ? "text-visa-blue bg-visa-blue/5" 
                                : "text-slate-500 bg-slate-100"
                            )}>
                              {article.category === 'priority' ? "重点来源" : "其他来源"}
                            </span>
                            {article.source && <span className="text-[10px] font-mono text-slate-400 uppercase">{article.source}</span>}
                          </div>
                          <h4 className="text-xl font-serif font-bold leading-tight text-visa-blue group-hover:opacity-80 transition-colors">
                            {article.titleZh}
                          </h4>
                          <h5 className="text-sm font-medium text-slate-500 italic">
                            {article.titleEn}
                          </h5>
                        </div>
                        {article.url && (
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-slate-50 text-slate-400 hover:bg-visa-blue hover:text-white rounded-md transition-all border border-slate-200"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-lg border-l-4 border-visa-blue">
                        <p className="text-[15px] leading-relaxed text-slate-700">
                          {article.analysis}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 p-4 bg-white text-[10px] flex justify-between items-center font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>VISA MARKET SENTINEL / V-SERIES INTEL</span>
        </div>
        <div className="flex gap-6">
          <span>REGION: GLOBAL</span>
          <span>STATUS: OPERATIONAL</span>
          <span>SYNC: REAL-TIME</span>
        </div>
      </footer>
    </div>
  );
}
