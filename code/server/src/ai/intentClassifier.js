function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function receiverIntent(message = '') {
  const text = message.toLowerCase();
  if (includesAny(text, ['next appointment', 'upcoming appointment', 'next booking'])) return 'my_next_appointment';
  if (includesAny(text, ['pending appointment', 'pending booking'])) return 'my_pending_appointments';
  if (includesAny(text, ['working hours', 'work hours', 'business hours', 'operating hours', 'availability window', 'provider schedule'])) return 'provider_working_hours';
  if (includesAny(text, ['best reviews', 'best reviewed', 'highest reviews', 'top reviews', 'highest average rating', 'best rating', 'top rating', 'provider rating', 'best provider', 'highest rated'])) return 'provider_rating';
  if (includesAny(text, ['review', 'rate appointment', 'write a rating'])) return 'review_status';
  if (includesAny(text, ['completed appointment', 'completed booking', 'past appointment'])) return 'my_completed_appointments';
  if (includesAny(text, ['unpaid payment', 'unpaid bill', 'owe', 'payment due'])) return 'my_unpaid_payments';
  if (includesAny(text, ['latest payment', 'last payment', 'recent payment'])) return 'my_latest_payment';
  if (includesAny(text, ['my address', 'addresses', 'saved address'])) return 'my_addresses';
  if (includesAny(text, ['default address', 'primary address'])) return 'my_default_address';
  if (includesAny(text, ['money did i spend', 'how much did i spend', 'total spent', 'spent in total', 'my spending', 'my total payments', 'total payments', 'how much have i paid'])) return 'my_spending_summary';
  if (includesAny(text, ['how much', 'cost', 'price', 'hourly', 'rate range', 'price range', 'fee', 'charge', 'range'])) return 'service_rate_summary';
  if (includesAny(text, ['available services', 'what services', 'service catalog'])) return 'available_services';
  if (includesAny(text, ['providers offer', 'provider offer', 'who offers', 'available for', 'for cleaning', 'for plumbing', 'for electrical', 'for painting', 'for landscaping'])) return 'providers_for_service';
  if (includesAny(text, ['cancel', 'cancellation'])) return 'cancellation_question';
  if (includesAny(text, ['pay', 'payment', 'wallet', 'refund'])) return 'payment_question';
  if (includesAny(text, ['book', 'schedule', 'appointment'])) return 'faq_general';
  return 'fallback';
}

function managerIntent(message = '') {
  const text = message.toLowerCase();
  if (includesAny(text, ['how many receivers', 'count receivers', 'receiver count'])) return 'count_receivers';
  if (includesAny(text, ['how many providers', 'count providers', 'provider count'])) return 'count_providers';
  if (includesAny(text, ['how many services', 'count services', 'service count'])) return 'count_services';
  if (includesAny(text, ['how many appointments', 'count appointments', 'appointment count'])) return 'count_appointments';
  if (includesAny(text, ['working hours', 'work hours', 'business hours', 'operating hours', 'availability window', 'provider schedule'])) return 'provider_working_hours';
  if (includesAny(text, ['total revenue', 'revenue summary', 'commission', 'provider payout', 'paid revenue', 'how much revenue', 'revenue did we earn', 'earnings'])) return 'revenue_summary';
  if (includesAny(text, ['how much', 'cost', 'price', 'hourly', 'rate range', 'price range', 'service rate', 'service pricing', 'fee', 'charge'])) return 'service_rate_summary';
  if (includesAny(text, ['status distribution', 'appointment distribution'])) return 'appointment_status_distribution';
  if (includesAny(text, ['completed appointments without payment', 'completed without payment', 'completed unpaid', 'completed but unpaid'])) return 'completed_without_payment';
  if (includesAny(text, ['pending appointments'])) return 'pending_appointments';
  if (includesAny(text, ['completed appointments'])) return 'completed_appointments';
  if (includesAny(text, ['cancelled appointments', 'canceled appointments'])) return 'cancelled_appointments';
  if (includesAny(text, ['payment status distribution', 'payment distribution'])) return 'payment_status_distribution';
  if (includesAny(text, ['completed the most', 'most completed', 'top provider'])) return 'top_provider_by_completed_jobs';
  if (includesAny(text, ['highest average rating', 'best rating', 'top rating', 'best reviews', 'best reviewed', 'highest reviews', 'top reviews'])) return 'top_provider_by_rating';
  if (includesAny(text, ['low rating provider', 'lowest rating', 'low ratings'])) return 'low_rating_providers';
  if (includesAny(text, ['most popular service', 'most popular services', 'top services', 'service popular', 'services are most popular'])) return 'top_services';
  if (includesAny(text, ['unpaid payments', 'unpaid amount'])) return 'unpaid_payments';
  if (includesAny(text, ['pending older', 'older than 2 days', 'older than 48'])) return 'pending_older_than_48h';
  if (includesAny(text, ['receiver activity', 'most active receiver', 'booked the most'])) return 'receiver_activity';
  if (includesAny(text, ['service performance', 'revenue by service', 'average hourly rate'])) return 'service_performance';
  if (includesAny(text, ['low rating reviews', 'reviews by direction', 'appointments without reviews'])) return 'review_analytics';
  return 'fallback';
}

function classifyIntent(role, message) {
  return role === 'manager' ? managerIntent(message) : receiverIntent(message);
}

module.exports = {
  classifyIntent,
  receiverIntent,
  managerIntent
};
