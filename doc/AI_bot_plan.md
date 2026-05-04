请在我现有的 Homefix 全栈项目基础上，新增两个 AI 功能模块：

1. Receiver AI Customer Service
2. Manager AI Assistant

项目技术栈：
- Frontend: React.js / Vite
- Backend: Node.js + Express.js
- Database: MySQL
- Deployment: Docker
- AI API: 可能使用 Gemini 或 Kimi，后端需要做成可配置的 AI Provider Adapter

请不要重写整个项目。请在现有代码结构上扩展功能。

==================================================
一、功能目标
==================================================

Homefix 是一个上门服务预约平台，有三种角色：

- manager
- provider
- receiver

现在需要新增 AI 聊天助手功能。

Receiver AI Customer Service：
- 面向 receiver，也就是顾客。
- 用来回答日常使用问题、预约问题、支付问题、评价问题、取消预约问题、服务说明问题。
- 项目内新增一个 JSON 文件，里面编造尽可能详细的 FAQ 数据。
- Receiver 提问时，AI 应该优先结合 FAQ JSON 找答案。
- AI 也可以访问当前 receiver 自己的数据，例如自己的 appointments、addresses、payments、reviews。
- AI 也可以访问公开 provider 数据，例如 provider 名字、状态、提供的服务、价格、评分。
- Receiver AI 严禁访问其他 receiver 的私有数据。

Manager AI Assistant：
- 面向 manager。
- 可以访问整个数据库的业务数据。
- 可以回答平台统计类问题，例如：
  - 总共有多少 receivers
  - 总共有多少 providers
  - 今天/本周/本月有多少 appointments
  - pending appointments 有多少
  - 哪个 provider 完成订单最多
  - 哪个 service 最受欢迎
  - 总收入是多少
  - 平台佣金是多少
  - 哪些 appointments cancelled/no_show 较多
  - 哪些 providers rating 低
  - 哪些 receivers 活跃度高
- Manager AI 应该可以基于数据库数据进行统计回答。
- Manager AI 严禁执行危险 SQL，例如 DROP、DELETE、UPDATE、INSERT。
- Manager AI 只做查询、分析、总结，不直接修改数据库。

==================================================
二、AI 总体架构要求
==================================================

请实现一个安全的 AI 架构，不要让 AI 直接访问数据库，也不要把用户输入直接拼成 SQL。

推荐架构：

User Message
→ Auth & Role Check
→ Intent Classifier
→ FAQ Retrieval
→ Safe Data Resolver
→ Context Builder
→ AI Provider Adapter
→ Response Formatter
→ Frontend Chat UI

核心原则：

1. AI 不能直接执行 SQL。
2. 所有数据库查询必须通过后端预定义的 safe query functions。
3. 用户输入不能拼接到 SQL 中。
4. Receiver 只能访问自己的数据。
5. Manager 可以访问全平台统计数据，但必须通过白名单查询。
6. AI API key 只能存在后端环境变量中，不能暴露给前端。
7. 前端只调用后端 `/api/ai/...` 接口。
8. 如果 AI API 不可用，系统要有 fallback answer，不要崩溃。
9. FAQ JSON 仍然要存在，用作 grounding knowledge。
10. AI 回答时应该尽量基于 FAQ 和数据库结果，不要凭空编造。

==================================================
三、AI Provider Adapter 要求
==================================================

请新增一个可切换的 AI Provider Adapter。

建议文件：

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

环境变量：

AI_PROVIDER=gemini 或 kimi 或 mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=

说明：

1. AI_PROVIDER=gemini 时，调用 Gemini API。
2. AI_PROVIDER=kimi 时，调用 Kimi API。
3. AI_PROVIDER=mock 时，不调用外部 API，返回本地模板答案，用于没有 API key 的开发环境。
4. 如果 AI_API_KEY 缺失，自动 fallback 到 mockProvider，不要让项目启动失败。
5. 不要在代码中硬编码 API key。
6. 不要在前端暴露 AI_API_KEY。
7. Docker 和 README 中要说明如何配置这些环境变量。

aiProvider.js 应该提供统一方法：

generateAiResponse({
  role,
  userMessage,
  systemPrompt,
  context,
  conversationHistory
})

不管底层是 Gemini、Kimi 还是 mock，controller/service 都只调用这个统一接口。

==================================================
四、AI 调用方式要求
==================================================

不要让 LLM 自己决定查什么数据库。

正确流程是：

1. 后端先验证用户身份和角色。
2. 后端根据 message 判断 intent。
3. 后端根据 intent 调用安全的数据库查询函数。
4. 后端从 FAQ JSON 中检索相关 FAQ。
5. 后端把 FAQ 命中结果和数据库查询结果整理成 context。
6. 后端把 context + user message 发给 Gemini/Kimi。
7. Gemini/Kimi 只负责把已有 context 整理成自然语言回答。
8. 如果 context 中没有答案，AI 应该说不知道或建议用户去相关页面。

禁止：

- 禁止把数据库连接交给 AI。
- 禁止让 AI 生成并执行 SQL。
- 禁止让 AI 返回其他用户隐私数据。
- 禁止让 AI 编造不存在的 appointment/payment/provider 信息。
- 禁止前端直接调用 Gemini/Kimi。

==================================================
五、后端新增 API
==================================================

Receiver AI API：

POST /api/ai/receiver/chat

权限：
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

Manager AI API：

POST /api/ai/manager/chat

权限：
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
六、receiverFaq.json 要求
==================================================

请新建：

server/src/data/receiverFaq.json

里面要尽可能详细地编造 Homefix 顾客日常会问的问题和答案。

JSON 结构建议：

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

FAQ 至少覆盖这些 category：

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

每个 category 至少 5 条 FAQ。
总 FAQ 数量至少 80 条。
每条 FAQ 要有：
- id
- category
- questions
- keywords
- answer
- related_actions

FAQ 内容要贴合 Homefix 业务，不要写成泛泛而谈。

==================================================
七、Receiver AI 能力要求
==================================================

Receiver AI 能回答的问题类型：

A. FAQ 类
- 如何预约
- 如何取消
- 如何支付
- 如何评价
- appointment status 是什么意思
- 如何添加地址
- 如何选择 provider
- 如何查看价格
- 如何保护隐私
- AI 会使用哪些数据

B. 当前 receiver 自己的数据
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

C. Provider / Service 公开数据
- Which providers offer cleaning?
- Who is available for plumbing?
- What services does provider X offer?
- What is the hourly rate for provider X?
- Which providers are active?
- Which provider has the best rating?
- What services are available?

Receiver AI 数据访问限制：
- 只能查询当前 req.user.receiver_id 对应的数据
- 不能查询其他 receiver 的 appointments、payments、addresses、reviews
- 可以查询公开 provider 信息
- 可以查询 services
- 可以查询 Provider_Services 的公开 hourly rate
- 不返回 password_hash
- 不返回其他 receiver 的隐私字段

Receiver AI 回答风格：
- 友好
- 简洁
- 像客服
- 如果找到相关数据，要直接回答
- 如果没找到，要告诉用户可以去哪个页面操作
- 如果问题超出范围，提示联系 manager/support

Receiver AI system prompt 要包含：

You are the Homefix AI Customer Service Assistant for receivers.
You can answer using only the provided FAQ context, the current receiver's own data, and public provider/service data.
Never reveal another receiver's private data.
Never invent appointments, payments, addresses, or reviews.
If the provided context does not contain the answer, say that you do not have enough information and suggest a safe next action.
Keep the tone friendly, concise, and helpful.

==================================================
八、Manager AI 能力要求
==================================================

Manager AI 应能回答的问题类型：

A. 全局数量统计
- How many receivers do we have?
- How many providers do we have?
- How many services do we offer?
- How many appointments are in the system?
- How many payments are paid?
- How many reviews are there?

B. Appointment 统计
- How many pending appointments?
- How many completed appointments?
- How many cancelled appointments?
- How many appointments are scheduled today?
- How many appointments this week?
- How many appointments this month?
- What is the appointment status distribution?
- Which service has the most appointments?
- Which provider has the most appointments?

C. Revenue / Payment 统计
- What is total revenue?
- What is total paid revenue?
- What is unpaid amount?
- What is total commission fee?
- What is total provider payout?
- Which provider earned the most?
- Which appointments are unpaid?
- What is the payment status distribution?

D. Provider performance
- Which provider completed the most jobs?
- Which provider has the highest average rating?
- Which provider has the lowest rating?
- Which provider has the most cancelled appointments?
- Which provider has no services?
- Which active providers have no appointments?

E. Receiver behavior
- Which receiver booked the most appointments?
- Which receiver has unpaid payments?
- Which receiver gave the most reviews?
- Which receivers have no appointments?
- Which receiver has the highest completed appointment count?

F. Service analytics
- Most popular service
- Least used service
- Average hourly rate by service
- Providers per service
- Revenue by service

G. Reviews
- Average rating overall
- Average provider rating
- Low rating reviews
- Reviews by direction
- Appointments without reviews
- Providers with low average rating

H. Operational warnings
- Show pending appointments older than 2 days
- Show completed appointments without payment
- Show paid appointments without review
- Show providers with inactive/suspended status
- Show appointments with no_show
- Show refunded payments

Manager AI 数据访问权限：
- 可以读取所有业务表
- 可以做统计聚合
- 不返回 password_hash
- 不执行写入操作
- 不根据用户输入执行任意 SQL
- 所有 analytics query 必须通过 safeAnalyticsQueries.js 中的白名单函数

Manager AI 回答风格：
- 专业
- 数据驱动
- 适合 manager dashboard
- 尽量给出数字
- 如果适合，给出 operational suggestion
- 如果数据为空，要明确说明没有找到相关记录

Manager AI system prompt 要包含：

You are the Homefix Manager AI Assistant.
You help managers understand platform operations using only the database context provided by the backend.
You can summarize metrics, trends, operational risks, and provider/receiver/service performance.
You must not invent data.
You must not claim to perform database updates.
You must not expose password hashes or sensitive authentication fields.
If the context is insufficient, say what data is missing and suggest a safe manager action.
Use a professional, concise, data-driven tone.

==================================================
九、Intent Classifier 要求
==================================================

请实现简单 intent classifier，不需要机器学习。

server/src/ai/intentClassifier.js

功能：
- 输入 message
- 输出 role-specific intent

Receiver intents 示例：
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

Manager intents 示例：
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

Intent classifier 可以使用：
- lowercased text
- keyword matching
- regex
- simple scoring

如果无法判断 intent：
- Receiver：先走 FAQ search，再调用 AI 基于 FAQ top results 回答
- Manager：返回可询问的问题示例，或者让 AI 基于可用 analytics summary 给出安全建议

==================================================
十、FAQ Search 要求
==================================================

server/src/ai/faqSearch.js

请实现：
- load receiverFaq.json
- normalize message
- tokenize
- 对每个 FAQ 计算 score：
  - keyword 命中
  - question 字符串包含
  - category 命中
  - token overlap
- 返回 top 3 FAQ
- 如果最高分低于阈值，返回 fallback

Receiver AI 回答时：
- 先找 FAQ
- 再根据 intent 查数据库
- 把 FAQ 和数据库 context 一起给 Gemini/Kimi
- 让 AI 结合 context 生成自然语言答案

例如用户问：
"Can I cancel my next appointment?"

AI 应该：
- 从 FAQ 找 cancellation 规则
- 查询 receiver 的 next appointment
- 回答该 appointment 当前 status 是否允许取消

==================================================
十一、数据库查询要求
==================================================

请新增安全 query functions。

Receiver data functions：
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

Manager analytics functions：
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

所有 SQL 要：
- 使用参数化查询
- 不拼接用户输入到 SQL
- 不返回 password_hash
- 对 manager 查询加 limit，避免返回过多数据
- 只返回 AI 回答需要的字段，不要返回整表所有字段

==================================================
十二、Context Builder 要求
==================================================

请实现：

server/src/ai/contextBuilder.js

功能：
根据 role、intent、FAQ result、database result 生成结构化 context。

Receiver context 示例：

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

Manager context 示例：

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

Context 不要太大。
Conversation history 最多保留最近 6 到 10 条消息。
如果数据库结果很多，只传 top 10 或 summary。

==================================================
十三、Prompt Builder 要求
==================================================

请实现：

server/src/ai/promptBuilder.js

功能：
- 根据 role 生成 system prompt
- 把 context 格式化成清楚的文本或 JSON
- 限制 AI 回答范围
- 要求 AI 不编造数据
- 要求 AI 输出简洁答案

建议把 AI 输出格式固定为 JSON，便于前端解析：

{
  "answer": "string",
  "suggested_actions": [
    {
      "label": "string",
      "path": "string"
    }
  ]
}

如果 AI 返回的不是合法 JSON，后端要 fallback，把原始文本包装成：

{
  "answer": "...",
  "suggested_actions": []
}

==================================================
十四、前端页面要求
==================================================

请新增两个 AI 页面或组件：

Receiver:
- 页面路径：/receiver/ai-support 或 /ai-support
- Sidebar 显示：AI Support
- 仅 receiver 可访问

Manager:
- 页面路径：/manager/ai-assistant 或 /ai-assistant
- Sidebar 显示：AI Assistant
- 仅 manager 可访问

如果当前项目已经有 role-based sidebar，请按 role 动态显示：
- receiver 显示 AI Support
- manager 显示 AI Assistant
- provider 暂时不显示 AI，除非后续扩展

AI Chat UI 要求：
- 聊天气泡布局
- 用户消息靠右
- AI 消息靠左
- 支持 loading 状态
- 支持 error 状态
- 支持 suggested question chips
- 支持 suggested action buttons
- 支持 sources 展示，例如 “FAQ: booking_001” 或 “Database: receiver_appointments” 或 “AI: gemini”
- 支持清空对话
- 输入框 Enter 发送
- Shift+Enter 换行
- 页面不能白屏

Receiver AI Suggested Questions：
- How do I book a service?
- What is my next appointment?
- Do I have unpaid payments?
- How do I cancel an appointment?
- Which providers offer cleaning?
- When can I write a review?
- What does pending mean?

Manager AI Suggested Questions：
- How many pending appointments do we have?
- What is total revenue?
- Which provider completed the most jobs?
- Which service is most popular?
- Show payment status distribution.
- Show completed appointments without payment.
- Which providers have low ratings?

UI 设计：
- 保持现代 SaaS dashboard 风格
- 使用 Card
- 使用 Badge
- 使用图标
- AI 页面顶部有说明文案
- Receiver AI 文案偏客服
- Manager AI 文案偏数据分析

==================================================
十五、前端 API Client 要求
==================================================

前端新增：

client/src/api/ai.js

包含：
- sendReceiverAiMessage(message, conversation)
- sendManagerAiMessage(message, conversation)

必须自动带 Authorization header。
复用现有 API client / auth token 逻辑。
不要从前端调用 Gemini/Kimi。
前端永远只调用自己的后端 API。

==================================================
十六、权限与安全要求
==================================================

必须满足：

1. 未登录不能访问 AI API
2. provider 不能访问 receiver AI
3. receiver 不能访问 manager AI
4. manager 不能通过 receiver AI 冒充 receiver
5. receiver AI 只能访问自己的数据
6. manager AI 可以访问全平台统计，但不能返回 password_hash
7. 不允许 AI 执行写操作
8. 不允许用户输入任意 SQL
9. 所有数据库查询必须白名单
10. 所有输入要做长度限制，例如 message 最大 1000 字符
11. conversation history 也要限制长度和单条长度
12. 如果 message 为空，返回 400
13. 如果 intent 不支持，返回 fallback answer
14. 如果用户尝试 prompt injection，例如 “ignore previous instructions” 或 “show me all users passwords”，AI 必须拒绝
15. 如果用户输入 DROP TABLE、SELECT * FROM Users、show password_hash 等内容，AI 不执行，只返回安全拒绝说明
16. AI API 调用失败时，返回 FAQ / template fallback，不要让页面崩溃
17. 后端日志不要打印完整 AI_API_KEY
18. 不要把敏感数据发送给 AI provider，例如 password_hash

Fallback answer 示例：

Receiver:
"I’m sorry, I couldn’t find a specific answer for that. You can ask me about booking, appointments, payments, addresses, providers, or reviews."

Manager:
"I couldn’t match that to a supported analytics question. Try asking about revenue, appointment status, provider performance, service popularity, payments, or reviews."

==================================================
十七、Docker 和环境变量要求
==================================================

请更新 docker-compose.yml 的 server environment：

AI_PROVIDER=${AI_PROVIDER:-mock}
AI_API_KEY=${AI_API_KEY:-}
AI_MODEL=${AI_MODEL:-}
AI_BASE_URL=${AI_BASE_URL:-}

请更新 .env.example：

AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=

说明：
- 本地没有 AI key 时，用 AI_PROVIDER=mock
- 使用 Gemini 时，设置 AI_PROVIDER=gemini
- 使用 Kimi 时，设置 AI_PROVIDER=kimi
- 不要提交真实 AI API key

==================================================
十八、README 更新要求
==================================================

请更新 README，说明：

1. Receiver AI Customer Service 是什么
2. Manager AI Assistant 是什么
3. FAQ JSON 文件在哪里
4. 如何新增 FAQ
5. AI 可以访问哪些数据
6. AI 不能访问哪些数据
7. Manager AI 支持哪些统计问题
8. 如何配置 Gemini 或 Kimi
9. 如何使用 mock provider 本地测试
10. 如何用 Docker 运行
11. AI 安全设计：
   - 不执行任意 SQL
   - 不返回 password_hash
   - receiver 只能访问自己的数据
   - manager 通过白名单 analytics query 访问统计
   - AI key 只在后端环境变量中

请特别写明：

Receiver AI:
- Uses FAQ JSON + current receiver data + public provider/service data.
- Uses AI provider only to generate a natural language response from safe backend context.
- Cannot access other receivers’ private data.

Manager AI:
- Uses safe predefined analytics queries.
- Can read platform-wide business analytics.
- Cannot directly modify database records.
- Does not execute arbitrary SQL from user input.

==================================================
十九、验收标准
==================================================

请保证以下流程可运行：

Receiver 测试：
1. 使用 receiver1@homefix.com 登录
2. 打开 AI Support
3. 输入 “How do I book a service?”
4. AI 从 FAQ JSON 返回 booking 指南
5. 输入 “What is my next appointment?”
6. AI 查询当前 receiver 的 appointment 并回答
7. 输入 “Do I have unpaid payments?”
8. AI 只查询当前 receiver 的 payments
9. 输入 “Which providers offer cleaning?”
10. AI 返回提供 cleaning 的 active providers

Manager 测试：
1. 使用 manager@homefix.com 登录
2. 打开 AI Assistant
3. 输入 “How many receivers do we have?”
4. AI 返回 receiver 数量
5. 输入 “What is total revenue?”
6. AI 返回 paid revenue、commission fee、provider payout
7. 输入 “Which provider completed the most jobs?”
8. AI 返回 provider 排名
9. 输入 “Show completed appointments without payment.”
10. AI 返回异常列表或说明没有异常

AI Provider 测试：
1. AI_PROVIDER=mock 时，项目不需要 API key 也能运行
2. AI_PROVIDER=gemini 且 AI_API_KEY 有值时，使用 Gemini 生成回答
3. AI_PROVIDER=kimi 且 AI_API_KEY 有值时，使用 Kimi 生成回答
4. AI API 失败时，返回 fallback，不要白屏

安全测试：
1. receiver 访问 /api/ai/manager/chat 应返回 403
2. provider 访问 /api/ai/receiver/chat 应返回 403
3. 未登录访问任何 AI API 应返回 401
4. receiver 问其他 receiver 的数据时，AI 不应该返回
5. 用户输入 DROP TABLE 或 SELECT * FROM Users 时，AI 不执行 SQL，只返回拒绝说明
6. 用户要求 password_hash、API key、JWT secret 时，AI 必须拒绝

最终要求：
- npm run build 通过
- docker compose up --build 可运行
- 前端 AI 页面可打开
- 后端 AI API 可用
- FAQ JSON 至少 80 条
- AI Provider Adapter 可切换 Gemini / Kimi / Mock
- 所有 AI 查询都有权限控制
- 不破坏现有 receiver/provider/manager 功能