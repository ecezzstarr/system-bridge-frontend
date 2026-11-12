-- Employment approval is separate from a verified Pro activation receipt.
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS appointment_approved_at timestamptz;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS appointment_approved_by uuid;
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS appointment_reference varchar(255);
ALTER TABLE company_client_staff_offers ADD COLUMN IF NOT EXISTS previous_candidate_name varchar(255);
-- An activated File Number is claimed by its verified owner at registration.
ALTER TABLE pro_file_folder_activations ALTER COLUMN client_id DROP NOT NULL;
