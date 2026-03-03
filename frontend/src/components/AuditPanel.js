import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function renderMarkdown(text) {
  // Simple inline markdown renderer
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-100 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-5 mb-2 pb-1 border-b border-slate-700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-300 italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-blue-300 px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300 text-sm list-disc list-inside">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 text-sm list-decimal list-inside">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 text-sm leading-relaxed my-2">')
    .replace(/\n/g, '<br/>');
}

function Message({ msg }) {
  const isUser = msg.role === 'user-display';
  const isReport = msg.isReport;

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-blue-600 text-white text-sm px-4 py-3 rounded-2xl rounded-br-sm max-w-[85%]">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className={`text-sm px-4 py-3 rounded-2xl rounded-bl-sm max-w-[95%] ${
        isReport
          ? 'bg-slate-800/80 border border-slate-700 w-full'
          : 'bg-slate-800 text-slate-200'
      }`}>
        {isReport ? (
          <div
            className="prose-audit text-slate-300"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        ) : (
          <div
            className="leading-relaxed text-slate-200"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        )}
      </div>
    </div>
  );
}

export default function AuditPanel({ dataSummary }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | questions | report
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [reportContent, setReportContent] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startAudit = async () => {
    setPhase('loading');
    setError('');
    try {
      const resp = await axios.post('/api/audit/start', { dataSummary });
      setHistory(resp.data.conversationHistory);
      setMessages([{ role: 'assistant', content: resp.data.message }]);
      setPhase('questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start audit. Check your ANTHROPIC_API_KEY.');
      setPhase('idle');
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || phase === 'loading') return;

    const newQCount = questionCount + 1;
    setQuestionCount(newQCount);
    setInput('');

    // Show user message in UI
    setMessages(prev => [...prev, { role: 'user-display', content: trimmed }]);
    setPhase('loading');

    // Decide whether to generate the full report (after answering questions)
    const shouldGenerateReport = newQCount >= 2;

    try {
      const resp = await axios.post('/api/audit/message', {
        message: trimmed,
        conversationHistory: history,
        generateReport: shouldGenerateReport,
      });

      setHistory(resp.data.conversationHistory);

      const aiMsg = {
        role: 'assistant',
        content: resp.data.message,
        isReport: resp.data.isReport,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (resp.data.isReport) {
        setReportContent(resp.data.message);
        setPhase('report');
      } else {
        setPhase('questions');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Message failed. Please try again.');
      setPhase('questions');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-audit-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAudit = () => {
    setPhase('idle');
    setMessages([]);
    setHistory([]);
    setInput('');
    setQuestionCount(0);
    setReportContent('');
    setError('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <span>🤖</span> AI Deep Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Powered by Claude Sonnet</p>
          </div>
          {phase !== 'idle' && (
            <button onClick={resetAudit} className="text-xs text-slate-500 hover:text-slate-300">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {phase === 'idle' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <h4 className="font-semibold text-slate-200 mb-2">Get a Deep AI Audit</h4>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Claude will analyze your data, ask targeted follow-up questions about your margins and goals, then generate a full written audit report with specific action plans.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 text-left mb-6 text-xs text-slate-400 space-y-2">
              <p className="font-medium text-slate-300">What you'll get:</p>
              <p>• 3–5 smart follow-up questions</p>
              <p>• Executive summary of your account</p>
              <p>• Top 3 profit leaks ranked by impact</p>
              <p>• Specific action plans for each leak</p>
              <p>• Quick wins (fixable in 48 hours)</p>
              <p>• Exportable markdown report</p>
            </div>
            <button
              onClick={startAudit}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-medium transition-all"
            >
              Start AI Deep Audit →
            </button>
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          </div>
        )}

        {phase === 'loading' && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Analyzing your data...</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {phase === 'loading' && messages.length > 0 && (
          <div className="flex justify-start mb-3">
            <div className="bg-slate-800 px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && phase !== 'idle' && (
          <div className="text-red-400 text-xs bg-red-950/30 border border-red-800 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Report Actions */}
      {phase === 'report' && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800 flex gap-2">
          <button
            onClick={downloadReport}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            ⬇ Export Report (.md)
          </button>
          <button
            onClick={resetAudit}
            className="px-4 border border-slate-700 hover:border-slate-500 text-slate-300 py-2.5 rounded-lg text-sm transition-colors"
          >
            New Audit
          </button>
        </div>
      )}

      {/* Input Area */}
      {(phase === 'questions') && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">
            {questionCount === 0
              ? 'Answer the questions above, then press Enter'
              : questionCount === 1
              ? 'Answer any remaining questions, then press Enter to generate your report'
              : ''}
          </p>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answers here..."
              rows={3}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`px-4 rounded-xl transition-colors text-sm font-medium ${
                input.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {questionCount >= 1 ? '📄 Generate Report' : 'Send →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
