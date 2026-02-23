-- FRETNOW AGI — PRODUCTION RESET
-- Supprime toutes les données fictives, garde uniquement FRETNOW + Admin
-- À exécuter UNE SEULE FOIS avant le lancement

-- 1. Supprimer dans l'ordre (dépendances)
DELETE FROM "VehicleCheckItem";
DELETE FROM "VehicleCheck";
DELETE FROM "MissionChecklist";
DELETE FROM "MissionStatusLog";
DELETE FROM "GpsPosition";
DELETE FROM "WalletTransaction";
DELETE FROM "Escrow";
DELETE FROM "Wallet";
DELETE FROM "Notification";
DELETE FROM "Dispute";
DELETE FROM "Rating";
DELETE FROM "Invoice";
DELETE FROM "Payment";
DELETE FROM "Document";
DELETE FROM "Bid";
DELETE FROM "Mission";
DELETE FROM "Driver";
DELETE FROM "Vehicle";
DELETE FROM "TransporteurZone";
DELETE FROM "Zone";
DELETE FROM "Favorite";
DELETE FROM "InviteCode";
DELETE FROM "Session";
DELETE FROM "AuditLog";

-- 2. Supprimer tous les utilisateurs SAUF admin
DELETE FROM "User" WHERE email != 'admin@fretnow.com';

-- 3. Supprimer toutes les entreprises SAUF FRETNOW
DELETE FROM "Company" WHERE id != 'co-fretnow';

-- 4. Mettre à jour le compte admin avec un vrai mot de passe sécurisé
-- Le hash sera généré par le endpoint /api/admin/reset-password

-- 5. S'assurer que FRETNOW est bien configuré
UPDATE "Company" SET 
  type = 'PLATEFORME',
  name = 'FRETNOW AGI',
  "tradeName" = 'FRETNOW',
  "isVerified" = true,
  "verifiedAt" = NOW()
WHERE id = 'co-fretnow';

-- 6. Mettre à jour l'admin
UPDATE "User" SET 
  status = 'ACTIVE',
  "emailVerified" = true,
  "kycVerified" = true,
  role = 'SUPER_ADMIN'
WHERE email = 'admin@fretnow.com';

-- 7. Créer le wallet FRETNOW
INSERT INTO "Wallet" (id, "companyId", "balanceCents", "reservedCents", currency, "createdAt", "updatedAt")
VALUES ('wallet-fretnow', 'co-fretnow', 0, 0, 'EUR', NOW(), NOW())
ON CONFLICT ("companyId") DO NOTHING;

-- 8. Insérer des paramètres de base
INSERT INTO "Setting" (id, key, value, description, "updatedAt") VALUES
  (gen_random_uuid()::text, 'commission_default_percent', '8.0', 'Commission par défaut (%)', NOW()),
  (gen_random_uuid()::text, 'min_topup_cents', '1000', 'Rechargement minimum (centimes)', NOW()),
  (gen_random_uuid()::text, 'max_topup_cents', '10000000', 'Rechargement maximum (centimes)', NOW()),
  (gen_random_uuid()::text, 'payment_delay_hours', '24', 'Délai de paiement transporteur (heures)', NOW()),
  (gen_random_uuid()::text, 'platform_name', 'FRETNOW AGI', 'Nom de la plateforme', NOW()),
  (gen_random_uuid()::text, 'platform_version', '6.0.0', 'Version', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();
