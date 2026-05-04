import React from 'react';
import { Bot, Database, FileQuestion, RotateCcw, Send, Sparkles } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import ErrorAlert from '../components/common/ErrorAlert';
import { sendManagerAiMessage, sendReceiverAiMessage } from '../api/ai';
import { useAuth } from '../auth/useAuth';

const receiverQuestions = [
  'How do I book a service?',
  'What is my next appointment?',
  'Do I have unpaid payments?',
  'How do I cancel an appointment?',
  'Which providers offer cleaning?',
  'When can I write a review?',
  'What does pending mean?'
];

const managerQuestions = [
  'How many pending appointments do we have?',
  'What is total revenue?',
  'Which provider completed the most jobs?',
  'Which service is most popular?',
  'Show payment status distribution.',
  'Show completed appointments without payment.',
  'Which providers have low ratings?'
];

function sourceIcon(type) {
  if (type === 'faq') return <FileQuestion size={13} />;
  if (type === 'database') return <Database size={13} />;
  return <Sparkles size={13} />;
}

function SourceList({ sources = [] }) {
  if (!sources.length) {
    return null;
  }
  return (
    <div className="ai-sources">
      {sources.map((source, index) => (
        <span key={`${source.type}-${source.id || source.name || index}`}>
          {sourceIcon(source.type)}
          {source.type === 'faq' && `FAQ: ${source.id}`}
          {source.type === 'database' && `Database: ${source.name}`}
          {source.type === 'ai' && `AI: ${source.provider}${source.model ? ` (${source.model})` : ''}`}
        </span>
      ))}
    </div>
  );
}

function SuggestedActions({ actions = [] }) {
  if (!actions.length) {
    return null;
  }
  return (
    <div className="ai-actions">
      {actions.map((action) => (
        <a className="button mini" href={action.path} key={`${action.label}-${action.path}`}>
          {action.label}
        </a>
      ))}
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`ai-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="ai-avatar"><Bot size={18} /></div>}
      <div className="ai-bubble">
        <p>{message.content}</p>
        {!isUser && <SourceList sources={message.sources} />}
        {!isUser && <SuggestedActions actions={message.suggested_actions} />}
      </div>
    </div>
  );
}

export default function AiChatPage({ mode }) {
  const { user } = useAuth();
  const isManager = mode === 'manager';
  const suggestedQuestions = isManager ? managerQuestions : receiverQuestions;
  const sendMessage = isManager ? sendManagerAiMessage : sendReceiverAiMessage;
  const [messages, setMessages] = React.useState([
    {
      role: 'assistant',
      content: isManager
        ? 'Ask me about revenue, appointments, provider performance, services, payments, reviews, or operational warnings.'
        : 'Ask me about booking, your appointments, payments, addresses, providers, services, reviews, or Homefix rules.',
      sources: [],
      suggested_actions: []
    }
  ]);
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function submit(text = draft) {
    const messageText = text.trim();
    if (!messageText || loading) {
      return;
    }
    const conversation = messages
      .filter((item) => ['user', 'assistant'].includes(item.role))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));
    const userMessage = { role: 'user', content: messageText };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setError('');
    setLoading(true);
    try {
      const result = await sendMessage(messageText, conversation);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources || [],
          suggested_actions: result.suggested_actions || []
        }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={isManager ? 'Manager AI' : 'Receiver AI'}
        title={isManager ? 'AI Assistant' : 'AI Support'}
        description={isManager
          ? 'Ask safe analytics questions backed by predefined database queries. The assistant cannot modify records or run arbitrary SQL.'
          : 'Ask customer service questions grounded in Homefix FAQ, your own receiver data, and public provider/service data.'}
        actions={(
          <button className="button ghost" type="button" onClick={() => setMessages([])}>
            <RotateCcw size={16} />
            Clear
          </button>
        )}
      />
      <ErrorAlert message={error} onClose={() => setError('')} />
      <section className="panel ai-panel">
        <div className="ai-chat">
          {messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} />)}
          {loading && (
            <div className="ai-message assistant">
              <div className="ai-avatar"><Bot size={18} /></div>
              <div className="ai-bubble"><p>Thinking with safe Homefix context...</p></div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
        <div className="ai-suggestions">
          {suggestedQuestions.map((question) => (
            <button className="button mini" type="button" key={question} onClick={() => submit(question)} disabled={loading}>
              {question}
            </button>
          ))}
        </div>
        <div className="ai-composer">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isManager ? 'Ask a platform analytics question...' : 'Ask about booking, payments, providers, or your appointments...'}
            rows="3"
            maxLength={1000}
          />
          <button className="button primary" type="button" onClick={() => submit()} disabled={loading || !draft.trim()}>
            <Send size={16} />
            Send
          </button>
        </div>
        <p className="ai-footnote">
          Signed in as {user.display_name}. AI answers use backend-approved context only.
        </p>
      </section>
    </div>
  );
}
