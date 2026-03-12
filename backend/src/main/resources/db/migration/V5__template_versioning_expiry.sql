-- ============================================
-- V5: Template Versioning & Expiry Support
-- ============================================

-- Add expires_at column for template expiry scheduling
ALTER TABLE fs_form_templates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add effective_from column to control when a template version becomes active
ALTER TABLE fs_form_templates ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP DEFAULT NOW();

-- Add superseded_by to link old version → new version
ALTER TABLE fs_form_templates ADD COLUMN IF NOT EXISTS superseded_by BIGINT REFERENCES fs_form_templates(id);

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_form_templates_expires ON fs_form_templates(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_formcode_version ON fs_form_templates(form_code, version DESC);
