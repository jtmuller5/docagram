import React, { useState, useEffect, useRef } from 'react';

const StreamingOutput = ({ isLoading, error }) => {
  const [content, setContent] = useState('');
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [content]);

  const formatChunkProgress = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, i) => {
      if (line.startsWith('Analyzing chunk')) {
        return (
          <div key={i} className="flex items-center gap-2 text-blue-600 font-medium my-1">
            {line}
            {isLoading && (
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"/>
            )}
          </div>
        );
      }
      if (line.startsWith('Chunk') && line.includes('results:')) {
        return <div key={i} className="font-semibold text-gray-700 mt-3 mb-1">{line}</div>;
      }
      if (line.startsWith('Chunk') && line.includes('output:')) {
        return <div key={i} className="font-semibold text-gray-700 mt-3 mb-1">{line}</div>;
      }
      return <div key={i} className="text-gray-600">{line}</div>;
    });
  };

  const updateContent = (newContent) => {
    setContent(newContent);
  };

  return (
    <div className="relative w-full">
      <div 
        ref={outputRef}
        className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-y-auto font-mono text-sm"
      >
        {error ? (
          <div className="text-red-500 font-medium">
            {error}
          </div>
        ) : (
          formatChunkProgress(content)
        )}
      </div>
    </div>
  );
};

export default StreamingOutput;