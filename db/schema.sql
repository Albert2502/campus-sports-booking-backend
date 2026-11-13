-- Campus Sports Booking - schema PostgreSQL (v3, acopera toate cerintele din pagina de cerinte)
-- v3: facilitati cu descriere, program, stare (activa/mentenanta/inactiva), pret pe ora, imagini
-- Rulare: psql -U <user> -d campus_sports -f schema.sql

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- Tipuri enumerate ----------
CREATE TYPE user_role           AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE account_status      AS ENUM ('active', 'blocked');
CREATE TYPE team_join_mode      AS ENUM ('invitation', 'open');
CREATE TYPE invitation_status   AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE booking_status      AS ENUM ('pending', 'confirmed', 'checked_in', 'cancelled', 'released', 'no_show');
CREATE TYPE participant_status  AS ENUM ('invited', 'joined', 'declined', 'removed');
CREATE TYPE payment_status      AS ENUM ('pending', 'accepted', 'declined', 'refunded');
CREATE TYPE bid_status          AS ENUM ('pending', 'won', 'lost');
CREATE TYPE incident_type       AS ENUM ('no_show', 'rule_violation');
CREATE TYPE lift_method         AS ENUM ('expired', 'fine', 'admin');
CREATE TYPE facility_status     AS ENUM ('active', 'maintenance', 'inactive');

-- ---------- Reguli configurabile (raspunde intrebarilor deschise) ----------
CREATE TABLE booking_rules (
    id                        SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- un singur rand
    monthly_booking_limit     INT          NOT NULL DEFAULT 1,
    limit_applies_to_teachers BOOLEAN      NOT NULL DEFAULT FALSE,
    free_cancel_hours         INT          NOT NULL DEFAULT 4,
    checkin_minutes_before    INT          NOT NULL DEFAULT 10,
    sanction_after_incidents  INT          NOT NULL DEFAULT 2,
    ban_months                INT          NOT NULL DEFAULT 6,
    unban_fine_amount         NUMERIC(8,2) NOT NULL DEFAULT 100.00
);

-- ---------- Utilizatori ----------
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(120) NOT NULL,
    role           user_role      NOT NULL DEFAULT 'student',
    status         account_status NOT NULL DEFAULT 'active',
    blocked_until  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ---------- Sporturi si facilitati ----------
CREATE TABLE sports (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE facilities (
    id                SERIAL PRIMARY KEY,
    sport_id          INT          NOT NULL REFERENCES sports(id),
    name              VARCHAR(120) NOT NULL,
    location          VARCHAR(200),
    description       VARCHAR(1000),
    capacity          INT          NOT NULL CHECK (capacity > 0),       -- locuri totale
    price_per_hour    NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0),   -- 0 = gratuit
    opens_at          TIME,                                              -- program; NULL = fara restrictie
    closes_at         TIME,
    status            facility_status NOT NULL DEFAULT 'active',
    CHECK (num_nonnulls(opens_at, closes_at) IN (0, 2)),
    CHECK (closes_at > opens_at)
);

CREATE TABLE facility_images (
    id           SERIAL PRIMARY KEY,
    facility_id  INT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    path         VARCHAR(255) NOT NULL,                                  -- fisierul din uploads/
    position     INT NOT NULL DEFAULT 0,                                 -- prima imagine e miniatura
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facility_images_facility ON facility_images (facility_id, position);

CREATE TABLE time_slots (
    id                  SERIAL PRIMARY KEY,
    facility_id         INT         NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ NOT NULL,
    auction_closes_at   TIMESTAMPTZ,                  -- cand se inchide licitatia pentru slot (daca exista)
    CHECK (ends_at > starts_at),
    EXCLUDE USING gist (facility_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);

-- inchideri pentru mentenanta (optional, din tema proiectului)
CREATE TABLE facility_closures (
    id           SERIAL PRIMARY KEY,
    facility_id  INT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    starts_at    TIMESTAMPTZ NOT NULL,
    ends_at      TIMESTAMPTZ NOT NULL,
    reason       VARCHAR(200),
    CHECK (ends_at > starts_at)
);

-- lista de asteptare pentru sloturi ocupate (optional, din tema proiectului)
CREATE TABLE waiting_list (
    slot_id     INT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (slot_id, user_id)
);

-- ---------- Echipe ----------
CREATE TABLE teams (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    sport_id    INT NOT NULL REFERENCES sports(id),
    captain_id  INT NOT NULL REFERENCES users(id),
    max_players INT NOT NULL DEFAULT 10 CHECK (max_players > 0),     -- echipe dupa sport si numar
    join_mode   team_join_mode NOT NULL DEFAULT 'invitation',       -- pe invitatie sau open match
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, sport_id)
);

CREATE TABLE team_members (
    team_id    INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE team_invitations (
    id               SERIAL PRIMARY KEY,
    team_id          INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status           invitation_status NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_pending_invitation
    ON team_invitations (team_id, invited_user_id) WHERE status = 'pending';

-- ---------- Rezervari ----------
CREATE TABLE bookings (
    id             SERIAL PRIMARY KEY,
    slot_id        INT NOT NULL REFERENCES time_slots(id),
    team_id        INT REFERENCES teams(id),                 -- NULL pentru rezervarile administratorului
    captain_id     INT NOT NULL REFERENCES users(id),        -- cel care face rezervarea
    status         booking_status NOT NULL DEFAULT 'pending',
    total_places   INT NOT NULL DEFAULT 1 CHECK (total_places > 0),
    is_open_match  BOOLEAN NOT NULL DEFAULT FALSE,           -- locurile libere sunt afisate altora (cu plata)
    qr_code        VARCHAR(64) UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at   TIMESTAMPTZ,
    cancelled_at   TIMESTAMPTZ,
    cancelled_by   INT REFERENCES users(id),                 -- utilizator sau administrator
    cancel_reason  VARCHAR(200),
    displaced_by   INT REFERENCES bookings(id),              -- rezervarea administratorului care a preluat sala
    checked_in_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_active_booking_per_slot
    ON bookings (slot_id) WHERE status IN ('pending', 'confirmed', 'checked_in');
CREATE INDEX idx_bookings_captain ON bookings (captain_id, created_at);

-- jucatori invitati / inscrisi la o rezervare (invitatii pe teren inchiriat, open match)
CREATE TABLE booking_participants (
    booking_id  INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      participant_status NOT NULL DEFAULT 'invited',
    invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    joined_at   TIMESTAMPTZ,
    PRIMARY KEY (booking_id, user_id)
);

-- ---------- Sanctiuni (creata inaintea platilor, care o pot referi) ----------
CREATE TABLE incidents (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(id),
    booking_id   INT REFERENCES bookings(id) ON DELETE SET NULL,
    type         incident_type NOT NULL,
    description  VARCHAR(200),
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_one_no_show_per_booking
    ON incidents (booking_id) WHERE type = 'no_show';

CREATE TABLE sanctions (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(id),
    reason       VARCHAR(200) NOT NULL,
    starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at      TIMESTAMPTZ,                     -- de obicei starts_at + 6 luni
    fine_amount  NUMERIC(8,2),                    -- amenda pentru deblocare anticipata
    lifted_at    TIMESTAMPTZ,
    lifted_by    INT REFERENCES users(id),        -- administratorul, daca a deblocat el
    lift_method  lift_method
);

-- ---------- Plati (rezervari, locuri in open match, amenzi) ----------
CREATE TABLE payments (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id),             -- cel care plateste
    booking_id    INT REFERENCES bookings(id) ON DELETE CASCADE,
    sanction_id   INT REFERENCES sanctions(id),                  -- plata unei amenzi
    amount        NUMERIC(8,2) NOT NULL CHECK (amount >= 0),
    method        VARCHAR(30),                                   -- ex: card
    status        payment_status NOT NULL DEFAULT 'pending',
    provider_ref  VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    refunded_at   TIMESTAMPTZ,
    CHECK (num_nonnulls(booking_id, sanction_id) = 1)
);

-- ---------- Licitatii (depasirea limitei lunare) ----------
CREATE TABLE bids (
    id          SERIAL PRIMARY KEY,
    slot_id     INT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    team_id     INT NOT NULL REFERENCES teams(id),
    captain_id  INT NOT NULL REFERENCES users(id),
    amount      NUMERIC(8,2) NOT NULL CHECK (amount > 0),
    status      bid_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slot_id, team_id)
);

-- ---------- Notificari (email de confirmare, QR, invitatii, sanctiuni) ----------
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id  INT REFERENCES bookings(id) ON DELETE SET NULL,
    type        VARCHAR(40)  NOT NULL,   -- booking_confirmed, qr_code, invitation, sanction, displaced ...
    subject     VARCHAR(200) NOT NULL,
    sent_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ====================================================================
-- Vederi pentru rapoartele administratorului si pentru regulile de acces
-- ====================================================================

-- rezervari active pe luna si utilizator (pentru limita lunara)
CREATE VIEW v_monthly_bookings AS
SELECT b.captain_id AS user_id,
       date_trunc('month', s.starts_at) AS month,
       count(*) AS bookings_count
FROM bookings b
JOIN time_slots s ON s.id = b.slot_id
WHERE b.status IN ('pending', 'confirmed', 'checked_in', 'no_show')
GROUP BY b.captain_id, date_trunc('month', s.starts_at);

-- cele mai inchiriate si cele mai profitabile facilitati
CREATE VIEW v_facility_stats AS
SELECT f.id AS facility_id,
       f.name,
       count(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'checked_in', 'no_show')) AS bookings_count,
       coalesce(sum(p.amount) FILTER (WHERE p.status = 'accepted'), 0) AS revenue
FROM facilities f
LEFT JOIN time_slots s ON s.facility_id = f.id
LEFT JOIN bookings   b ON b.slot_id = s.id
LEFT JOIN payments   p ON p.booking_id = b.id
GROUP BY f.id, f.name;

-- istoricul inchirierilor pentru administrator
CREATE VIEW v_rental_history AS
SELECT b.id AS booking_id, f.name AS facility, sp.name AS sport,
       s.starts_at, s.ends_at, u.full_name AS captain, t.name AS team,
       b.status, coalesce(sum(p.amount) FILTER (WHERE p.status = 'accepted'), 0) AS paid
FROM bookings b
JOIN time_slots s  ON s.id = b.slot_id
JOIN facilities f  ON f.id = s.facility_id
JOIN sports sp     ON sp.id = f.sport_id
JOIN users u       ON u.id = b.captain_id
LEFT JOIN teams t  ON t.id = b.team_id
LEFT JOIN payments p ON p.booking_id = b.id
GROUP BY b.id, f.name, sp.name, s.starts_at, s.ends_at, u.full_name, t.name, b.status;

-- locuri libere in rezervarile cu open match
CREATE VIEW v_open_places AS
SELECT b.id AS booking_id, b.slot_id, b.total_places,
       count(bp.user_id) FILTER (WHERE bp.status = 'joined') AS joined,
       b.total_places - count(bp.user_id) FILTER (WHERE bp.status = 'joined') AS free_places
FROM bookings b
LEFT JOIN booking_participants bp ON bp.booking_id = b.id
WHERE b.is_open_match AND b.status IN ('pending', 'confirmed')
GROUP BY b.id;
