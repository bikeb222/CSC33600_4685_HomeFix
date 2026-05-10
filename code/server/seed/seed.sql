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
ALTER TABLE Reviews AUTO_INCREMENT = 1;
ALTER TABLE Payments AUTO_INCREMENT = 1;
ALTER TABLE Appointments AUTO_INCREMENT = 1;
ALTER TABLE Provider_Unavailable_Blocks AUTO_INCREMENT = 1;
ALTER TABLE Addresses AUTO_INCREMENT = 1;
ALTER TABLE Services AUTO_INCREMENT = 1;
ALTER TABLE Managers AUTO_INCREMENT = 1;
ALTER TABLE Providers AUTO_INCREMENT = 1;
ALTER TABLE Receivers AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO Managers (email, password_hash, display_name, phone, is_active, department) VALUES
('manager@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'Maya Manager', '212-555-0001', TRUE, 'Operations');

INSERT INTO Managers (email, password_hash, display_name, phone, is_active, department) VALUES
('dispatch@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'Noah Dispatch', '212-555-0002', TRUE, 'Dispatch'),
('finance@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'Priya Finance', '212-555-0003', TRUE, 'Finance');

INSERT INTO Receivers (email, password_hash, display_name, phone, is_active, language, wallet_balance) VALUES
('receiver1@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'alice_home', '212-555-0101', TRUE, 'English', 500.00),
('receiver2@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'ben_chen', '212-555-0102', TRUE, 'Mandarin', 320.00),
('receiver3@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'carla_r', '718-555-0103', TRUE, 'Spanish', 250.00),
('receiver4@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'david_k', '646-555-0104', TRUE, 'English', 200.00),
('receiver5@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'emma_w', '917-555-0105', TRUE, 'English', 180.00);

INSERT INTO Receivers (email, password_hash, display_name, phone, is_active, language, wallet_balance) VALUES
('receiver6@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'morgan_l', '347-555-0106', TRUE, 'English', 640.00),
('receiver7@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'sofia_r', '929-555-0107', TRUE, 'Spanish', 420.00),
('receiver8@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'liam_b', '646-555-0108', TRUE, 'English', 710.00),
('receiver9@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'nora_k', '718-555-0109', TRUE, 'Korean', 360.00),
('receiver10@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'owen_p', '332-555-0110', TRUE, 'English', 285.00);

INSERT INTO Providers (email, password_hash, display_name, phone, is_active, provider_status, biography) VALUES
('provider1@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'fixit_mario', '212-555-0201', TRUE, 'active', 'Licensed handyman focused on plumbing and small repairs.'),
('provider2@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'spark_sara', '212-555-0202', TRUE, 'active', 'Electrician with ten years of apartment maintenance experience.'),
('provider3@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'clean_nina', '718-555-0203', TRUE, 'resting', 'Deep cleaning specialist for move-in and move-out jobs.'),
('provider4@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'paint_omar', '646-555-0204', TRUE, 'active', 'Interior painting and drywall touch-up provider.'),
('provider5@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'garden_li', '917-555-0205', TRUE, 'active', 'Outdoor maintenance, small landscaping, and seasonal cleanup.');

INSERT INTO Providers (email, password_hash, display_name, phone, is_active, provider_status, biography) VALUES
('receiver1@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'alex_dual_role', '212-555-0206', TRUE, 'active', 'HVAC and light plumbing provider who also keeps a receiver account.'),
('provider7@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'fresh_ivy', '347-555-0207', TRUE, 'active', 'Cleaning and HVAC filter replacement specialist.'),
('provider8@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'secure_sam', '929-555-0208', TRUE, 'active', 'Smart lock, camera, and electrical safety technician.'),
('provider9@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'appliance_ana', '718-555-0209', TRUE, 'active', 'Appliance repair provider for washers, dryers, and kitchen units.'),
('provider10@homefix.com', '$2a$10$vA5FAsnOaIlnsOFs3Iz5YOMKa7sVR9W8sA1WRDPeTJPR2p/7U00Ei', 'reno_lee', '332-555-0210', TRUE, 'active', 'Painting, outdoor repair, and small renovation provider.');

INSERT INTO Services (service_name, description) VALUES
('Plumbing', 'Leaks, faucets, drains, and small bathroom repairs.'),
('Electrical', 'Light fixtures, outlets, switches, and safety checks.'),
('Cleaning', 'Standard and deep cleaning for apartments and houses.'),
('Painting', 'Interior painting, trim touch-ups, and minor drywall prep.'),
('Landscaping', 'Lawn care, pruning, planting, and outdoor cleanup.');

INSERT INTO Services (service_name, description) VALUES
('HVAC', 'Air conditioning, heating tune-ups, and filter replacement.'),
('Smart Home', 'Smart locks, doorbells, cameras, and connected device setup.'),
('Appliance Repair', 'Washer, dryer, refrigerator, and kitchen appliance troubleshooting.');

INSERT INTO Provider_Services (provider_id, service_id, base_hourly_rate, approval_status, reviewed_by, reviewed_at) VALUES
(1, 1, 68.00, 'approved', 1, CURRENT_TIMESTAMP), (1, 4, 52.00, 'approved', 1, CURRENT_TIMESTAMP),
(2, 2, 82.00, 'approved', 1, CURRENT_TIMESTAMP), (2, 1, 75.00, 'approved', 1, CURRENT_TIMESTAMP),
(3, 3, 45.00, 'approved', 1, CURRENT_TIMESTAMP), (3, 5, 42.00, 'approved', 1, CURRENT_TIMESTAMP),
(4, 4, 58.00, 'approved', 1, CURRENT_TIMESTAMP), (4, 3, 48.00, 'approved', 1, CURRENT_TIMESTAMP),
(5, 5, 55.00, 'approved', 1, CURRENT_TIMESTAMP), (5, 3, 50.00, 'approved', 1, CURRENT_TIMESTAMP);

INSERT INTO Provider_Services (provider_id, service_id, base_hourly_rate, approval_status, reviewed_by, reviewed_at) VALUES
(6, 6, 95.00, 'approved', 1, CURRENT_TIMESTAMP), (6, 1, 72.00, 'approved', 1, CURRENT_TIMESTAMP),
(7, 3, 52.00, 'approved', 1, CURRENT_TIMESTAMP), (7, 6, 88.00, 'approved', 1, CURRENT_TIMESTAMP),
(8, 7, 90.00, 'approved', 1, CURRENT_TIMESTAMP), (8, 2, 76.00, 'approved', 1, CURRENT_TIMESTAMP),
(9, 8, 110.00, 'approved', 1, CURRENT_TIMESTAMP), (9, 1, 70.00, 'approved', 1, CURRENT_TIMESTAMP),
(10, 4, 60.00, 'approved', 1, CURRENT_TIMESTAMP), (10, 5, 57.00, 'approved', 1, CURRENT_TIMESTAMP),
(7, 5, 54.00, 'pending', NULL, NULL), (8, 6, 92.00, 'pending', NULL, NULL);

INSERT INTO Provider_Unavailable_Blocks (provider_id, start_time, end_time, reason) VALUES
(1, '2026-05-12 13:00:00', '2026-05-12 15:00:00', 'Personal appointment'),
(4, '2026-05-13 09:00:00', '2026-05-13 12:00:00', 'Supply pickup'),
(6, '2026-05-20 08:00:00', '2026-05-20 10:30:00', 'Parts delivery'),
(8, '2026-05-21 13:00:00', '2026-05-21 17:00:00', 'Training block'),
(10, '2026-05-22 11:00:00', '2026-05-22 12:30:00', 'Inspection appointment');

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

INSERT INTO Addresses (receiver_id, street, city, state, zip_code, is_default) VALUES
(6, '25-40 31st Ave Apt 5B', 'Astoria', 'NY', '11106', TRUE),
(6, '401 E 34th St Apt 19C', 'New York', 'NY', '10016', FALSE),
(7, '760 Dean St Apt 2R', 'Brooklyn', 'NY', '11238', TRUE),
(7, '90-15 Queens Blvd Apt 12D', 'Elmhurst', 'NY', '11373', FALSE),
(8, '135 W 70th St Apt 8F', 'New York', 'NY', '10023', TRUE),
(8, '11 Hoyt St Apt 21A', 'Brooklyn', 'NY', '11201', FALSE),
(9, '37-18 Main St Apt 6D', 'Flushing', 'NY', '11354', TRUE),
(9, '680 Fort Washington Ave Apt 4H', 'New York', 'NY', '10040', FALSE),
(10, '222 E 39th St Apt 9G', 'New York', 'NY', '10016', TRUE),
(10, '3619 Riverdale Ave Apt 3C', 'Bronx', 'NY', '10463', FALSE);

INSERT INTO Addresses (receiver_id, street, city, state, zip_code, is_default) VALUES
(1, '135 W 70th St Apt 11A', 'New York', 'NY', '10023', FALSE),
(1, '760 Dean St Apt 4B', 'Brooklyn', 'NY', '11238', FALSE),
(1, '37-18 Main St Apt 9C', 'Flushing', 'NY', '11354', FALSE),
(1, '3619 Riverdale Ave Apt 8D', 'Bronx', 'NY', '10463', FALSE);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, provider_base_hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(1, 1, 1, 1, 'completed', '2026-05-02 09:00:00', 68.00, 0.0000, 'standard_hours', 2.00, 2.00),
(1, 4, 4, 2, 'pending', '2026-05-08 13:00:00', 58.00, 0.0000, 'standard_hours', 4.00, NULL),
(2, 2, 2, 3, 'accepted', '2026-05-06 11:30:00', 82.00, 0.0000, 'standard_hours', 1.50, NULL),
(2, 1, 4, 4, 'completed', '2026-04-28 10:00:00', 52.00, 0.0000, 'standard_hours', 3.00, 3.00),
(3, 3, 3, 5, 'completed', '2026-04-29 14:00:00', 45.00, 0.0000, 'standard_hours', 2.50, 2.50),
(3, 5, 5, 6, 'in_progress', '2026-05-03 15:00:00', 55.00, 0.1000, 'weekend', 2.00, NULL),
(4, 2, 1, 7, 'cancelled', '2026-05-01 08:00:00', 75.00, 0.0000, 'standard_hours', 1.00, NULL),
(4, 4, 3, 8, 'pending', '2026-05-11 12:00:00', 48.00, 0.0000, 'standard_hours', 3.50, NULL),
(5, 5, 5, 9, 'completed', '2026-04-25 09:30:00', 55.00, 0.1000, 'weekend', 2.25, 2.25),
(5, 4, 3, 10, 'accepted', '2026-05-09 16:00:00', 48.00, 0.3000, 'weekend_after_hours', 2.00, NULL);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, provider_base_hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(6, 6, 6, 11, 'completed', '2026-04-22 09:00:00', 95.00, 0.0000, 'standard_hours', 3.00, 2.75),
(6, 7, 3, 12, 'pending', '2026-05-14 10:00:00', 52.00, 0.0000, 'standard_hours', 2.00, NULL),
(7, 8, 7, 13, 'accepted', '2026-05-14 13:00:00', 90.00, 0.0000, 'standard_hours', 1.50, NULL),
(7, 9, 8, 14, 'completed', '2026-04-30 15:00:00', 110.00, 0.0000, 'standard_hours', 1.00, 1.00),
(8, 6, 1, 15, 'in_progress', '2026-05-15 08:30:00', 72.00, 0.0000, 'standard_hours', 2.00, NULL),
(8, 10, 4, 16, 'pending', '2026-05-15 11:00:00', 60.00, 0.0000, 'standard_hours', 4.00, NULL),
(9, 8, 2, 17, 'cancelled', '2026-05-07 09:00:00', 76.00, 0.0000, 'standard_hours', 1.00, NULL),
(9, 9, 1, 18, 'completed', '2026-04-18 12:00:00', 70.00, 0.0000, 'standard_hours', 2.50, 2.50),
(10, 10, 5, 19, 'completed', '2026-04-24 14:00:00', 57.00, 0.0000, 'standard_hours', 3.00, 3.00),
(10, 7, 6, 20, 'rejected', '2026-05-16 10:00:00', 88.00, 0.1000, 'weekend', 2.00, NULL),
(1, 6, 6, 1, 'pending', '2026-05-18 09:00:00', 95.00, 0.0000, 'standard_hours', 2.00, NULL),
(2, 8, 7, 3, 'completed', '2026-04-21 17:30:00', 90.00, 0.2000, 'after_hours', 1.50, 1.25),
(3, 7, 3, 5, 'completed', '2026-04-20 11:00:00', 52.00, 0.0000, 'standard_hours', 3.50, 3.50),
(4, 9, 8, 7, 'pending', '2026-05-19 14:00:00', 110.00, 0.0000, 'standard_hours', 1.25, NULL),
(5, 10, 4, 9, 'completed', '2026-04-26 10:00:00', 60.00, 0.1000, 'weekend', 2.00, 2.00);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, provider_base_hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(1, 1, 1, 21, 'completed', '2026-04-05 09:00:00', 68.00, 0.1000, 'weekend', 2.00, 2.00),
(6, 1, 4, 11, 'completed', '2026-04-09 10:00:00', 52.00, 0.0000, 'standard_hours', 3.00, 3.00),
(7, 1, 1, 13, 'completed', '2026-04-12 13:00:00', 68.00, 0.1000, 'weekend', 1.50, 1.50),
(9, 1, 4, 17, 'completed', '2026-04-15 16:30:00', 52.00, 0.2000, 'after_hours', 2.00, 2.00),
(1, 1, 1, 1, 'pending', '2026-05-20 09:00:00', 68.00, 0.0000, 'standard_hours', 1.50, NULL),
(1, 1, 4, 2, 'accepted', '2026-05-21 14:00:00', 52.00, 0.0000, 'standard_hours', 2.00, NULL),
(2, 1, 1, 3, 'completed', '2026-04-17 11:00:00', 68.00, 0.0000, 'standard_hours', 1.25, 1.25),
(4, 1, 4, 7, 'completed', '2026-04-19 10:30:00', 52.00, 0.1000, 'weekend', 2.50, 2.50),
(8, 1, 1, 15, 'completed', '2026-04-23 08:30:00', 68.00, 0.0000, 'standard_hours', 2.25, 2.25),
(9, 1, 1, 18, 'cancelled', '2026-05-24 12:00:00', 68.00, 0.1000, 'weekend', 1.00, NULL),
(10, 1, 4, 19, 'rejected', '2026-05-25 10:00:00', 52.00, 0.0000, 'standard_hours', 2.00, NULL),
(1, 1, 1, 21, 'in_progress', '2026-05-26 09:30:00', 68.00, 0.0000, 'standard_hours', 1.00, NULL);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, provider_base_hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(1, 2, 2, 1, 'completed', '2026-05-04 10:00:00', 82.00, 0.0000, 'standard_hours', 1.25, 1.25),
(1, 3, 3, 2, 'completed', '2026-05-06 09:30:00', 45.00, 0.0000, 'standard_hours', 2.00, 2.00),
(1, 5, 5, 21, 'accepted', '2026-05-27 11:00:00', 55.00, 0.0000, 'standard_hours', 1.50, NULL),
(1, 8, 7, 22, 'pending', '2026-05-28 14:00:00', 90.00, 0.0000, 'standard_hours', 1.00, NULL),
(1, 10, 4, 23, 'cancelled', '2026-05-29 10:00:00', 60.00, 0.0000, 'standard_hours', 2.00, NULL),
(1, 7, 3, 24, 'rejected', '2026-05-30 13:00:00', 52.00, 0.0000, 'standard_hours', 2.50, NULL),
(1, 9, 8, 1, 'pending', '2026-06-02 12:00:00', 110.00, 0.0000, 'standard_hours', 1.25, NULL),
(1, 6, 1, 21, 'in_progress', '2026-06-03 09:00:00', 72.00, 0.0000, 'standard_hours', 2.00, NULL);

INSERT INTO Appointments (
    receiver_id, provider_id, service_id, address_id, appointment_status,
    scheduled_time, provider_base_hourly_rate_at_booking, schedule_surcharge_rate, schedule_surcharge_reason, estimated_hours, actual_hours
) VALUES
(1, 1, 1, 1, 'completed', '2026-06-05 18:30:00', 68.00, 0.2000, 'after_hours', 1.50, 1.50),
(1, 1, 4, 2, 'completed', '2026-06-06 10:00:00', 52.00, 0.1000, 'weekend', 2.00, 2.00),
(1, 1, 1, 21, 'completed', '2026-06-07 18:00:00', 68.00, 0.3000, 'weekend_after_hours', 1.25, 1.25),
(1, 1, 4, 22, 'completed', '2026-07-02 07:00:00', 52.00, 0.2000, 'after_hours', 2.50, 2.50);

INSERT INTO Payments (app_id, total_amount, provider_payout, commission_rate, payment_status, payment_date)
SELECT
    a.app_id,
    a.actual_total,
    a.provider_actual_payout,
    0.1500,
    'paid',
    paid.payment_date
FROM (
    SELECT 1 AS app_id, '2026-05-02 12:10:00' AS payment_date UNION ALL
    SELECT 4, '2026-04-28 14:00:00' UNION ALL
    SELECT 5, '2026-04-29 17:20:00' UNION ALL
    SELECT 9, '2026-04-25 13:45:00' UNION ALL
    SELECT 11, '2026-04-22 13:10:00' UNION ALL
    SELECT 14, '2026-04-30 17:30:00' UNION ALL
    SELECT 18, '2026-04-18 15:20:00' UNION ALL
    SELECT 19, '2026-04-24 17:00:00' UNION ALL
    SELECT 22, '2026-04-21 20:15:00' UNION ALL
    SELECT 23, '2026-04-20 15:45:00' UNION ALL
    SELECT 25, '2026-04-26 13:25:00' UNION ALL
    SELECT 26, '2026-04-05 12:30:00' UNION ALL
    SELECT 27, '2026-04-09 14:10:00' UNION ALL
    SELECT 28, '2026-04-12 16:00:00' UNION ALL
    SELECT 29, '2026-04-15 19:00:00' UNION ALL
    SELECT 32, '2026-04-17 13:15:00' UNION ALL
    SELECT 33, '2026-04-19 14:00:00' UNION ALL
    SELECT 34, '2026-04-23 11:40:00' UNION ALL
    SELECT 38, '2026-05-04 12:20:00' UNION ALL
    SELECT 39, '2026-05-06 12:00:00' UNION ALL
    SELECT 46, '2026-06-05 20:40:00' UNION ALL
    SELECT 47, '2026-06-06 12:45:00' UNION ALL
    SELECT 48, '2026-06-07 19:50:00' UNION ALL
    SELECT 49, '2026-07-02 10:15:00'
) paid
JOIN Appointments a ON a.app_id = paid.app_id;

INSERT INTO Reviews (app_id, rating, review_direction, comment) VALUES
(1, 5, 'receiver_to_provider', 'Fast repair and very clear communication.'),
(1, 5, 'provider_to_receiver', 'Customer was prepared and easy to work with.'),
(4, 4, 'receiver_to_provider', 'Good painting touch-up and clean finish.'),
(4, 5, 'provider_to_receiver', 'Clear instructions and friendly.'),
(5, 5, 'receiver_to_provider', 'Apartment looks great after the deep clean.'),
(5, 4, 'provider_to_receiver', 'Helpful notes before arrival.'),
(9, 4, 'receiver_to_provider', 'Yard cleanup was done carefully.'),
(9, 5, 'provider_to_receiver', 'Easy access and prompt payment.');

INSERT INTO Reviews (app_id, rating, review_direction, comment) VALUES
(11, 5, 'receiver_to_provider', 'HVAC tune-up was quick and the apartment cooled down immediately.'),
(11, 5, 'provider_to_receiver', 'Clear access notes and fast approval.'),
(14, 4, 'receiver_to_provider', 'Washer is working again and the price was clear.'),
(14, 5, 'provider_to_receiver', 'Receiver had the appliance model ready.'),
(18, 5, 'receiver_to_provider', 'Kitchen leak was fixed cleanly.'),
(18, 4, 'provider_to_receiver', 'Helpful and responsive during scheduling.'),
(19, 4, 'receiver_to_provider', 'Outdoor cleanup was neat and completed on time.'),
(19, 5, 'provider_to_receiver', 'Payment was prompt.'),
(22, 5, 'receiver_to_provider', 'Smart lock setup was smooth and secure.'),
(22, 5, 'provider_to_receiver', 'Receiver tested everything before sign-off.'),
(23, 4, 'receiver_to_provider', 'Deep cleaning was thorough.'),
(23, 4, 'provider_to_receiver', 'Good communication before arrival.'),
(25, 5, 'receiver_to_provider', 'Paint touch-up matched the wall perfectly.'),
(25, 5, 'provider_to_receiver', 'Prepared the room before the visit.');

INSERT INTO Reviews (app_id, rating, review_direction, comment) VALUES
(26, 5, 'receiver_to_provider', 'Great plumbing help for my Upper West Side apartment.'),
(26, 5, 'provider_to_receiver', 'Clear remote access notes and fast confirmation.'),
(27, 4, 'receiver_to_provider', 'Painting work was neat and finished on schedule.'),
(27, 5, 'provider_to_receiver', 'Receiver approved details quickly.'),
(28, 3, 'receiver_to_provider', 'Repair worked, but arrival was a little late.'),
(28, 4, 'provider_to_receiver', 'Good communication after arrival.'),
(29, 2, 'receiver_to_provider', 'Paint match needed a second pass.'),
(29, 4, 'provider_to_receiver', 'Flexible with the follow-up timing.'),
(32, 1, 'receiver_to_provider', 'The faucet issue returned after a few days.'),
(32, 3, 'provider_to_receiver', 'Access was delayed at the building desk.'),
(33, 5, 'receiver_to_provider', 'Excellent wall repair and cleanup.'),
(33, 5, 'provider_to_receiver', 'Workspace was prepared before arrival.'),
(34, 4, 'receiver_to_provider', 'Efficient plumbing visit and fair pricing.'),
(34, 5, 'provider_to_receiver', 'Payment and confirmation were prompt.');

INSERT INTO Reviews (app_id, rating, review_direction, comment) VALUES
(38, 5, 'receiver_to_provider', 'Electrical check was quick and clearly explained.'),
(38, 5, 'provider_to_receiver', 'Receiver had the panel area ready.'),
(39, 4, 'receiver_to_provider', 'Cleaning was on time and neatly finished.'),
(39, 5, 'provider_to_receiver', 'Smooth access and fast confirmation.');
