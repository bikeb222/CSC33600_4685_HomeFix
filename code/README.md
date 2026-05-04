# Homefix Service Booking Platform

Homefix is a full-stack database course project for managing home service bookings. It includes customers, providers, service categories, addresses, appointments, payments, reviews, and reporting exports.

This README is written for teammates who need to run, test, demo, or continue developing the project.

## Table of Contents

- [Project Summary](#project-summary)
- [Tech Stack](#tech-stack)
- [Current Local URLs](#current-local-urls)
- [Project Structure](#project-structure)
- [How The App Works](#how-the-app-works)
- [Database Design](#database-design)
- [Back-End Architecture](#back-end-architecture)
- [Front-End Architecture](#front-end-architecture)
- [Environment Variables](#environment-variables)
- [Run With Docker](#run-with-docker)
- [Run Locally For Development](#run-locally-for-development)
- [API Reference](#api-reference)
- [AI Assistant Features](#ai-assistant-features)
- [Reporting And Tableau](#reporting-and-tableau)
- [Seed Data](#seed-data)
- [Testing Checklist](#testing-checklist)
- [Common Troubleshooting](#common-troubleshooting)
- [Deployment Notes](#deployment-notes)

## Project Summary

Homefix is a service appointment platform with an admin dashboard interface.

Main business flow:

1. A receiver is registered as a customer.
2. A provider is registered as a service professional.
3. Services are created, such as Plumbing, Electrical, Cleaning, Painting, or Landscaping.
4. Providers request service skills through `Provider_Services`; manager approval is required before the skill can be booked.
5. A receiver adds one or more addresses.
6. An appointment is created by choosing receiver, address, service, provider, scheduled time, and estimated hours.
7. The appointment stores the provider's hourly rate at booking time, including any schedule surcharge.
8. The system blocks overlapping provider appointments and provider-created unavailable time blocks.
9. After the provider accepts the appointment, the provider or manager can record actual service hours.
10. The receiver confirms completion, then payment uses the actual service total.
11. Receivers and providers can review each other after service completion.
12. Reports can be exported to Excel or consumed by Tableau.

## Tech Stack

Database:

- MySQL 8.0
- SQL schema with foreign keys, composite foreign keys, generated columns, functional indexes, and `CHECK` constraints

Back end:

- Node.js
- Express.js
- mysql2
- bcryptjs
- exceljs
- dotenv
- cors
- morgan

Front end:

- React.js
- Vite
- React Router
- Recharts
- lucide-react
- Plain CSS design system

Deployment:

- Docker Compose
- MySQL container
- Express server container
- Nginx container serving the React build

## Current Local URLs

When running with Docker:

- Frontend: <http://localhost:3000>
- Frontend API proxy health check: <http://localhost:3000/api/health>
- Back-end API: <http://localhost:5000/api>
- Back-end health check: <http://localhost:5000/api/health>
- MySQL from host machine: `localhost:33306`
- MySQL inside Docker network: `mysql:3306`

Default local database credentials:

- Database: `homefix`
- User: `homefix_user`
- Password: `homefix_password`
- Root password: `root_password`

## Project Structure

```text
code/
  .env.example
  .gitignore
  docker-compose.yml
  README.md

  server/
    Dockerfile
    package.json
    migrations/
      schema.sql
    seed/
      seed.sql
    src/
      app.js
      server.js
      config/
        db.js
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/

  client/
    Dockerfile
    nginx.conf
    package.json
    vite.config.js
    index.html
    src/
      App.jsx
      main.jsx
      styles.css
      api/
        client.js
      components/
        common/
        layout/
        Alert.jsx
        DataTable.jsx
        StatusBadge.jsx
      pages/
      utils/
```

## How The App Works

### Database

The MySQL schema is loaded from:

```text
server/migrations/schema.sql
```

The sample data is loaded from:

```text
server/seed/seed.sql
```

Docker runs both SQL files automatically when the MySQL volume is first created.

### Back End

The Express API starts from:

```text
server/src/server.js
```

`server.js` loads `app.js`, connects to MySQL, and starts listening on the configured port.

The API uses this layered structure:

- `routes`: defines URL paths and HTTP methods
- `controllers`: handles request and response objects
- `services`: contains validation and business rules
- `models`: contains SQL queries
- `middleware`: handles errors and async route wrappers
- `utils`: shared helpers and constants

### Front End

The React application starts from:

```text
client/src/main.jsx
client/src/App.jsx
```

The front end uses React Router routes:

- `/`
- `/receivers`
- `/providers`
- `/services`
- `/appointments`
- `/payments`
- `/reviews`
- `/reports`

The production Docker front end is served by Nginx. Nginx also proxies `/api` requests to the Express server.

## Database Design

### Tables

The database includes:

- `Receivers`
- `Providers`
- `Provider_Unavailable_Blocks`
- `Services`
- `Provider_Services`
- `Addresses`
- `Appointments`
- `Payments`
- `Reviews`

### Relationship Summary

- One receiver can have many addresses.
- One receiver can have many appointments.
- One provider can have many appointments.
- One provider can add many unavailable time blocks.
- One service can be offered by many providers.
- One provider can offer many services.
- `Provider_Services` is the many-to-many bridge table between providers and services, including manager approval status.
- One appointment references one receiver, one provider, one service, and one address.
- One appointment can have zero or one payment.
- One appointment can have up to two reviews, one in each direction.

### Important Database Design Highlights

1. No `ENUM` is used.
   Status fields use `VARCHAR` plus `CHECK` constraints.

2. `Provider_Services` enforces the provider-service relationship.
   Appointments cannot choose a random provider and service combination, and only approved provider-service links can be booked.

3. `Appointments` uses a composite foreign key:

   ```sql
   FOREIGN KEY (provider_id, service_id)
   REFERENCES Provider_Services(provider_id, service_id)
   ```

   This guarantees that the selected provider really offers the selected service.

4. `Provider_Unavailable_Blocks` stores provider-created unavailable time windows.
   Appointment creation rejects any provider whose requested time overlaps an existing unavailable block.

5. `Appointments` stores `hourly_rate_at_booking`.
   This preserves historical booking prices even if provider rates change later.
   The stored rate includes schedule surcharges:
   - Monday-Friday, 8:00 AM to 5:00 PM: no surcharge
   - After-hours weekday bookings: 20% surcharge
   - Weekend daytime bookings: 10% surcharge
   - Weekend after-hours bookings: both surcharges, 30% total

6. `Appointments.schedule_surcharge_rate` and `Appointments.schedule_surcharge_reason` explain the booking-time surcharge.

7. `Appointments.actual_hours` stores the final service duration after provider acceptance.
   `Appointments.actual_total` is generated from `hourly_rate_at_booking * actual_hours`, falling back to estimated hours before actual hours are recorded.

8. `Payments.app_id` is unique.
   This enforces at most one payment per appointment.

9. `Receivers.wallet_balance` stores wallet funds.
   Receivers can recharge themselves, and managers can recharge any receiver.

10. `Reviews(app_id, review_direction)` is unique.
   This prevents duplicate reviews in the same direction for one appointment.

11. `Appointments` uses a composite address foreign key:

   ```sql
   FOREIGN KEY (address_id, receiver_id)
   REFERENCES Addresses(address_id, receiver_id)
   ```

   This guarantees that the appointment address belongs to the selected receiver.

12. Default address uniqueness is enforced with a MySQL 8 functional unique index:

   ```sql
   CREATE UNIQUE INDEX uq_one_default_address_per_receiver
   ON Addresses ((CASE WHEN is_default = TRUE THEN receiver_id ELSE NULL END));
   ```

   This keeps each receiver limited to one default address.

### Tableau Views

The schema creates three views for reporting:

- `vw_tableau_appointment_report`
- `vw_tableau_payment_report`
- `vw_tableau_provider_performance`

## Back-End Architecture

### Entry Files

- `server/src/server.js`: starts the app
- `server/src/app.js`: creates the Express application and attaches middleware/routes
- `server/src/config/db.js`: creates the MySQL connection pool

### Middleware

- `asyncHandler.js`: wraps async controllers
- `errorHandler.js`: converts database and application errors into API responses
- `notFound.js`: handles unknown routes

### API Pattern

Example request flow for creating an appointment:

```text
POST /api/appointments
  -> appointmentRoutes.js
  -> appointmentController.js
  -> appointmentService.js
  -> appointmentModel.js
  -> MySQL
```

The appointment service validates:

- Receiver exists
- Address belongs to receiver
- Provider-service pair exists
- Estimated hours are greater than 0
- Hourly rate is copied from `Provider_Services.base_hourly_rate` and adjusted for schedule surcharge
- Provider does not have another appointment or unavailable block at the requested time

## Front-End Architecture

### App Shell

The app uses one shared layout:

- `components/layout/AppLayout.jsx`
- `components/layout/Sidebar.jsx`
- `components/layout/Topbar.jsx`

### Common Components

Important reusable components:

- `PageHeader`
- `StatCard`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `LoadingState`
- `ErrorAlert`
- `ConfirmDialog`
- `Modal`
- `SearchAndFilterBar`

### API Client

All API calls are centralized in:

```text
client/src/api/client.js
```

The default API base URL is:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
```

This is important because:

- Docker production should call `/api` and let Nginx proxy to the server.
- Local development can also use `/api` through the Vite proxy.
- Deployed front ends can override it with `VITE_API_BASE_URL`.

## Environment Variables

Example file:

```text
.env.example
```

Variables:

```env
DB_HOST=localhost
DB_PORT=33306
DB_USER=homefix_user
DB_PASSWORD=homefix_password
DB_NAME=homefix
PORT=5000
CLIENT_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5000/api
JWT_SECRET=replace_this_with_a_long_random_secret
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Docker Compose sets most values directly for container-to-container communication.
The local MySQL host port is intentionally `33306` because `3306` and `3307` are commonly used by other MySQL installs. Inside Docker, the server still connects to the MySQL service on `mysql:3306`.

Important notes:

- Never commit real hosted database passwords.
- Never commit real AI API keys.
- Set a real `JWT_SECRET` outside local development.
- Put real PlanetScale, Aiven, or other hosted database credentials in `.env`.
- If deploying the front end separately, set `VITE_API_BASE_URL` to the deployed back-end API URL.

## Run With Docker

From the `code` folder:

```powershell
cd "C:\Users\65413\Desktop\CSC33600\group_project\code"
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

If containers are already built:

```powershell
docker compose up -d
```

Check running containers:

```powershell
docker compose ps
```

Stop containers:

```powershell
docker compose down
```

Reset the database from scratch:

```powershell
docker compose down -v
docker compose up --build
```

Use `down -v` only when you want to delete the MySQL Docker volume and reload schema/seed data from scratch.

## Run Locally For Development

### 1. Start MySQL with Docker

```powershell
cd "C:\Users\65413\Desktop\CSC33600\group_project\code"
docker compose up -d mysql
```

### 2. Start the Back End

```powershell
cd server
npm install
npm run dev
```

The back end runs at:

```text
http://localhost:5000/api
```

### 3. Start the Front End

Open another terminal:

```powershell
cd client
npm install
npm run dev
```

The front end runs at:

```text
http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`.

## API Reference

All endpoints except `GET /api/health`, `POST /api/auth/login`, and public `POST /api/auth/register` require:

```http
Authorization: Bearer <token>
```

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Public registration only allows `receiver` and `provider`. Managers are created by seed data or by an existing manager through User Management.

Login example:

```json
{
  "email": "manager@homefix.com",
  "password": "Password123!"
}
```

Login returns:

```json
{
  "token": "jwt-token",
  "user": {
    "user_id": 1,
    "role": "manager",
    "email": "manager@homefix.com",
    "display_name": "Maya Manager",
    "manager_id": 1
  }
}
```

### Health

- `GET /api/health`

### Dashboard

- `GET /api/dashboard/stats`

Returns:

- total receivers
- total providers
- total services
- total appointments
- total payments
- total revenue
- completed appointments
- pending appointments

### Receivers

- `POST /api/receivers/register`
- `GET /api/receivers`
- `GET /api/receivers/:id`
- `PUT /api/receivers/:id`
- `DELETE /api/receivers/:id`

Create receiver example:

```json
{
  "display_name": "new_customer",
  "email": "new_customer@example.com",
  "password": "Password123!",
  "phone": "212-555-0199",
  "language": "English"
}
```

### Providers

- `POST /api/providers/register`
- `GET /api/providers`
- `GET /api/providers?serviceId=:serviceId`
- `GET /api/providers/:id`
- `PUT /api/providers/:id`
- `DELETE /api/providers/:id`
- `GET /api/providers/:id/services`
- `GET /api/providers/:id/unavailable-blocks`
- `POST /api/providers/:id/unavailable-blocks`
- `DELETE /api/providers/:id/unavailable-blocks/:blockId`
- `POST /api/providers/:id/services`
- `DELETE /api/providers/:providerId/services/:serviceId`
- `GET /api/providers/:providerId/unavailable-times`
- `GET /api/providers/service-approvals` - manager only
- `PUT /api/providers/:providerId/services/:serviceId/review` - manager only

### Users

- `GET /api/users` - manager only
- `POST /api/users` - manager only
- `PUT /api/users/:id` - manager or the same logged-in user

Use this for manager-side account creation, enabling/disabling login with `is_active`, and profile updates. The API never returns `password_hash`.

Add service to provider example:

```json
{
  "service_id": 1,
  "base_hourly_rate": 75.00
}
```

Provider-created service skills are saved as `pending`. A manager must approve the skill before appointments can use that provider-service pair.

### Services

- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

Create service example:

```json
{
  "service_name": "Furniture Assembly",
  "description": "Assembly for desks, beds, shelves, and small home furniture."
}
```

### Addresses

- `GET /api/receivers/:receiverId/addresses`
- `POST /api/receivers/:receiverId/addresses`
- `PUT /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `PUT /api/receivers/:receiverId/addresses/:addressId/default`

Create address example:

```json
{
  "street": "123 Main St Apt 4B",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001",
  "is_default": true
}
```

### Appointments

- `POST /api/appointments`
- `GET /api/appointments`
- `GET /api/appointments/:id`
- `GET /api/receivers/:receiverId/appointments`
- `GET /api/providers/:providerId/appointments`
- `GET /api/providers/:providerId/unavailable-times`
- `PUT /api/appointments/:id/status`
- `PUT /api/appointments/:id/actual-hours`
- `DELETE /api/appointments/:id`

Create appointment example:

```json
{
  "receiver_id": 1,
  "provider_id": 1,
  "service_id": 1,
  "address_id": 1,
  "scheduled_time": "2026-05-10 10:00:00",
  "estimated_hours": 2.5
}
```

The back end reads the base hourly rate from `Provider_Services`, applies schedule surcharge, then stores the final hourly rate in `hourly_rate_at_booking`.
It also rejects overlapping `pending`, `accepted`, or `in_progress` appointments and provider-created unavailable time blocks for the same provider.

Schedule surcharge rules:

- Monday-Friday, 8:00 AM to 5:00 PM: no surcharge
- Weekday after-hours: 20%
- Weekend daytime: 10%
- Weekend after-hours: 30%

Update appointment status example:

```json
{
  "appointment_status": "completed"
}
```

Update actual service hours example:

```json
{
  "actual_hours": 2.75
}
```

Allowed appointment statuses:

- `pending`
- `accepted`
- `rejected`
- `in_progress`
- `completed`
- `cancelled`
- `no_show`

### Payments

- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/:id`
- `GET /api/appointments/:appointmentId/payment`
- `PUT /api/payments/:id/status`
- `POST /api/wallet/recharge`
- `POST /api/receivers/:receiverId/recharge` - manager only

Create payment example:

```json
{
  "app_id": 1,
  "commission_rate": 0.15,
  "payment_status": "paid"
}
```

Payments can only be created after the appointment is `completed` and `actual_hours` is set.
If `total_amount` is omitted, the back end uses appointment `actual_total`.
Receiver-created payments are forced to `paid` and deducted from the receiver wallet.

Allowed payment statuses:

- `unpaid`
- `paid`
- `failed`
- `refunded`
- `partially_refunded`

### Reviews

- `POST /api/reviews`
- `GET /api/reviews`
- `GET /api/appointments/:appointmentId/reviews`
- `GET /api/providers/:providerId/reviews`
- `DELETE /api/reviews/:id`

Create review example:

```json
{
  "app_id": 1,
  "rating": 5,
  "review_direction": "receiver_to_provider",
  "comment": "Great service and clear communication."
}
```

Allowed review directions:

- `receiver_to_provider`
- `provider_to_receiver`

### Reports

Excel exports:

- `GET /api/reports/appointments/export`
- `GET /api/reports/payments/export`
- `GET /api/reports/provider-performance/export`

JSON report data:

- `GET /api/reports/appointments`
- `GET /api/reports/payments`
- `GET /api/reports/provider-performance`

## Reporting And Tableau

The Reports page can export:

1. Appointments Report
2. Payments Report
3. Provider Performance Report

Excel files are generated by the Express back end using `exceljs`.

Tableau can use either option:

1. Connect directly to MySQL and read these views:
   - `vw_tableau_appointment_report`
   - `vw_tableau_payment_report`
   - `vw_tableau_provider_performance`
2. Use JSON endpoints:
   - `/api/reports/appointments`
   - `/api/reports/payments`
   - `/api/reports/provider-performance`

## Seed Data

The seed file provides:

- 5 receivers
- 5 providers
- 1 manager user
- 11 total login users
- 5 services
- 10 provider-service links
- 2 provider unavailable blocks
- 10 addresses
- 10 appointments
- 4 payments
- 8 reviews

Seed login accounts:

```text
manager@homefix.com / Password123!
receiver1@homefix.com / Password123!
provider1@homefix.com / Password123!
```

Seed data is intended for demo and testing only.

## Testing Checklist

### Build Checks

Back-end module load:

```powershell
cd server
node -e "require('./src/app'); console.log('server modules load ok')"
```

Front-end build:

```powershell
cd client
npm run build
```

Docker config:

```powershell
cd ..
docker compose config
```

### Runtime Checks

After Docker is running:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/stats"
```

Check front-end routes:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/appointments" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/reports" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Check seed counts:

```powershell
docker compose exec -T mysql mysql -uhomefix_user -phomefix_password homefix -e "SELECT 'Receivers' AS table_name, COUNT(*) AS count FROM Receivers UNION ALL SELECT 'Providers', COUNT(*) FROM Providers UNION ALL SELECT 'Services', COUNT(*) FROM Services UNION ALL SELECT 'Provider_Services', COUNT(*) FROM Provider_Services UNION ALL SELECT 'Provider_Unavailable_Blocks', COUNT(*) FROM Provider_Unavailable_Blocks UNION ALL SELECT 'Addresses', COUNT(*) FROM Addresses UNION ALL SELECT 'Appointments', COUNT(*) FROM Appointments UNION ALL SELECT 'Payments', COUNT(*) FROM Payments UNION ALL SELECT 'Reviews', COUNT(*) FROM Reviews;"
```

Expected counts:

```text
Receivers           5
Providers           5
Services            5
Provider_Services   10
Provider_Unavailable_Blocks 2
Addresses           10
Appointments        10
Payments            4
Reviews             8
```

### Manual Front-End Demo Checklist

Use <http://localhost:3000>.

Dashboard:

- Stats cards load.
- Appointment status chart displays.
- Revenue chart displays.
- Provider performance chart displays.
- Recent appointments and payments show data.

Receivers:

- Create a receiver.
- Edit a receiver.
- Select a receiver and view addresses/appointments.
- Add an address.
- Set default address.

Providers:

- Create a provider.
- Edit provider status.
- Select a provider and add a service with hourly rate.
- Add and remove provider unavailable time blocks.
- View provider appointments and reviews.

Services:

- Create a service.
- Edit a service.
- Delete a service only when no dependent data blocks it.

Appointments:

- Create appointment.
- Confirm that providers are filtered after selecting a service.
- Confirm that unavailable provider times are displayed after selecting a provider.
- Confirm that provider-created unavailable blocks reject overlapping appointments.
- Confirm after-hours and weekend surcharge updates the booking rate.
- Confirm that rate and total update automatically.
- Update appointment status.
- Set actual service hours after provider acceptance.
- Use the Rate button for a completed appointment.

Payments:

- Create payment for an appointment.
- Confirm payment is only available for completed appointments with actual hours.
- Recharge a receiver wallet.
- Confirm commission and payout calculations.
- Update payment status.

Reviews:

- Create review for a completed appointment.
- Confirm duplicate direction is blocked by the back end.
- Delete review with confirmation.

Reports:

- Export all three Excel reports.
- Check Tableau endpoint descriptions.

## Common Troubleshooting

### Docker says the port is already in use

Another process may be using port `3000`, `5000`, or `33306`.

Options:

- Stop the other process.
- Change the published port in `docker-compose.yml`.

### MySQL schema changes do not appear

Docker only runs initialization SQL when the MySQL volume is first created.

To force a full reset:

```powershell
docker compose down -v
docker compose up --build
```

### Dashboard API returns table-not-found errors

The database may be partially initialized. Reset the volume:

```powershell
docker compose down -v
docker compose up --build
```

### Front end cannot call the API

Check:

- Server is running on port `5000`.
- `client/nginx.conf` proxies `/api` to `server:5000`.
- `client/src/api/client.js` uses `/api` or the correct `VITE_API_BASE_URL`.
- Docker Compose service names are unchanged.

### Excel export fails

Check:

- Server logs with `docker compose logs server`.
- Report endpoints return `200`.
- The database has seed data.

### Delete operation fails

This is often expected because of foreign key restrictions. For example, a provider, receiver, or service referenced by appointments may not be deletable. This protects database integrity.

## AI Assistant Features

Homefix includes two role-based AI modules:

- Receiver AI Customer Service at `/ai-support`
- Manager AI Assistant at `/ai-assistant`

The front end never calls Gemini or Kimi directly. It only calls Homefix back-end endpoints:

- `POST /api/ai/receiver/chat`
- `POST /api/ai/manager/chat`

### AI Provider Configuration

The back end uses a provider adapter in `server/src/ai/aiProvider.js`.

Supported providers:

- `AI_PROVIDER=mock`: local template answers, no external API key required.
- `AI_PROVIDER=gemini`: calls Gemini when `AI_API_KEY` is set.
- `AI_PROVIDER=kimi`: calls Kimi/Moonshot when `AI_API_KEY` is set.

Environment variables:

```env
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

If `AI_API_KEY` is missing or the external AI call fails, the system falls back to the mock provider so local Docker runs do not break.

### Receiver AI

Receiver AI uses FAQ grounding from `server/src/data/receiverFaq.json`, the current receiver's own appointments/payments/addresses/reviews, and public provider/service data.

Receiver AI cannot access another receiver's private data, return `password_hash`, expose API keys or JWT secrets, execute SQL, or modify records.

To add FAQ content, edit `server/src/data/receiverFaq.json`. Each item has `id`, `category`, `questions`, `keywords`, `answer`, and `related_actions`.

### Manager AI

Manager AI uses predefined safe analytics queries from `server/src/ai/safeAnalyticsQueries.js`.

It can answer questions about receiver/provider/service counts, appointment status distribution, pending/completed/cancelled appointments, revenue, unpaid amount, commission, provider payout, provider performance, popular services, reviews, completed appointments without payment, and receiver activity.

Manager AI cannot execute arbitrary SQL from user input, run write operations, return authentication secrets, or modify database records.

### AI Safety Design

```text
User message
-> Auth and role check
-> Intent classifier
-> FAQ retrieval
-> Safe data resolver
-> Context builder
-> AI provider adapter
-> Response formatter
-> Frontend chat UI
```

Safety constraints:

- User input is never concatenated into SQL.
- All database access uses predefined functions with parameterized queries.
- Receiver AI is scoped to `req.user.receiver_id`.
- Manager AI only uses whitelisted analytics functions.
- Conversation history is length-limited.
- Prompt injection and SQL-like dangerous requests return a safe refusal.
- AI API keys live only in server environment variables.

## Deployment Notes

Recommended free or low-cost deployment split:

- Front end: Netlify
- Back end: Render
- Database: Aiven MySQL

Front-end deployed environment variable:

```env
VITE_API_BASE_URL=https://your-render-backend.onrender.com/api
```

Back-end deployed environment variables:

```env
DB_HOST=your-aiven-host
DB_PORT=your-aiven-port
DB_USER=your-aiven-user
DB_PASSWORD=your-aiven-password
DB_NAME=homefix
PORT=5000
CLIENT_URL=https://your-netlify-site.netlify.app
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Deployment reminders:

- Do not commit real passwords.
- Run `schema.sql` and `seed.sql` manually on the hosted database if Docker initialization is not available.
- If the hosted database limits expression indexes, replace the default-address uniqueness implementation with a compatible generated column, trigger, or application-level transaction strategy.

## Current Verification Status

The project has been checked with:

- Front-end `npm run build`
- Back-end module load check
- Docker Compose build
- Front-end route smoke tests
- API health checks
- JWT login checks for manager, provider, and receiver
- Role-filtered dashboard and appointments API checks
- 403 permission checks for receiver/provider restricted APIs
- Excel export checks

The current Docker URLs are:

- Frontend: <http://localhost:3000>
- API: <http://localhost:5000/api>
- Health: <http://localhost:5000/api/health>
