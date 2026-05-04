const faqs = require('../data/receiverFaq.json');

const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'my', 'i', 'do', 'how', 'what', 'is', 'are', 'can', 'for', 'of', 'in']);

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value = '') {
  return normalize(value).split(' ').filter((token) => token && !stopWords.has(token));
}

function scoreFaq(faq, message) {
  const text = normalize(message);
  const messageTokens = tokens(message);
  const keywordHits = (faq.keywords || []).filter((keyword) => text.includes(normalize(keyword))).length;
  const questionHits = (faq.questions || []).filter((question) => normalize(question).includes(text) || text.includes(normalize(question))).length;
  const categoryHit = text.includes(normalize(faq.category)) ? 1 : 0;
  const faqTokens = new Set(tokens([
    faq.category,
    ...(faq.questions || []),
    ...(faq.keywords || []),
    faq.answer
  ].join(' ')));
  const overlap = messageTokens.filter((token) => faqTokens.has(token)).length;
  return keywordHits * 5 + questionHits * 4 + categoryHit * 3 + overlap;
}

function searchFaq(message, limit = 3, threshold = 2) {
  return faqs
    .map((faq) => ({ ...faq, score: scoreFaq(faq, message) }))
    .filter((faq) => faq.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...faq }) => faq);
}

module.exports = {
  searchFaq,
  normalize,
  tokens
};
