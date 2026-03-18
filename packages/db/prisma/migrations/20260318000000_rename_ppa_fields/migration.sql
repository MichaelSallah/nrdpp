-- Rename column ppaRegNo -> procurementRegNo on Supplier
ALTER TABLE "Supplier" RENAME COLUMN "ppaRegNo" TO "procurementRegNo";

-- Rename enum value PPA_REGISTRATION -> COMPANY_CERTIFICATE on DocumentType
ALTER TYPE "DocumentType" RENAME VALUE 'PPA_REGISTRATION' TO 'COMPANY_CERTIFICATE';
