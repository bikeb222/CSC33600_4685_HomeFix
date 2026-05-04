Please extend my existing Homefix full-stack project by adding two AI modules:

1. Receiver AI Customer Service
2. Manager AI Assistant

Current tech stack:
- Frontend: React.js / Vite
- Backend: Node.js + Express.js
- Database: MySQL
- Deployment: Docker
- AI API: Gemini or Kimi. The backend should support a configurable AI Provider Adapter.

Do not rewrite the entire project. Extend the existing codebase using the current architecture and style.

==================================================
1. Feature Goals
==================================================

Homefix is an on-demand home service booking platform with three roles:

- manager
- provider
- receiver

We need to add AI chat assistant functionality.

Receiver AI Customer Service:
- This assistant is for receivers, meaning customers.
- It should answer daily support questions about accounts, addresses, bookings, appointment statuses, cancellations, payments, refunds, reviews, ratings, providers, services, privacy, and troubleshooting.
- Add a JSON file inside the project that contains detailed FAQ data.
- When a receiver asks a question, the assistant should use the FAQ JSON as grounded knowledge.
- The assistant should also be able to access the current receiver’s own data, such as appointments, addresses, payments, and reviews.
- The assistant should also access public provider/service data, such as provider name, status, services offered, hourly rate, and average rating.
- The receiver AI must never access another receiver’s private data.

Manager AI Assistant:
- This assistant is for managers.
- It can access business data across the whole database through safe backend queries.
- It should answer operational and analytics questions, such as:
  - How many receivers are there?
  - How many providers are there?
  - How many appointments are pending?
  - Which provider completed the most jobs?
  - Which service is most popular?
  - What is the total revenue?
  - What is the total commission fee?
  - Which appointments are cancelled or no-show?
  - Which providers have low ratings?
  - Which receivers are most active?
- The manager AI should answer using database statistics.
- The manager AI must not execute dangerous SQL such as DROP, DELETE, UPDATE, or INSERT.
- The manager AI only performs read-only analysis and summarization. It must not directly modify the database.

==================================================
2. AI Architecture Requirements
==================================================

Implement a secure AI architecture.

The AI must not directly access the database.
The AI must not generate and execute SQL.
User input must never be directly converted into SQL.

Recommended architecture:

User Message
→ Authentication and Role Check
→ Intent Classifier
→ FAQ Retrieval
→ Safe Data Resolver
→ Context Builder
→ AI Provider Adapter
→ Response Formatter
→ Frontend Chat UI

Core principles:

1. The AI must not directly execute SQL.
2. All database access must happen through predefined backend safe query functions.
3. User input must not be concatenated into SQL.
4. Receivers can only access their own data.
5. Managers can access platform-wide analytics only through whitelisted query functions.
6. AI API keys must only exist in backend environment variables.
7. AI API keys must never be exposed to the frontend.
8. The frontend should only call backend `/api/ai/...` endpoints.
9. If the external AI API is unavailable, the app should return a fallback answer and should not crash.
10. The FAQ JSON should be used as grounding knowledge.
11. AI answers should be based on FAQ results and database context. Do not hallucinate records.

==================================================
3. AI Provider Adapter
==================================================

Add a configurable AI Provider Adapter.

Suggested backend files:

server/src/ai/
- aiProvider.js
- geminiProvider.js
- kimiProvider.js
- mockProvider.js
- promptBuilder.js
- contextBuilder.js
- faqSearch.js
- intentClassifier.js
- receiverAssistant.js
- managerAssistant.js
- responseTemplates.js
- safeAnalyticsQueries.js

Environment variables:

AI_PROVIDER=gemini or kimi or mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=

Requirements:

1. When AI_PROVIDER=gemini, call the Gemini API.
2. When AI_PROVIDER=kimi, call the Kimi API.
3. When AI_PROVIDER=mock, do not call an external AI API. Return a local template-based answer for development.
4. If AI_API_KEY is missing, automatically fall back to mockProvider.
5. Do not hardcode any API key.
6. Do not expose the API key to the frontend.
7. Update Docker and README to explain these environment variables.

The unified adapter method should be:

generateAiResponse({
  role,
  userMessage,
  systemPrompt,
  context,
  conversationHistory
})

Controllers and services should only call this unified method, regardless of whether the provider is Gemini, Kimi, or mock.

==================================================
4. AI Request Flow
==================================================

Do not let the LLM decide what database queries to run.

Correct flow:

1. Backend verifies authentication and role.
2. Backend classifies the user message intent.
3. Backend calls safe database query functions based on the intent.
4. Backend retrieves relevant FAQ entries from the FAQ JSON.
5. Backend builds a safe structured context from FAQ results and database results.
6. Backend sends only that safe context plus the user message to Gemini/Kimi.
7. Gemini/Kimi only generates a natural language answer from the provided context.
8. If the context does not contain enough information, the AI should say it does not have enough information and suggest a safe next action.

Forbidden:

- Do not give the AI direct database access.
- Do not let the AI generate and execute SQL.
- Do not return another user’s private data.
- Do not hallucinate non-existing appointments, payments, reviews, providers, or users.
- Do not allow the frontend to call Gemini/Kimi directly.

==================================================
5. Backend API Endpoints
==================================================

Receiver AI API:

POST /api/ai/receiver/chat

Access:
- authenticate required
- receiver only

Request body:

{
  "message": "What is my next appointment?",
  "conversation": [
    {
      "role": "user",
      "content": "previous message"
    },
    {
      "role": "assistant",
      "content": "previous answer"
    }
  ]
}

Response:

{
  "answer": "...",
  "sources": [
    {
      "type": "faq",
      "id": "booking_001",
      "category": "booking"
    },
    {
      "type": "database",
      "name": "receiver_appointments"
    },
    {
      "type": "ai",
      "provider": "gemini",
      "model": "..."
    }
  ],
  "suggested_actions": [
    {
      "label": "View My Appointments",
      "path": "/appointments"
    }
  ]
}

Manager AI API:

POST /api/ai/manager/chat

Access:
- authenticate required
- manager only

Request body:

{
  "message": "Which provider completed the most appointments?",
  "conversation": []
}

Response:

{
  "answer": "...",
  "sources": [
    {
      "type": "database",
      "name": "top_providers_by_completed_appointments"
    },
    {
      "type": "ai",
      "provider": "kimi",
      "model": "..."
    }
  ],
  "metrics": {
    "provider_name": "John Smith",
    "completed_count": 12
  },
  "suggested_actions": [
    {
      "label": "View Providers",
      "path": "/providers"
    }
  ]
}

==================================================
6. receiverFaq.json Requirements
==================================================

Create:

server/src/data/receiverFaq.json

This file should contain detailed FAQ data for common Homefix customer questions.

Suggested JSON structure:

[
  {
    "id": "booking_001",
    "category": "booking",
    "questions": [
      "How do I book a service?",
      "How can I create an appointment?",
      "I want to schedule a home service"
    ],
    "keywords": ["book", "appointment", "schedule", "service"],
    "answer": "You can book a service by going to Book Service, selecting a service, choosing an available provider, selecting your address, estimated hours, and scheduled time.",
    "related_actions": ["view_services", "create_appointment"]
  }
]

FAQ categories must include at least:

1. account
2. profile
3. address
4. booking
5. appointment_status
6. cancellation
7. provider
8. service
9. pricing
10. payment
11. refund
12. review
13. rating
14. privacy
15. safety
16. troubleshooting
17. notification
18. support
19. AI_help
20. general

Each category should contain at least 5 FAQ entries.
The full FAQ file should contain at least 80 entries.

Each FAQ entry must include:

- id
- category
- questions
- keywords
- answer
- related_actions

The FAQ content should be specific to Homefix. Avoid generic unrelated FAQ content.

==================================================
7. Receiver AI Capabilities
==================================================

The receiver AI should answer:

A. FAQ questions:
- How to book a service
- How to cancel an appointment
- How to pay
- How to write a review
- What appointment statuses mean
- How to add an address
- How to choose a provider
- How pricing works
- What data the AI uses
- How privacy is protected

B. Current receiver’s own data:
- What is my next appointment?
- Show my pending appointments.
- How many appointments do I have?
- Do I have unpaid payments?
- What is my latest payment?
- What addresses do I have?
- Which address is default?
- Did I already review my completed appointment?
- Show my completed appointments.
- What services have I booked before?

C. Public provider/service data:
- Which providers offer cleaning?
- Who is available for plumbing?
- What services does provider X offer?
- What is the hourly rate for provider X?
- Which providers are active?
- Which provider has the best rating?
- What services are available?

Receiver AI data restrictions:

- Only query data for the current req.user.receiver_id.
- Never query or reveal another receiver’s appointments, payments, addresses, or reviews.
- It may query public provider information.
- It may query services.
- It may query Provider_Services public hourly rates.
- It must not return password_hash.
- It must not return private data for other receivers.

Receiver AI tone:

- Friendly
- Concise
- Customer-service oriented
- If relevant data is found, answer directly.
- If no data is found, tell the user which page or action may help.
- If the question is out of scope, suggest contacting manager/support.

Receiver AI system prompt should include:

You are the Homefix AI Customer Service Assistant for receivers.
You can answer using only the provided FAQ context, the current receiver's own data, and public provider/service data.
Never reveal another receiver's private data.
Never invent appointments, payments, addresses, or reviews.
If the provided context does not contain the answer, say that you do not have enough information and suggest a safe next action.
Keep the tone friendly, concise, and helpful.

==================================================
8. Manager AI Capabilities
==================================================

The manager AI should answer:

A. Global counts:
- How many receivers do we have?
- How many providers do we have?
- How many services do we offer?
- How many appointments are in the system?
- How many payments are paid?
- How many reviews are there?

B. Appointment analytics:
- How many pending appointments?
- How many completed appointments?
- How many cancelled appointments?
- How many appointments are scheduled today?
- How many appointments this week?
- How many appointments this month?
- What is the appointment status distribution?
- Which service has the most appointments?
- Which provider has the most appointments?

C. Revenue/payment analytics:
- What is total revenue?
- What is total paid revenue?
- What is unpaid amount?
- What is total commission fee?
- What is total provider payout?
- Which provider earned the most?
- Which appointments are unpaid?
- What is the payment status distribution?

D. Provider performance:
- Which provider completed the most jobs?
- Which provider has the highest average rating?
- Which provider has the lowest rating?
- Which provider has the most cancelled appointments?
- Which provider has no services?
- Which active providers have no appointments?

E. Receiver behavior:
- Which receiver booked the most appointments?
- Which receiver has unpaid payments?
- Which receiver gave the most reviews?
- Which receivers have no appointments?
- Which receiver has the highest completed appointment count?

F. Service analytics:
- Most popular service
- Least used service
- Average hourly rate by service
- Providers per service
- Revenue by service

G. Reviews:
- Average rating overall
- Average provider rating
- Low rating reviews
- Reviews by direction
- Appointments without reviews
- Providers with low average rating

H. Operational warnings:
- Show pending appointments older than 2 days
- Show completed appointments without payment
- Show paid appointments without review
- Show inactive or suspended providers
- Show no-show appointments
- Show refunded payments

Manager AI data permissions:

- Can read all business tables through safe query functions.
- Can perform aggregated analytics.
- Must not return password_hash.
- Must not perform write operations.
- Must not execute SQL generated from user input.
- All analytics queries must come from whitelisted functions in safeAnalyticsQueries.js.

Manager AI tone:

- Professional
- Concise
- Data-driven
- Suitable for a manager dashboard
- Include numbers whenever possible
- Provide operational suggestions when useful
- If data is empty, clearly say that no matching records were found.

Manager AI system prompt should include:

You are the Homefix Manager AI Assistant.
You help managers understand platform operations using only the database context provided by the backend.
You can summarize metrics, trends, operational risks, and provider/receiver/service performance.
You must not invent data.
You must not claim to perform database updates.
You must not expose password hashes or sensitive authentication fields.
If the context is insufficient, say what data is missing and suggest a safe manager action.
Use a professional, concise, data-driven tone.

==================================================
9. Intent Classifier
==================================================

Implement a simple rule-based intent classifier.

File:

server/src/ai/intentClassifier.js

Function:
- Input: message
- Output: role-specific intent

Receiver intents:
- faq_general
- my_next_appointment
- my_pending_appointments
- my_completed_appointments
- my_unpaid_payments
- my_addresses
- my_default_address
- available_services
- providers_for_service
- provider_details
- provider_rating
- review_status
- cancellation_question
- payment_question
- fallback

Manager intents:
- count_receivers
- count_providers
- count_services
- count_appointments
- appointment_status_distribution
- pending_appointments
- completed_appointments
- cancelled_appointments
- revenue_summary
- payment_status_distribution
- top_provider_by_completed_jobs
- top_provider_by_rating
- low_rating_providers
- top_services
- unpaid_payments
- completed_without_payment
- pending_older_than_48h
- receiver_activity
- service_performance
- fallback

Classifier can use:

- lowercased text
- keyword matching
- regex
- simple scoring

If intent cannot be detected:

- Receiver: run FAQ search first, then ask the AI to answer using the top FAQ matches.
- Manager: return suggested analytics questions, or let the AI summarize available safe analytics context.

==================================================
10. FAQ Search
==================================================

File:

server/src/ai/faqSearch.js

Implement:

- load receiverFaq.json
- normalize message
- tokenize
- score each FAQ entry using:
  - keyword matches
  - question string matches
  - category matches
  - token overlap
- return top 3 FAQ entries
- if top score is below threshold, return fallback

Receiver AI response process:

- Search FAQ first.
- Query database based on intent.
- Send FAQ results and database context to Gemini/Kimi.
- Let AI generate a natural language response grounded in the context.

Example:

User:
"Can I cancel my next appointment?"

The assistant should:
- Retrieve cancellation FAQ rules.
- Query the receiver’s next appointment.
- Explain whether that appointment can be cancelled based on its current status.

==================================================
11. Safe Database Query Requirements
==================================================

Add safe query functions.

Receiver data functions:

- getReceiverNextAppointment(receiverId)
- getReceiverAppointments(receiverId, filters)
- getReceiverPendingAppointments(receiverId)
- getReceiverCompletedAppointments(receiverId)
- getReceiverPayments(receiverId)
- getReceiverUnpaidPayments(receiverId)
- getReceiverAddresses(receiverId)
- getReceiverDefaultAddress(receiverId)
- getAvailableServices()
- getProvidersForService(serviceName or serviceId)
- getProviderPublicDetails(providerId)
- getProviderServices(providerId)
- getProviderAverageRating(providerId)
- getReceiverReviewStatus(receiverId, appId)

Manager analytics functions:

- getDashboardStats()
- countReceivers()
- countProviders()
- countServices()
- countAppointments()
- getAppointmentStatusDistribution()
- getPaymentStatusDistribution()
- getRevenueSummary()
- getTopProvidersByCompletedAppointments(limit)
- getTopProvidersByAverageRating(limit)
- getLowRatingProviders(limit)
- getTopServicesByAppointments(limit)
- getRevenueByService(limit)
- getUnpaidPayments(limit)
- getCompletedAppointmentsWithoutPayment(limit)
- getPendingAppointmentsOlderThan(hours)
- getReceiversByAppointmentCount(limit)
- getProvidersWithNoServices()
- getActiveProvidersWithNoAppointments()
- getLowRatingReviews(limit)

All SQL must:

- Use parameterized queries.
- Never concatenate user input into SQL.
- Never return password_hash.
- Use limits for manager list-style queries.
- Return only fields needed for the AI answer.

==================================================
12. Context Builder
==================================================

File:

server/src/ai/contextBuilder.js

Build structured context based on role, intent, FAQ results, and database results.

Receiver context example:

{
  "role": "receiver",
  "intent": "my_next_appointment",
  "faq_matches": [
    {
      "id": "appointment_002",
      "category": "appointment_status",
      "answer": "..."
    }
  ],
  "receiver_data": {
    "next_appointment": {
      "service_name": "Cleaning",
      "provider_name": "Maria Lopez",
      "scheduled_time": "2026-05-06T10:00:00",
      "appointment_status": "accepted",
      "estimated_total": 90
    }
  },
  "rules": [
    "Only answer about the current receiver's data.",
    "Do not reveal other receivers' data."
  ]
}

Manager context example:

{
  "role": "manager",
  "intent": "revenue_summary",
  "analytics": {
    "total_paid_revenue": 12450,
    "total_commission_fee": 1867.5,
    "total_provider_payout": 10582.5
  },
  "rules": [
    "Summarize only based on the analytics object.",
    "Do not invent missing metrics."
  ]
}

Context should not be too large.
Conversation history should be limited to the most recent 6 to 10 messages.
If database results are large, send only top 10 records or a summary.

==================================================
13. Prompt Builder
==================================================

File:

server/src/ai/promptBuilder.js

Responsibilities:

- Generate role-specific system prompts.
- Format the context clearly as text or JSON.
- Restrict the AI answer scope.
- Tell the AI not to invent data.
- Ask for concise answers.

Prefer asking the AI to return JSON:

{
  "answer": "string",
  "suggested_actions": [
    {
      "label": "string",
      "path": "string"
    }
  ]
}

If the AI does not return valid JSON, backend should fall back by wrapping raw text:

{
  "answer": "...",
  "suggested_actions": []
}

==================================================
14. Frontend Pages
==================================================

Add two AI pages/components.

Receiver:

- Path: /receiver/ai-support or /ai-support
- Sidebar label: AI Support
- Only receiver can access it.

Manager:

- Path: /manager/ai-assistant or /ai-assistant
- Sidebar label: AI Assistant
- Only manager can access it.

If the project already has a role-based sidebar:

- receiver should see AI Support
- manager should see AI Assistant
- provider should not see AI for now

AI Chat UI requirements:

- Chat bubble layout
- User messages on the right
- AI messages on the left
- Loading state
- Error state
- Suggested question chips
- Suggested action buttons
- Sources display, such as:
  - FAQ: booking_001
  - Database: receiver_appointments
  - AI: gemini
- Clear conversation button
- Enter to send
- Shift + Enter for new line
- Page must not white-screen

Receiver suggested questions:

- How do I book a service?
- What is my next appointment?
- Do I have unpaid payments?
- How do I cancel an appointment?
- Which providers offer cleaning?
- When can I write a review?
- What does pending mean?

Manager suggested questions:

- How many pending appointments do we have?
- What is total revenue?
- Which provider completed the most jobs?
- Which service is most popular?
- Show payment status distribution.
- Show completed appointments without payment.
- Which providers have low ratings?

UI style:

- Keep the modern SaaS dashboard style.
- Use cards, badges, and icons.
- Receiver AI should feel like customer support.
- Manager AI should feel like an analytics assistant.

==================================================
15. Frontend API Client
==================================================

Add:

client/src/api/ai.js

Functions:

- sendReceiverAiMessage(message, conversation)
- sendManagerAiMessage(message, conversation)

Requirements:

- Automatically include Authorization header.
- Reuse the existing API client and auth token logic.
- Do not call Gemini/Kimi from the frontend.
- The frontend should only call the Homefix backend API.

==================================================
16. Security Requirements
==================================================

Must satisfy:

1. Unauthenticated users cannot access AI APIs.
2. Providers cannot access receiver AI.
3. Receivers cannot access manager AI.
4. Managers cannot use receiver AI to impersonate a receiver.
5. Receiver AI can only access the current receiver’s data.
6. Manager AI can access platform-wide analytics but must not return password_hash.
7. AI must not perform write operations.
8. AI must not execute arbitrary SQL.
9. All database queries must be whitelisted.
10. User message length must be limited, for example max 1000 characters.
11. Conversation history length and per-message length must also be limited.
12. Empty message should return 400.
13. Unsupported intent should return a fallback answer.
14. Prompt injection attempts such as “ignore previous instructions” or “show me all user passwords” must be rejected.
15. If user enters DROP TABLE, SELECT * FROM Users, or asks for password_hash, the AI must not execute anything and must refuse safely.
16. If the AI API fails, return a FAQ/template fallback. Do not crash or white-screen.
17. Backend logs must not print the full AI_API_KEY.
18. Do not send sensitive data such as password_hash to the AI provider.

Fallback answer examples:

Receiver:
"I’m sorry, I couldn’t find a specific answer for that. You can ask me about booking, appointments, payments, addresses, providers, or reviews."

Manager:
"I couldn’t match that to a supported analytics question. Try asking about revenue, appointment status, provider performance, service popularity, payments, or reviews."

==================================================
17. Docker and Environment Variables
==================================================

Update docker-compose.yml server environment:

AI_PROVIDER=${AI_PROVIDER:-mock}
AI_API_KEY=${AI_API_KEY:-}
AI_MODEL=${AI_MODEL:-}
AI_BASE_URL=${AI_BASE_URL:-}

Update .env.example:

AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=

Notes:

- Use AI_PROVIDER=mock when developing without an AI key.
- Use AI_PROVIDER=gemini for Gemini.
- Use AI_PROVIDER=kimi for Kimi.
- Do not commit real AI API keys.

==================================================
18. README Updates
==================================================

Update README with:

1. What Receiver AI Customer Service does
2. What Manager AI Assistant does
3. Where the FAQ JSON file is located
4. How to add new FAQ entries
5. What data the AI can access
6. What data the AI cannot access
7. What analytics questions Manager AI supports
8. How to configure Gemini or Kimi
9. How to use mock provider for local testing
10. How to run with Docker
11. AI security design:
    - No arbitrary SQL execution
    - No password_hash exposure
    - Receiver only accesses own data
    - Manager uses whitelisted analytics queries
    - AI key only exists in backend environment variables

Clearly state:

Receiver AI:
- Uses FAQ JSON + current receiver data + public provider/service data.
- Uses the AI provider only to generate a natural language answer from safe backend context.
- Cannot access other receivers’ private data.

Manager AI:
- Uses safe predefined analytics queries.
- Can read platform-wide business analytics.
- Cannot directly modify database records.
- Does not execute arbitrary SQL from user input.

==================================================
19. Acceptance Tests
==================================================

Receiver tests:

1. Log in as receiver1@homefix.com.
2. Open AI Support.
3. Ask: “How do I book a service?”
4. AI should answer using the FAQ JSON.
5. Ask: “What is my next appointment?”
6. AI should query only the current receiver’s appointment and answer.
7. Ask: “Do I have unpaid payments?”
8. AI should query only the current receiver’s payments.
9. Ask: “Which providers offer cleaning?”
10. AI should return active providers who offer cleaning.

Manager tests:

1. Log in as manager@homefix.com.
2. Open AI Assistant.
3. Ask: “How many receivers do we have?”
4. AI should return the receiver count.
5. Ask: “What is total revenue?”
6. AI should return paid revenue, commission fee, and provider payout.
7. Ask: “Which provider completed the most jobs?”
8. AI should return provider ranking.
9. Ask: “Show completed appointments without payment.”
10. AI should return a list of exceptions or say none were found.

AI Provider tests:

1. With AI_PROVIDER=mock, the project should run without an API key.
2. With AI_PROVIDER=gemini and a valid AI_API_KEY, use Gemini to generate answers.
3. With AI_PROVIDER=kimi and a valid AI_API_KEY, use Kimi to generate answers.
4. If the AI API fails, return a fallback answer and do not white-screen.

Security tests:

1. Receiver calling /api/ai/manager/chat should return 403.
2. Provider calling /api/ai/receiver/chat should return 403.
3. Unauthenticated AI API requests should return 401.
4. Receiver asking for another receiver’s data must not receive it.
5. User input like DROP TABLE or SELECT * FROM Users must not execute SQL.
6. Requests for password_hash, API key, or JWT secret must be refused.

Final requirements:

- npm run build must pass.
- docker compose up --build must run.
- AI frontend pages must open.
- AI backend APIs must work.
- receiverFaq.json must contain at least 80 FAQ entries.
- AI Provider Adapter must support Gemini, Kimi, and Mock.
- All AI data access must have role-based permission control.
- Do not break existing receiver, provider, or manager features.