import React, { useEffect, useRef } from 'react';

interface HtmlRendererProps {
  html: string;
  className?: string;
  key?: React.Key;
}

export default function HtmlRenderer({ html, className }: HtmlRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !html) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Polyfill document.write for the duration of this script execution
    // This is crucial for ad networks like Adsterra that use document.write
    const originalWrite = document.write;
    const originalWriteln = document.writeln;

    let capturedHtml = '';
    document.write = (content: string) => {
      capturedHtml += content;
    };
    document.writeln = (content: string) => {
      capturedHtml += content + '\n';
    };

    try {
      const range = document.createRange();
      const fragment = range.createContextualFragment(html);
      
      // Extract scripts to handle them manually
      const scripts = Array.from(fragment.querySelectorAll('script'));
      scripts.forEach(s => s.parentNode?.removeChild(s));
      
      // Append the non-script parts first
      container.appendChild(fragment);

      // Execute each script
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }
        
        container.appendChild(newScript);
      });

      // If document.write captured anything (like an iframe or another script), render it
      if (capturedHtml) {
        const capturedFragment = range.createContextualFragment(capturedHtml);
        container.appendChild(capturedFragment);
        
        // Handle nested scripts in captured HTML
        const nestedScripts = Array.from(capturedFragment.querySelectorAll('script'));
        nestedScripts.forEach(ns => {
          const s = document.createElement('script');
          if (ns.src) s.src = ns.src;
          if (ns.innerHTML) s.innerHTML = ns.innerHTML;
          container.appendChild(s);
        });
      }
    } catch (e) {
      console.error('Error rendering HTML/Script:', e);
    } finally {
      // Restore original document.write
      document.write = originalWrite;
      document.writeln = originalWriteln;
    }
  }, [html]);

  return (
    <div 
      ref={containerRef} 
      className={className}
    />
  );
}
