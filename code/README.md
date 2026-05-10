# Homefix Service Booking Platform

Homefix is a full-stack CSC 336 database project for home service booking. It supports three role-specific workspaces:

- Receivers: book services, manage addresses, pay appointments, and review providers.
- Providers: manage approved skills, block unavailable time, accept work, record actual hours, and review receivers.
- Managers: manage users, providers, receivers, services, approvals, appointments, payments, reports, and AI analytics.

The project is designed around MySQL 8.0, Docker, Express, React, and Plotly visualizations.

## Quick Start With Docker

From the `code` folder:

```powershell
cd "C:\Users\65413\Desktop\CSC33600\group_project\code"
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Useful local URLs:

- Front end: `http://localhost:3000`
- API health: `http://localhost:5000/api/health`
- Front-end API proxy health: `http://localhost:3000/api/health`
- MySQL from host: `localhost:33306`
- MySQL inside Docker: `mysql:3306`

Default database credentials:

```text
Database: homefix
User: homefix_user
Password: homefix_password
Root password: root_password
```

Port note: MySQL uses host port `33306` because local `3306` and `3307` are commonly occupied.

## Demo Accounts

All seed accounts use:

```text
Password123!
```

Main demo accounts:

```text
manager@homefix.com
receiver1@homefix.com
provider1@homefix.com
```

There are also additional receiver/provider/manager seed accounts for richer dashboards.

Important login behavior:

- Receiver, provider, and manager login pages are separated.
- The default login page is the receiver login.
- A person can use the same email for different roles.
- The same email cannot be reused within the same role table.

## Tech Stack

Database:

- MySQL 8.0
- Foreign keys, composite foreign keys, generated columns, indexes, triggers, views, stored procedures, and check constraints

Back end:

- Node.js
- Express
- mysql2
- jsonwebtoken
- bcryptjs
- exceljs
- dotenv
- cors
- morgan

Front end:

- React
- Vite
- React Router
- Plotly.js
- lucide-react
- Plain CSS

Deployment/runtime:

- Docker Compose
- MySQL container
- Express API container
- Nginx container serving the React build and proxying `/api`

## Project Structure

```text
code/
  docker-compose.yml
  README.md
  use_cases.md
  .env.example
  .gitignore

  server/
    migrations/schema.sql
    seed/seed.sql
    src/
      app.js
      server.js
      ai/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/

  client/
    nginx.conf
    vite.config.js
    src/
      App.jsx
      api/client.js
      auth/
      components/
      data/nycZipGeoJson.json
      pages/
      styles.css
      utils/
```

## Current Front-End Routes

Public routes:

- `/login`
- `/login/receiver`
- `/login/provider`
- `/login/manager`
- `/register`

Protected shared routes:

- `/`
- `/profile`
- `/services`
- `/appointments`
- `/payments`
- `/reviews`

Manager-only routes:

- `/receivers`
- `/providers`
- `/reports`
- `/users`
- `/ai-assistant`
- `/visualizations`

Receiver-only route:

- `/ai-support`

## Database Design Summary

Main tables:

- `Receivers`
- `Providers`
- `Managers`
- `Services`
- `Provider_Services`
- `Provider_Unavailable_Blocks`
- `Addresses`
- `Appointments`
- `Payments`
- `Reviews`

Key relationships:

- One receiver has many addresses.
- One receiver has many appointments.
- One provider has many appointments.
- One provider has many unavailable time blocks.
- Providers and services are many-to-many through `Provider_Services`.
- Only approved provider-service links can be booked.
- One appointment references one receiver, provider, service, and receiver-owned address.
- One appointment can have one payment.
- One appointment can have two reviews: receiver to provider and provider to receiver.

Important schema rules:

- The old shared `Users` table was removed. Receiver, Provider, and Manager each store their own login/profile fields.
- Role tables allow the same email across different roles, but each role table has unique email.
- `Appointments(provider_id, service_id)` references `Provider_Services(provider_id, service_id)`.
- `Appointments(address_id, receiver_id)` references `Addresses(address_id, receiver_id)`.
- `Appointments` stores the provider's base hourly rate, then generates the receiver-visible base rate with the platform fee:
  `receiver_base_hourly_rate_at_booking = provider_base_hourly_rate_at_booking * (1 + platform_fee_rate)`.
- Receiver totals use the receiver-visible base rate:
  `provider_base_hourly_rate_at_booking * (1 + platform_fee_rate) * (1 + schedule_surcharge_rate) * hours + tip_amount`.
- Provider payouts use the provider base rate:
  `provider_base_hourly_rate_at_booking * (1 + schedule_surcharge_rate) * hours + tip_amount`.
- `Payments.commission_fee` is generated as `total_amount - provider_payout`.
- `Payments.app_id` is unique, so one appointment cannot be paid twice.
- `Reviews(app_id, review_direction)` is unique, so each side can review once.
- Each receiver can have one default address through a MySQL functional unique index.
- Triggers enforce approved skills, provider conflicts, unavailable blocks, completed-before-payment, and completed-before-review.
- Stored procedures:
  - `sp_create_payment_for_completed_appointment(app_id, commission_rate)`
  - `sp_receiver_recharge(receiver_id, amount)`

Reporting views:

- `vw_tableau_appointment_report`
- `vw_tableau_payment_report`
- `vw_tableau_provider_performance`

## Main Business Rules

Appointment lifecycle:

```text
pending -> accepted -> in_progress -> completed -> paid -> reviewed
```

Other possible statuses:

- `rejected`
- `cancelled`
- `no_show`

Booking rules:

- Managers can create appointments for any receiver.
- Receivers can create appointments only for themselves.
- Providers cannot create appointments.
- When a provider is selected, services are filtered to services approved for that provider.
- When a service is selected, providers are filtered to providers approved for that service.
- Providers can accept, reject, and move assigned appointments to in progress.
- Receivers confirm completion after the provider marks the appointment in progress.
- Completed appointments cannot have actual hours changed from the UI.
- Pending appointments can be adjusted by receiver/manager before provider acceptance.
- Receivers can add a tip to pending requests.

Provider time rules:

- Normal working hours are Monday-Friday, 8:00 AM to 5:00 PM.
- Weekday after-hours surcharge: 20%.
- Weekend surcharge: 10%.
- Weekend after-hours surcharge: 30%.
- Providers cannot accept overlapping accepted or in-progress appointments.
- Pending overlaps are allowed, but the UI warns how many pending requests already overlap.
- If a provider accepts one request, overlapping pending requests for the same provider/time are rejected.
- Providers can add manual unavailable blocks from My Services.
- Managers can view all provider unavailable blocks from the Providers page.

Payment rules:

- Payment is based on actual service time after completion.
- Appointment revenue uses the stored base rate snapshot, schedule surcharge rate, actual hours, and tip.
- Receiver pays from wallet balance.
- Receiver can recharge their own wallet.
- Manager can recharge any receiver wallet.
- Platform commission is stored through payment generated columns.
- Provider payout is calculated from payment total minus commission.

Review rules:

- Managers cannot create reviews.
- Receivers can review providers after completed appointments.
- Providers can review receivers after completed appointments.
- Duplicate review direction for the same appointment is blocked.

## Dashboards And Visualizations

All role dashboards are role-scoped.

Manager dashboard includes:

- KPI overview
- Appointment status chart
- Revenue trend
- Provider performance
- Service demand
- Revenue split
- Receiver spending ranking
- Recent data tables

Provider dashboard includes:

- KPI overview
- My Appointment Pipeline calendar with month navigation
- Payout Trend
- Service Workload
- Customer Feedback
- NYC ZIP Coverage choropleth map using `client/src/data/nycZipGeoJson.json`
- Upcoming Work
- My Payments
- My Service Menu
- Recent Reviews

Receiver dashboard includes:

- KPI overview
- Appointment calendar with month navigation
- Spending trend
- Spending by service
- Surcharge mix
- Recommended services
- Upcoming appointments
- Pending payments
- Saved addresses
- Recent reviews

## AI Features

The front end only calls Homefix API endpoints. It does not call Kimi or Gemini directly.

AI endpoints:

- `POST /api/ai/receiver/chat`
- `POST /api/ai/manager/chat`

Provider configuration:

```env
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Supported provider modes:

- `mock`: local safe fallback
- `kimi`: Moonshot/Kimi-compatible API
- `gemini`: Gemini-compatible API

Current Kimi model used in local testing:

```env
AI_MODEL=moonshot-v1-128k
```

AI safety design:

- Receiver AI is scoped to the logged-in receiver's own data.
- Manager AI uses predefined analytics queries only.
- User prompts are not converted into arbitrary SQL.
- Secrets such as JWT, password hashes, and API keys are never exposed.
- Missing or failing AI API calls fall back to mock responses.

## Seed Data

`server/seed/seed.sql` currently initializes:

- 3 managers
- 10 receivers
- 10 providers
- 8 services
- 22 provider-service links
- 5 provider unavailable blocks
- 24 addresses
- 49 appointments
- 24 payments
- 40 reviews

The current running local database may contain extra manually tested records. To reset to exactly the seed file:

```powershell
docker compose down -v
docker compose up --build
```

## Environment Variables

The repo includes `.env.example`. Real `.env` files are ignored by git.

Common local variables:

```env
DB_HOST=localhost
DB_PORT=33306
DB_USER=homefix_user
DB_PASSWORD=homefix_password
DB_NAME=homefix
PORT=5000
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace_this_with_a_long_random_secret
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Docker Compose sets container-to-container values automatically. The server container connects to MySQL through `mysql:3306`.

## Development Without Full Docker

Start only MySQL:

```powershell
docker compose up -d mysql
```

Run server:

```powershell
cd server
npm install
npm run dev
```

Run client:

```powershell
cd client
npm install
npm run dev
```

Local dev URLs:

- Client: `http://localhost:5173`
- Server: `http://localhost:5000/api`

## API Overview

All protected endpoints require:

```http
Authorization: Bearer <token>
```

Public endpoints:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`

Main endpoint groups:

- Auth: `/api/auth/*`
- Dashboard: `/api/dashboard/stats`
- AI: `/api/ai/receiver/chat`, `/api/ai/manager/chat`
- Users: `/api/users`
- Receivers: `/api/receivers`
- Providers: `/api/providers`
- Services: `/api/services`
- Addresses: `/api/receivers/:receiverId/addresses`, `/api/addresses/:id`
- Appointments: `/api/appointments`
- Payments: `/api/payments`, `/api/wallet/recharge`, `/api/receivers/:receiverId/recharge`
- Reviews: `/api/reviews`
- Reports: `/api/reports/*`

See `client/src/api/client.js` for the front-end API wrapper.

## Reports

Reports support JSON and Excel exports:

- Appointment report
- Payment report
- Provider performance report

JSON endpoints:

- `/api/reports/appointments`
- `/api/reports/payments`
- `/api/reports/provider-performance`

Excel endpoints:

- `/api/reports/appointments/export`
- `/api/reports/payments/export`
- `/api/reports/provider-performance/export`

## Useful Checks

Front-end build:

```powershell
cd client
npm run build
```

Server module load:

```powershell
cd server
node -e "require('./src/app'); console.log('server modules load ok')"
```

Docker status:

```powershell
docker compose ps
```

Health checks:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Seed count check:

```powershell
docker compose exec -T mysql mysql -uhomefix_user -phomefix_password homefix -e "SELECT 'Receivers' AS table_name, COUNT(*) AS count FROM Receivers UNION ALL SELECT 'Providers', COUNT(*) FROM Providers UNION ALL SELECT 'Managers', COUNT(*) FROM Managers UNION ALL SELECT 'Services', COUNT(*) FROM Services UNION ALL SELECT 'Provider_Services', COUNT(*) FROM Provider_Services UNION ALL SELECT 'Provider_Unavailable_Blocks', COUNT(*) FROM Provider_Unavailable_Blocks UNION ALL SELECT 'Addresses', COUNT(*) FROM Addresses UNION ALL SELECT 'Appointments', COUNT(*) FROM Appointments UNION ALL SELECT 'Payments', COUNT(*) FROM Payments UNION ALL SELECT 'Reviews', COUNT(*) FROM Reviews;"
```

## Common Troubleshooting

Port already in use:

- Change the published port in `docker-compose.yml`, or stop the process using the port.

Schema changes do not appear:

- MySQL only runs initialization SQL when the volume is created.
- Run `docker compose down -v` and then `docker compose up --build`.

Front end cannot call API:

- Confirm `homefix-server` is running.
- Confirm `client/nginx.conf` proxies `/api` to `server:5000`.
- Confirm `client/src/api/client.js` uses `/api` by default.

Delete fails:

- This is often expected because foreign keys protect referenced data.
- For example, a service used by appointments cannot be deleted freely.

AI gives mock answers:

- Check `.env`.
- Set `AI_PROVIDER=kimi`, `AI_API_KEY`, `AI_MODEL=moonshot-v1-128k`, and the correct `AI_BASE_URL` if needed.
- Rebuild/restart the server container after changing environment variables.

## Deployment Notes

Suggested simple deployment split:

- Front end: Netlify
- Back end: Render
- Database: Aiven MySQL or another hosted MySQL 8 service

Front-end production variable:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
```

Back-end production variables:

```env
DB_HOST=your_mysql_host
DB_PORT=your_mysql_port
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=homefix
PORT=5000
CLIENT_URL=https://your-frontend.example.com
JWT_SECRET=long_random_secret
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Do not commit `.env` or real API keys.
