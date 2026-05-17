import React from "react";

export function renderMarkdown(markdownText: string): React.ReactNode[] {
  if (!markdownText) return [];

  const lines = markdownText.split("\n");
  let inList = false;
  let listItems: React.ReactNode[] = [];
  const parsedNodes: React.ReactNode[] = [];

  const parseInlineStyles = (text: string): React.ReactNode => {
    // Basic bold **text** parsing
    const boldRegex = /\*\*(.*?)\*\*/g;
    const codeRegex = /`(.*?)`/g;
    
    const elements: React.ReactNode[] = [];
    
    // Combine regex to split and parse inline formatting
    const parts: { type: "text" | "bold" | "code"; content: string; index: number }[] = [];
    
    // Find all bold occurrences
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      parts.push({ type: "bold", content: match[1], index: match.index });
    }
    
    // Find all code occurrences
    codeRegex.lastIndex = 0;
    while ((match = codeRegex.exec(text)) !== null) {
      parts.push({ type: "code", content: match[1], index: match.index });
    }
    
    // Sort matches by index
    parts.sort((a, b) => a.index - b.index);
    
    // Reconstruct with React elements
    let currentIdx = 0;
    for (const part of parts) {
      if (part.index < currentIdx) continue; // skip overlapping
      
      // Add plain text before match
      if (part.index > currentIdx) {
        elements.push(text.substring(currentIdx, part.index));
      }
      
      if (part.type === "bold") {
        elements.push(
          <strong key={part.index} className="font-extrabold text-white">
            {part.content}
          </strong>
        );
        currentIdx = part.index + part.content.length + 4; // **content** is length + 4
      } else if (part.type === "code") {
        elements.push(
          <code key={part.index} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 text-sky-400 font-mono text-xs">
            {part.content}
          </code>
        );
        currentIdx = part.index + part.content.length + 2; // `content` is length + 2
      }
    }
    
    if (currentIdx < text.length) {
      elements.push(text.substring(currentIdx));
    }
    
    return <>{elements.length > 0 ? elements : text}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // End list if we hit a non-list item
    if (inList && !line.startsWith("-") && !line.startsWith("*") && line !== "") {
      parsedNodes.push(
        <ul key={`list-${i}`} className="list-disc list-inside pl-5 space-y-1.5 my-4 text-slate-350 text-sm">
          {listItems}
        </ul>
      );
      inList = false;
      listItems = [];
    }

    // Headers
    if (line.startsWith("# ")) {
      parsedNodes.push(
        <h1 key={i} className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight mt-8 mb-4 pb-2 border-b border-slate-900">
          {parseInlineStyles(line.substring(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      parsedNodes.push(
        <h2 key={i} className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-6 mb-3">
          {parseInlineStyles(line.substring(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      parsedNodes.push(
        <h3 key={i} className="font-display text-base sm:text-lg font-bold text-sky-400 tracking-tight mt-5 mb-2.5">
          {parseInlineStyles(line.substring(4))}
        </h3>
      );
    }
    // Blockquotes
    else if (line.startsWith("> ")) {
      parsedNodes.push(
        <blockquote key={i} className="pl-4 border-l-4 border-sky-500 bg-sky-950/10 py-2.5 px-4 rounded-r-2xl my-4 text-xs sm:text-sm text-sky-300 font-medium">
          {parseInlineStyles(line.substring(2))}
        </blockquote>
      );
    }
    // Bullet lists
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {parseInlineStyles(line.substring(2))}
        </li>
      );
    }
    // Code blocks block
    else if (line.startsWith("```")) {
      const lang = line.substring(3).trim();
      const codeContent = [];
      i++; // move past backticks
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeContent.push(lines[i]);
        i++;
      }
      parsedNodes.push(
        <div key={`code-block-${i}`} className="relative my-6 rounded-2xl overflow-hidden border border-slate-900 bg-slate-950 font-mono text-xs leading-relaxed text-slate-350 p-4 max-w-full overflow-x-auto">
          {lang && (
            <span className="absolute top-2 right-3 text-[9px] uppercase tracking-wider text-slate-600 font-bold bg-slate-900 px-2 py-0.5 rounded">
              {lang}
            </span>
          )}
          <pre className="mt-2">
            <code>{codeContent.join("\n")}</code>
          </pre>
        </div>
      );
    }
    // Paragraph
    else if (line !== "") {
      parsedNodes.push(
        <p key={i} className="my-3.5 text-slate-350 text-sm leading-relaxed text-balance">
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  // Handle remaining list if EOF was reached inside list
  if (inList) {
    parsedNodes.push(
      <ul key={`list-end`} className="list-disc list-inside pl-5 space-y-1.5 my-4 text-slate-350 text-sm">
        {listItems}
      </ul>
    );
  }

  return parsedNodes;
}
