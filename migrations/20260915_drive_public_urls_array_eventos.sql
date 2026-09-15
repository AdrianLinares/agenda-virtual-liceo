-- Convert the single drive_public_url column into a text array
-- so records can carry multiple public Google Drive links.
ALTER TABLE eventos RENAME COLUMN drive_public_url TO drive_public_urls;

ALTER TABLE eventos
    ALTER COLUMN drive_public_urls TYPE TEXT[]
    USING CASE
        WHEN drive_public_urls IS NULL OR btrim(drive_public_urls) = '' THEN NULL
        ELSE ARRAY[btrim(drive_public_urls)]
    END;
