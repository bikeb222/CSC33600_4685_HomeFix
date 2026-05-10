# Homefix Use Cases

This file lists the main use cases supported by the current Homefix application.

## Actors

- Receiver: customer who books home services.
- Provider: service professional who receives and completes appointments.
- Manager: platform operator who manages users, services, approvals, payments, and reports.
- AI Assistant: read-only support/analytics assistant backed by safe database context.

## Receiver Use Cases

### UC-R1: Register As Receiver

Actor: Receiver

Goal: Create a receiver account.

Main flow:

1. User opens the receiver login/register flow.
2. User enters email, password, display name, phone, and language.
3. System creates a Receiver record.
4. User logs in through the receiver login page.

Rules:

- Receiver email must be unique within `Receivers`.
- The same email may still be used for a provider account.

### UC-R2: Log In As Receiver

Actor: Receiver

Goal: Access the receiver workspace.

Main flow:

1. User opens `/login/receiver`.
2. User enters receiver email and password.
3. System authenticates against the `Receivers` table.
4. System loads receiver-scoped navigation and dashboard.

### UC-R3: Manage Receiver Profile

Actor: Receiver

Goal: Update contact details.

Main flow:

1. Receiver opens My Profile.
2. Receiver edits display name or phone.
3. Receiver saves changes.

### UC-R4: Add Address

Actor: Receiver

Goal: Add a service location.

Main flow:

1. Receiver opens My Profile.
2. Receiver enters street, city, state, ZIP code, and optional default flag.
3. System creates an Address linked to the receiver.

Rules:

- Address belongs to exactly one receiver.
- A receiver can have only one default address.

### UC-R5: Edit Address

Actor: Receiver

Goal: Update a saved service location.

Main flow:

1. Receiver opens My Profile.
2. Receiver clicks Edit on an address.
3. System loads that address into the form.
4. Receiver updates fields and saves.

Rules:

- Receiver can only edit their own addresses.

### UC-R6: Delete Address

Actor: Receiver

Goal: Remove an address that is no longer needed.

Main flow:

1. Receiver opens My Profile.
2. Receiver clicks Delete on an address.
3. System asks for confirmation.
4. System deletes the address if database constraints allow it.

Rules:

- Deletion may fail if existing appointments reference the address.

### UC-R7: Browse Services

Actor: Receiver

Goal: See available service categories.

Main flow:

1. Receiver opens Book Service.
2. System lists services and provider coverage.
3. Receiver can start an appointment from the service catalog.

### UC-R8: Create Appointment

Actor: Receiver

Goal: Request a home service appointment.

Main flow:

1. Receiver opens My Appointments or Book Service.
2. Receiver clicks New Appointment.
3. Receiver selects one of their addresses.
4. Receiver selects a service or provider.
5. System filters the other selector:
   - selected service filters providers
   - selected provider filters services
6. Receiver selects scheduled time and estimated hours.
7. System shows the receiver-visible base rate, surcharge, tip, and estimated total.
8. Receiver submits the request.
9. System creates a pending appointment.

Rules:

- Receiver can only create appointments for themselves.
- Provider-service link must be approved.
- Provider unavailable blocks cannot be booked.
- Accepted/in-progress conflicts are blocked.
- Pending overlaps are allowed, but the UI warns how many pending requests already overlap.

### UC-R9: Adjust Pending Appointment

Actor: Receiver

Goal: Change a request before provider acceptance.

Main flow:

1. Receiver opens My Appointments.
2. Receiver clicks Adjust on a pending appointment.
3. Receiver changes requested time, estimated hours, or tip.
4. System recalculates conflicts and surcharge.
5. System saves the updated request.

Rules:

- Only pending appointments can be adjusted.
- Tip is included in appointment totals and platform commission calculations.

### UC-R10: View Appointment Calendar

Actor: Receiver

Goal: See appointment dates visually.

Main flow:

1. Receiver opens Dashboard.
2. System shows appointment calendar.
3. Receiver can move to previous or next month.
4. Receiver hovers a day to view appointment details.

### UC-R11: Pay Completed Appointment

Actor: Receiver

Goal: Pay for completed service.

Main flow:

1. Provider moves the appointment to in progress and actual hours are set.
2. Receiver confirms the appointment as completed.
3. Receiver opens My Appointments or Payments.
4. Receiver clicks Pay.
5. System creates payment using appointment actual total.
6. System deducts receiver wallet balance.
7. System records platform commission and provider payout.

Rules:

- Appointment must be completed.
- Appointment must have actual hours.
- One appointment can have only one payment.
- Receiver wallet must have enough balance.

### UC-R12: Recharge Wallet

Actor: Receiver

Goal: Add funds to wallet.

Main flow:

1. Receiver opens My Payments.
2. Receiver enters recharge amount.
3. System calls wallet recharge procedure.
4. System updates wallet balance.

### UC-R13: Review Provider

Actor: Receiver

Goal: Rate a provider after service.

Main flow:

1. Receiver opens My Appointments or My Reviews.
2. Receiver clicks Rate for a completed appointment.
3. Receiver enters rating and comment.
4. System creates `receiver_to_provider` review.

Rules:

- Appointment must be completed.
- Receiver can review only once per appointment direction.

### UC-R14: Use Receiver AI Support

Actor: Receiver

Goal: Ask account and service questions.

Main flow:

1. Receiver opens AI Support.
2. Receiver asks about appointments, providers, services, payments, addresses, reviews, rates, or rules.
3. System builds receiver-scoped context.
4. AI answers using safe context and FAQ grounding.

Rules:

- Receiver AI cannot see other receivers' private data.
- AI cannot modify records.

## Provider Use Cases

### UC-P1: Register As Provider

Actor: Provider

Goal: Create a provider account.

Main flow:

1. User opens provider registration/login flow.
2. User enters account and provider profile details.
3. System creates a Provider record.

Rules:

- Provider email must be unique within `Providers`.
- The same email may be used by a receiver account.

### UC-P2: Log In As Provider

Actor: Provider

Goal: Access provider workspace.

Main flow:

1. Provider opens `/login/provider`.
2. Provider enters email and password.
3. System authenticates against `Providers`.
4. System loads provider dashboard and navigation.

### UC-P3: Request New Skill

Actor: Provider

Goal: Offer a new service category.

Main flow:

1. Provider opens My Services.
2. Provider selects a service not already in My Skill Requests.
3. Provider enters hourly rate.
4. System creates a pending Provider_Service link.

Rules:

- Pending skills cannot receive appointments.
- Manager approval is required.
- Skill dropdown excludes services already requested by that provider.

### UC-P4: Manage Unavailable Time

Actor: Provider

Goal: Block times when provider cannot work.

Main flow:

1. Provider opens My Services.
2. Provider enters start time, end time, and reason.
3. System creates unavailable block.
4. System prevents appointment booking that overlaps the block.

Rules:

- End time must be after start time.
- Provider unavailable blocks cannot overlap each other.
- Unavailable blocks cannot overlap active appointments.

### UC-P5: View Appointment Calendar

Actor: Provider

Goal: See assigned appointment dates visually.

Main flow:

1. Provider opens Dashboard.
2. System shows My Appointment Pipeline calendar.
3. Provider can move to previous or next month.
4. Provider hovers a day to view appointment details.

### UC-P6: Accept Appointment

Actor: Provider

Goal: Accept a pending appointment request.

Main flow:

1. Provider opens My Appointments.
2. Provider reviews pending requests.
3. Provider changes status to accepted.
4. System rejects overlapping pending requests for the same provider/time.
5. Accepted appointment blocks that provider's time.

Rules:

- Provider can only accept their own appointments.
- Provider cannot accept overlapping active appointments.

### UC-P7: Reject Appointment

Actor: Provider

Goal: Decline a pending request.

Main flow:

1. Provider opens My Appointments.
2. Provider changes pending appointment to rejected.
3. System stores rejected status.

### UC-P8: Move Appointment To In Progress

Actor: Provider

Goal: Mark service as started.

Main flow:

1. Provider opens My Appointments.
2. Provider changes accepted appointment to in progress.
3. System updates status.

### UC-P9: Record Actual Hours

Actor: Provider

Goal: Store final service duration before completion/payment.

Main flow:

1. Provider opens My Appointments.
2. Provider enters actual hours for accepted or in-progress appointment.
3. System updates appointment actual hours.
4. Appointment final total uses actual hours.

Rules:

- Completed appointment actual hours cannot be edited from the UI.

### UC-P10: Start Appointment Work

Actor: Provider

Goal: Move accepted service work into the active work stage.

Main flow:

1. Provider reviews an accepted appointment.
2. Provider records or adjusts actual service hours while work is active.
3. Provider changes appointment status to in progress.
4. Receiver can confirm completion after the service is finished.

Rules:

- Receiver confirmation is required before payment and reviews become available.
- Payment requires completed appointment and actual hours.

### UC-P11: Review Receiver

Actor: Provider

Goal: Rate customer cooperation.

Main flow:

1. Provider opens My Appointments or My Reviews.
2. Provider clicks Rate for a completed appointment.
3. Provider enters rating and comment.
4. System creates `provider_to_receiver` review.

Rules:

- Provider can review only appointments assigned to them.
- Duplicate provider-to-receiver review is blocked.

### UC-P12: View Provider ZIP Coverage

Actor: Provider

Goal: See NYC ZIP areas served.

Main flow:

1. Provider opens Dashboard.
2. System shows NYC ZIP Coverage choropleth map.
3. ZIP areas with no visits are white.
4. Darker blue means more completed or active visits.

## Manager Use Cases

### UC-M1: Log In As Manager

Actor: Manager

Goal: Access operations workspace.

Main flow:

1. Manager opens `/login/manager`.
2. Manager enters manager email and password.
3. System authenticates against `Managers`.
4. System loads manager navigation.

### UC-M2: Manage Receivers

Actor: Manager

Goal: Create, edit, inspect, or delete receiver accounts.

Main flow:

1. Manager opens Receivers.
2. Manager creates or edits receiver profile.
3. Manager views receiver addresses and appointments.
4. Manager can add, delete, or set default addresses for selected receiver.

Rules:

- Delete may fail if related appointments or payments require the receiver.

### UC-M3: Manage Providers

Actor: Manager

Goal: Manage provider records and availability.

Main flow:

1. Manager opens Providers.
2. Manager creates or edits provider account/status.
3. Manager views provider services, appointments, reviews.
4. Manager views all provider unavailable blocks.

### UC-M4: Manage Services

Actor: Manager

Goal: Maintain service catalog.

Main flow:

1. Manager opens Services.
2. Manager creates, edits, or deletes services.
3. System updates catalog and provider coverage.

Rules:

- Delete may fail when service is referenced by appointments or provider-service links.

### UC-M5: Approve Provider Skill

Actor: Manager

Goal: Review provider service requests.

Main flow:

1. Manager opens Services.
2. Manager reviews provider skill approval queue.
3. Manager approves or rejects pending provider-service link.
4. Approved links become bookable.

Rules:

- Approved or rejected links store manager and review time.
- Pending links cannot contain review fields.

### UC-M6: Create Appointment For Any Receiver

Actor: Manager

Goal: Book service on behalf of a customer.

Main flow:

1. Manager opens Appointments.
2. Manager clicks New Appointment.
3. Manager selects receiver, receiver address, service, provider, time, hours, and optional tip.
4. System creates appointment.

Rules:

- Manager can select any receiver.
- Provider-service link must be approved.
- Provider active/unavailable/conflict rules still apply.

### UC-M7: Manage Appointment Status

Actor: Manager

Goal: Help intervene in appointment lifecycle.

Main flow:

1. Manager opens Appointments.
2. Manager filters or searches appointments.
3. Manager changes appointment status when needed.
4. Manager can delete appointment if constraints allow.

### UC-M8: Recharge Receiver Wallet

Actor: Manager

Goal: Add funds for a receiver.

Main flow:

1. Manager opens Payments.
2. Manager selects receiver and amount.
3. System calls recharge procedure.
4. Wallet balance is updated.

### UC-M9: Manage Payments

Actor: Manager

Goal: Create and inspect payment records.

Main flow:

1. Manager opens Payments.
2. Manager creates payment for completed appointment or updates payment status.
3. System calculates commission and payout.

Rules:

- Payment requires completed appointment and actual hours.
- One payment per appointment.

### UC-M10: Manage Reviews

Actor: Manager

Goal: Inspect or remove problematic reviews.

Main flow:

1. Manager opens Reviews.
2. System shows receiver-to-provider and provider-to-receiver panels separately.
3. Manager deletes review if needed.

Rules:

- Manager cannot create reviews.

### UC-M11: Manage Users

Actor: Manager

Goal: Create or activate/deactivate role accounts.

Main flow:

1. Manager opens User Management.
2. Manager creates receiver, provider, or manager account.
3. Manager toggles account active state.

Rules:

- Creation/update operations use transactions to keep role data atomic.

### UC-M12: View Reports

Actor: Manager

Goal: Export data for analysis.

Main flow:

1. Manager opens Reports.
2. Manager views report endpoint descriptions.
3. Manager downloads Excel reports or uses JSON endpoints.

Reports:

- Appointment report
- Payment report
- Provider performance report

### UC-M13: Use Manager AI Assistant

Actor: Manager

Goal: Ask operational questions.

Main flow:

1. Manager opens AI Assistant.
2. Manager asks about revenue, pending appointments, provider performance, low ratings, unpaid work, or service demand.
3. System uses safe predefined analytics queries.
4. AI responds with database-backed context.

Rules:

- Manager AI cannot run arbitrary SQL.
- AI cannot modify records.
- Secrets are not exposed.

## Cross-Role Use Cases

### UC-X1: Full Appointment Lifecycle

Actors: Receiver, Provider, Manager

Main flow:

1. Receiver creates pending appointment.
2. Provider reviews pending request.
3. Provider accepts appointment.
4. System rejects overlapping pending requests for that provider/time.
5. Provider moves appointment to in progress.
6. Provider records actual hours.
7. Receiver confirms completion.
8. Receiver pays appointment.
9. Receiver reviews provider.
10. Provider reviews receiver.
11. Manager can inspect or intervene throughout the process.

### UC-X2: Provider Conflict Handling

Actors: Receiver, Provider, Manager

Main flow:

1. Two receivers request overlapping pending appointments with the same provider.
2. System allows pending overlap but shows warning.
3. Provider accepts one request.
4. System automatically rejects the overlapping pending request.
5. Accepted appointment blocks the provider's time.

### UC-X3: Pricing And Revenue

Actors: Receiver, Provider, Manager

Main flow:

1. Receiver chooses appointment time and estimated hours.
2. System snapshots provider base hourly rate.
3. System generates the receiver-visible base rate by adding the platform fee.
4. System applies schedule surcharge if needed.
5. Receiver may add tip.
6. Provider records actual hours.
7. Receiver final total uses the receiver-visible base rate, schedule surcharge, actual hours, and tip.
8. Provider payout uses the provider base rate, schedule surcharge, actual hours, and tip.
9. Payment calculates platform commission as receiver total minus provider payout.
10. Manager tracks platform revenue and payouts.

### UC-X4: Service Skill Approval

Actors: Provider, Manager, Receiver

Main flow:

1. Provider requests a service skill with hourly rate.
2. Manager reviews the request.
3. If approved, the provider appears as bookable for that service.
4. If rejected or pending, receiver cannot book that provider-service pair.

### UC-X5: Dashboard Visualization

Actors: Receiver, Provider, Manager

Main flow:

1. User logs in.
2. System detects role.
3. System loads role-scoped dashboard data.
4. System renders Plotly charts and data tables relevant to that role.

Examples:

- Receiver sees spending and booking calendar.
- Provider sees payout, workload, ratings, and NYC ZIP coverage.
- Manager sees platform-wide operations and revenue.

### UC-X6: Data Export And Analytics

Actors: Manager

Main flow:

1. Manager opens Reports.
2. Manager downloads Excel reports or reads JSON endpoints.
3. Manager can also connect Tableau-style tools to MySQL views.

### UC-X7: AI Grounded Question Answering

Actors: Receiver, Manager

Main flow:

1. User asks a natural language question.
2. System classifies intent.
3. System loads allowed database context.
4. AI generates answer using safe context.

Rules:

- Receiver context is private to that receiver.
- Manager context uses whitelisted analytics.
- AI is read-only.
