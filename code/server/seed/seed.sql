USE homefix;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM Reviews;
DELETE FROM Payments;
DELETE FROM Appointments;
DELETE FROM Provider_Unavailable_Blocks;
DELETE FROM Provider_Services;
DELETE FROM Addresses;
DELETE FROM Services;
DELETE FROM Managers;
DELETE FROM Providers;
DELETE FROM Receivers;
DELETE FROM Users;
ALTER TABLE Reviews AUTO_INCREMENT = 1;
ALTER TABLE Payments AUTO_INCREMENT = 1;
ALTER TABLE Appointments AUTO_INCREMENT = 1;
ALTER TABLE Provider_Unavailable_Blocks AUTO_INCREMENT = 1;
ALTER TABLE Addresses AUTO_INCREMENT = 1;
ALTER TABLE Services AUTO_INCREMENT = 1;
ALTER TABLE Managers AUTO_INCREMENT = 1;
ALTER TABLE Providers AUTO_INCREMENT = 1;
ALTER TABLE Receivers AUTO_INCREMENT = 1;
ALTER TABLE Users AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO Users (role, email, password_hash, display_name, phone, is_active) VALUES
('manager', 'manager@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'Maya Manager', '212-555-0001', TRUE),
('receiver', 'receiver1@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'alice_home', '212-555-0101', TRUE),
('receiver', 'receiver2@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'ben_chen', '212-555-0102', TRUE),
('receiver', 'receiver3@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'carla_r', '718-555-0103', TRUE),
('receiver', 'receiver4@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'david_k', '646-555-0104', TRUE),
('receiver', 'receiver5@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'emma_w', '917-555-0105', TRUE),
('provider', 'provider1@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'fixit_mario', '212-555-0201', TRUE),
('provider', 'provider2@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'spark_sara', '212-555-0202', TRUE),
('provider', 'provider3@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'clean_nina', '718-555-0203', TRUE),
('provider', 'provider4@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'paint_omar', '646-555-0204', TRUE),
('provider', 'provider5@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'garden_li', '917-555-0205', TRUE);

INSERT INTO Managers (user_id, department) VALUES
(1, 'Operations');

INSERT INTO Receivers (user_id, language, wallet_balance) VALUES
(2, 'English', 500.00),
(3, 'Mandarin', 320.00),
(4, 'Spanish', 250.00),
(5, 'English', 200.00),
(6, 'English', 180.00);

INSERT INTO Providers (user_id, provider_status, biography) VALUES
(7, 'active', 'Licensed handyman focused on plumbing and small repairs.'),
(8, 'active', 'Electrician with ten years of apartment maintenance experience.'),
(9, 'resting', 'Deep cleaning specialist for move-in and move-out jobs.'),
(10, 'active', 'Interior painting and drywall touch-up provider.'),
(11, 'active', 'Outdoor maintenance, small landscaping, and seasonal cleanup.');

INSERT INTO Services (service_name, description) VALUES
('Plumbing', 'Leaks, faucets, drains, and small bathroom repairs.'),
('Electrical', 'Light fixtures, outlets, switches, and safety checks.'),
('Cleaning', 'Standard and deep cleaning for apartments and houses.'),
('Painting', 'Interior painting, trim touch-ups, and minor drywall prep.'),
('Landscaping', 'Lawn care, pruning, planting, and outdoor cleanup.');

INSERT INTO Provider_Services (provider_id, service_id, base_hourly_rate, approval_status, reviewed_by, reviewed_at) VALUES
(1, 1, 68.00, 'approved', 1, CURRENT_TIMESTAMP), (1, 4, 52.00, 'approved', 1, CURRENT_TIMESTAMP),
(2, 2, 82.00, 'approved', 1, CURRENT_TIMESTAMP), (2, 1, 75.00, 'approved', 1, CURRENT_TIMESTAMP),
(3, 3, 45.00, 'approved', 1, CURRENT_TIMESTAMP), (3, 5, 42.00, 'approved', 1, CURRENT_TIMESTAMP),
(4, 4, 58.00, 'approved', 1, CURRENT_TIMESTAMP), (4, 3, 48.00, 'approved', 1, CURRENT_TIMESTAMP),
(5, 5, 55.00, 'approved', 1, CURRENT_TIMESTAMP), (5, 3, 50.00, 'approved', 1, CURRENT_TIMESTAMP);

INSERT INTO Provider_Unavailable_Blocks (provider_id, start_time, end_time, reason) VALUES
(1, '2026-05-12 13:00:00', '2026-05-12 15:00:00', 'Personal appointment'),
(4, '2026-05-13 09:00:00', '2026-05-13 12:00:00', 'Supply pickup');

INSERT INTO Addresses (receiver_id, street, city, state, zip_code, is_default) VALUES
(1, '101 W 24th St Apt 4A', 'New York', 'NY', '10011', TRUE),
(1, '55 Hudson Yards Apt 18B', 'New York', 'NY', '10001', FALSE),
(2, '88 Bayard St Apt 2C', 'New York', 'NY', '10013', TRUE),
(2, '440 Kent Ave Apt 6D', 'Brooklyn', 'NY', '11249', FALSE),
(3, '77 Queens Blvd Apt 9E', 'Queens', 'NY', '11375', TRUE),
(3, '15 Court St Apt 3', 'Brooklyn', 'NY', '11201', FALSE),
(4, '250 Park Ave South Apt 10F', 'New York', 'NY', '10003', TRUE),
(4, '310 Prospect Park West', 'Brooklyn', 'NY', '11215', FALSE),
(5, '140 Riverside Dr Apt 7C', 'New York', 'NY', '10024', TRUE),
(5, '500 Grand Concourse Apt 12A', 'Bronx', 'NY', '10451', FALSE);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(1, 1, 1, 1, 'completed', '2026-05-05 09:00:00', 68.00, 0.0000, 'standard_hours', 2.00, 2.00),
(1, 4, 4, 2, 'pending', '2026-05-08 13:00:00', 58.00, 0.0000, 'standard_hours', 4.00, NULL),
(2, 2, 2, 3, 'accepted', '2026-05-06 11:30:00', 82.00, 0.0000, 'standard_hours', 1.50, NULL),
(2, 1, 4, 4, 'completed', '2026-04-28 10:00:00', 52.00, 0.0000, 'standard_hours', 3.00, 3.00),
(3, 3, 3, 5, 'completed', '2026-04-29 14:00:00', 45.00, 0.0000, 'standard_hours', 2.50, 2.50),
(3, 5, 5, 6, 'in_progress', '2026-05-03 15:00:00', 60.50, 0.1000, 'weekend', 2.00, NULL),
(4, 2, 1, 7, 'cancelled', '2026-05-01 08:00:00', 75.00, 0.0000, 'standard_hours', 1.00, NULL),
(4, 4, 3, 8, 'pending', '2026-05-11 12:00:00', 48.00, 0.0000, 'standard_hours', 3.50, NULL),
(5, 5, 5, 9, 'completed', '2026-04-25 09:30:00', 60.50, 0.1000, 'weekend', 2.25, 2.25),
(5, 3, 3, 10, 'accepted', '2026-05-09 16:00:00', 58.50, 0.3000, 'weekend_after_hours', 2.00, NULL);

INSERT INTO Payments (app_id, total_amount, commission_rate, payment_status, payment_date) VALUES
(1, 136.00, 0.1500, 'paid', '2026-05-05 12:10:00'),
(4, 156.00, 0.1500, 'paid', '2026-04-28 14:00:00'),
(5, 112.50, 0.1200, 'paid', '2026-04-29 17:20:00'),
(9, 136.13, 0.1500, 'paid', '2026-04-25 13:45:00');

INSERT INTO Reviews (app_id, rating, review_direction, comment) VALUES
(1, 5, 'receiver_to_provider', 'Fast repair and very clear communication.'),
(1, 5, 'provider_to_receiver', 'Customer was prepared and easy to work with.'),
(4, 4, 'receiver_to_provider', 'Good painting touch-up and clean finish.'),
(4, 5, 'provider_to_receiver', 'Clear instructions and friendly.'),
(5, 5, 'receiver_to_provider', 'Apartment looks great after the deep clean.'),
(5, 4, 'provider_to_receiver', 'Helpful notes before arrival.'),
(9, 4, 'receiver_to_provider', 'Yard cleanup was done carefully.'),
(9, 5, 'provider_to_receiver', 'Easy access and prompt payment.');
