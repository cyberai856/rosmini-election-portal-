-- Rosmini Secondary School Tanga — election data backup
-- Generated: 2026-09-29T12:21:51.518Z
-- Import with: psql -U user -d database -f election-data-backup.sql
BEGIN;
DELETE FROM votes; DELETE FROM candidates; DELETE FROM election_settings;
INSERT INTO election_settings (id, school_name, start_at, end_at, administration_email, notification_sent, notification_sent_at, updated_at) VALUES (1, 'Rosmini Secondary School, Tanga', '2026-09-18T02:02:00.000Z', '2026-09-23T03:02:00.000Z', 'desiremdoe@gmail.com, emil.mahaja@gmail.com', 'true', '2026-09-24T06:05:11.364Z', '2026-09-24T06:05:11.364Z');
INSERT INTO candidates (id, position, name, class_name, tagline, manifesto, accent, initials, image_url, created_at) VALUES (9, 'HEAD BOY', 'DESIRE', 'F2', 'DESIRE', 'The full manifesto for this candidate will be published by the student leadership office shortly.', '#1b3f94', 'D', NULL, '2026-09-20T12:29:06.207Z');
INSERT INTO candidates (id, position, name, class_name, tagline, manifesto, accent, initials, image_url, created_at) VALUES (10, 'HEAD GIRL', 'GRACE', 'F5', 'GRACE', 'The full manifesto for this candidate will be published by the student leadership office shortly.', '#d9a441', 'G', NULL, '2026-09-20T12:29:26.196Z');
INSERT INTO candidates (id, position, name, class_name, tagline, manifesto, accent, initials, image_url, created_at) VALUES (11, 'HEAD BOY', 'JAMES', 'F2', 'JAMES', 'The full manifesto for this candidate will be published by the student leadership office shortly.', '#1b3f94', 'J', NULL, '2026-09-20T12:29:49.542Z');
INSERT INTO candidates (id, position, name, class_name, tagline, manifesto, accent, initials, image_url, created_at) VALUES (12, 'HEAD GIRL', 'KIWANDI', 'F6', 'KIWANDI', 'The full manifesto for this candidate will be published by the student leadership office shortly.', '#d9a441', 'K', NULL, '2026-09-20T12:30:06.783Z');
INSERT INTO votes (id, student_id, candidate_id, position, created_at) VALUES (3, '001', 9, 'HEAD BOY', '2026-09-20T12:41:45.672Z');
INSERT INTO votes (id, student_id, candidate_id, position, created_at) VALUES (4, '001', 10, 'HEAD GIRL', '2026-09-20T12:41:45.672Z');
INSERT INTO votes (id, student_id, candidate_id, position, created_at) VALUES (5, '004', 9, 'HEAD BOY', '2026-09-22T13:55:14.090Z');
INSERT INTO votes (id, student_id, candidate_id, position, created_at) VALUES (6, '004', 12, 'HEAD GIRL', '2026-09-22T13:55:14.090Z');
COMMIT;
