DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Provider_Services;
DROP TABLE IF EXISTS Addresses;
DROP TABLE IF EXISTS Services;
DROP TABLE IF EXISTS Providers;
DROP TABLE IF EXISTS Receivers;

CREATE TABLE Receivers (
    receiver_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    language VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_receivers_username UNIQUE (username),
    CONSTRAINT uq_receivers_email UNIQUE (email)
);

CREATE TABLE Providers (
    provider_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    provider_status VARCHAR(20) NOT NULL DEFAULT 'active',
    biography VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_providers_username UNIQUE (username),
    CONSTRAINT uq_providers_email UNIQUE (email),

    CONSTRAINT chk_provider_status
        CHECK (provider_status IN ('active', 'resting', 'inactive', 'suspended'))
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

    CONSTRAINT chk_provider_services_rate
        CHECK (base_hourly_rate >= 0)
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

    default_receiver_id INT
        GENERATED ALWAYS AS (
            CASE 
                WHEN is_default = TRUE THEN receiver_id
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT fk_addresses_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES Receivers(receiver_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_address_receiver
        UNIQUE (address_id, receiver_id),

    CONSTRAINT uq_one_default_address_per_receiver
        UNIQUE (default_receiver_id)
);

CREATE INDEX idx_addresses_receiver_id
ON Addresses(receiver_id);

CREATE TABLE Appointments (
    app_id INT AUTO_INCREMENT PRIMARY KEY,
    receiver_id INT NOT NULL,
    provider_id INT NOT NULL,
    service_id INT NOT NULL,
    address_id INT NOT NULL,

    appointment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_time DATETIME NOT NULL,

    hourly_rate_at_booking DECIMAL(8,2) NOT NULL,
    estimated_hours DECIMAL(5,2) NOT NULL,
    estimated_total DECIMAL(10,2)
        GENERATED ALWAYS AS (hourly_rate_at_booking * estimated_hours) STORED,

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

    CONSTRAINT chk_estimated_hours
        CHECK (estimated_hours > 0)
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

