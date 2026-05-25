-- Migration : convertir la colonne 'date' de la table 'audits' de TIMESTAMP vers DATE
-- A exécuter manuellement sur la base de données PostgreSQL AVANT le démarrage du backend
-- après le changement LocalDateTime → LocalDate dans l'entité Audit.java

ALTER TABLE audits ALTER COLUMN date TYPE DATE USING date::DATE;
