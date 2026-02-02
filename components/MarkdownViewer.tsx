
import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

interface MarkdownViewerProps {
  content: string;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Check if content height exceeds a threshold (e.g., 100px)
      setIsOverflowing(contentRef.current.scrollHeight > 120);
    }
  }, [content]);

  // Reset expansion when content changes (new question selected)
  useEffect(() => {
    setIsExpanded(false);
  }, [content]);

  const getHtml = () => {
    try {
      return marked.parse(content || '');
    } catch (e) {
      return content;
    }
  };

  return (
    <div className="relative">
      <div 
        ref={contentRef}
        className={`markdown-body text-xs text-gray-500 transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-[1000px]' : 'max-h-[100px]'
        }`}
        dangerouslySetInnerHTML={{ __html: getHtml() as string }}
      />
      
      {isOverflowing && (
        <div className={`flex justify-center mt-1 ${!isExpanded ? 'absolute bottom-0 left-0 right-0 pt-8 bg-gradient-to-t from-white via-white/80 to-transparent' : ''}`}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-black text-pink-400 hover:text-pink-500 uppercase tracking-widest flex items-center gap-1 bg-pink-50/80 px-3 py-1 rounded-full hover:bg-pink-100 transition-colors backdrop-blur-sm"
          >
            {isExpanded ? (
              <>Show Less <span className="transform rotate-180">▼</span></>
            ) : (
              <>Read More <span>▼</span></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MarkdownViewer;
