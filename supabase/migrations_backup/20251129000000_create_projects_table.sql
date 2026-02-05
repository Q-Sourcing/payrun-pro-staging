-- Create projects table
CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_code_key" UNIQUE ("code"),
    CONSTRAINT "projects_name_key" UNIQUE ("name")
);

-- Add RLS policies for projects
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to projects" ON "public"."projects"
    USING (true)
    WITH CHECK (true);

-- Add project_id to pay_groups
ALTER TABLE "public"."pay_groups" 
ADD COLUMN IF NOT EXISTS "project_id" "uuid" REFERENCES "public"."projects"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_pay_groups_project_id" ON "public"."pay_groups" ("project_id");

-- Add project_id to employees
ALTER TABLE "public"."employees" 
ADD COLUMN IF NOT EXISTS "project_id" "uuid" REFERENCES "public"."projects"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_employees_project_id" ON "public"."employees" ("project_id");

-- Trigger for updating updated_at
CREATE TRIGGER "update_projects_updated_at"
    BEFORE UPDATE ON "public"."projects"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();
