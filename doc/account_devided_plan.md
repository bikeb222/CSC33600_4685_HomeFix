# Homefix Account Division And Authorization Plan

This plan extends the existing Homefix full-stack project with three account roles and a complete login/authorization flow. The project should be modified incrementally instead of rewritten from scratch.

## Roles

- `manager`
- `provider`
- `receiver`

## Technical Stack

- Frontend: React.js / Vite
- Backend: Node.js / Express.js
- Database: MySQL 8.0
- Deployment: Docker Compose

## Business Context

Homefix is a home service booking platform.

- A receiver is a customer. Receivers can manage their own addresses, create appointments, view their own payments, and write reviews.
- A provider is a service professional. Providers can manage their own services, view assigned appointments, update appointment status, view payouts, and write reviews.
- A manager is a platform administrator. Managers can manage all receivers, providers, services, appointments, payments, reviews, users, dashboards, and reports.

## Database Requirements

Add a shared `Users` table:

- `user_id INT AUTO_INCREMENT PRIMARY KEY`
- `role VARCHAR(20) NOT NULL`
- `email VARCHAR(100) NOT NULL UNIQUE`
- `password_hash VARCHAR(255) NOT NULL`
- `display_name VARCHAR(80) NOT NULL`
- `phone VARCHAR(20)`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

Role values must be limited to:

- `manager`
- `provider`
- `receiver`

Update `Receivers`:

- Add `user_id INT NOT NULL UNIQUE`
- Add foreign key to `Users(user_id)`
- Keep receiver-specific fields such as `receiver_id`, `language`, and `created_at`
- Do not duplicate email, password, phone, or display name in `Receivers`

Update `Providers`:

- Add `user_id INT NOT NULL UNIQUE`
- Add foreign key to `Users(user_id)`
- Keep provider-specific fields such as `provider_id`, `provider_status`, `biography`, and `created_at`
- Do not duplicate email, password, phone, or display name in `Providers`

Add `Managers`:

- `manager_id INT AUTO_INCREMENT PRIMARY KEY`
- `user_id INT NOT NULL UNIQUE`
- `department VARCHAR(80)`
- `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Foreign key to `Users(user_id)`

Seed data must include:

- 1 manager account
- 5 receiver accounts
- 5 provider accounts

Demo credentials:

- Manager: `manager@homefix.com / Password123!`
- Receiver: `receiver1@homefix.com / Password123!`
- Provider: `provider1@homefix.com / Password123!`

Passwords must be stored as bcrypt hashes, never plaintext.

## Backend Auth Requirements

Implement:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Use JWT authentication:

- Send token with `Authorization: Bearer <token>`
- Read `JWT_SECRET` from environment variables
- Do not hard-code production secrets
- Inactive users cannot log in
- Never return `password_hash` from the API

Middleware:

- `authenticate`
- `authorizeRoles(...roles)`
- owner checks for receiver/provider resources

## Authorization Rules

Manager:

- Can view global dashboard data
- Can manage all receivers, providers, services, appointments, payments, and reviews
- Can export reports
- Can create manager, provider, and receiver accounts
- Can enable or disable users with `is_active`

Provider:

- Can view and update own profile
- Can manage own provider services and hourly rates
- Can view assigned appointments
- Can update own appointment statuses through allowed transitions
- Can view own payments and reviews
- Cannot view private data for other providers or receivers
- Cannot export global reports

Receiver:

- Can view and update own profile
- Can manage own addresses
- Can view services and active providers
- Can create own appointments
- Can view own appointments, payments, and reviews
- Can cancel own pending or accepted appointments
- Cannot mark appointments as completed
- Cannot access global reports

## Frontend Requirements

Add:

- `/login`
- `/register`
- `/unauthorized`
- `/profile`

Frontend auth utilities:

- `AuthContext`
- `ProtectedRoute`
- `RoleRoute`
- `useAuth`
- token storage
- automatic `Authorization` header in API requests

The sidebar and dashboard must change based on the logged-in role.

Manager navigation:

- Dashboard
- Receivers
- Providers
- Services
- Appointments
- Payments
- Reviews
- Reports
- User Management

Provider navigation:

- Dashboard
- My Profile
- My Services
- My Appointments
- My Payments
- My Reviews

Receiver navigation:

- Dashboard
- My Profile
- Book Service
- My Appointments
- My Payments
- My Reviews

## Security Requirements

- Use bcrypt for password hashing
- Use parameterized SQL
- Use backend authorization checks, not only frontend hidden buttons
- Do not log sensitive data
- Do not return `password_hash`
- Store JWT secrets in environment variables

## Docker And Migration Notes

After changing `schema.sql`, reset the MySQL volume:

```powershell
docker compose down -v
docker compose up --build
```

## Acceptance Checklist

Manager:

- Can log in with `manager@homefix.com / Password123!`
- Can access dashboard, all management pages, reports, and user management
- Can create or disable users

Receiver:

- Can log in with `receiver1@homefix.com / Password123!`
- Can see only own appointments, addresses, payments, and reviews
- Cannot access all receivers or global reports

Provider:

- Can log in with `provider1@homefix.com / Password123!`
- Can see only own appointments, services, payments, and reviews
- Can move appointments through allowed provider status transitions
- Cannot access global reports

Final checks:

- `npm run build` passes
- `docker compose up --build` runs
- The frontend does not show a blank page
- Unauthenticated users are redirected to `/login`
- Receiver/provider accounts cannot access other users' private data
- Manager can access all management pages
