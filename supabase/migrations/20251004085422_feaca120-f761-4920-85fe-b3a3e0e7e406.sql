-- Add new fields to employees table for comprehensive employee data

-- Personal Details
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS tin TEXT,
ADD COLUMN IF NOT EXISTS nssf_number TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- Bank Details
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Department/Project
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id);
CREATE INDEX IF NOT EXISTS idx_employees_tin ON employees(tin);
CREATE INDEX IF NOT EXISTS idx_employees_nssf_number ON employees(nssf_number);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Add comments for documentation
COMMENT ON COLUMN employees.gender IS 'Employee gender: Male, Female, or Other';
COMMENT ON COLUMN employees.date_of_birth IS 'Employee date of birth';
COMMENT ON COLUMN employees.national_id IS 'National ID or identification number';
COMMENT ON COLUMN employees.tin IS 'Tax Identification Number';
COMMENT ON COLUMN employees.nssf_number IS 'Social Security/NSSF number';
COMMENT ON COLUMN employees.passport_number IS 'Passport number for international employees';
COMMENT ON COLUMN employees.bank_name IS 'Employee bank name for salary payments';
COMMENT ON COLUMN employees.bank_branch IS 'Bank branch for salary payments';
COMMENT ON COLUMN employees.account_number IS 'Bank account number for salary payments';
COMMENT ON COLUMN employees.account_type IS 'Bank account type (Savings, Current, Salary Account)';
COMMENT ON COLUMN employees.department IS 'Employee department or project assignment';