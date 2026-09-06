import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { EmailRecord } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';
import { Search, Sparkles, ExternalLink, Loader2 } from 'lucide-react';

export const EmailSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmailRecord[]>([]);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.emails.search(query.trim());
      setResults(res.results);
      setSearchSource(res.source);
      setHasSearched(true);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSearchSource(null);
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm my-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Elasticsearch Full-Text Search</h4>
            <p className="text-xs text-gray-500">Fast indexing across recipient, subject, body, and status</p>
          </div>
        </div>

        {searchSource && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Engine: {searchSource === 'elasticsearch' ? '⚡ Elasticsearch' : '💾 Database Fallback'}
          </span>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all emails (e.g. 'john@acme.com', 'demo', 'failed')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Search</span>
        </button>

        {hasSearched && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition-all"
          >
            Clear
          </button>
        )}
      </form>

      {/* Results view */}
      {hasSearched && (
        <div className="pt-2 border-t border-gray-100">
          {results.length === 0 ? (
            <p className="text-xs text-gray-500 py-3 text-center">No indexed emails match "{query}".</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-[11px] text-gray-400 font-medium">Found {results.length} matching email(s):</p>
              {results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 text-xs hover:bg-gray-100/70 transition-colors"
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <p className="font-semibold text-gray-900 truncate">{item.subject}</p>
                    <p className="text-gray-500 truncate">To: {item.recipient}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={item.status} />
                    {item.etherealPreviewUrl && (
                      <a
                        href={item.etherealPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50"
                        title="View in Ethereal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
