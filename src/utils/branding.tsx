import React from 'react';

/**
 * Utility to parse strings with color tags or specific word highlighting.
 */
export const renderStyledBranding = (text: string, highlightWord?: string, highlightColor?: string) => {
  if (!text) return null;

  // 1. Specific Word Highlighting (Priority)
  if (highlightWord && text.toLowerCase().includes(highlightWord.toLowerCase())) {
    const regex = new RegExp(`(${highlightWord})`, 'gi');
    const segments = text.split(regex);
    
    let className = 'text-blue-600';
    switch (highlightColor) {
      case 'primary': className = 'text-blue-600'; break;
      case 'success': className = 'text-emerald-500'; break;
      case 'alert': className = 'text-red-500'; break;
      case 'warning': className = 'text-amber-500'; break;
      default: className = 'text-blue-600';
    }

    return segments.map((segment, i) => {
      if (segment.toLowerCase() === highlightWord.toLowerCase()) {
        return <span key={i} className={`${className} font-black`}>{segment}</span>;
      }
      return segment;
    });
  }

  // 2. Tag Parsing {tag}content{/tag} or [tag]content[/tag]
  const tagRegex = /[{\[](\w+)[}\]](.*?)[{\[]\/\1[}\]]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...autoHighlightMY(text.substring(lastIndex, match.index)));
    }

    const tag = match[1].toLowerCase();
    const content = match[2];
    let className = 'text-blue-600';
    
    switch (tag) {
      case 'primary': case 'blue': className = 'text-blue-600'; break;
      case 'success': case 'green': className = 'text-emerald-500'; break;
      case 'alert': case 'red': className = 'text-red-500'; break;
      case 'warning': case 'amber': className = 'text-amber-500'; break;
    }

    parts.push(<span key={match.index} className={`${className} font-black`}>{content}</span>);
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(...autoHighlightMY(text.substring(lastIndex)));
  }

  return parts.length > 0 ? parts : text;
};

const autoHighlightMY = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const myRegex = /(MY)/g;
  let lastIdx = 0;
  let myMatch;

  while ((myMatch = myRegex.exec(text)) !== null) {
    if (myMatch.index > lastIdx) {
      parts.push(text.substring(lastIdx, myMatch.index));
    }
    parts.push(<span key={`my-${myMatch.index}`} className="text-blue-600 font-black">MY</span>);
    lastIdx = myRegex.lastIndex;
  }
  
  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }
  
  return parts.length > 0 ? parts : [text];
};
