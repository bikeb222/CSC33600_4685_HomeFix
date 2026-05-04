const { generateAiResponse, configuredProvider } = require('./aiProvider');
const { classifyIntent } = require('./intentClassifier');
const { searchFaq } = require('./faqSearch');
const { buildContext, compactConversation } = require('./contextBuilder');
const { systemPromptFor } = require('./promptBuilder');
const { actionsFromKeys, sanitizeActions, dangerousInput, securityRefusal, receiverFallback } = require('./responseTemplates');
const receiverQueries = require('./safeReceiverQueries');

async function dataForIntent(intent, receiverId, message) {
  switch (intent) {
    case 'my_next_appointment':
      return { receiver_appointments: await receiverQueries.getReceiverNextAppointment(receiverId) };
    case 'my_pending_appointments':
      return { receiver_appointments: await receiverQueries.getReceiverPendingAppointments(receiverId) };
    case 'my_completed_appointments':
      return { receiver_appointments: await receiverQueries.getReceiverCompletedAppointments(receiverId) };
    case 'my_unpaid_payments':
      return { receiver_payments: await receiverQueries.getReceiverUnpaidPayments(receiverId) };
    case 'my_spending_summary':
      return { receiver_spending_summary: await receiverQueries.getReceiverSpendingSummary(receiverId) };
    case 'my_latest_payment': {
      const payments = await receiverQueries.getReceiverPayments(receiverId);
      return { receiver_payments: payments.slice(0, 1) };
    }
    case 'my_addresses':
      return { receiver_addresses: await receiverQueries.getReceiverAddresses(receiverId) };
    case 'my_default_address':
      return { receiver_addresses: await receiverQueries.getReceiverDefaultAddress(receiverId) };
    case 'service_rate_summary':
      return { service_rate_summary: await receiverQueries.getServiceRateSummary() };
    case 'available_services':
      return { services: await receiverQueries.getAvailableServices() };
    case 'providers_for_service':
      return { providers: await receiverQueries.getProvidersForService(message) };
    case 'provider_rating':
      return { top_providers_by_average_rating: await receiverQueries.getTopProvidersByAverageRating(5) };
    case 'provider_working_hours':
      return { provider_working_hours: await receiverQueries.getProviderWorkingHoursSummary() };
    case 'review_status':
      return { receiver_reviews: await receiverQueries.getReceiverReviewStatus(receiverId) };
    case 'cancellation_question':
      return { receiver_appointments: await receiverQueries.getReceiverNextAppointment(receiverId) };
    case 'payment_question':
      return { receiver_payments: await receiverQueries.getReceiverPayments(receiverId) };
    default:
      return {};
  }
}

async function baselineData(receiverId) {
  const [
    appointmentHistory,
    spendingSummary,
    recentPayments,
    addresses,
    reviewStatus,
    serviceRateSummary,
    providerWorkingHours,
    topProviders,
    services
  ] = await Promise.all([
    receiverQueries.getReceiverAppointments(receiverId),
    receiverQueries.getReceiverSpendingSummary(receiverId),
    receiverQueries.getReceiverPayments(receiverId),
    receiverQueries.getReceiverAddresses(receiverId),
    receiverQueries.getReceiverReviewStatus(receiverId),
    receiverQueries.getServiceRateSummary(),
    receiverQueries.getProviderWorkingHoursSummary(),
    receiverQueries.getTopProvidersByAverageRating(5),
    receiverQueries.getAvailableServices()
  ]);

  return {
    receiver_context: {
      appointment_history: appointmentHistory,
      spending_summary: spendingSummary,
      recent_payments: recentPayments,
      addresses,
      completed_appointment_review_status: reviewStatus,
      public_service_rate_summary: serviceRateSummary,
      public_provider_working_hours: providerWorkingHours,
      public_top_providers_by_average_rating: topProviders,
      public_services: services
    }
  };
}

function sourceList(faqMatches, data, aiResult) {
  return [
    ...faqMatches.map((faq) => ({ type: 'faq', id: faq.id, category: faq.category })),
    ...Object.keys(data).map((name) => ({ type: 'database', name })),
    { type: 'ai', provider: aiResult.provider || configuredProvider(), model: aiResult.model || 'fallback' }
  ];
}

async function answer({ user, message, conversation = [] }) {
  if (dangerousInput(message)) {
    return {
      answer: securityRefusal,
      sources: [],
      suggested_actions: actionsFromKeys(['view_appointments', 'view_payments'])
    };
  }
  const intent = classifyIntent('receiver', message);
  const faqMatches = searchFaq(message);
  const [baseline, intentData] = await Promise.all([
    baselineData(user.receiver_id),
    dataForIntent(intent, user.receiver_id, message)
  ]);
  const data = { ...baseline, ...intentData };
  const relatedActionKeys = faqMatches.flatMap((faq) => faq.related_actions || []);
  const defaultActions = actionsFromKeys([
    ...relatedActionKeys,
    intent.includes('appointment') || intent.includes('cancellation') ? 'view_appointments' : null,
    intent.includes('payment') ? 'view_payments' : null,
    intent.includes('address') ? 'view_addresses' : null,
    intent.includes('provider') ? 'view_providers' : null,
    intent.includes('service') ? 'view_services' : null
  ].filter(Boolean));
  const context = buildContext({
    role: 'receiver',
    intent,
    faqMatches,
    data
  });
  const aiResult = await generateAiResponse({
    role: 'receiver',
    userMessage: message,
    systemPrompt: systemPromptFor('receiver'),
    context,
    conversationHistory: compactConversation(conversation),
    fallbackActions: defaultActions
  });
  return {
    answer: aiResult.answer || faqMatches[0]?.answer || receiverFallback,
    sources: sourceList(faqMatches, data, aiResult),
    suggested_actions: sanitizeActions(aiResult.suggested_actions?.length ? aiResult.suggested_actions : defaultActions),
    intent
  };
}

module.exports = {
  answer
};
