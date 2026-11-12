-- Date de test pentru Campus Sports Booking
-- (parolele sunt valori fictive, nu hash-uri reale)

INSERT INTO booking_rules DEFAULT VALUES;

INSERT INTO users (email, password_hash, full_name, role, status) VALUES
 ('admin@campus.test',   'hash_admin',   'Administrator Campus', 'admin',   'active'),   -- 1
 ('ana@campus.test',     'hash_ana',     'Ana Popescu',          'student', 'active'),   -- 2
 ('bogdan@campus.test',  'hash_bogdan',  'Bogdan Ionescu',       'student', 'active'),   -- 3
 ('carmen@campus.test',  'hash_carmen',  'Carmen Dumitru',       'student', 'active'),   -- 4
 ('dan@campus.test',     'hash_dan',     'Dan Marin',            'student', 'blocked'),  -- 5
 ('prof.radu@campus.test','hash_radu',   'Prof. Radu Stan',      'teacher', 'active');   -- 6

INSERT INTO sports (name) VALUES ('Fotbal'), ('Baschet'), ('Tenis'), ('Volei');

INSERT INTO facilities (sport_id, name, location, description, capacity, price_per_hour, opens_at, closes_at, status) VALUES
 (1, 'Teren fotbal sintetic', 'Complex sportiv, Corp A', 'Teren cu gazon sintetic, nocturna si vestiare.',      14, 60.00, '08:00', '22:00', 'active'),
 (2, 'Sala baschet',          'Sala de sport, etaj 1',   'Sala cu parchet, doua cosuri si tribuna mica.',       10,  0.00, '08:00', '22:00', 'active'),
 (3, 'Teren tenis 1',         'Complex sportiv, Corp B', 'Teren cu zgura, fileu si rachete la cerere.',          4, 40.00, '08:00', '22:00', 'active'),
 (4, 'Sala volei',            'Sala de sport, parter',   'Sala cu fileu reglabil; parchetul se renoveaza.',     12,  0.00, '08:00', '20:00', 'maintenance');

INSERT INTO time_slots (facility_id, starts_at, ends_at, auction_closes_at) VALUES
 (1, now()::date + interval '1 day 16 hours', now()::date + interval '1 day 17 hours', now()::date + interval '12 hours'),
 (1, now()::date + interval '1 day 17 hours', now()::date + interval '1 day 18 hours', NULL),
 (2, now()::date + interval '1 day 18 hours', now()::date + interval '1 day 19 hours', NULL),
 (3, now()::date + interval '2 days 10 hours', now()::date + interval '2 days 11 hours', NULL),
 (4, now()::date + interval '2 days 19 hours', now()::date + interval '2 days 20 hours', NULL),
 (2, now()::date + interval '3 days 18 hours', now()::date + interval '3 days 19 hours', NULL);

INSERT INTO facility_closures (facility_id, starts_at, ends_at, reason) VALUES
 (3, now()::date + interval '10 days', now()::date + interval '12 days', 'Renovare suprafata');

INSERT INTO teams (name, sport_id, captain_id, max_players, join_mode) VALUES
 ('Tigrii',   1, 2, 14, 'open'),
 ('Vulturii', 2, 3,  8, 'invitation');

INSERT INTO team_members (team_id, user_id) VALUES (1, 2), (1, 3), (1, 4), (2, 3), (2, 2);

INSERT INTO team_invitations (team_id, invited_user_id, status, responded_at) VALUES
 (1, 4, 'accepted', now()),
 (2, 4, 'pending',  NULL);

-- rezervare 1: teren cu plata, open match (locuri libere afisate altora)
INSERT INTO bookings (slot_id, team_id, captain_id, status, total_places, is_open_match, qr_code, confirmed_at) VALUES
 (1, 1, 2, 'confirmed', 14, TRUE, 'QR-TIGRII-0001', now());
INSERT INTO booking_participants (booking_id, user_id, status, joined_at) VALUES
 (1, 2, 'joined', now()), (1, 3, 'joined', now()), (1, 4, 'invited', NULL), (1, 6, 'joined', now());
INSERT INTO payments (user_id, booking_id, amount, method, status, provider_ref) VALUES
 (2, 1, 60.00, 'card', 'accepted', 'PAY-0001'),
 (6, 1,  4.29, 'card', 'accepted', 'PAY-0002');   -- plata unui jucator care s-a alaturat (60 lei / 14 locuri)

-- rezervare 2: facilitate gratuita, deci confirmata direct
INSERT INTO bookings (slot_id, team_id, captain_id, status, total_places, confirmed_at) VALUES
 (3, 2, 3, 'confirmed', 10, now());

-- licitatie pentru un slot (limita lunara depasita)
INSERT INTO bids (slot_id, team_id, captain_id, amount, status) VALUES
 (2, 1, 2, 70.00, 'pending');

-- lista de asteptare pentru slotul ocupat
INSERT INTO waiting_list (slot_id, user_id) VALUES (1, 4);

-- rezervare 3 a lui Dan: neprezentare, apoi inca una -> sanctiune
INSERT INTO bookings (slot_id, team_id, captain_id, status, total_places) VALUES
 (4, 2, 5, 'no_show', 4),
 (5, 2, 5, 'no_show', 12);
INSERT INTO incidents (user_id, booking_id, type, description) VALUES
 (5, 3, 'no_show', 'Neprezentare 1'),
 (5, 4, 'no_show', 'Neprezentare 2 consecutiva');
INSERT INTO sanctions (user_id, reason, ends_at, fine_amount) VALUES
 (5, 'A doua neprezentare consecutiva', now() + interval '6 months', 100.00);
UPDATE users SET blocked_until = (SELECT ends_at FROM sanctions WHERE user_id = 5) WHERE id = 5;

-- rezervare a administratorului care preia o sala si anuleaza o rezervare existenta
INSERT INTO bookings (slot_id, team_id, captain_id, status, total_places, confirmed_at) VALUES
 (6, NULL, 1, 'confirmed', 10, now());              -- id 5
INSERT INTO bookings (slot_id, team_id, captain_id, status, total_places, cancelled_at, cancelled_by, cancel_reason, displaced_by) VALUES
 (6, 2, 3, 'cancelled', 10, now(), 1, 'Preluat de administrator', 5);   -- id 6, rezervarea mutata

INSERT INTO notifications (user_id, booking_id, type, subject) VALUES
 (2, 1, 'booking_confirmed', 'Rezervare confirmata'),
 (2, 1, 'qr_code',           'Codul QR pentru intrare'),
 (4, NULL, 'invitation',     'Ai fost invitat in echipa Vulturii');
