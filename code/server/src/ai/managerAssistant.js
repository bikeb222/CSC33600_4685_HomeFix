const { generateAiResponse, configuredProvider } = require('./aiProvider');
const { classifyIntent } = require('./intentClassifier');
const { buildContext, compactConversation } = require('./contextBuilder');
const { systemPromptFor } = require('./promptBuilder');
const { actionsFromKeys, sanitizeActions, dangerousInput, securityRefusal, managerFallback } = require('./responseTemplates');
const analytics = require('./safeAnalyticsQueries');

async function dataForIntent(intent) {
  switch (intent) {
    case 'count_receivers':
      return { receiver_count: await analytics.countReceivers() };
    case 'count_providers':
      return { provider_count: await analytics.countProviders() };
    case 'count_services':
      return { service_count: await analytics.countServices() };
    case 'count_appointments':
      return { appointment_count: await analytics.countAppointments() };
    case 'service_rate_summary':
      return { service_rate_summary: await analytics.getServiceRateSummary() };
    case 'provider_working_hours':
      return { provider_working_hours: await analytics.getProviderWorkingHoursSummary() };
    case 'appointment_status_distribution':
      return { appointment_status_distribution: await analytics.getAppointmentStatusDistribution() };
    case 'pending_appointments':
      return { pending_appointments: await analytics.countAppointmentsByStatus('pending') };
    case 'completed_appointments':
      return { completed_appointments: await analytics.countAppointmentsByStatus('completed') };
    case 'cancelled_appointments':
      return { cancelled_appointments: await analytics.countAppointmentsByStatus('cancelled') };
    case 'revenue_summary':
      return { revenue_summary: await analytics.getRevenueSummary() };
    case 'payment_status_distribution':
      return { payment_status_distribution: await analytics.getPaymentStatusDistribution() };
    case 'top_provider_by_completed_jobs':
      return { top_providers_by_completed_appointments: await analytics.getTopProvidersByCompletedAppointments(5) };
    case 'top_provider_by_rating':
      return { top_providers_by_average_rating: await analytics.getTopProvidersByAverageRating(5) };
    case 'low_rating_providers':
      return { low_rating_providers: await analytics.getLowRatingProviders(5) };
    case 'top_services':
      return { top_services_by_appointments: await analytics.getTopServicesByAppointments(5) };
    case 'unpaid_payments':
      return { unpaid_payments: await analytics.getUnpaidPayments(10) };
    case 'completed_without_payment':
      return { completed_appointments_without_payment: await analytics.getCompletedAppointmentsWithoutPayment(10) };
    case 'pending_older_than_48h':
      return { pending_appointments_older_than_48h: await analytics.getPendingAppointmentsOlderThan(48) };
    case 'receiver_activity':
      return { receivers_by_appointment_count: await analytics.getReceiversByAppointmentCount(5) };
    case 'service_performance':
      return { service_performance: await analytics.getServicePerformance() };
    case 'review_analytics':
      return { review_analytics: await analytics.getReviewAnalytics(), low_rating_reviews: await analytics.getLowRatingReviews(10) };
    default:
      return { dashboard_stats: await analytics.getDashboardStats() };
  }
}

async function baselineData() {
  const [
    dashboardStats,
    revenueSummary,
    serviceRateSummary,
    providerWorkingHours,
    topProvidersByRating,
    topProvidersByCompletedAppointments,
    topServices,
    unpaidPayments,
    completedWithoutPayment
  ] = await Promise.all([
    analytics.getDashboardStats(),
    analytics.getRevenueSummary(),
    analytics.getServiceRateSummary(),
    analytics.getProviderWorkingHoursSummary(),
    analytics.getTopProvidersByAverageRating(5),
    analytics.getTopProvidersByCompletedAppointments(5),
    analytics.getTopServicesByAppointments(5),
    analytics.getUnpaidPayments(10),
    analytics.getCompletedAppointmentsWithoutPayment(10)
  ]);

  return {
    manager_context: {
      dashboard_stats: dashboardStats,
      revenue_summary: revenueSummary,
      service_rate_summary: serviceRateSummary,
      provider_working_hours: providerWorkingHours,
      top_providers_by_average_rating: topProvidersByRating,
      top_providers_by_completed_appointments: topProvidersByCompletedAppointments,
      top_services_by_appointments: topServices,
      unpaid_payments: unpaidPayments,
      completed_appointments_without_payment: completedWithoutPayment
    }
  };
}

function managerActions(intent) {
  if (intent.includes('provider')) return actionsFromKeys(['view_providers', 'view_dashboard']);
  if (intent.includes('payment') || intent.includes('revenue')) return actionsFromKeys(['view_payments', 'view_reports']);
  if (intent.includes('service')) return actionsFromKeys(['view_services', 'view_reports']);
  if (intent.includes('receiver')) return actionsFromKeys(['view_users', 'view_dashboard']);
  if (intent.includes('review')) return actionsFromKeys(['view_reviews', 'view_reports']);
  return actionsFromKeys(['view_dashboard', 'view_reports']);
}

function sourceList(data, aiResult) {
  return [
    ...Object.keys(data).map((name) => ({ type: 'database', name })),
    { type: 'ai', provider: aiResult.provider || configuredProvider(), model: aiResult.model || 'fallback' }
  ];
}

async function answer({ message, conversation = [] }) {
  if (dangerousInput(message)) {
    return {
      answer: securityRefusal,
      sources: [],
      metrics: {},
      suggested_actions: actionsFromKeys(['view_dashboard'])
    };
  }
  const intent = classifyIntent('manager', message);
  const [baseline, intentData] = await Promise.all([
    baselineData(),
    dataForIntent(intent)
  ]);
  const data = { ...baseline, ...intentData };
  const defaultActions = managerActions(intent);
  const context = buildContext({
    role: 'manager',
    intent,
    data,
    metrics: data[Object.keys(data)[0]]
  });
  const aiResult = await generateAiResponse({
    role: 'manager',
    userMessage: message,
    systemPrompt: systemPromptFor('manager'),
    context,
    conversationHistory: compactConversation(conversation),
    fallbackActions: defaultActions
  });
  return {
    answer: aiResult.answer || managerFallback,
    sources: sourceList(data, aiResult),
    metrics: data[Object.keys(data)[0]],
    suggested_actions: sanitizeActions(aiResult.suggested_actions?.length ? aiResult.suggested_actions : defaultActions),
    intent
  };
}

module.exports = {
  answer
};
