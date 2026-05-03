# Homefix Front-End Implementation Plan

This document describes the target React front-end for the Homefix service booking platform. The goal is to turn the existing front end into a polished, modern, course-demo-ready admin dashboard and booking management interface.

## Project Context

Homefix is a home service booking platform. The system includes:

- `Receivers`: customers
- `Providers`: service professionals
- `Services`: service categories
- `Provider_Services`: many-to-many relationship between providers and services, including `base_hourly_rate`
- `Addresses`: receiver addresses
- `Appointments`: bookings
- `Payments`: payment records
- `Reviews`: service reviews
- `Reports`: Excel export and Tableau-ready data

## Technical Requirements

- Use React.js and Vite.
- React Router should provide page-level routes.
- lucide-react should provide icons.
- Recharts may be used for dashboard charts.
- Keep the existing back-end API paths unchanged unless an existing front-end API call is clearly wrong.
- Keep Docker deployment working.
- Keep `VITE_API_BASE_URL` configurable.
- The Docker/Nginx production build should access the API through `/api`.

## Design Direction

The UI should feel like a modern SaaS admin dashboard:

- Professional, clean, and trustworthy
- Warm neutral background with blue and emerald accents
- White cards with subtle borders and light shadow
- Clear tables and tidy forms
- Strong visual status badges
- Desktop-first layout with reasonable responsive behavior

Recommended color roles:

- Primary: blue
- Success: green
- Warning: amber
- Danger: red
- Neutral: slate or zinc
- Background: `#f8fafc` or `#f7f5f2`
- Cards: white
- Borders: light gray

## Global Layout

The application should use one consistent app shell:

1. Left sidebar
2. Top header
3. Main content area
4. Responsive layout

Sidebar navigation:

- Dashboard
- Receivers
- Providers
- Services
- Appointments
- Payments
- Reviews
- Reports

Topbar:

- Current page title
- Short subtitle
- Search input
- "New Appointment" shortcut button
- Simple admin identity area, such as "Admin / Homefix"

## Routes

Use React Router with these routes:

- `/`
- `/receivers`
- `/providers`
- `/services`
- `/appointments`
- `/payments`
- `/reviews`
- `/reports`

## Reusable Components

Recommended reusable components:

- `AppLayout`
- `Sidebar`
- `Topbar`
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

## Status Badge Design

Appointment statuses:

- `pending`: amber
- `accepted`: blue
- `rejected`: red
- `in_progress`: purple
- `completed`: green
- `cancelled`: gray
- `no_show`: orange or red

Payment statuses:

- `unpaid`: gray
- `paid`: green
- `failed`: red
- `refunded`: purple
- `partially_refunded`: amber

Provider statuses:

- `active`: green
- `resting`: amber
- `inactive`: gray
- `suspended`: red

## Dashboard Requirements

The Dashboard should be the strongest visual page in the project.

Statistics cards:

- Total Receivers
- Total Providers
- Total Services
- Total Appointments
- Total Revenue
- Pending Appointments
- Completed Appointments
- Total Payments

Charts:

- Appointment status distribution, using a donut or pie chart
- Revenue summary, using a line or area chart
- Provider performance, using a bar chart

If the back end does not have dedicated aggregation APIs, the front end may calculate these values from existing list APIs.

The Dashboard should also include:

- Recent Appointments table
- Recent Payments table
- Top Providers section
- Quick actions:
  - Create Appointment
  - Add Provider
  - Add Service
  - Export Reports

Suggested Dashboard subtitle:

> Monitor bookings, payments, providers, and service performance in one place.

## Receivers Page Requirements

Functions:

- Show receivers list
- Search by username, email, or phone
- Show `address_count` and `appointment_count`
- Create receiver
- Edit receiver
- Delete receiver
- Click a receiver to show a detail panel or drawer

Fields:

- `username`
- `email`
- `phone`
- `language`
- `address_count`
- `appointment_count`
- `created_at`

## Providers Page Requirements

Functions:

- Show providers list
- Search by username, email, phone, or biography
- Filter by `provider_status`
- Show `service_count` and `appointment_count`
- Create provider
- Edit provider
- Delete provider
- Manage provider services
- Set `base_hourly_rate`
- Show provider detail panel

Provider card or table fields:

- `username`
- `email`
- `phone`
- `provider_status` badge
- biography preview
- `service_count`
- `appointment_count`

Suggested subtitle:

> Manage service professionals, availability, and hourly rates.

## Services Page Requirements

Functions:

- Show services list
- Create service
- Edit service
- Delete service
- Show how many providers offer each service

If the back end does not return `provider_count`, show the base service fields only.

## Appointments Page Requirements

This is the core business page. It should be a clear booking workflow.

Functions:

- Show appointments list
- Search by receiver, provider, or service
- Filter by `appointment_status`
- Sort by `scheduled_time`
- Create appointment
- Update `appointment_status`
- Delete appointment

Appointment creation form:

- Select receiver
- Select receiver address
- Select service
- Filter providers by selected service
- Select provider
- Automatically show `base_hourly_rate`
- Enter `estimated_hours`
- Automatically calculate `estimated_total`
- Select `scheduled_time`
- Submit

Business rule:

- The provider must come from `Provider_Services` for the selected service.
- `hourly_rate_at_booking` should come from the provider-service `base_hourly_rate`.
- `estimated_total = hourly_rate_at_booking * estimated_hours`.

Table fields:

- `app_id`
- `receiver_name`
- `provider_name`
- `service_name`
- `address_label`
- `appointment_status` badge
- `scheduled_time`
- `hourly_rate_at_booking`
- `estimated_hours`
- `estimated_total`
- `created_at`

Suggested subtitle:

> Create, track, and manage home service appointments.

## Payments Page Requirements

Functions:

- Show payments list
- Create payment
- Update `payment_status`
- Filter by `payment_status`
- Show `commission_fee` and `provider_payout`

Payment creation form:

- Select appointment
- Use appointment `estimated_total` as default `total_amount`
- `commission_rate`, default `0.15`
- Automatically show `commission_fee`
- Automatically show `provider_payout`

Table fields:

- `payment_id`
- `app_id`
- `total_amount`
- `commission_rate`
- `commission_fee`
- `provider_payout`
- `payment_status` badge
- `payment_date`

## Reviews Page Requirements

Functions:

- Show reviews list
- Create review
- Delete review
- Filter by rating
- Filter by `review_direction`

Review creation form:

- Select completed appointment
- Select `review_direction`:
  - `receiver_to_provider`
  - `provider_to_receiver`
- Rating 1-5
- Comment

UI:

- Show rating with stars
- Show `review_direction` with a badge
- Show comment clearly

## Reports Page Requirements

The Reports page should feel like a polished reporting center.

Show three report cards:

1. Appointments Report
2. Payments Report
3. Provider Performance Report

Each card should include:

- Icon
- Description
- Export Excel button
- Last exported placeholder
- Data source description

Button endpoints:

- `GET /api/reports/appointments/export`
- `GET /api/reports/payments/export`
- `GET /api/reports/provider-performance/export`

Excel download filenames:

- `appointments_report.xlsx`
- `payments_report.xlsx`
- `provider_performance_report.xlsx`

Suggested subtitle:

> Export operational data for Excel and Tableau analysis.

## API Layer Requirements

Centralize API calls.

Suggested structure:

- `src/api/client.js`
- `src/api/receivers.js`
- `src/api/providers.js`
- `src/api/services.js`
- `src/api/appointments.js`
- `src/api/payments.js`
- `src/api/reviews.js`
- `src/api/reports.js`
- `src/api/dashboard.js`

API base URL:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
```

Error handling:

- All API requests should use unified error handling.
- Pages should display friendly error messages.
- Loading states should show skeletons or loading cards.
- Empty datasets should show `EmptyState`, not blank pages.

## Form Requirements

- Forms should use a modal or drawer.
- Required fields should have validation.
- Submit buttons should show loading text while submitting.
- Success should show a toast or success alert.
- Failure should show an error alert.
- Lists should refresh after successful form submission.

## Page Details

1. All money should display as USD, for example `$123.45`.
2. Dates should display in a readable format, for example `May 3, 2026, 10:30 AM`.
3. Table rows should have a subtle hover background.
4. Destructive actions, such as delete, should use a confirmation dialog.
5. Primary action buttons should use a consistent style.
6. Every page should have a `PageHeader` with title, description, and primary action if applicable.
7. Tables should not look like default HTML tables; they should fit the modern dashboard style.

## Docker Compatibility

If `client/Dockerfile` builds the app and serves `dist` with Nginx, keep that workflow compatible.

If new environment variables are needed, update `docker-compose.yml` client build args.

Do not hard-code the back-end URL as `localhost:5000` in production. In container deployment, the front end should access the back end through the Nginx `/api` proxy.

Required Nginx proxy:

```nginx
location /api/ {
  proxy_pass http://server:5000/api/;
}
```

## Final Delivery Criteria

- `npm run build` must pass.
- `docker compose up --build` should make the front end accessible.
- Pages must not render blank screens.
- API errors must not crash the whole page.
- Dashboard, Appointments, and Reports should receive special visual polish.
- The UI should be suitable for class presentation and project defense.
