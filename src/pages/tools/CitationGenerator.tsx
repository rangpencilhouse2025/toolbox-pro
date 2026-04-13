import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Quote, Copy, RotateCcw, Book, Globe, FileText } from 'lucide-react';
import { db } from '../../firebase';
import { UserProfile, AppSettings } from '../../types';
import ToolAdWrapper from '../../components/ToolAdWrapper';
import { motion } from 'motion/react';

type SourceType = 'book' | 'website' | 'journal';
type CitationStyle = 'APA' | 'MLA' | 'Chicago';

export default function CitationGenerator({ profile }: { profile: UserProfile | null, settings: AppSettings | null }) {
  const [type, setType] = useState<SourceType>('book');
  const [style, setStyle] = useState<CitationStyle>('APA');
  const [formData, setFormData] = useState({
    author: '',
    title: '',
    publisher: '',
    year: '',
    url: '',
    journalTitle: '',
    volume: '',
    issue: '',
    pages: '',
    accessDate: new Date().toLocaleDateString()
  });
  const [citation, setCitation] = useState('');

  const generateCitation = async () => {
    if (!formData.author || !formData.title) {
      toast.error("Author and Title are required");
      return;
    }

    let result = '';
    const { author, title, publisher, year, url, journalTitle, volume, issue, pages, accessDate } = formData;

    if (style === 'APA') {
      if (type === 'book') {
        result = `${author}. (${year}). ${title}. ${publisher}.`;
      } else if (type === 'website') {
        result = `${author}. (${year}). ${title}. Retrieved from ${url}`;
      } else if (type === 'journal') {
        result = `${author}. (${year}). ${title}. ${journalTitle}, ${volume}(${issue}), ${pages}.`;
      }
    } else if (style === 'MLA') {
      if (type === 'book') {
        result = `${author}. ${title}. ${publisher}, ${year}.`;
      } else if (type === 'website') {
        result = `${author}. "${title}." ${publisher || 'N.p.'}, ${year}. Web. ${accessDate}. <${url}>.`;
      } else if (type === 'journal') {
        result = `${author}. "${title}." ${journalTitle} ${volume}.${issue} (${year}): ${pages}.`;
      }
    } else if (style === 'Chicago') {
      if (type === 'book') {
        result = `${author}. ${title}. ${publisher}, ${year}.`;
      } else if (type === 'website') {
        result = `${author}. "${title}." Last modified ${year}. ${url}.`;
      } else if (type === 'journal') {
        result = `${author}. "${title}." ${journalTitle} ${volume}, no. ${issue} (${year}): ${pages}.`;
      }
    }

    setCitation(result);
    toast.success("Citation generated!");

    // Update usage count (skip for admins)
    if (profile && profile.role !== 'admin') {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          usageCount: increment(1),
          lastUsedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating usage:", error);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(citation);
    toast.success("Copied to clipboard!");
  };

  const reset = () => {
    setFormData({
      author: '',
      title: '',
      publisher: '',
      year: '',
      url: '',
      journalTitle: '',
      volume: '',
      issue: '',
      pages: '',
      accessDate: new Date().toLocaleDateString()
    });
    setCitation('');
  };

  return (
    <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto w-full px-4">
      <ToolAdWrapper position="tool_top" />
      
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Quote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Citation Generator</h1>
            <p className="text-gray-500 text-sm">Create accurate citations in APA, MLA, or Chicago style.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
              {(['book', 'website', 'journal'] as SourceType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t === 'book' && <Book className="w-3 h-3" />}
                  {t === 'website' && <Globe className="w-3 h-3" />}
                  {t === 'journal' && <FileText className="w-3 h-3" />}
                  {t}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Style</label>
                  <select 
                    value={style}
                    onChange={(e) => setStyle(e.target.value as CitationStyle)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="APA">APA (7th Ed.)</option>
                    <option value="MLA">MLA (9th Ed.)</option>
                    <option value="Chicago">Chicago</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Year</label>
                  <input
                    type="text"
                    placeholder="2024"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Author(s)</label>
                <input
                  type="text"
                  placeholder="e.g. Smith, J."
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                <input
                  type="text"
                  placeholder="e.g. The Future of AI"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              {type === 'book' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Publisher</label>
                  <input
                    type="text"
                    placeholder="e.g. Oxford Press"
                    value={formData.publisher}
                    onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              )}

              {type === 'website' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              )}

              {type === 'journal' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Journal Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Nature"
                      value={formData.journalTitle}
                      onChange={(e) => setFormData({...formData, journalTitle: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Vol.</label>
                      <input
                        type="text"
                        value={formData.volume}
                        onChange={(e) => setFormData({...formData, volume: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Issue</label>
                      <input
                        type="text"
                        value={formData.issue}
                        onChange={(e) => setFormData({...formData, issue: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Pages</label>
                      <input
                        type="text"
                        placeholder="12-24"
                        value={formData.pages}
                        onChange={(e) => setFormData({...formData, pages: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={reset}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={generateCitation}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Generate Citation
              </button>
            </div>
          </div>

          <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-100 p-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Generated Citation</h2>
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              {citation ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 w-full"
                >
                  <div className="p-6 bg-white rounded-xl border border-indigo-100 text-gray-800 text-sm italic leading-relaxed shadow-sm">
                    {citation}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Citation
                  </button>
                </motion.div>
              ) : (
                <div className="text-gray-300">
                  <Quote className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm">Fill in the details to generate your citation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToolAdWrapper position="tool_bottom" />
    </div>
  );
}
