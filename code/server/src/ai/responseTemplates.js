const securityRefusal = 'I cannot help with SQL execution, secrets, passwords, API keys, or private data from another user. Please ask about safe Homefix booking, payment, review, provider, service, or analytics information.';

const receiverFallback = 'I am sorry, I could not find a specific answer for that. You can ask me about booking, appointments, payments, addresses, providers, services, reviews, or account help.';

const managerFallback = 'I could not match that to a supported analytics question. Try asking about revenue, appointment status, provider performance, service popularity, payments, reviews, or operational warnings.';

const receiverSuggestedQuestions = [
  'How do I book a service?',
  'What is my next appointment?',
  'Do I have unpaid payments?',
  'How do I cancel an appointment?',
  'Which providers offer cleaning?',
  'When can I write a review?',
  'What does pending mean?'
];

const managerSuggestedQuestions = [
  'How many pending appointments do we have?',
  'What is total revenue?',
  'Which provider completed the most jobs?',
  'Which service is most popular?',
  'Show payment status distribution.',
  'Show completed appointments without payment.',
  'Which providers have low ratings?'
];

const actionMap = {
  view_services: { label: 'View Services', path: '/services' },
  create_appointment: { label: 'Create Appointment', path: '/appointments?new=1' },
  view_appointments: { label: 'View Appointments', path: '/appointments' },
  view_payments: { label: 'View Payments', path: '/payments' },
  view_reviews: { label: 'View Reviews', path: '/reviews' },
  view_addresses: { label: 'View My Profile', path: '/profile' },
  view_providers: { label: 'View Providers', path: '/providers' },
  view_reports: { label: 'View Reports', path: '/reports' },
  view_dashboard: { label: 'View Dashboard', path: '/' },
  view_users: { label: 'View User Management', path: '/users' }
};

function actionsFromKeys(keys = []) {
  const seen = new Set();
  return keys
    .map((key) => actionMap[key])
    .filter((action) => {
      if (!action || seen.has(action.path)) {
        return false;
      }
      seen.add(action.path);
      return true;
    });
}

function dangerousInput(message = '') {
  const text = String(message).toLowerCase();
  return [
    /\bdrop\s+table\b/,
    /\bdelete\s+from\b/,
    /\bupdate\s+\w+\s+set\b/,
    /\binsert\s+into\b/,
    /\balter\s+table\b/,
    /\btruncate\b/,
    /\bselect\s+\*\s+from\s+users\b/,
    /password_hash/,
    /jwt\s*secret/,
    /api[_\s-]*key/,
    /ignore previous instructions/,
    /show me all users/,
    /other receiver/,
    /another receiver/
  ].some((pattern) => pattern.test(text));
}

module.exports = {
  securityRefusal,
  receiverFallback,
  managerFallback,
  receiverSuggestedQuestions,
  managerSuggestedQuestions,
  actionsFromKeys,
  dangerousInput
};
