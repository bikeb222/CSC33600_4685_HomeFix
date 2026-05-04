const geminiProvider = require('./geminiProvider');
const kimiProvider = require('./kimiProvider');
const mockProvider = require('./mockProvider');

function configuredProvider() {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (!process.env.AI_API_KEY || provider === 'mock') {
    return 'mock';
  }
  if (provider === 'gemini' || provider === 'kimi') {
    return provider;
  }
  return 'mock';
}

async function generateAiResponse(input) {
  const provider = configuredProvider();
  try {
    if (provider === 'gemini') {
      return await geminiProvider.generate(input);
    }
    if (provider === 'kimi') {
      return await kimiProvider.generate(input);
    }
    return await mockProvider.generate(input);
  } catch {
    return mockProvider.generate(input);
  }
}

module.exports = {
  generateAiResponse,
  configuredProvider
};
