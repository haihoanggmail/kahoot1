import React, { useState } from 'react';
import { TECHNICAL_DOCS } from '../../data/technicalArchitecture';
import { 
  FileCode2, Database, Network, ShieldCheck, 
  FolderTree, Terminal, Calendar, Copy, Check, 
  Download, ExternalLink, Zap
} from 'lucide-react';

export const TechnicalBlueprint: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState('architecture');
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  const activeDoc = TECHNICAL_DOCS.find((d) => d.id === activeSectionId) || TECHNICAL_DOCS[0];

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navTabs = [
    { id: 'architecture', label: '1. Kiến trúc Tổng quan', icon: Network },
    { id: 'database', label: '2. Database Schema D1', icon: Database },
    { id: 'api-specs', label: '3. API & WebSockets 50p', icon: Zap },
    { id: 'source-structure', label: '4. Kiểm kê Source Code', icon: FolderTree },
    { id: 'github-cloudflare', label: '5. GitHub & Cloudflare CI/CD', icon: Terminal },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
          <FileCode2 className="w-4 h-4" />
          <span>Hồ sơ Thiết kế Kỹ thuật & Triển khai (Engineering Runbook)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Thiết kế Kỹ thuật & Triển khai HACHIHI Quiz
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Tài liệu kỹ thuật hoàn chỉnh: GitHub Repository, CI/CD Actions tự động, Cloudflare Pages + Workers + D1, D1 Migrations có phiên bản, và phân tích chi phí gói Free Tier 0đ.
        </p>
      </div>

      {/* Main Layout: Tabs + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Menu */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm space-y-1 transition-colors">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSectionId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSectionId(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Download Artifacts Card */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200 transition-colors">
            <div className="font-bold mb-1 flex items-center gap-1.5 text-indigo-950 dark:text-white">
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Tải file triển khai (DevOps)</span>
            </div>
            <p className="text-indigo-700/90 dark:text-indigo-300/80 text-[11px] mb-3 leading-relaxed">
              Tải sẵn cấu hình GitHub Actions, Cloudflare và file SQL schema để triển khai ngay:
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  const dbDoc = TECHNICAL_DOCS.find((d) => d.id === 'database');
                  if (dbDoc && dbDoc.codeBlocks?.[0]) {
                    downloadFile('schema.sql', dbDoc.codeBlocks[0].code);
                  }
                }}
                className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-semibold rounded-lg text-[11px] flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span>schema.sql (D1)</span>
                <Download className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              <button
                onClick={() => {
                  const archDoc = TECHNICAL_DOCS.find((d) => d.id === 'architecture');
                  if (archDoc && archDoc.codeBlocks?.[0]) {
                    downloadFile('wrangler.toml', archDoc.codeBlocks[0].code);
                  }
                }}
                className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-semibold rounded-lg text-[11px] flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span>wrangler.toml</span>
                <Download className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              <button
                onClick={() => {
                  const ghDoc = TECHNICAL_DOCS.find((d) => d.id === 'github-cloudflare');
                  if (ghDoc && ghDoc.codeBlocks?.[0]) {
                    downloadFile('deploy.yml', ghDoc.codeBlocks[0].code);
                  }
                }}
                className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-semibold rounded-lg text-[11px] flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span>deploy.yml (GitHub Actions)</span>
                <Download className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            {/* Header of Section */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                  {activeDoc.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {activeDoc.title}
                </h2>
              </div>
            </div>

            {/* Summary Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 mb-6 font-medium leading-relaxed">
              {activeDoc.summary}
            </div>

            {/* Main Markdown / Text Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-4">
              {activeDoc.content.split('\n\n').map((paragraph, pIdx) => {
                if (paragraph.startsWith('###')) {
                  return (
                    <h3 key={pIdx} className="text-sm font-bold text-slate-900 dark:text-white mt-6 mb-2">
                      {paragraph.replace(/^###\s*/, '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('```')) {
                  const cleanText = paragraph.replace(/```[a-z]*\n?/g, '');
                  return (
                    <pre
                      key={pIdx}
                      className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800"
                    >
                      {cleanText}
                    </pre>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n- ');
                  return (
                    <ul key={pIdx} className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                      {items.map((item, itemIdx) => (
                        <li key={itemIdx}>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: item
                                .replace(/^- /, '')
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-white">$1</strong>')
                                .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-mono">$1</code>'),
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p
                    key={pIdx}
                    className="text-slate-600 dark:text-slate-300"
                    dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-white">$1</strong>')
                        .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded font-mono">$1</code>'),
                    }}
                  />
                );
              })}
            </div>

            {/* Code Blocks if present */}
            {activeDoc.codeBlocks && activeDoc.codeBlocks.length > 0 && (
              <div className="mt-8 space-y-6">
                {activeDoc.codeBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg"
                  >
                    <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 font-semibold">
                        {block.filename}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyCode(block.code, block.filename)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedCodeKey === block.filename ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => downloadFile(block.filename, block.code)}
                          className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Tải file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-96">
                      <code>{block.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
