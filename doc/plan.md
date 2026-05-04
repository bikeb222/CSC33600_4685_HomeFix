# Homefix Service Booking Platform Project Plan

## Technical Stack

- Database: MySQL 8.0
- Front End: React.js
- Back End: Node.js + Express.js
- Deployment: Docker
- Hosting Platform: PlanetScale or Aiven
- Reporting: one-click Excel export, with Tableau-ready data endpoints or views
- AI Assistant: configurable backend provider adapter, currently tested with Kimi/Moonshot-compatible settings

## Project Goal

Build a full-stack web application similar to a home maintenance and on-demand service booking platform. The system includes receivers, providers, services, addresses, appointments, payments, reviews, and reports.

Receivers are customers. Providers are service professionals. Services are service categories. A receiver can choose a service, select a qualified provider, pick an address, and create an appointment. After service completion, the receiver can pay and submit a review.

## Current Implemented Design Update

The implemented application now uses a shared `Users` login table plus role-specific subtype tables:

- `Users`: authentication, email, display name, role, account status, and shared profile fields.
- `Receivers`: receiver-only fields such as language and wallet balance.
- `Providers`: provider-only fields such as provider status and biography.
- `Managers`: manager-only department and administrative identity.

The database and application now include these additional business rules:

- Provider skills are stored in `Provider_Services` and require manager approval before they can be booked.
- Appointment creation supports manager-created bookings for any receiver, receiver self-service bookings, and provider-side receiving/accepting of assigned appointments.
- Provider appointment times cannot overlap active appointments and cannot overlap provider unavailable blocks.
- Provider normal working hours are Monday through Friday, 8:00 AM to 5:00 PM.
- After-hours bookings add a 20% surcharge, weekend bookings add a 10% surcharge, and weekend after-hours bookings add both effects.
- Appointment payment is based on actual service hours after the provider has accepted the appointment and recorded actual hours.
- Payments deduct receiver wallet balance when paid and record platform commission and provider payout.
- Reviews are allowed only after appointment completion, with one receiver-to-provider review and one provider-to-receiver review per appointment.

The final EER diagram must show both the operational entities and the revenue model. The current revenue streams are:

- Receiver payment for completed appointments through `Payments.total_amount`.
- Homefix platform commission through `Payments.commission_fee`.
- Provider net payout through `Payments.provider_payout`.
- Premium time-window revenue through `Appointments.schedule_surcharge_rate` and `Appointments.schedule_surcharge_reason`.
- Receiver wallet recharge support through `Receivers.wallet_balance`.

The schema is designed to satisfy at least Second Normal Form (2NF). Attributes are atomic, many-to-many provider skill data is separated into `Provider_Services`, and non-key attributes depend on the whole primary key of their table.

## AI Assistant Design Update

The project includes two AI modules:

- Receiver AI Customer Service for receiver-facing support questions.
- Manager AI Assistant for platform analytics and operational questions.

The AI architecture is intentionally backend-controlled:

- The frontend calls only `/api/ai/receiver/chat` or `/api/ai/manager/chat`.
- API keys stay in backend environment variables and are never exposed to the frontend.
- The AI provider is configured through `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL`.
- Kimi/Moonshot is supported through a configurable provider adapter. The current intended model is `moonshot-v1-128k`.
- If the external AI API fails or is not configured, the backend can fall back without crashing the application.

The AI does not directly access the database and does not generate SQL. It uses:

- FAQ grounding data for common support answers.
- Safe receiver query functions scoped to the authenticated receiver.
- Safe manager analytics query functions for read-only platform summaries.
- Intent classification and response formatting before calling the external model.

Receiver AI can access only the current receiver's appointments, addresses, payments, reviews, and public provider/service information. Manager AI can access platform-wide aggregate and operational data such as revenue, commission, payment status, appointment status, provider performance, service popularity, and incomplete-payment warnings.

## Database Requirements

Use MySQL. Do not use `ENUM`. All status fields should use `VARCHAR` with `CHECK` constraints.

Required tables:

### 1. Receivers

Fields:

- `receiver_id INT AUTO_INCREMENT PRIMARY KEY`
- `username VARCHAR(50) NOT NULL UNIQUE`
- `email VARCHAR(100) NOT NULL UNIQUE`
- `password_hash VARCHAR(255) NOT NULL`
- `phone VARCHAR(20)`
- `language VARCHAR(30)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### 2. Providers

Fields:

- `provider_id INT AUTO_INCREMENT PRIMARY KEY`
- `username VARCHAR(50) NOT NULL UNIQUE`
- `email VARCHAR(100) NOT NULL UNIQUE`
- `password_hash VARCHAR(255) NOT NULL`
- `phone VARCHAR(20)`
- `provider_status VARCHAR(20) NOT NULL DEFAULT 'active'`
- `biography VARCHAR(1000)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Check constraint:

```sql
provider_status IN ('active', 'resting', 'inactive', 'suspended')
```

### 3. Services

Fields:

- `service_id INT AUTO_INCREMENT PRIMARY KEY`
- `service_name VARCHAR(50) NOT NULL UNIQUE`
- `description VARCHAR(500)`

### 4. Provider_Services

This is the many-to-many bridge table between Providers and Services.

Fields:

- `provider_id INT NOT NULL`
- `service_id INT NOT NULL`
- `base_hourly_rate DECIMAL(8,2) NOT NULL`
- `approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'`
- `requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `reviewed_by INT NULL`
- `reviewed_at TIMESTAMP NULL`

Constraints:

- `PRIMARY KEY(provider_id, service_id)`
- `provider_id` foreign key references `Providers(provider_id)`
- `service_id` foreign key references `Services(service_id)`
- `reviewed_by` foreign key references `Managers(manager_id)`
- `CHECK base_hourly_rate >= 0`
- `CHECK approval_status IN ('pending', 'approved', 'rejected')`

Business meaning:

- One provider can offer many services.
- One service can be offered by many providers.
- Different providers can charge different hourly rates for the same service.
- Provider-created skills start as `pending`.
- Manager-reviewed skills become `approved` or `rejected`.
- Only approved provider-service pairs can be used for appointments.

### 4a. Provider_Unavailable_Blocks

Fields:

- `block_id INT AUTO_INCREMENT PRIMARY KEY`
- `provider_id INT NOT NULL`
- `start_time DATETIME NOT NULL`
- `end_time DATETIME NOT NULL`
- `reason VARCHAR(255)`
- `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

Constraints:

- `provider_id` foreign key references `Providers(provider_id)`
- `CHECK end_time > start_time`

Business meaning:

- Providers can mark personal unavailable time.
- Appointment creation rejects active appointments that overlap unavailable blocks.
- Unavailable blocks also cannot overlap existing active appointments.

### 5. Addresses

Fields:

- `address_id INT AUTO_INCREMENT PRIMARY KEY`
- `receiver_id INT NOT NULL`
- `street VARCHAR(255) NOT NULL`
- `city VARCHAR(100) NOT NULL`
- `state VARCHAR(50)`
- `zip_code VARCHAR(20)`
- `is_default BOOLEAN NOT NULL DEFAULT FALSE`

Constraints:

- `receiver_id` foreign key references `Receivers(receiver_id)`
- `UNIQUE(address_id, receiver_id)`
- Each receiver should have at most one default address.

Implementation note:

- The original design allowed a generated column for default-address uniqueness.
- The implemented MySQL 8 Docker schema uses a functional unique index instead:

```sql
CREATE UNIQUE INDEX uq_one_default_address_per_receiver
ON Addresses ((CASE WHEN is_default = TRUE THEN receiver_id ELSE NULL END));
```

This keeps the same business rule while remaining compatible with the tested MySQL 8.0.46 container.

### 6. Appointments

Fields:

- `app_id INT AUTO_INCREMENT PRIMARY KEY`
- `receiver_id INT NOT NULL`
- `provider_id INT NOT NULL`
- `service_id INT NOT NULL`
- `address_id INT NOT NULL`
- `appointment_status VARCHAR(20) NOT NULL DEFAULT 'pending'`
- `scheduled_time DATETIME NOT NULL`
- `hourly_rate_at_booking DECIMAL(8,2) NOT NULL`
- `schedule_surcharge_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000`
- `schedule_surcharge_reason VARCHAR(30) NOT NULL DEFAULT 'standard_hours'`
- `estimated_hours DECIMAL(5,2) NOT NULL`
- `actual_hours DECIMAL(5,2) NULL`
- `estimated_total DECIMAL(10,2) GENERATED ALWAYS AS (hourly_rate_at_booking * estimated_hours) STORED`
- `actual_total DECIMAL(10,2) GENERATED ALWAYS AS (hourly_rate_at_booking * COALESCE(actual_hours, estimated_hours)) STORED`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Constraints:

- `receiver_id` foreign key references `Receivers(receiver_id)`
- Composite foreign key `(provider_id, service_id)` references `Provider_Services(provider_id, service_id)`
- Composite foreign key `(address_id, receiver_id)` references `Addresses(address_id, receiver_id)`
- `CHECK appointment_status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'no_show')`
- `CHECK hourly_rate_at_booking >= 0`
- `CHECK schedule_surcharge_rate >= 0`
- `CHECK schedule_surcharge_reason IN ('standard_hours', 'after_hours', 'weekend', 'weekend_after_hours')`
- `CHECK estimated_hours > 0`
- `CHECK actual_hours IS NULL OR actual_hours > 0`

Business focus:

Appointments cannot freely choose any provider-service pair. The selected provider must actually offer the selected service. This is enforced by the composite foreign key to `Provider_Services(provider_id, service_id)`.

Additional implemented database triggers enforce:

- The provider-service pair must be approved.
- Active appointments require an active provider.
- A provider cannot have overlapping active appointments.
- Active appointments cannot overlap provider unavailable blocks.

### 7. Payments

Fields:

- `payment_id INT AUTO_INCREMENT PRIMARY KEY`
- `app_id INT NOT NULL UNIQUE`
- `total_amount DECIMAL(10,2) NOT NULL`
- `commission_rate DECIMAL(5,4) NOT NULL`
- `commission_fee DECIMAL(10,2) GENERATED ALWAYS AS (total_amount * commission_rate) STORED`
- `provider_payout DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - (total_amount * commission_rate)) STORED`
- `payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid'`
- `payment_date TIMESTAMP NULL`

Constraints:

- `app_id` foreign key references `Appointments(app_id)`
- `CHECK total_amount >= 0`
- `CHECK commission_rate >= 0 AND commission_rate <= 1`
- `CHECK payment_status IN ('unpaid', 'paid', 'failed', 'refunded', 'partially_refunded')`
- `CHECK payment_status <> 'paid' OR payment_date IS NOT NULL`

Business meaning:

- One appointment can have at most one payment.
- This is represented by `Payments.app_id UNIQUE`.
- Payments can be created only after a completed appointment has actual service hours.
- `commission_fee` is Homefix platform revenue.
- `provider_payout` is the provider's net payout after platform commission.

### 8. Reviews

Fields:

- `review_id INT AUTO_INCREMENT PRIMARY KEY`
- `app_id INT NOT NULL`
- `rating INT NOT NULL`
- `review_direction VARCHAR(30) NOT NULL`
- `comment VARCHAR(1000)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Constraints:

- `app_id` foreign key references `Appointments(app_id)`
- `CHECK rating >= 1 AND rating <= 5`
- `CHECK review_direction IN ('receiver_to_provider', 'provider_to_receiver')`
- `UNIQUE(app_id, review_direction)`

Business meaning:

One appointment can have at most two reviews:

- `receiver_to_provider`
- `provider_to_receiver`

The same appointment cannot have duplicate reviews in the same direction.

Implemented database triggers enforce that reviews can be created or updated only for completed appointments.

## Back-End Requirements

Use Node.js and Express.js.

Recommended structure:

```text
server/
  src/
    app.js
    server.js
    config/db.js
    routes/
    controllers/
    services/
    models/
    middleware/
    utils/
  migrations/
  seed/
  package.json
```

Quality requirements:

- Use async/await.
- Use parameterized SQL queries to avoid SQL injection.
- Use centralized error handling middleware.
- Keep API logic separated into routes, controllers, services, and models.

### Receiver APIs

- `POST /api/receivers/register`
- `GET /api/receivers`
- `GET /api/receivers/:id`
- `PUT /api/receivers/:id`
- `DELETE /api/receivers/:id`

### Provider APIs

- `POST /api/providers/register`
- `GET /api/providers`
- `GET /api/providers/:id`
- `PUT /api/providers/:id`
- `DELETE /api/providers/:id`
- `GET /api/providers/:id/services`
- `POST /api/providers/:id/services`
- `DELETE /api/providers/:providerId/services/:serviceId`
- `GET /api/providers/:providerId/unavailable-times`
- `GET /api/providers/:providerId/unavailable-blocks`
- `POST /api/providers/:providerId/unavailable-blocks`
- `PUT /api/providers/:providerId/unavailable-blocks/:blockId`
- `DELETE /api/providers/:providerId/unavailable-blocks/:blockId`
- `GET /api/providers/service-approvals`
- `PUT /api/providers/:providerId/services/:serviceId/review`

### Service APIs

- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

### Address APIs

- `GET /api/receivers/:receiverId/addresses`
- `POST /api/receivers/:receiverId/addresses`
- `PUT /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `PUT /api/receivers/:receiverId/addresses/:addressId/default`

### Appointment APIs

- `POST /api/appointments`
- `GET /api/appointments`
- `GET /api/appointments/:id`
- `GET /api/receivers/:receiverId/appointments`
- `GET /api/providers/:providerId/appointments`
- `PUT /api/appointments/:id/status`
- `PUT /api/appointments/:id/actual-hours`
- `DELETE /api/appointments/:id`

Appointment creation validation:

- Receiver exists.
- Address belongs to the selected receiver.
- Provider-service pair exists in `Provider_Services`.
- Provider-service pair is manager-approved.
- `hourly_rate_at_booking` is calculated from `Provider_Services.base_hourly_rate` plus schedule surcharge.
- `estimated_hours` must be greater than 0.
- Provider cannot already have an active appointment during the selected time.
- Provider unavailable blocks cannot overlap the selected time.

### Payment APIs

- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/:id`
- `GET /api/appointments/:appointmentId/payment`
- `PUT /api/payments/:id/status`

Payment creation validation:

- One appointment can have at most one payment.
- Payment can be created only for a completed appointment with `actual_hours`.
- `total_amount` can default to appointment `actual_total`.
- `commission_rate` is a decimal, such as `0.15` for 15%.

### Review APIs

- `POST /api/reviews`
- `GET /api/reviews`
- `GET /api/appointments/:appointmentId/reviews`
- `GET /api/providers/:providerId/reviews`
- `DELETE /api/reviews/:id`

Review creation validation:

- `rating` must be 1 through 5.
- `review_direction` must be `receiver_to_provider` or `provider_to_receiver`.
- The same `app_id + review_direction` cannot be duplicated.
- Appointment must be completed.

### AI APIs

- `POST /api/ai/receiver/chat`
- `POST /api/ai/manager/chat`

AI validation and safety:

- The authenticated user role determines which assistant can be used.
- Receiver AI uses receiver-scoped safe query functions only.
- Manager AI uses read-only safe analytics functions only.
- The AI provider receives summarized context, not unrestricted database access.
- AI provider failures return safe fallback answers instead of crashing the API.

### Reporting APIs

- `GET /api/reports/appointments/export`
- `GET /api/reports/payments/export`
- `GET /api/reports/provider-performance/export`

Excel export requirements:

- Use `xlsx` or `exceljs`.
- Appointment report includes receiver, provider, service, scheduled time, status, and estimated total.
- Payment report includes total amount, commission fee, provider payout, and payment status.
- Provider performance report includes provider name, completed appointment count, average rating, and total payout.

## Front-End Requirements

Use React.js.

Recommended structure:

```text
client/
  src/
    App.jsx
    main.jsx
    api/
    pages/
    components/
    hooks/
    utils/
```

Front-end quality requirements:

- Centralize API calls.
- Forms should perform basic validation.
- API errors should display friendly messages.
- Tables should support search or simple filtering.
- The UI should be clean and suitable for a course demo.

Required pages:

### Dashboard

Show:

- Total receivers
- Total providers
- Total services
- Total appointments
- Total payments
- Total revenue
- Completed appointments
- Pending appointments

Dashboard content is role-aware:

- Manager dashboard shows platform totals, revenue, payments, provider performance, service performance, and operational warnings.
- Receiver dashboard shows the receiver's own appointments, payments, saved addresses, reviews, and recommended services.
- Provider dashboard shows assigned appointments, accepted/in-progress work, payouts, ratings, approved skills, pending skill approvals, and schedule conflicts.

### Receivers Page

Functions:

- View receiver list
- Create receiver
- Edit receiver
- Delete receiver
- View receiver addresses and appointments

### Providers Page

Functions:

- View provider list
- Create provider
- Edit provider
- Delete provider
- Add services to provider
- Set base hourly rate
- View provider appointments and reviews
- Manage provider unavailable schedule blocks
- Request new skills and track manager approval status

### Services Page

Functions:

- View service list
- Create service
- Edit service
- Delete service

### Appointments Page

Functions:

- Create appointment
- Select receiver
- Select receiver address
- Select service
- Filter available providers by selected service
- Filter available services by selected provider
- Automatically show base hourly rate
- Show unavailable provider times after a provider is selected
- Apply weekday after-hours and weekend surcharge rules
- Enter estimated hours
- Automatically calculate estimated total
- View appointment list
- Update appointment status
- Let providers record actual hours after accepting work

### Payments Page

Functions:

- Create payment for appointment
- View payment list
- Update payment status
- Show commission fee and provider payout

### Reviews Page

Functions:

- Add review for completed appointment
- Support both `receiver_to_provider` and `provider_to_receiver`
- View reviews

### Reports Page

Functions:

- Export appointments Excel
- Export payments Excel
- Export provider performance Excel
- Provide Tableau-ready data interface notes

### AI Assistant Pages

Functions:

- Receiver AI customer service answers questions about personal bookings, payments, addresses, reviews, providers, services, and Homefix rules.
- Manager AI assistant answers operational questions about revenue, commission, payment status, appointment status, provider performance, service popularity, warnings, and platform counts.
- Chat responses show grounding sources such as FAQ entries or database summaries.
- The UI must not expose API keys or raw SQL.

## Docker Requirements

Provide a Docker deployment setup with:

- `docker-compose.yml`
- `server/Dockerfile`
- `client/Dockerfile`
- MySQL service
- Environment variable example

Environment variables:

```env
DB_HOST=localhost
DB_PORT=33306
DB_USER=homefix_user
DB_PASSWORD=homefix_password
DB_NAME=homefix
PORT=5000
CLIENT_URL=http://localhost:5173
```

For Docker Compose, the host machine should connect to MySQL through `localhost:33306`. Containers should use the internal MySQL service address `mysql:3306`.

If using PlanetScale or Aiven:

- Store database connection information in `.env`.
- Do not write real passwords into code.
- If the hosted database does not support certain MySQL constraints or functional indexes, document the replacement strategy in the README.

## Seed Data Requirements

Provide seed data with at least:

- 5 receivers
- 5 providers
- 5 services
- Each provider linked to at least 2 services
- 10 addresses
- 10 appointments
- 4 paid payments tied to completed appointments with actual hours
- 8 reviews

The current seed data intentionally includes multiple appointment states such as pending, accepted, in progress, completed, and cancelled so the lifecycle can be demonstrated. Paid seed payments are limited to completed appointments that have actual service hours, matching the payment trigger rules.

## README Requirements

The README should clearly explain:

- Project overview
- Tech stack
- Database ERD
- Local run instructions
- Docker run instructions
- Environment variable configuration
- API list
- Reporting export instructions
- Tableau connection instructions
- Database design highlights
- Simple testing instructions

## Final Deliverables

The final project should include:

- MySQL `schema.sql`
- `seed.sql` or seed script
- Express back end
- React front end
- Excel export
- Docker deployment files
- `README.md`
- Simple test instructions

The priority is to ensure the project runs locally, has complete core functionality, uses clear code structure, and is suitable for database course presentation.
