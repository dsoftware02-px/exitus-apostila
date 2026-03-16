import React from 'react';
import ReactMarkdown from 'react-markdown';

interface LiveA4PageProps {
  content: string;
}

export function LiveA4Page({ content }: LiveA4PageProps) {
  return (
    <div className="w-full h-full bg-zinc-200/50 overflow-y-auto flex justify-center p-4 sm:p-8">
      {/* A4 Container */}
      <div 
        className="bg-white shadow-2xl shrink-0 print:shadow-none print:m-0"
        style={{ 
          width: '210mm', 
          minHeight: '297mm',
          padding: '20mm',
          // Use CSS transform to scale down if the container is too small, 
          // but for simplicity we'll let it be actual size and scrollable,
          // or we can use a responsive approach.
        }}
      >
        <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-xl prose-img:shadow-md prose-img:w-full prose-img:object-cover break-words">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
