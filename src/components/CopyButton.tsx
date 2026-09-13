import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = '',
  label = 'Copy',
  iconOnly = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        copied
          ? 'liquid-glass-accent shadow-sm'
          : 'liquid-glass-btn text-slate-700 dark:text-slate-300 shadow-sm'
      } ${className}`}
      title={copied ? 'Copied to clipboard!' : label}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 animate-in zoom-in-50 duration-150" />
          {!iconOnly && <span className="font-semibold">Copied!</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 opacity-80" />
          {!iconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
