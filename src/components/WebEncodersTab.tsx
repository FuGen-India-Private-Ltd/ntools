import React, { useState, useMemo } from 'react';
import {
  textToHtmlEntities,
  htmlEntitiesToText,
  textToBase64,
  base64ToText,
  textToUrlEncoding,
  urlEncodingToText,
  HtmlEntityMode,
} from '../lib/encoders';
import { CopyButton } from './CopyButton';
import { Globe, Code2, Link, Binary, ArrowRightLeft, Trash2, CheckCircle2 } from 'lucide-react';

export const WebEncodersTab: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'html' | 'base64' | 'url'>('html');
  const [inputText, setInputText] = useState('<div class="header">Hello & Welcome! Café © 2026 🚀</div>');
  const [htmlMode, setHtmlMode] = useState<HtmlEntityMode>('hex');

  // Computed outputs
  const htmlOutput = useMemo(() => textToHtmlEntities(inputText, htmlMode), [inputText, htmlMode]);
  const base64Output = useMemo(() => textToBase64(inputText), [inputText]);
  const urlOutput = useMemo(() => textToUrlEncoding(inputText), [inputText]);

  // Decode states
  const [decodeInput, setDecodeInput] = useState('&lt;div class=&quot;header&quot;&gt;Hello &amp; Welcome! Café &copy; 2026 &#x1F680;&lt;/div&gt;');
  const htmlDecoded = useMemo(() => htmlEntitiesToText(decodeInput), [decodeInput]);
  const base64Decoded = useMemo(() => base64ToText(decodeInput), [decodeInput]);
  const urlDecoded = useMemo(() => urlEncodingToText(decodeInput), [decodeInput]);

  return (
    <div className="space-y-6">
      {/* Tool Selector */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-dock border border-black/10 dark:border-white/15 shadow-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTool('html')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeTool === 'html'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Code2 className="w-4 h-4" />
          HTML Entities
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('base64')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeTool === 'base64'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Binary className="w-4 h-4" />
          Base64 (UTF-8)
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('url')}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
            activeTool === 'url'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Link className="w-4 h-4" />
          URL Percent-Encoding
        </button>
      </div>

      {/* HTML Entities Tool */}
      {activeTool === 'html' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Encoder */}
          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-500" />
                Text ➔ HTML Entities
              </h3>
              <select
                value={htmlMode}
                onChange={(e) => setHtmlMode(e.target.value as HtmlEntityMode)}
                className="text-xs px-2.5 py-1.5 rounded-xl liquid-glass-input text-black dark:text-white cursor-pointer"
              >
                <option value="hex">Hex Entities (&#xHHHH;)</option>
                <option value="dec">Decimal Entities (&#NNNN;)</option>
                <option value="named">Named (&amp;copy;, &amp;lt;)</option>
                <option value="all-hex">Encode All (Hex)</option>
              </select>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to convert to HTML entities..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono focus:ring-2 focus:ring-indigo-500 transition resize-y"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">HTML Output</span>
                <CopyButton text={htmlOutput} label="Copy HTML" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-mono text-xs break-all min-h-[60px] text-indigo-600 dark:text-indigo-300">
                {htmlOutput || <span className="text-black/40 dark:text-white/40 italic">No output</span>}
              </div>
            </div>
          </div>

          {/* Decoder */}
          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              HTML Entities ➔ Decoded Text
            </h3>

            <textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste HTML entities (e.g. &amp;copy; &#x1F600; &lt;b&gt;)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono focus:ring-2 focus:ring-emerald-500 transition resize-y"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">Decoded Text</span>
                <CopyButton text={htmlDecoded} label="Copy Decoded" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-sans text-xs break-words min-h-[60px] text-black dark:text-white">
                {htmlDecoded || <span className="text-black/40 dark:text-white/40 italic">No output</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Base64 Tool */}
      {activeTool === 'base64' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
              <Binary className="w-4 h-4 text-blue-500" />
              Text (UTF-8) ➔ Base64
            </h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to encode to Base64..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono focus:ring-2 focus:ring-blue-500 transition resize-y"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">Base64 Output</span>
                <CopyButton text={base64Output} label="Copy Base64" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-mono text-xs break-all min-h-[60px] text-emerald-600 dark:text-emerald-400">
                {base64Output || <span className="text-black/40 dark:text-white/40 italic">No output</span>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              Base64 ➔ Decoded Text
            </h3>
            <textarea
              value={base64Output}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste Base64 string..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono focus:ring-2 focus:ring-emerald-500 transition resize-y"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">Decoded Text</span>
                <CopyButton text={base64Decoded.text} label="Copy Decoded" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-sans text-xs break-words min-h-[60px] text-black dark:text-white">
                {base64Decoded.error ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">{base64Decoded.error}</span>
                ) : (
                  base64Decoded.text || <span className="text-black/40 dark:text-white/40 italic">No output</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL Tool */}
      {activeTool === 'url' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
              <Link className="w-4 h-4 text-cyan-500" />
              Text ➔ URL Percent-Encoding
            </h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text/URI to encode..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono focus:ring-2 focus:ring-cyan-500 transition resize-y"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">URL Encoded Output</span>
                <CopyButton text={urlOutput} label="Copy URL" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-mono text-xs break-all min-h-[60px] text-cyan-600 dark:text-cyan-300">
                {urlOutput || <span className="text-black/40 dark:text-white/40 italic">No output</span>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl liquid-glass-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              URL Percent-Encoded ➔ Decoded Text
            </h3>
            <textarea
              value={urlOutput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste URL encoded string..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-xs font-mono transition resize-y"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">Decoded Text</span>
                <CopyButton text={urlDecoded.text} label="Copy Decoded" />
              </div>
              <div className="p-3.5 rounded-2xl liquid-glass-card font-sans text-xs break-words min-h-[60px] text-black dark:text-white">
                {urlDecoded.error ? (
                  <span className="text-black/80 dark:text-white/80 font-semibold px-2 py-1 rounded-lg bg-black/10 dark:bg-white/15 border border-black/20 dark:border-white/20">{urlDecoded.error}</span>
                ) : (
                  urlDecoded.text || <span className="text-black/40 dark:text-white/40 italic">No output</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
