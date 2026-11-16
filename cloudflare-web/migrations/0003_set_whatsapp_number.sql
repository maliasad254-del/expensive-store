-- Migration 0003: Set store WhatsApp support number if blank
UPDATE store_settings
SET whatsapp_number = '03037626960'
WHERE id = 1 AND (whatsapp_number IS NULL OR trim(whatsapp_number) = '');
