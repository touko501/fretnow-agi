-- ═══════════════════════════════════════════════════════════════════════════
-- FRETNOW — SEED DATA v5.1
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix: Prisma @updatedAt doesn't set DB defaults
ALTER TABLE "Zone" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Company" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Driver" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Vehicle" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Mission" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Bid" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Rating" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Favorite" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Document" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "MissionStatusLog" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "TransporteurZone" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "CnrIndex" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "Setting" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
ALTER TABLE "AuditLog" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- ═══ ZONES FRANCE ═══
INSERT INTO "Zone" (id, name, code, departments) VALUES
('z-idf',  'Île-de-France',    'IDF', ARRAY['75','77','78','91','92','93','94','95']),
('z-hdf',  'Hauts-de-France',  'HDF', ARRAY['02','59','60','62','80']),
('z-ara',  'Auvergne-Rhône-Alpes', 'ARA', ARRAY['01','03','07','15','26','38','42','43','63','69','73','74']),
('z-paca', 'Provence-Alpes-Côte d''Azur', 'PACA', ARRAY['04','05','06','13','83','84']),
('z-occ',  'Occitanie',        'OCC', ARRAY['09','11','12','30','31','32','34','46','48','65','66','81','82']),
('z-naq',  'Nouvelle-Aquitaine','NAQ', ARRAY['16','17','19','23','24','33','40','47','64','79','86','87']),
('z-bret', 'Bretagne',         'BRE', ARRAY['22','29','35','56']),
('z-pdl',  'Pays de la Loire', 'PDL', ARRAY['44','49','53','72','85']),
('z-nor',  'Normandie',        'NOR', ARRAY['14','27','50','61','76']),
('z-ge',   'Grand Est',        'GE',  ARRAY['08','10','51','52','54','55','57','67','68','88']),
('z-cvl',  'Centre-Val de Loire','CVL', ARRAY['18','28','36','37','41','45']),
('z-bfc',  'Bourgogne-Franche-Comté','BFC', ARRAY['21','25','39','58','70','71','89','90']),
('z-cor',  'Corse',            'COR', ARRAY['2A','2B']);

-- ═══ ENTREPRISE FRETNOW ═══
INSERT INTO "Company" (id, type, name, "tradeName", siren, siret, "tvaIntra", naf, address, "postalCode", city, country, lat, lon, phone, email, website, "isVerified", "verifiedAt") VALUES
('co-fretnow', 'PLATEFORME', 'FRETNOW AGI', 'FRETNOW', '987654321', '98765432100010', 'FR12987654321', '5229A', '15 Rue de la Paix', '75002', 'Paris', 'FR', 48.8698, 2.3308, '+33155667788', 'contact@fretnow.com', 'https://fretnow.com', true, '2026-01-15');

-- ═══ ENTREPRISES TRANSPORTEURS ═══
INSERT INTO "Company" (id, type, name, "tradeName", siren, siret, "tvaIntra", naf, address, "postalCode", city, country, lat, lon, phone, email, "licenceNumber", "licenceType", "isVerified", "verifiedAt") VALUES
('co-expressrte', 'TRANSPORTEUR', 'EXPRESS ROUTE SAS', 'Express Route', '912345678', '91234567800012', 'FR56912345678', '4941A', '8 Av. Gabriel Péri', '92230', 'Gennevilliers','FR', 48.9296, 2.2926, '+33698765432', 'direction@expressroute.fr', 'LI-2023-ER-002', 'communautaire', true, '2026-01-22'),
('co-frigotrans', 'TRANSPORTEUR', 'FRIGOTRANS EURL', 'Frigotrans', '823456789', '82345678900018', 'FR78823456789', '4941A', '12 Rue du Séminaire', '94150', 'Rungis', 'FR', 48.7464, 2.3516, '+33678901234', 'contact@frigotrans.fr', 'LI-2024-FG-003', 'intérieur', true, '2026-01-25'),
('co-nordfret', 'TRANSPORTEUR', 'NORD FRET TRANSPORT SARL', 'Nord Fret', '734567890', '73456789000011', 'FR91734567890', '4941A', '25 Boulevard de la Liberté', '59000', 'Lille', 'FR', 50.6310, 3.0575, '+33645678901', 'contact@nordfret.fr', 'LI-2023-NF-004', 'intérieur', true, '2026-02-01'),
('co-medlog', 'TRANSPORTEUR', 'MÉDITERRANÉE LOGISTIQUE SAS', 'Med Log', '645678901', '64567890100014', 'FR23645678901', '4941A', '45 Chemin de Gibbes', '13014', 'Marseille', 'FR', 43.3437, 5.3736, '+33634567890', 'info@medlog.fr', 'LI-2024-ML-005', 'communautaire', true, '2026-02-03'),
('co-karim', 'TRANSPORTEUR', 'KARIM TRANSPORT', 'Karim Transport', '556789012', '55678901200017', 'FR45556789012', '4941A', '18 Rue Garibaldi', '69006', 'Lyon', 'FR', 45.7640, 4.8508, '+33623456789', 'karim@karimtransport.fr', 'LI-2024-KT-006', 'intérieur', true, '2026-02-05'),
('co-loirex', 'TRANSPORTEUR', 'LOIRE EXPRESS SARL', 'Loire Express', '467890123', '46789012300013', 'FR67467890123', '4941A', '5 Place Jean Jaurès', '37000', 'Tours', 'FR', 47.3941, 0.6848, '+33612098765', 'contact@loirexpress.fr', 'LI-2025-LE-007', 'intérieur', true, '2026-02-07'),
('co-bretfret', 'TRANSPORTEUR', 'BRETAGNE FRET SAS', 'Bretagne Fret', '378901234', '37890123400016', 'FR89378901234', '4941A', '10 Rue de Châtillon', '35000', 'Rennes', 'FR', 48.1135, -1.6751, '+33687654321', 'bretagnefret@orange.fr', 'LI-2024-BF-008', 'intérieur', true, '2026-02-08'),
('co-sudfret', 'TRANSPORTEUR', 'SUD FRET EXPRESS SARL', 'Sud Fret Express', '289012345', '28901234500019', 'FR01289012345', '4941A', '78 Route de Bayonne', '31300', 'Toulouse', 'FR', 43.5866, 1.4388, '+33676543210', 'sudfret31@gmail.com', 'LI-2025-SF-009', 'intérieur', false, NULL),
('co-alsace', 'TRANSPORTEUR', 'ALSACE TRANSPORT SAS', 'Alsace Transport', '190123456', '19012345600012', 'FR13190123456', '4941A', '22 Route du Rhin', '67000', 'Strasbourg', 'FR', 48.5734, 7.7521, '+33665432109', 'contact@alsacetransport.fr', 'LI-2024-AT-010', 'communautaire', true, '2026-02-10'),
('co-normlog', 'TRANSPORTEUR', 'NORMANDIE LOGISTIQUE SARL', 'Normandie Log', '101234567', '10123456700015', 'FR35101234567', '4941A', '4 Quai de France', '76000', 'Rouen', 'FR', 49.4432, 1.0999, '+33654321098', 'nlog@nlog.fr', 'LI-2024-NL-011', 'intérieur', true, '2026-02-12'),
('co-rapidcargo', 'TRANSPORTEUR', 'RAPID CARGO SAS', 'Rapid Cargo', '012345678', '01234567800018', 'FR57012345678', '4941A', '12 Rue Bannier', '45000', 'Orléans', 'FR', 47.9027, 1.9086, '+33643210987', 'bonjour@rapidcargo.fr', 'LI-2025-RC-012', 'intérieur', true, '2026-02-14');

-- ═══ ENTREPRISES CHARGEURS ═══
INSERT INTO "Company" (id, type, name, "tradeName", siren, siret, "tvaIntra", naf, address, "postalCode", city, country, lat, lon, phone, email, "isVerified", "verifiedAt") VALUES
('co-agrobon', 'CHARGEUR', 'AGROBON SAS', 'Agrobon', '534725817', '53472581700011', 'FR76534725817', '4631Z', '8 Rue de la Tour', '94150', 'Rungis', 'FR', 48.7480, 2.3510, '+33155001122', 'commandes@agrobon.fr', true, '2026-01-18'),
('co-batiplus', 'CHARGEUR', 'BATIPLUS MATÉRIAUX SA', 'Batiplus', '445836928', '44583692800014', 'FR88445836928', '4673A', '120 Route de Gennevilliers', '92600', 'Asnières', 'FR', 48.9155, 2.2852, '+33141557788', 'logistique@batiplus.fr', true, '2026-01-28'),
('co-pharmalog', 'CHARGEUR', 'PHARMA LOGISTIQUE SAS', 'PharmaLog', '356947038', '35694703800017', 'FR10356947038', '4646Z', '25 Rue de la Santé', '75013', 'Paris', 'FR', 48.8351, 2.3406, '+33144889966', 'transport@pharmalog.fr', true, '2026-02-02'),
('co-vinexport', 'CHARGEUR', 'VIN EXPORT BORDEAUX', 'VinExport', '267058149', '26705814900013', 'FR32267058149', '4634Z', '45 Quai des Chartrons', '33000', 'Bordeaux', 'FR', 44.8553, -0.5675, '+33556112233', 'expedition@vinexport.fr', true, '2026-02-06'),
('co-techparts', 'CHARGEUR', 'TECH PARTS EUROPE', 'TechParts', '178169250', '17816925000016', 'FR54178169250', '4652Z', '10 ZI des Milles', '13290', 'Aix-en-Provence', 'FR', 43.5037, 5.3918, '+33442998877', 'shipping@techparts.eu', true, '2026-02-09');

-- ═══ USERS FRETNOW TEAM ═══
INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, status, "emailVerified", "kycVerified", "companyId") VALUES
('u-admin', 'admin@fretnow.com', '$2b$12$7zBsoNH1EzzU63FZ3XEcEOFdOCKW/cd9Bxg9gf2vzog1N1cflNMTG', 'Admin', 'FRETNOW', '+33155667788', 'SUPER_ADMIN', 'ACTIVE', true, true, 'co-fretnow'),
('u-tarek', 'tarek@fretnow.com', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Tarek', 'JAZIRI', '+33612345678', 'ADMIN', 'ACTIVE', true, true, 'co-fretnow'),
('u-support', 'support@fretnow.com', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Support', 'FRETNOW', '+33155667789', 'ADMIN', 'ACTIVE', true, true, 'co-fretnow');

-- ═══ USERS TRANSPORTEURS ═══
INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, status, "emailVerified", "kycVerified", "companyId") VALUES
('u-marc', 'marc@expressroute.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Marc', 'DURAND', '+33698765432', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-expressrte'),
('u-youssef', 'youssef@frigotrans.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Youssef', 'BENALI', '+33678901234', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-frigotrans'),
('u-pierre', 'pierre@nordfret.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Pierre', 'LEFEBVRE', '+33645678901', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-nordfret'),
('u-karim', 'karim@karimtransport.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Karim', 'BENALI', '+33623456789', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-karim'),
('u-hassan', 'hassan@medlog.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Hassan', 'MANSOURI', '+33634567890', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-medlog'),
('u-jean', 'jean@loirexpress.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Jean', 'MARTIN', '+33612098765', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-loirex'),
('u-yann', 'yann@bretagnefret.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Yann', 'LE GALL', '+33687654321', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-bretfret'),
('u-moussa', 'moussa@sudfret.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Moussa', 'DIALLO', '+33676543210', 'TRANSPORTEUR', 'PENDING_VERIFICATION', true, false, 'co-sudfret'),
('u-thomas', 'thomas@alsacetransport.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Thomas', 'WEBER', '+33665432109', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-alsace'),
('u-nicolas', 'nicolas@nlog.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Nicolas', 'DUBOIS', '+33654321098', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-normlog'),
('u-fabien', 'fabien@rapidcargo.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Fabien', 'MOREAU', '+33643210987', 'TRANSPORTEUR', 'ACTIVE', true, true, 'co-rapidcargo');

-- ═══ USERS CHARGEURS ═══
INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, status, "emailVerified", "kycVerified", "companyId") VALUES
('u-antoine', 'antoine@agrobon.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Antoine', 'BERGER', '+33155001122', 'CHARGEUR', 'ACTIVE', true, true, 'co-agrobon'),
('u-sophie', 'sophie@batiplus.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Sophie', 'DUPONT', '+33141557788', 'CHARGEUR', 'ACTIVE', true, true, 'co-batiplus'),
('u-claire', 'claire@pharmalog.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Claire', 'ROUSSEAU', '+33144889966', 'CHARGEUR', 'ACTIVE', true, true, 'co-pharmalog'),
('u-philippe', 'philippe@vinexport.fr', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'Philippe', 'LAURENT', '+33556112233', 'CHARGEUR', 'ACTIVE', true, true, 'co-vinexport'),
('u-david', 'david@techparts.eu', '$2b$12$LJ3FxVqH7xKPYfQJJUk.5OcmqZHZKH7P5cPXfWKx3R2S1g5Eu5YrC', 'David', 'PETIT', '+33442998877', 'CHARGEUR', 'ACTIVE', true, true, 'co-techparts');

-- ═══ CONDUCTEURS ═══
INSERT INTO "Driver" (id, "companyId", "firstName", "lastName", phone, "licenceNumber", "licenceExpiry", "fimofcoExpiry", "adrCertified") VALUES
('d-eric', 'co-expressrte', 'Éric', 'LEMAIRE', '+33678002001', 'P-92-2023-001', '2028-09-10', '2027-03-20', true),
('d-mehdi', 'co-expressrte', 'Mehdi', 'AMAR', '+33678002002', 'P-92-2023-002', '2029-05-15', '2027-11-10', false),
('d-abdel', 'co-frigotrans', 'Abdel', 'KHELIFI', '+33678003001', 'P-94-2024-001', '2029-10-20', '2027-09-01', true),
('d-laurent', 'co-frigotrans', 'Laurent', 'GIMENEZ', '+33678003002', 'P-94-2024-002', '2028-06-30', '2026-08-15', false),
('d-christophe', 'co-nordfret', 'Christophe', 'DELATTRE', '+33678004001', 'P-59-2023-001', '2029-04-15', '2027-07-20', false),
('d-mourad', 'co-medlog', 'Mourad', 'BEN SAID', '+33678005001', 'P-13-2024-001', '2030-01-20', '2028-02-10', true),
('d-yoann', 'co-karim', 'Yoann', 'PETIT', '+33678006001', 'P-69-2024-001', '2028-12-15', '2027-05-30', false),
('d-stephane', 'co-loirex', 'Stéphane', 'ROUX', '+33678007001', 'P-37-2024-001', '2029-08-20', '2027-10-15', false),
('d-gwenael', 'co-bretfret', 'Gwenaël', 'CORRE', '+33678008001', 'P-35-2024-001', '2030-03-10', '2028-04-20', true),
('d-maxime', 'co-normlog', 'Maxime', 'LEROY', '+33678009001', 'P-76-2024-001', '2029-11-05', '2027-06-15', false),
('d-olivier', 'co-rapidcargo', 'Olivier', 'BLANC', '+33678010001', 'P-45-2025-001', '2030-05-20', '2028-08-01', false);

-- ═══ VÉHICULES ═══
INSERT INTO "Vehicle" (id, "companyId", type, brand, model, year, "licensePlate", "capacityKg", "volumeM3", "palletSpots", "hasTailLift", "hasTracker", "euroNorm", "fuelType", "consumptionPer100km", "costPerKm", "costPerHour", "costPerDay", "lastInspection", "insuranceExpiry") VALUES
('v-er1', 'co-expressrte', 'SEMI_TAUTLINER', 'Volvo', 'FH 500', 2022, 'UV-678-WX', 25000, 92, 33, false, true, 'Euro 6', 'DIESEL_B7', 31.5, 0.79, 29, 142, '2025-10-01', '2026-11-30'),
('v-er2', 'co-expressrte', 'SEMI_BACHE', 'DAF', 'CF 450', 2021, 'YZ-901-AB', 24000, 90, 33, false, true, 'Euro 6', 'DIESEL_B7', 32.5, 0.80, 28, 138, '2025-09-15', '2026-11-30'),
('v-er3', 'co-expressrte', 'MEGA_TRAILER', 'Scania', 'S 500', 2023, 'CD-234-EF', 24000, 102, 33, false, true, 'Euro 6', 'HVO100', 33.0, 0.88, 32, 155, '2025-11-20', '2027-01-15'),
('v-fg1', 'co-frigotrans', 'SEMI_FRIGO', 'Renault', 'T 480', 2023, 'GH-567-IJ', 24000, 86, 33, false, true, 'Euro 6', 'DIESEL_B7', 35.0, 0.90, 30, 150, '2025-10-20', '2026-12-15'),
('v-fg2', 'co-frigotrans', 'PORTEUR_12T', 'DAF', 'LF 280', 2022, 'KL-890-MN', 7000, 40, 14, true, true, 'Euro 6', 'DIESEL_B7', 24.0, 0.68, 27, 125, '2025-09-01', '2026-11-15'),
('v-fg3', 'co-frigotrans', 'SEMI_FRIGO', 'Volvo', 'FM 460', 2024, 'OP-123-QR', 25000, 88, 33, false, true, 'Euro 6', 'B100_COLZA', 34.5, 0.87, 30, 148, '2026-01-10', '2027-04-30'),
('v-nf1', 'co-nordfret', 'SEMI_TAUTLINER', 'MAN', 'TGX 510', 2022, 'ST-456-UV', 25000, 90, 33, false, true, 'Euro 6', 'DIESEL_B7', 33.0, 0.80, 29, 140, '2025-10-05', '2026-12-31'),
('v-ml1', 'co-medlog', 'SEMI_TAUTLINER', 'Iveco', 'S-Way', 2023, 'WX-789-YZ', 24000, 90, 33, false, true, 'Euro 6', 'GNL', 30.0, 0.76, 28, 135, '2025-11-15', '2027-01-31'),
('v-kt1', 'co-karim', 'PORTEUR_12T', 'Renault', 'D Wide', 2021, 'AB-234-CD', 7500, 44, 15, true, true, 'Euro 6', 'DIESEL_B7', 23.0, 0.66, 26, 118, '2025-08-20', '2026-09-30'),
('v-kt2', 'co-karim', 'FOURGON_3T5', 'Mercedes', 'Sprinter', 2024, 'EF-567-GH', 1300, 14, 5, true, true, 'Euro 6', 'DIESEL_B7', 10.0, 0.38, 22, 85, '2026-01-05', '2027-06-30'),
('v-le1', 'co-loirex', 'FOURGON_20M3', 'Fiat', 'Ducato', 2023, 'IJ-890-KL', 1100, 18, 6, true, false, 'Euro 6', 'DIESEL_B7', 11.5, 0.42, 23, 90, '2025-12-01', '2026-12-31'),
('v-bf1', 'co-bretfret', 'SEMI_FRIGO', 'DAF', 'XG+ 530', 2024, 'MN-123-OP', 25000, 88, 33, false, true, 'Euro 6', 'HVO100', 32.0, 0.84, 30, 150, '2026-02-01', '2027-05-31'),
('v-at1', 'co-alsace', 'SEMI_CITERNE', 'MAN', 'TGS 440', 2022, 'QR-456-ST', 30000, NULL, NULL, false, true, 'Euro 6', 'DIESEL_B7', 36.0, 0.92, 32, 160, '2025-09-10', '2026-11-15'),
('v-nl1', 'co-normlog', 'PORTEUR_12T', 'Volvo', 'FL 250', 2023, 'UV-789-WX', 7000, 40, 14, true, true, 'Euro 6', 'ELECTRIQUE', NULL, 0.55, 26, 110, '2025-11-01', '2027-02-28'),
('v-rc1', 'co-rapidcargo', 'SEMI_TAUTLINER', 'Scania', 'R 500', 2023, 'YZ-012-AB', 25000, 92, 33, false, true, 'Euro 6', 'DIESEL_B7', 32.0, 0.79, 29, 140, '2025-10-15', '2026-12-31');

-- ═══ ZONES TRANSPORTEURS ═══
INSERT INTO "TransporteurZone" (id, "userId", "zoneId") VALUES
('tz-1','u-marc','z-idf'),('tz-2','u-marc','z-hdf'),('tz-3','u-marc','z-nor'),('tz-4','u-marc','z-pdl'),('tz-5','u-marc','z-naq'),('tz-6','u-marc','z-ara'),('tz-7','u-marc','z-paca'),
('tz-8','u-youssef','z-idf'),('tz-9','u-youssef','z-pdl'),('tz-10','u-youssef','z-bret'),('tz-11','u-youssef','z-ara'),
('tz-12','u-pierre','z-hdf'),('tz-13','u-pierre','z-idf'),
('tz-14','u-hassan','z-paca'),('tz-15','u-hassan','z-occ'),('tz-16','u-hassan','z-ara'),
('tz-17','u-karim','z-ara'),('tz-18','u-karim','z-idf'),('tz-19','u-karim','z-bfc'),
('tz-20','u-jean','z-cvl'),('tz-21','u-jean','z-idf'),('tz-22','u-jean','z-pdl'),
('tz-23','u-yann','z-bret'),('tz-24','u-yann','z-pdl'),('tz-25','u-yann','z-nor'),
('tz-26','u-thomas','z-ge'),('tz-27','u-thomas','z-idf'),('tz-28','u-thomas','z-bfc'),
('tz-29','u-nicolas','z-nor'),('tz-30','u-nicolas','z-idf'),
('tz-31','u-fabien','z-cvl'),('tz-32','u-fabien','z-idf'),('tz-33','u-fabien','z-hdf');

-- ═══ MISSIONS ═══
INSERT INTO "Mission" (id, reference, "clientId", "vehicleId", "driverId", status,
  "pickupAddress", "pickupCity", "pickupPostalCode", "pickupLat", "pickupLon", "pickupContact", "pickupPhone", "pickupTimeWindow", "pickupDateRequested",
  "deliveryAddress", "deliveryCity", "deliveryPostalCode", "deliveryLat", "deliveryLon", "deliveryContact", "deliveryPhone", "deliveryTimeWindow", "deliveryDateRequested",
  "goodsDescription", "weightKg", "palletCount", "vehicleTypeRequired", "requiresTemp", "tempMin", "tempMax",
  "distanceKm", "durationMinutes", "tolls", "budgetMaxCents", "finalPriceCents", "commissionPercent", "commissionCents",
  "progressPercent", "etaMinutes",
  "publishedAt", "assignedAt", "acceptedAt", "pickupStartedAt", "inTransitAt") VALUES
('m-001', 'FN-2026-0001', 'u-antoine', 'v-fg1', 'd-abdel', 'IN_TRANSIT',
 '8 Rue de la Tour, MIN Rungis', 'Rungis', '94150', 48.7480, 2.3510, 'Antoine Berger', '+33155001122', '06:00-08:00', '2026-02-24 07:00',
 '15 Av. Tony Garnier', 'Lyon', '69007', 45.7305, 4.8267, 'Dépôt Agrobon Lyon', '+33472001122', '14:00-18:00', '2026-02-24 16:00',
 '18 palettes produits frais - fruits et légumes', 14400, 18, 'SEMI_FRIGO', true, 2, 8,
 465, 280, 4520, 120000, 108000, 8.0, 8640, 65, 120,
 '2026-02-22 10:00', '2026-02-23 14:00', '2026-02-23 15:00', '2026-02-24 06:30', '2026-02-24 08:15'),
('m-002', 'FN-2026-0002', 'u-sophie', NULL, NULL, 'BIDDING',
 '120 Route de Gennevilliers', 'Asnières-sur-Seine', '92600', 48.9155, 2.2852, 'Sophie Dupont', '+33141557788', '08:00-12:00', '2026-02-25 09:00',
 '45 Zone Industrielle Blanquefort', 'Bordeaux', '33290', 44.9105, -0.6318, 'Dépôt Batiplus Sud-Ouest', '+33556334455', '14:00-18:00', '2026-02-25 17:00',
 '22 tonnes matériaux de construction', 22000, NULL, 'SEMI_BACHE', false, NULL, NULL,
 585, 340, 5890, 110000, NULL, 8.0, NULL, 0, NULL,
 '2026-02-23 08:00', NULL, NULL, NULL, NULL),
('m-003', 'FN-2026-0003', 'u-antoine', NULL, NULL, 'PUBLISHED',
 'MIN de Rungis, Bâtiment A3', 'Rungis', '94150', 48.7480, 2.3510, 'Antoine Berger', '+33155001122', '05:00-07:00', '2026-02-26 06:00',
 '8 ZI Carquefou', 'Nantes', '44470', 47.2980, -1.4919, 'Entrepôt Agrobon Nantes', '+33240556677', '12:00-16:00', '2026-02-26 14:00',
 '8 palettes surgelés -18C - poissons', 6400, 8, 'SEMI_FRIGO', true, -20, -16,
 385, 240, 3250, 85000, NULL, 8.0, NULL, 0, NULL,
 '2026-02-23 10:00', NULL, NULL, NULL, NULL),
('m-004', 'FN-2026-0004', 'u-sophie', NULL, NULL, 'PUBLISHED',
 '120 Route de Gennevilliers', 'Asnières-sur-Seine', '92600', 48.9155, 2.2852, 'Sophie Dupont', '+33141557788', '06:00-10:00', '2026-02-27 08:00',
 '45 Chemin de Gibbes', 'Marseille', '13014', 43.3437, 5.3736, 'Dépôt Batiplus PACA', '+33491223344', '16:00-20:00', '2026-02-27 18:00',
 '20 palettes matériaux sec - carrelage', 18000, 20, 'SEMI_TAUTLINER', false, NULL, NULL,
 775, 460, 7850, 130000, NULL, 8.0, NULL, 0, NULL,
 '2026-02-24 09:00', NULL, NULL, NULL, NULL),
('m-005', 'FN-2026-0005', 'u-antoine', 'v-nf1', 'd-christophe', 'COMPLETED',
 '25 Boulevard de la Liberté', 'Lille', '59000', 50.6310, 3.0575, 'Dépôt Nord', '+33320112233', '06:00-08:00', '2026-02-21 07:00',
 '8 Rue de la Tour, MIN Rungis', 'Rungis', '94150', 48.7480, 2.3510, 'Antoine Berger', '+33155001122', '11:00-14:00', '2026-02-21 12:00',
 '12 palettes boissons', 9600, 12, 'SEMI_TAUTLINER', false, NULL, NULL,
 220, 160, 1850, 45000, 42000, 8.0, 3360, 100, 0,
 '2026-02-19 14:00', '2026-02-20 09:00', '2026-02-20 10:00', '2026-02-21 06:45', '2026-02-21 07:30'),
('m-006', 'FN-2026-0006', 'u-antoine', 'v-fg3', 'd-laurent', 'COMPLETED',
 '45 Chemin de Gibbes', 'Marseille', '13014', 43.3437, 5.3736, 'Expédition Med', '+33491334455', '04:00-06:00', '2026-02-17 05:00',
 'MIN de Rungis, Bâtiment C2', 'Rungis', '94150', 48.7480, 2.3510, 'Réception Agrobon', '+33155001122', '14:00-17:00', '2026-02-17 15:00',
 '24 palettes fruits frais - agrumes', 19200, 24, 'SEMI_FRIGO', true, 4, 10,
 775, 470, 7620, 140000, 128000, 8.0, 10240, 100, 0,
 '2026-02-14 10:00', '2026-02-15 08:00', '2026-02-15 09:00', '2026-02-17 04:30', '2026-02-17 05:45'),
('m-007', 'FN-2026-0007', 'u-antoine', 'v-at1', NULL, 'ACCEPTED',
 'MIN de Rungis', 'Rungis', '94150', 48.7480, 2.3510, 'Antoine Berger', '+33155001122', '06:00-08:00', '2026-02-24 07:00',
 '22 Route du Rhin', 'Strasbourg', '67000', 48.5734, 7.7521, 'Dépôt Alsace', '+33388556677', '14:00-18:00', '2026-02-24 16:00',
 '14 palettes produits laitiers', 11200, 14, 'SEMI_FRIGO', true, 2, 6,
 490, 300, 4200, 95000, 88000, 8.0, 7040, 40, 180,
 '2026-02-22 11:00', '2026-02-23 16:00', '2026-02-24 06:00', NULL, NULL);

UPDATE "Mission" SET "completedAt" = '2026-02-21 12:15', "deliveredAt" = '2026-02-21 11:50' WHERE id = 'm-005';
UPDATE "Mission" SET "completedAt" = '2026-02-17 15:30', "deliveredAt" = '2026-02-17 15:10' WHERE id = 'm-006';

-- ═══ BIDS ═══
INSERT INTO "Bid" (id, "missionId", "transporteurId", "vehicleId", status, "priceCents", message, "expiresAt", "createdAt") VALUES
('b-001', 'm-002', 'u-marc', 'v-er2', 'PENDING', 105000, 'Semi bâché DAF CF dispo.', '2026-02-25 08:00', '2026-02-23 09:00'),
('b-002', 'm-002', 'u-hassan', 'v-ml1', 'PENDING', 98000, 'S-Way GNL. Prix compétitif.', '2026-02-25 08:00', '2026-02-23 10:30'),
('b-003', 'm-002', 'u-moussa', NULL, 'PENDING', 92000, 'Prix serré mais disponible.', '2026-02-25 08:00', '2026-02-23 12:00'),
('b-004', 'm-003', 'u-youssef', 'v-fg1', 'PENDING', 78000, 'Spécialiste surgelés.', '2026-02-26 06:00', '2026-02-23 14:00'),
('b-005', 'm-003', 'u-yann', 'v-bf1', 'PENDING', 82000, 'Bretagne Fret frigo HVO100.', '2026-02-26 06:00', '2026-02-23 16:00'),
('b-006', 'm-001', 'u-youssef', 'v-fg1', 'ACCEPTED', 108000, 'Spécialiste frais. Frigo 2-8C.', '2026-02-24 07:00', '2026-02-22 11:00'),
('b-007', 'm-005', 'u-pierre', 'v-nf1', 'ACCEPTED', 42000, 'Axe Lille-Paris quotidien.', '2026-02-21 07:00', '2026-02-19 16:00'),
('b-008', 'm-006', 'u-youssef', 'v-fg3', 'ACCEPTED', 128000, 'Spécialiste froid Marseille-Rungis.', '2026-02-17 05:00', '2026-02-14 12:00'),
('b-009', 'm-007', 'u-thomas', 'v-at1', 'ACCEPTED', 88000, 'Axe IDF-Strasbourg régulier.', '2026-02-24 07:00', '2026-02-22 15:00');

-- ═══ RATINGS ═══
INSERT INTO "Rating" (id, "missionId", "giverId", "receiverId", score, punctuality, communication, "cargoCondition", comment) VALUES
('r-001', 'm-005', 'u-antoine', 'u-pierre', 4, 4, 4, 5, 'Livraison ponctuelle, bon conducteur.'),
('r-002', 'm-005', 'u-pierre', 'u-antoine', 5, 5, 5, NULL, 'Chargement prêt à l''heure.'),
('r-003', 'm-006', 'u-antoine', 'u-youssef', 5, 5, 5, 5, 'Frigotrans excellent !'),
('r-004', 'm-006', 'u-youssef', 'u-antoine', 5, 5, 4, NULL, 'Client sérieux.');

-- ═══ PAIEMENTS ═══
INSERT INTO "Payment" (id, "missionId", "amountCents", "amountHtCents", "tvaCents", "commissionCents", "transporteurCents", status, method, "paidAt", "transferredAt") VALUES
('pay-001', 'm-005', 50400, 42000, 8400, 3360, 38640, 'COMPLETED', 'STRIPE', '2026-02-21 14:00', '2026-02-22 10:00'),
('pay-002', 'm-006', 153600, 128000, 25600, 10240, 117760, 'COMPLETED', 'STRIPE', '2026-02-17 18:00', '2026-02-18 10:00');

-- ═══ FAVORIS ═══
INSERT INTO "Favorite" (id, "giverId", "receiverId") VALUES
('fav-1', 'u-antoine', 'u-youssef'),('fav-2', 'u-antoine', 'u-pierre'),('fav-3', 'u-antoine', 'u-karim'),
('fav-4', 'u-sophie', 'u-marc'),('fav-5', 'u-sophie', 'u-hassan');

-- ═══ NOTIFICATIONS ═══
INSERT INTO "Notification" (id, "userId", "missionId", type, title, message, "sentEmail", "sentPush") VALUES
('n-001', 'u-antoine', 'm-001', 'IN_TRANSIT', 'Mission en route', 'Frigotrans est en route vers Lyon.', true, true),
('n-002', 'u-antoine', 'm-002', 'NEW_BID', 'Nouvelle offre', '3 transporteurs ont répondu.', true, true),
('n-003', 'u-antoine', 'm-005', 'DELIVERY_CONFIRMED', 'Livraison confirmée', 'Mission Lille-Rungis livrée.', true, true),
('n-004', 'u-youssef', 'm-001', 'MISSION_ASSIGNED', 'Mission attribuée', 'Sélectionné pour Rungis-Lyon.', true, true),
('n-005', 'u-pierre', 'm-005', 'PAYMENT_RECEIVED', 'Paiement reçu', '386,40 euros virés.', true, true),
('n-006', 'u-youssef', 'm-006', 'RATING_RECEIVED', 'Évaluation reçue', '5/5 pour Marseille-Rungis.', true, true);

-- ═══ DOCUMENTS ═══
INSERT INTO "Document" (id, "userId", type, name, url, "isVerified", "verifiedAt", "expiresAt") VALUES
('doc-01', 'u-marc', 'KBIS', 'Kbis Express Route', '/docs/expressroute/kbis.pdf', true, '2026-01-22', '2026-07-22'),
('doc-02', 'u-marc', 'ATTESTATION_ASSURANCE', 'RC Express Route', '/docs/expressroute/rc.pdf', true, '2026-01-22', '2027-01-15'),
('doc-03', 'u-marc', 'LICENCE_TRANSPORT', 'Licence communautaire', '/docs/expressroute/licence.pdf', true, '2026-01-22', '2029-05-20'),
('doc-04', 'u-youssef', 'KBIS', 'Kbis Frigotrans', '/docs/frigotrans/kbis.pdf', true, '2026-01-25', '2026-07-25'),
('doc-05', 'u-youssef', 'ATTESTATION_ASSURANCE', 'RC Frigotrans', '/docs/frigotrans/rc.pdf', true, '2026-01-25', '2027-02-10'),
('doc-06', 'u-antoine', 'KBIS', 'Kbis AGROBON', '/docs/agrobon/kbis.pdf', true, '2026-01-18', '2026-07-18'),
('doc-07', 'u-antoine', 'ASSURANCE_MARCHANDISE', 'Assurance marchandise', '/docs/agrobon/assurance.pdf', true, '2026-01-18', '2027-02-10'),
('doc-08', 'u-antoine', 'CGV', 'CGV Agrobon', '/docs/agrobon/cgv.pdf', true, '2026-01-18', NULL);

-- ═══ STATUS LOG ═══
INSERT INTO "MissionStatusLog" (id, "missionId", "fromStatus", "toStatus", "changedBy", "createdAt") VALUES
('sl-01', 'm-001', NULL, 'DRAFT', 'u-antoine', '2026-02-22 09:00'),
('sl-02', 'm-001', 'DRAFT', 'PUBLISHED', 'u-antoine', '2026-02-22 10:00'),
('sl-03', 'm-001', 'PUBLISHED', 'BIDDING', 'system', '2026-02-22 10:05'),
('sl-04', 'm-001', 'BIDDING', 'ASSIGNED', 'u-antoine', '2026-02-23 14:00'),
('sl-05', 'm-001', 'ASSIGNED', 'ACCEPTED', 'u-youssef', '2026-02-23 15:00'),
('sl-06', 'm-001', 'ACCEPTED', 'PICKUP', 'system', '2026-02-24 06:30'),
('sl-07', 'm-001', 'PICKUP', 'IN_TRANSIT', 'system', '2026-02-24 08:15');

-- ═══ CNR INDICES ═══
INSERT INTO "CnrIndex" (id, month, "fuelPricePerL", "driverCostIndex", "maintenanceIndex", "tollIndex", "insuranceIndex", "structureIndex") VALUES
('cnr-01', '2025-09', 1.82, 102.3, 101.5, 103.8, 100.9, 101.2),
('cnr-02', '2025-10', 1.79, 102.5, 101.8, 103.8, 101.1, 101.4),
('cnr-03', '2025-11', 1.85, 102.8, 102.0, 104.1, 101.3, 101.5),
('cnr-04', '2025-12', 1.88, 103.1, 102.2, 104.1, 101.5, 101.7),
('cnr-05', '2026-01', 1.84, 103.4, 102.5, 104.5, 101.7, 101.9),
('cnr-06', '2026-02', 1.86, 103.6, 102.8, 104.5, 101.9, 102.1);

-- ═══ SETTINGS ═══
INSERT INTO "Setting" (id, key, value, description) VALUES
('s-01', 'commission_percent', '8.0', 'Commission FRETNOW par défaut (%)'),
('s-02', 'tva_percent', '20.0', 'TVA applicable (%)'),
('s-03', 'min_bid_cents', '5000', 'Offre minimum (50 euros)'),
('s-04', 'bid_expiry_hours', '48', 'Durée validité offre'),
('s-05', 'payment_delay_days', '1', 'Délai virement J+1'),
('s-06', 'max_distance_km', '5000', 'Distance max par mission'),
('s-07', 'check_items_count', '18', 'Items check véhicule'),
('s-08', 'rating_min', '1', 'Note min'),
('s-09', 'rating_max', '5', 'Note max'),
('s-10', 'invite_reward_cents', '2000', 'Bonus parrainage (20 euros)'),
('s-11', 'invite_expiry_days', '30', 'Durée code parrainage'),
('s-12', 'session_expiry_hours', '24', 'Durée session JWT'),
('s-13', 'refresh_expiry_days', '30', 'Durée refresh token'),
('s-14', 'max_upload_mb', '10', 'Taille max upload'),
('s-15', 'maintenance_mode', 'false', 'Mode maintenance');

-- ═══ AUDIT LOG ═══
INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", details) VALUES
('al-01', 'u-admin', 'system.seed', NULL, NULL, '{"version": "5.1"}'),
('al-02', 'u-tarek', 'system.deploy', NULL, NULL, '{"note": "FRETNOW v5.1 production"}'),
('al-03', 'u-antoine', 'mission.create', 'Mission', 'm-001', '{"route": "Rungis - Lyon"}'),
('al-04', 'u-youssef', 'bid.create', 'Bid', 'b-006', '{"missionId": "m-001"}'),
('al-05', 'u-antoine', 'bid.accept', 'Bid', 'b-007', '{"missionId": "m-005"}'),
('al-06', 'u-antoine', 'mission.complete', 'Mission', 'm-005', '{"route": "Lille - Rungis"}');
