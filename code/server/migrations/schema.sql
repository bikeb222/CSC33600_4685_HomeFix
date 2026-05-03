CREATE DATABASE IF NOT EXISTS homefix
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE homefix;

DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Provider_Unavailable_Blocks;
DROP TABLE IF EXISTS Provider_Services;
DROP TABLE IF EXISTS Addresses;
DROP TABLE IF EXISTS Services;
DROP TABLE IF EXISTS Managers;
DROP TABLE IF EXISTS Providers;
DROP TABLE IF EXISTS Receivers;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
        CHECK (role IN ('manager', 'provider', 'receiver'))
);

CREATE TABLE Receivers (
    receiver_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    language VARCHAR(30),
    wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receivers_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE Providers (
    provider_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    provider_status VARCHAR(20) NOT NULL DEFAULT 'active',
    biography VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_providers_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_provider_status
        CHECK (provider_status IN ('active', 'resting', 'inactive', 'suspended'))
);

CREATE TABLE Provider_Unavailable_Blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_provider_unavailable_blocks_provider
        FOREIGN KEY (provider_id)
        REFERENCES Providers(provider_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_provider_unavailable_block_range
        CHECK (end_time > start_time)
);

CREATE INDEX idx_provider_unavailable_blocks_provider_time
ON Provider_Unavailable_Blocks(provider_id, start_time, end_time);

CREATE TABLE Managers (
    manager_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    department VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_managers_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE Services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    description VARCHAR(500),

    CONSTRAINT uq_services_service_name UNIQUE (service_name)
);

CREATE TABLE Provider_Services (
    provider_id INT NOT NULL,
    service_id INT NOT NULL,
    base_hourly_rate DECIMAL(8,2) NOT NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,

    PRIMARY KEY (provider_id, service_id),

    CONSTRAINT fk_provider_services_provider
        FOREIGN KEY (provider_id)
        REFERENCES Providers(provider_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_provider_services_service
        FOREIGN KEY (service_id)
        REFERENCES Services(service_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_provider_services_manager
        FOREIGN KEY (reviewed_by)
        REFERENCES Managers(manager_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_provider_services_rate
        CHECK (base_hourly_rate >= 0),

    CONSTRAINT chk_provider_services_approval
        CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_provider_services_service_id
ON Provider_Services(service_id);

CREATE TABLE Addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    receiver_id INT NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    zip_code VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_addresses_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES Receivers(receiver_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_address_receiver
        UNIQUE (address_id, receiver_id)
);

CREATE INDEX idx_addresses_receiver_id
ON Addresses(receiver_id);

CREATE UNIQUE INDEX uq_one_default_address_per_receiver
ON Addresses ((CASE WHEN is_default = TRUE THEN receiver_id ELSE NULL END));

CREATE TABLE Appointments (
    app_id INT AUTO_INCREMENT PRIMARY KEY,
    receiver_id INT NOT NULL,
    provider_id INT NOT NULL,
    service_id INT NOT NULL,
    address_id INT NOT NULL,
    appointment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_time DATETIME NOT NULL,
    hourly_rate_at_booking DECIMAL(8,2) NOT NULL,
    schedule_surcharge_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    schedule_surcharge_reason VARCHAR(30) NOT NULL DEFAULT 'standard_hours',
    estimated_hours DECIMAL(5,2) NOT NULL,
    actual_hours DECIMAL(5,2) NULL,
    estimated_total DECIMAL(10,2)
        GENERATED ALWAYS AS (hourly_rate_at_booking * estimated_hours) STORED,
    actual_total DECIMAL(10,2)
        GENERATED ALWAYS AS (hourly_rate_at_booking * COALESCE(actual_hours, estimated_hours)) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_appointments_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES Receivers(receiver_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_appointments_provider_service
        FOREIGN KEY (provider_id, service_id)
        REFERENCES Provider_Services(provider_id, service_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_appointments_address_receiver
        FOREIGN KEY (address_id, receiver_id)
        REFERENCES Addresses(address_id, receiver_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_appointment_status
        CHECK (
            appointment_status IN (
                'pending',
                'accepted',
                'rejected',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            )
        ),

    CONSTRAINT chk_hourly_rate_at_booking
        CHECK (hourly_rate_at_booking >= 0),

    CONSTRAINT chk_schedule_surcharge_rate
        CHECK (schedule_surcharge_rate >= 0),

    CONSTRAINT chk_schedule_surcharge_reason
        CHECK (
            schedule_surcharge_reason IN (
                'standard_hours',
                'after_hours',
                'weekend',
                'weekend_after_hours'
            )
        ),

    CONSTRAINT chk_estimated_hours
        CHECK (estimated_hours > 0),

    CONSTRAINT chk_actual_hours
        CHECK (actual_hours IS NULL OR actual_hours > 0)
);

CREATE INDEX idx_appointments_receiver_id
ON Appointments(receiver_id);

CREATE INDEX idx_appointments_provider_id
ON Appointments(provider_id);

CREATE INDEX idx_appointments_service_id
ON Appointments(service_id);

CREATE INDEX idx_appointments_scheduled_time
ON Appointments(scheduled_time);

CREATE INDEX idx_appointments_status
ON Appointments(appointment_status);

CREATE TABLE Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    commission_fee DECIMAL(10,2)
        GENERATED ALWAYS AS (total_amount * commission_rate) STORED,
    provider_payout DECIMAL(10,2)
        GENERATED ALWAYS AS (total_amount - (total_amount * commission_rate)) STORED,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    payment_date TIMESTAMP NULL,

    CONSTRAINT uq_payments_app_id UNIQUE (app_id),

    CONSTRAINT fk_payments_appointment
        FOREIGN KEY (app_id)
        REFERENCES Appointments(app_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_total_amount
        CHECK (total_amount >= 0),

    CONSTRAINT chk_commission_rate
        CHECK (commission_rate >= 0 AND commission_rate <= 1),

    CONSTRAINT chk_payment_status
        CHECK (
            payment_status IN (
                'unpaid',
                'paid',
                'failed',
                'refunded',
                'partially_refunded'
            )
        )
);

CREATE INDEX idx_payments_status
ON Payments(payment_status);

CREATE TABLE Reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    rating INT NOT NULL,
    review_direction VARCHAR(30) NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_appointment
        FOREIGN KEY (app_id)
        REFERENCES Appointments(app_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_reviews_rating
        CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT chk_review_direction
        CHECK (
            review_direction IN (
                'receiver_to_provider',
                'provider_to_receiver'
            )
        ),

    CONSTRAINT uq_review_once_per_direction
        UNIQUE (app_id, review_direction)
);

CREATE OR REPLACE VIEW vw_tableau_appointment_report AS
SELECT
    a.app_id,
    ru.display_name AS receiver_name,
    pu.display_name AS provider_name,
    s.service_name,
    a.scheduled_time,
    a.appointment_status,
    a.hourly_rate_at_booking,
    a.schedule_surcharge_rate,
    a.schedule_surcharge_reason,
    a.estimated_hours,
    a.estimated_total,
    a.actual_hours,
    a.actual_total,
    CONCAT(ad.street, ', ', ad.city, ', ', COALESCE(ad.state, ''), ' ', COALESCE(ad.zip_code, '')) AS service_address
FROM Appointments a
JOIN Receivers r ON a.receiver_id = r.receiver_id
JOIN Users ru ON r.user_id = ru.user_id
JOIN Providers p ON a.provider_id = p.provider_id
JOIN Users pu ON p.user_id = pu.user_id
JOIN Services s ON a.service_id = s.service_id
JOIN Addresses ad ON a.address_id = ad.address_id;

CREATE OR REPLACE VIEW vw_tableau_payment_report AS
SELECT
    pay.payment_id,
    pay.app_id,
    ru.display_name AS receiver_name,
    pu.display_name AS provider_name,
    s.service_name,
    pay.total_amount,
    pay.commission_rate,
    pay.commission_fee,
    pay.provider_payout,
    pay.payment_status,
    pay.payment_date
FROM Payments pay
JOIN Appointments a ON pay.app_id = a.app_id
JOIN Receivers r ON a.receiver_id = r.receiver_id
JOIN Users ru ON r.user_id = ru.user_id
JOIN Providers p ON a.provider_id = p.provider_id
JOIN Users pu ON p.user_id = pu.user_id
JOIN Services s ON a.service_id = s.service_id;

CREATE OR REPLACE VIEW vw_tableau_provider_performance AS
SELECT
    p.provider_id,
    u.display_name AS provider_name,
    COALESCE(completed.completed_appointments_count, 0) AS completed_appointments_count,
    COALESCE(ratings.average_rating, 0) AS average_rating,
    COALESCE(payouts.total_payout, 0) AS total_payout
FROM Providers p
JOIN Users u ON p.user_id = u.user_id
LEFT JOIN (
    SELECT provider_id, COUNT(*) AS completed_appointments_count
    FROM Appointments
    WHERE appointment_status = 'completed'
    GROUP BY provider_id
) completed ON p.provider_id = completed.provider_id
LEFT JOIN (
    SELECT a.provider_id, ROUND(AVG(rev.rating), 2) AS average_rating
    FROM Appointments a
    JOIN Reviews rev ON a.app_id = rev.app_id
    WHERE rev.review_direction = 'receiver_to_provider'
    GROUP BY a.provider_id
) ratings ON p.provider_id = ratings.provider_id
LEFT JOIN (
    SELECT a.provider_id, SUM(pay.provider_payout) AS total_payout
    FROM Payments pay
    JOIN Appointments a ON pay.app_id = a.app_id
    WHERE pay.payment_status = 'paid'
    GROUP BY a.provider_id
) payouts ON p.provider_id = payouts.provider_id;
