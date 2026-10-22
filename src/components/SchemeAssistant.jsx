import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { searchLocalSchemes } from '../utils/assistantSearch.js';
import { IconClose, Logo } from './Icons.jsx';
import { Link } from 'react-router-dom';

export default function SchemeAssistant({ isOpen, onClose }) {
  const { t, lang, tx } = useI18n();
  const { schemesCatalog, form } = useProfile();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: lang === 'hi'
        ? 'नमस्ते! मैं स्कीमसाथी सहायक हूँ। आप स्थानीय डेटाबेस में मौजूद सरकारी योजनाओं, पात्रता शर्तों और आवश्यक दस्तावेज़ों के बारे में सरल भाषा में पूछ सकते हैं।'
        : lang === 'ur'
        ? 'آداب! میں اسکیم ساتھی معاون ہوں۔ آپ سرکاری اسکیموں، اہلیت کی شرائط اور ضروری دستاویزات کے بارے میں آسان زبان میں پوچھ سکتے ہیں۔'
        : 'Hello! I am SchemeSaathi Assistant. Ask me anything in simple language about welfare schemes in our local database, eligibility criteria, or documents.',
      schemes: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const suggestions = [
    lang === 'hi' ? 'किसानों के लिए क्या योजनाएं हैं?' : 'What schemes are available for farmers?',
    lang === 'hi' ? 'विद्यार्थियों के लिए छात्रवृत्ति' : 'Scholarships for students',
    lang === 'hi' ? 'महिला उद्यमियों के लिए ऋण' : 'Loans for women entrepreneurs',
    lang === 'hi' ? 'वरिष्ठ नागरिकों के लिए पेंशन' : 'Pension for senior citizens',
  ];

  const handleSend = async (textToSend) => {
    const q = (textToSend || query).trim();
    if (!q || loading) return;

    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      // Attempt backend AI route
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          schemes: schemesCatalog,
          language: lang,
          profile: form,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            source: 'gemini',
            schemes: [],
          },
        ]);
      } else {
        // Fall back gracefully to local deterministic search
        const fallback = searchLocalSchemes(q, schemesCatalog, lang);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: fallback.reply,
            source: 'local_search',
            schemes: fallback.matchedSchemes,
          },
        ]);
      }
    } catch {
      // Network offline or server unreachable - use pure client search
      const fallback = searchLocalSchemes(q, schemesCatalog, lang);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallback.reply,
          source: 'local_search',
          schemes: fallback.matchedSchemes,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-overlay" role="dialog" aria-modal="true" aria-label={t('assistant.title')}>
      <div className="assistant-modal">
        <header className="assistant-header">
          <div className="assistant-brand">
            <Logo size={24} />
            <div>
              <h3>{t('assistant.title')}</h3>
              <span className="assistant-badge">{t('assistant.badge')}</span>
            </div>
          </div>
          <button
            type="button"
            className="assistant-close-btn"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <IconClose size={20} />
          </button>
        </header>

        <div className="assistant-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`msg-bubble msg-${m.role}`}>
              <div className="msg-content">
                <p style={{ whiteSpace: 'pre-line' }}>{m.text}</p>
                {m.schemes && m.schemes.length > 0 && (
                  <div className="msg-scheme-links">
                    {m.schemes.map((s) => (
                      <Link
                        key={s.id}
                        to={`/scheme/${s.id}`}
                        onClick={onClose}
                        className="msg-scheme-chip"
                      >
                        👉 {tx(s.name)}
                      </Link>
                    ))}
                  </div>
                )}
                {m.source === 'local_search' && (
                  <span className="msg-fallback-tag">ℹ️ {t('assistant.fallback')}</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="msg-bubble msg-assistant">
              <div className="msg-content">
                <span className="assistant-typing-dots">{t('common.loading')}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="assistant-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSend(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="assistant-input-row"
        >
          <input
            type="text"
            className="assistant-input"
            placeholder={t('assistant.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-solid btn-sm"
            disabled={!query.trim() || loading}
          >
            {t('assistant.send')}
          </button>
        </form>

        <footer className="assistant-footer">
          <small>{t('assistant.disclaimer')}</small>
        </footer>
      </div>
    </div>
  );
}
