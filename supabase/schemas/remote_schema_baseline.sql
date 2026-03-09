


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "ippms";


ALTER SCHEMA "ippms" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "migrations_protect";


ALTER SCHEMA "migrations_protect" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "ippms"."ippms_attendance_status" AS ENUM (
    'PRESENT',
    'ABSENT',
    'OFF',
    'LEAVE',
    'UNPAID_LEAVE',
    'SICK',
    'PUBLIC_HOLIDAY'
);


ALTER TYPE "ippms"."ippms_attendance_status" OWNER TO "postgres";


CREATE TYPE "ippms"."ippms_leave_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE "ippms"."ippms_leave_status" OWNER TO "postgres";


CREATE TYPE "ippms"."ippms_piece_recorded_source" AS ENUM (
    'PROJECT_ADMIN',
    'UPLOAD',
    'SYSTEM_AUTO'
);


ALTER TYPE "ippms"."ippms_piece_recorded_source" OWNER TO "postgres";


CREATE TYPE "ippms"."ippms_recorded_source" AS ENUM (
    'PROJECT_ADMIN',
    'EMPLOYEE_SELF',
    'UPLOAD',
    'SYSTEM_AUTO'
);


ALTER TYPE "ippms"."ippms_recorded_source" OWNER TO "postgres";


CREATE TYPE "ippms"."ippms_work_type" AS ENUM (
    'DAILY_RATE',
    'PIECE_RATE',
    'LEAVE',
    'HOLIDAY',
    'ABSENT',
    'OFF'
);


ALTER TYPE "ippms"."ippms_work_type" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'manager',
    'employee',
    'platform_admin',
    'org_super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."benefit_type" AS ENUM (
    'health_insurance',
    'retirement',
    'dental',
    'vision',
    'other'
);


ALTER TYPE "public"."benefit_type" OWNER TO "postgres";


CREATE TYPE "public"."head_office_pay_group_type" AS ENUM (
    'regular',
    'intern',
    'expatriate'
);


ALTER TYPE "public"."head_office_pay_group_type" OWNER TO "postgres";


CREATE TYPE "public"."head_office_status" AS ENUM (
    'draft',
    'active',
    'locked'
);


ALTER TYPE "public"."head_office_status" OWNER TO "postgres";


CREATE TYPE "public"."pay_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'monthly',
    'daily_rate'
);


ALTER TYPE "public"."pay_frequency" OWNER TO "postgres";


CREATE TYPE "public"."pay_frequency_old" AS ENUM (
    'weekly',
    'bi_weekly',
    'monthly',
    'custom',
    'Monthly'
);


ALTER TYPE "public"."pay_frequency_old" OWNER TO "postgres";


CREATE TYPE "public"."pay_group_type" AS ENUM (
    'local',
    'expatriate',
    'contractor',
    'intern',
    'temporary',
    'Expatriate',
    'Local',
    'piece_rate'
);


ALTER TYPE "public"."pay_group_type" OWNER TO "postgres";


CREATE TYPE "public"."pay_item_status" AS ENUM (
    'draft',
    'pending',
    'approved',
    'paid'
);


ALTER TYPE "public"."pay_item_status" OWNER TO "postgres";


CREATE TYPE "public"."pay_run_status" AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'processed',
    'paid',
    'completed',
    'rejected'
);


ALTER TYPE "public"."pay_run_status" OWNER TO "postgres";


CREATE TYPE "public"."pay_type" AS ENUM (
    'hourly',
    'salary',
    'piece_rate',
    'daily_rate'
);


ALTER TYPE "public"."pay_type" OWNER TO "postgres";


CREATE TYPE "public"."payrunstatus" AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'locked',
    'processed'
);


ALTER TYPE "public"."payrunstatus" OWNER TO "postgres";


CREATE TYPE "public"."platform_admin_role" AS ENUM (
    'super_admin',
    'support_admin',
    'compliance',
    'billing'
);


ALTER TYPE "public"."platform_admin_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."can_manage_project"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    ippms.is_privileged()
    or exists (
      select 1
      from public.employees e
      where e.user_id = auth.uid() and e.project_id = p_project_id
    );
$$;


ALTER FUNCTION "ippms"."can_manage_project"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  v_holiday_id uuid;
  emp record;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply holiday';
  end if;

  insert into ippms.ippms_holidays(name, holiday_date, country, project_id)
  values (p_name, p_holiday_date, p_country, p_project_id)
  on conflict (project_id, holiday_date) do update
    set name = excluded.name,
        country = excluded.country,
        updated_at = now()
  returning id into v_holiday_id;

  for emp in
    select id from public.employees where project_id = p_project_id
  loop
    perform ippms.ippms_update_work_type(emp.id, p_project_id, p_holiday_date, 'HOLIDAY');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      emp.id, p_project_id, p_holiday_date, 'PUBLIC_HOLIDAY', auth.uid(), 'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = 'PUBLIC_HOLIDAY',
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_holiday_id;

    update ippms.ippms_work_days
    set attendance_id = v_holiday_id,
        work_type = 'HOLIDAY',
        piece_entry_id = null
    where employee_id = emp.id and project_id = p_project_id and work_date = p_holiday_date;
  end loop;

  return v_holiday_id;
end;
$$;


ALTER FUNCTION "ippms"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  v_leave_id uuid;
  v_paid boolean;
  v_dt date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply leave';
  end if;

  select paid into v_paid from ippms.ippms_leave_types where id = p_leave_type_id;

  insert into ippms.ippms_leave_requests(
    employee_id, project_id, leave_type_id, start_date, end_date, reason, status, approved_by
  ) values (
    p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason, 'APPROVED', auth.uid()
  )
  returning id into v_leave_id;

  v_dt := p_start;
  while v_dt <= p_end loop
    perform ippms.ippms_update_work_type(p_employee_id, p_project_id, v_dt, 'LEAVE');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      p_employee_id, p_project_id, v_dt,
      case when v_paid then 'LEAVE' else 'UNPAID_LEAVE' end,
      auth.uid(),
      'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into strict v_leave_id;

    update ippms.ippms_work_days
    set attendance_id = v_leave_id,
        work_type = 'LEAVE',
        piece_entry_id = null
    where employee_id = p_employee_id and project_id = p_project_id and work_date = v_dt;

    v_dt := v_dt + interval '1 day';
  end loop;

  return v_leave_id;
end;
$$;


ALTER FUNCTION "ippms"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to assign shift';
  end if;

  insert into ippms.ippms_employee_shifts(employee_id, project_id, shift_id, start_date, end_date)
  values (p_employee_id, p_project_id, p_shift_id, p_start, p_end)
  on conflict (employee_id, project_id, shift_id, start_date) do update
    set end_date = excluded.end_date,
        active = true,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "ippms"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "status" "ippms"."ippms_attendance_status", "daily_rate_snapshot" numeric, "work_day_id" "uuid", "attendance_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, ar.status, ar.daily_rate_snapshot, wd.id, ar.id
  from ippms.ippms_work_days wd
  join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    and wd.payrun_id is null
    and ar.status in ('PRESENT','PUBLIC_HOLIDAY','LEAVE','UNPAID_LEAVE');
end;
$$;


ALTER FUNCTION "ippms"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_generate_attendance_template"("p_project_id" "uuid") RETURNS TABLE("employee_id" "uuid", "attendance_date" "date", "status" "text", "shift_id" "uuid", "hours_worked" numeric, "overtime_hours" numeric, "remarks" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select e.id as employee_id, current_date as attendance_date, 'PRESENT'::text as status, null::uuid as shift_id, 8::numeric as hours_worked, 0::numeric as overtime_hours, null::text as remarks
  from public.employees e
  where e.project_id = p_project_id;
$$;


ALTER FUNCTION "ippms"."ippms_generate_attendance_template"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_generate_piecework_template"("p_project_id" "uuid") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select e.id, current_date, null::uuid as piece_id, 0::numeric as quantity, null::numeric as rate_snapshot
  from public.employees e
  where e.project_id = p_project_id;
$$;


ALTER FUNCTION "ippms"."ippms_generate_piecework_template"("p_project_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "attendance_date" "date" NOT NULL,
    "status" "ippms"."ippms_attendance_status" NOT NULL,
    "shift_id" "uuid",
    "hours_worked" numeric(6,2),
    "overtime_hours" numeric(6,2),
    "remarks" "text",
    "daily_rate_snapshot" numeric(12,2),
    "recorded_by" "uuid",
    "recorded_source" "ippms"."ippms_recorded_source" DEFAULT 'PROJECT_ADMIN'::"ippms"."ippms_recorded_source",
    "payrun_id" "uuid",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_attendance_records" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "ippms"."ippms_attendance_records"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view attendance';
  end if;

  return query
  select *
  from ippms.ippms_attendance_records
  where project_id = p_project_id
    and attendance_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$$;


ALTER FUNCTION "ippms"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_piece_work_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "piece_id" "uuid" NOT NULL,
    "quantity" numeric(14,2) NOT NULL,
    "rate_snapshot" numeric(12,2),
    "recorded_by" "uuid",
    "recorded_source" "ippms"."ippms_piece_recorded_source" DEFAULT 'PROJECT_ADMIN'::"ippms"."ippms_piece_recorded_source",
    "payrun_id" "uuid",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_piece_work_entries" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "ippms"."ippms_piece_work_entries"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view piece work';
  end if;

  return query
  select *
  from ippms.ippms_piece_work_entries
  where project_id = p_project_id
    and work_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$$;


ALTER FUNCTION "ippms"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 0,
    "is_default" boolean DEFAULT false,
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_shifts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_get_shifts"("p_project_id" "uuid") RETURNS SETOF "ippms"."ippms_shifts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view shifts';
  end if;
  return query select * from ippms.ippms_shifts where project_id = p_project_id or project_id is null order by is_default desc, name;
end;
$$;


ALTER FUNCTION "ippms"."ippms_get_shifts"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "project_id" "uuid", "work_date" "date", "work_type" "ippms"."ippms_work_type", "attendance_status" "ippms"."ippms_attendance_status", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric, "is_locked" boolean, "payrun_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view work days';
  end if;

  return query
  select
    wd.id,
    wd.employee_id,
    wd.project_id,
    wd.work_date,
    wd.work_type,
    ar.status as attendance_status,
    pe.piece_id,
    pe.quantity,
    pe.rate_snapshot,
    wd.is_locked,
    wd.payrun_id
  from ippms.ippms_work_days wd
  left join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  left join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and (p_employee_id is null or wd.employee_id = p_employee_id);
end;
$$;


ALTER FUNCTION "ippms"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  perform ippms.ippms_save_attendance_bulk(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$$;


ALTER FUNCTION "ippms"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  perform ippms.ippms_save_piece_entries(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$$;


ALTER FUNCTION "ippms"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  update ippms.ippms_work_days
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_work_day_ids);

  update ippms.ippms_attendance_records ar
  set payrun_id = p_payrun_id, is_locked = true
  where ar.id in (select attendance_id from ippms.ippms_work_days where id = any(p_work_day_ids));
end;
$$;


ALTER FUNCTION "ippms"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  update ippms.ippms_piece_work_entries
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_piece_entry_ids);

  update ippms.ippms_work_days wd
  set payrun_id = p_payrun_id, is_locked = true
  where wd.piece_entry_id = any(p_piece_entry_ids);
end;
$$;


ALTER FUNCTION "ippms"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric, "piece_entry_id" "uuid", "work_day_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read piece payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, pe.piece_id, pe.quantity, pe.rate_snapshot, pe.id, wd.id
  from ippms.ippms_work_days wd
  join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type = 'PIECE_RATE'
    and wd.payrun_id is null;
end;
$$;


ALTER FUNCTION "ippms"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  rec jsonb;
  v_id uuid;
  v_status ippms.ippms_attendance_status;
  v_emp uuid;
  v_date date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage attendance';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'attendance_date')::date;
    v_status := (rec->>'status')::ippms.ippms_attendance_status;

    -- Guard against piece work already present
    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type = 'PIECE_RATE'
    ) then
      raise exception 'Work day already recorded as PIECE_RATE for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, shift_id,
      hours_worked, overtime_hours, remarks, daily_rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date, v_status,
      (rec->>'shift_id')::uuid,
      nullif(rec->>'hours_worked','')::numeric,
      nullif(rec->>'overtime_hours','')::numeric,
      rec->>'remarks',
      nullif(rec->>'daily_rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_recorded_source, 'PROJECT_ADMIN')
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          shift_id = excluded.shift_id,
          hours_worked = excluded.hours_worked,
          overtime_hours = excluded.overtime_hours,
          remarks = excluded.remarks,
          daily_rate_snapshot = excluded.daily_rate_snapshot,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_id;

    -- ensure work_day linkage
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, attendance_id)
    values (v_emp, p_project_id, v_date, case when v_status in ('LEAVE','UNPAID_LEAVE') then 'LEAVE' when v_status = 'PUBLIC_HOLIDAY' then 'HOLIDAY' else 'DAILY_RATE' end, v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = excluded.work_type,
          attendance_id = v_id,
          piece_entry_id = case when excluded.work_type = 'DAILY_RATE' then null else ippms.ippms_work_days.piece_entry_id end,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$$;


ALTER FUNCTION "ippms"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  rec jsonb;
  v_emp uuid;
  v_date date;
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage piece work';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'work_date')::date;

    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    ) then
      raise exception 'Work day already marked for daily/leave/holiday for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_piece_work_entries(
      employee_id, project_id, work_date, piece_id, quantity, rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date,
      (rec->>'piece_id')::uuid,
      nullif(rec->>'quantity','')::numeric,
      nullif(rec->>'rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_piece_recorded_source, 'PROJECT_ADMIN')
    )
    returning id into v_id;

    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, piece_entry_id)
    values (v_emp, p_project_id, v_date, 'PIECE_RATE', v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = 'PIECE_RATE',
          piece_entry_id = v_id,
          attendance_id = null,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$$;


ALTER FUNCTION "ippms"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
declare
  v_id uuid;
  v_locked boolean;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to update work days';
  end if;

  select id, is_locked into v_id, v_locked
  from ippms.ippms_work_days
  where employee_id = p_employee_id and project_id = p_project_id and work_date = p_work_date;

  if v_locked then
    raise exception 'Work day is locked for payrun';
  end if;

  if v_id is null then
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type)
    values (p_employee_id, p_project_id, p_work_date, p_work_type)
    returning id into v_id;
  else
    update ippms.ippms_work_days
    set work_type = p_work_type,
        attendance_id = case when p_work_type in ('DAILY_RATE','LEAVE','HOLIDAY') then attendance_id else null end,
        piece_entry_id = case when p_work_type = 'PIECE_RATE' then piece_entry_id else null end
    where id = v_id;
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "ippms"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."is_privileged"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  with jwt as (
    select coalesce(current_setting('request.jwt.claims', true)::json, '{}'::json) as c
  )
  select
    coalesce(public.is_platform_admin(auth.uid()), false)
    or public.has_permission(auth.uid(), 'payroll.prepare')
    or public.has_permission(auth.uid(), 'payroll.approve')
    or public.has_permission(auth.uid(), 'people.view')
    or public.has_permission(auth.uid(), 'people.edit')
    or (select (c->>'role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or (select (c->>'app_role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or auth.role() = 'service_role';
$$;


ALTER FUNCTION "ippms"."is_privileged"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ippms"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end$$;


ALTER FUNCTION "ippms"."tg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_invited_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    org_user_rec RECORD;
    invite_rec RECORD;
    role_rec RECORD;
    v_org_id UUID;
BEGIN
    -- Only proceed if this is the user's first login (confirmed_at just changed from null)
    IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
        -- Wrap EVERYTHING in a sub-block to catch and swallow errors
        BEGIN
            RAISE NOTICE '[activate_invited_user] Activating user: % (ID: %)', NEW.email, NEW.id;
            
            -- 1. Get org_users record
            SELECT * INTO org_user_rec
            FROM public.org_users
            WHERE user_id = NEW.id AND status = 'invited'
            LIMIT 1;

            IF FOUND THEN
                RAISE NOTICE '[activate_invited_user] Found invited record: %', org_user_rec.id;
                
                -- Update status to 'active'
                UPDATE public.org_users
                SET status = 'active'
                WHERE id = org_user_rec.id;

                -- Update user_profiles if it exists
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
                    UPDATE public.user_profiles
                    SET 
                        organization_id = COALESCE(organization_id, org_user_rec.org_id),
                        activated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = NEW.id;
                END IF;

                -- 2. Process invite metadata
                SELECT * INTO invite_rec
                FROM public.user_invites
                WHERE email = NEW.email 
                  AND status = 'pending'
                  -- Loosen expiry check slightly to handle clock drift or late activation
                  AND (expires_at > (now() - INTERVAL '1 day'))
                ORDER BY created_at DESC
                LIMIT 1;

                IF FOUND AND invite_rec.role_data IS NOT NULL THEN
                    -- Mark invite as accepted
                    UPDATE public.user_invites SET status = 'accepted' WHERE id = invite_rec.id;

                    -- Process role sets
                    DECLARE
                        org_assignment JSONB;
                        role_key TEXT;
                        company_id_val TEXT;
                    BEGIN
                        -- Safety check: ensure role_data->'orgs' is an array
                        IF jsonb_typeof(invite_rec.role_data->'orgs') = 'array' THEN
                            FOR org_assignment IN SELECT * FROM jsonb_array_elements((invite_rec.role_data->'orgs')::jsonb)
                            LOOP
                                -- Safely extract orgId
                                BEGIN
                                    v_org_id := (org_assignment->>'orgId')::UUID;
                                    
                                    -- Assign roles
                                    IF jsonb_typeof(org_assignment->'roles') = 'array' THEN
                                        FOR role_key IN SELECT * FROM jsonb_array_elements_text((org_assignment->'roles')::jsonb)
                                        LOOP
                                            SELECT id INTO role_rec FROM public.org_roles 
                                            WHERE org_id = v_org_id AND key = role_key LIMIT 1;

                                            IF FOUND THEN
                                                INSERT INTO public.org_user_roles (org_user_id, role_id)
                                                VALUES (org_user_rec.id, role_rec.id)
                                                ON CONFLICT DO NOTHING;
                                            END IF;
                                        END LOOP;
                                    END IF;

                                    -- Assign companies
                                    IF jsonb_typeof(org_assignment->'companyIds') = 'array' THEN
                                        FOR company_id_val IN SELECT * FROM jsonb_array_elements_text((org_assignment->'companyIds')::jsonb)
                                        LOOP
                                            INSERT INTO public.user_company_memberships (user_id, company_id)
                                            VALUES (NEW.id, company_id_val::UUID)
                                            ON CONFLICT DO NOTHING;
                                        END LOOP;
                                    END IF;

                                EXCEPTION WHEN OTHERS THEN
                                    RAISE NOTICE '[activate_invited_user] Failed processing an org assignment: %', SQLERRM;
                                END;
                            END LOOP;
                        END IF;
                    END;
                END IF;

                -- 3. Legacy compatibility
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'employee')
                    ON CONFLICT DO NOTHING;
                END IF;

            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- CRITICAL: Catch ALL errors and log them as a notice.
            -- This prevents the outer transaction (auth.users update) from failing.
            RAISE NOTICE '[activate_invited_user] FATAL ERROR during provisioning: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."activate_invited_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_payrun_step"("payrun_id_input" "uuid", "comments_input" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
    v_next_level int;
    v_next_step RECORD;
    v_max_level int;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun is not pending approval'; 
    END IF;
    
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'You are not the designated approver for the current level (%)', v_payrun.approval_current_level;
    END IF;
    
    UPDATE public.payrun_approval_steps
    SET status = 'approved', actioned_at = now(), actioned_by = auth.uid(), comments = comments_input
    WHERE id = v_step.id;
    
    v_next_level := v_payrun.approval_current_level + 1;
    SELECT count(*) INTO v_max_level FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    IF v_next_level <= v_max_level THEN
        UPDATE public.pay_runs
        SET approval_current_level = v_next_level, approval_last_action_at = now()
        WHERE id = payrun_id_input;
        
        SELECT * INTO v_next_step FROM public.payrun_approval_steps
        WHERE payrun_id = payrun_id_input AND level = v_next_level;
        
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_next_step.approver_user_id, 'approval_request', 'Payrun Approval Required',
            'A payrun is awaiting your approval (Level ' || v_next_level || ')',
            jsonb_build_object('payrun_id', payrun_id_input));
        
        RETURN jsonb_build_object('status', 'progressing', 'next_level', v_next_level);
    ELSE
        UPDATE public.pay_runs
        SET approval_status = 'approved', status = 'locked',
            approval_current_level = NULL, approval_last_action_at = now(),
            approved_at = now(), approved_by = auth.uid()
        WHERE id = payrun_id_input;
        
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_payrun.created_by, 'payroll_alert', 'Payrun Approved',
            'Your payrun has been fully approved and is now locked.',
            jsonb_build_object('payrun_id', payrun_id_input));
        
        RETURN jsonb_build_object('status', 'approved');
    END IF;
END;
$$;


ALTER FUNCTION "public"."approve_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_rbac_assignments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.org_id ELSE NEW.org_id END, 
    'ASSIGNMENT_' || TG_OP, 
    'rbac_assignments', 
    (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)::text,
    'Role assignment changed for user',
    jsonb_build_object('role', CASE WHEN TG_OP = 'DELETE' THEN OLD.role_code ELSE NEW.role_code END)
  );
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_rbac_assignments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_rbac_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_org_id UUID;
  v_details TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_org_id := OLD.org_id;
    v_details := 'Removed: ' || row_to_json(OLD)::text;
  ELSE
    v_org_id := NEW.org_id;
    v_details := CASE WHEN TG_OP = 'INSERT' THEN 'Added: ' ELSE 'Modified: ' END || row_to_json(NEW)::text;
  END IF;

  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    v_org_id, 
    'RBAC_' || TG_OP || '_' || TG_TABLE_NAME, 
    TG_TABLE_NAME, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.code ELSE NEW.code END, -- For rbac_roles
    'RBAC change detected in ' || TG_TABLE_NAME,
    jsonb_build_object('details', v_details)
  );
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_rbac_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_rbac_grants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description, metadata)
  VALUES (
    auth.uid(), 
    NEW.scope_id, -- Using scope_id as org_id if scope is ORGANIZATION, might need adjustment for deeper scopes
    'GRANT_' || TG_OP, 
    'rbac_grants', 
    NEW.id::text,
    'Custom permission grant ' || LOWER(TG_OP) || 'ed: ' || NEW.permission_key || ' (' || NEW.effect || ')',
    jsonb_build_object(
        'user_id', NEW.user_id,
        'role_code', NEW.role_code,
        'permission_key', NEW.permission_key,
        'effect', NEW.effect,
        'scope_type', NEW.scope_type,
        'scope_id', NEW.scope_id,
        'valid_until', NEW.valid_until,
        'reason', NEW.reason
    )
  );
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_rbac_grants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_perform_action"("p_org_id" "uuid", "p_company_id" "uuid", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  allowed_roles text[];
  needs_company boolean := p_company_id is not null;
begin
  if public.is_platform_admin() then
    return true;
  end if;

  if needs_company and not public.has_company_membership(p_company_id) then
    return false;
  end if;

  -- baseline RBAC: which org roles may ever perform the action
  if p_action = 'approve_payroll' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'export_bank_schedule' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'pii.read' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_HR','ORG_PAYROLL_ADMIN','ORG_HEAD_OFFICE_PAYROLL'];
  else
    -- Non-sensitive / unknown action: require explicit grant to be safe
    allowed_roles := array['ORG_OWNER','ORG_ADMIN'];
  end if;

  if not public.has_any_org_role(p_org_id, allowed_roles) then
    return false;
  end if;

  -- Sensitive actions require explicit allow (deny overrides allow)
  return public.has_grant(p_org_id, 'action', p_action, p_company_id);
end;
$$;


ALTER FUNCTION "public"."can_perform_action"("p_org_id" "uuid", "p_company_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_org_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN ('super_admin', 'organization_admin', 'payroll_manager') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id 
    AND role_code IN ('PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE_CONTROLLER', 'COMPANY_PAYROLL_ADMIN')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_is_org_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Roles
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role IN ('super_admin', 'organization_admin') 
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Roles
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code IN ('PLATFORM_SUPER_ADMIN', 'ORG_ADMIN')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") IS 'Checks for Org Admin privileges in both legacy and modern systems.';



CREATE OR REPLACE FUNCTION "public"."check_is_super_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _auth_id uuid := user_id;
BEGIN
  -- Check Legacy Role
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = _auth_id AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check OBAC Role
  IF EXISTS (
    SELECT 1 FROM public.rbac_assignments
    WHERE public.rbac_assignments.user_id = _auth_id AND role_code = 'PLATFORM_SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_is_super_admin"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_is_super_admin"("user_id" "uuid") IS 'Checks for Global Admin privileges in both legacy (users) and modern (OBAC) systems.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_permissions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.permission_cache 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    -- Update user to mark setup as complete
    UPDATE public.users 
    SET 
        two_factor_enabled = true,
        updated_at = NOW()
    WHERE id = user_id AND role = 'super_admin';
    
    -- Log the setup completion
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent,
        timestamp,
        result
    ) VALUES (
        user_id,
        'super_admin_setup_completed',
        'system',
        COALESCE(security_questions, '{}'::jsonb),
        '127.0.0.1',
        'System',
        NOW(),
        'success'
    );
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") IS 'Mark super admin setup as complete';



CREATE OR REPLACE FUNCTION "public"."create_project_onboarding_steps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.project_onboarding_steps (project_id, step_key, completed, completed_at)
    VALUES
        (NEW.id, 'basic_info', true, now()),
        (NEW.id, 'manager_assigned', NEW.responsible_manager_id IS NOT NULL, CASE WHEN NEW.responsible_manager_id IS NOT NULL THEN now() ELSE NULL END),
        (NEW.id, 'pay_types_configured', (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)), CASE WHEN (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)) THEN now() ELSE NULL END),
        (NEW.id, 'employees_assigned', false, NULL);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_project_onboarding_steps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workflow_version_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.version = NEW.version) THEN
        RETURN NEW;
    END IF;
    
    INSERT INTO public.approval_workflow_versions (
        workflow_id, version, workflow_snapshot, created_by
    )
    SELECT 
        NEW.id, NEW.version,
        jsonb_build_object(
            'workflow', row_to_json(NEW)::jsonb,
            'steps', (
                SELECT jsonb_agg(row_to_json(steps))
                FROM public.approval_workflow_steps steps
                WHERE steps.workflow_id = NEW.id
            )
        ),
        auth.uid()
    ON CONFLICT (workflow_id, version) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_workflow_version_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (
      SELECT ou.org_id
      FROM public.org_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.status = 'active'
      ORDER BY ou.created_at DESC
      LIMIT 1
    ),
    (
      SELECT up.organization_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
      LIMIT 1
    )
  );
$$;


ALTER FUNCTION "public"."current_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delegate_approval_step"("payrun_id_input" "uuid", "new_approver_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending'; 
    END IF;
    
    -- Must be current approver OR admin
    -- For simplicty checking current approver first
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level;
      
    IF v_step.approver_user_id != auth.uid() AND NOT public.check_is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to delegate';
    END IF;
    
    -- Perform Delegation
    UPDATE public.payrun_approval_steps
    SET 
        original_approver_id = CASE WHEN original_approver_id IS NULL THEN approver_user_id ELSE original_approver_id END,
        approver_user_id = new_approver_id,
        delegated_by = auth.uid(),
        delegated_at = now()
    WHERE id = v_step.id;
    
    -- Notify New Approver
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        new_approver_id,
        'approval_request',
        'Delegated Approval',
        'An approval step has been delegated to you.',
        jsonb_build_object('payrun_id', payrun_id_input)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."delegate_approval_step"("payrun_id_input" "uuid", "new_approver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_pay_run_security"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. Prevent Deletion of protected states
  -- We include 'processed' here because processed payrolls should be archived/locked, not deleted.
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('approved', 'processed', 'paid', 'completed') AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Cannot delete a payroll that has been approved, processed, or paid. Status: %', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Enforce Approval Authority (Status Change to Approved)
  IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
    -- Check for explicit permission
    IF NOT public.has_permission('payroll.approve', 'ORGANIZATION', NEW.organization_id) THEN
      RAISE EXCEPTION 'Insufficient authority to approve payroll. Role ORG_FINANCE_CONTROLLER or equivalent required.';
    END IF;
    
    -- Record approval event
    INSERT INTO public.security_audit_logs (actor_id, org_id, event_type, target_type, target_id, description)
    VALUES (auth.uid(), NEW.organization_id, 'PAYROLL_APPROVED', 'PAY_RUN', NEW.id::text, 'Payroll approved and locked.');
  END IF;

  -- 3. Lock Data in Approved/Processed/Paid States
  -- If the status is already approved/processed/paid, only allow status updates (no data changes)
  IF (OLD.status IN ('approved', 'processed', 'paid', 'completed')) THEN
    -- Allow transition from approved to processed/paid
    IF (OLD.status = 'approved' AND NEW.status IN ('processed', 'paid')) THEN
        -- OK
    ELSIF OLD.status = NEW.status THEN
        -- No data changes allowed once locked
        IF ROW(NEW.total_gross_pay, NEW.total_deductions, NEW.total_net_pay, NEW.pay_period_start, NEW.pay_period_end) 
           IS DISTINCT FROM 
           ROW(OLD.total_gross_pay, OLD.total_deductions, OLD.total_net_pay, OLD.pay_period_start, OLD.pay_period_end) 
        THEN
            RAISE EXCEPTION 'Cannot modify financial data for a locked payroll. Status: %', OLD.status;
        END IF;
    ELSE
        -- Prevent other status regressions unless platform admin
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Cannot revert status of a locked payroll. Status: % -> %', OLD.status, NEW.status;
        END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_pay_run_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_unique_paygroup_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  duplicate_count int;
BEGIN
  -- Skip check if assignment is being deactivated
  IF (NEW.active = false) THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate assignments based on employee identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    )
    AND pe.employee_id != NEW.employee_id;

  -- If duplicates found, deactivate old assignments (smart mode)
  IF duplicate_count > 0 THEN
    UPDATE paygroup_employees
    SET active = false
    WHERE employee_id IN (
      SELECT id FROM employees WHERE
        (national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id) AND national_id IS NOT NULL) OR
        (tin = (SELECT tin FROM employees WHERE id = NEW.employee_id) AND tin IS NOT NULL) OR
        (social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id) AND social_security_number IS NOT NULL)
    )
    AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_unique_paygroup_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  s record;
  prefix_parts text[] := ARRAY[]::text[];
  prefix text;
  digits integer;
  format text;
  seq integer;
  candidate text;
  dept_key text := coalesce(in_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton)
  SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
    INTO s
    FROM public.employee_number_settings
    WHERE id = settings_id;
  END IF;

  digits := s.sequence_digits;
  format := s.number_format;

  -- Build prefix based on settings
  prefix_parts := ARRAY[]::text[];
  IF s.include_country_code AND country_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(country_key), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_employment_type AND coalesce(in_employee_type, '') <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_department_prefix AND dept_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
  ELSE
    prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
  END IF;

  prefix := array_to_string(prefix_parts, '-');

  -- Determine sequence: support per-department start via department_rules
  IF s.department_rules ? dept_key THEN
    seq := (s.department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-department sequence
    UPDATE public.employee_number_settings
    SET department_rules = jsonb_set(s.department_rules,
                                     ARRAY[dept_key, 'next_sequence'],
                                     to_jsonb(seq + 1), true),
        updated_at = now()
    WHERE id = s.id;
  ELSE
    seq := s.next_sequence;
    UPDATE public.employee_number_settings
    SET next_sequence = s.next_sequence + 1,
        updated_at = now()
    WHERE id = s.id;
  END IF;

  IF format = 'SEQUENCE' THEN
    candidate := lpad(seq::text, digits, '0');
  ELSE
    candidate := prefix || '-' || lpad(seq::text, digits, '0');
  END IF;

  -- Ensure uniqueness; loop if collision (rare but safe)
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = 'SEQUENCE' THEN
      candidate := lpad(seq::text, digits, '0');
    ELSE
      candidate := prefix || '-' || lpad(seq::text, digits, '0');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;


ALTER FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_employee_number"("in_sub_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid", "in_prefix_override" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  s record;
  prefix_parts text[] := ARRAY[]::text[];
  prefix text;
  digits integer;
  format text;
  seq integer;
  candidate text;
  dept_key text := coalesce(in_sub_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton) with row-level lock to ensure atomicity
  SELECT id, number_format, default_prefix, sequence_digits, use_sub_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, sub_department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_sub_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, sub_department_rules, country_rules
    INTO s
    FROM public.employee_number_settings
    WHERE id = settings_id
    FOR UPDATE;
  END IF;

  digits := s.sequence_digits;
  format := s.number_format;

  -- Build prefix based on settings unless an override is provided
  IF in_prefix_override IS NOT NULL AND length(trim(in_prefix_override)) > 0 THEN
    prefix := regexp_replace(upper(trim(in_prefix_override)), '[^A-Z0-9\\-]+', '-', 'g');
  ELSE
    prefix_parts := ARRAY[]::text[];
    IF s.include_country_code AND country_key <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(country_key), '[^A-Z0-9]+', '-', 'g');
    END IF;
    IF s.use_employment_type AND coalesce(in_employee_type, '') <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), '[^A-Z0-9]+', '-', 'g');
    END IF;
    IF s.use_sub_department_prefix AND dept_key <> '' THEN
      prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
    ELSE
      prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
    END IF;
    prefix := array_to_string(prefix_parts, '-');
  END IF;

  -- Determine sequence: support per-sub-department start via sub_department_rules
  IF s.sub_department_rules ? dept_key THEN
    seq := (s.sub_department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-sub-department sequence atomically
    UPDATE public.employee_number_settings
    SET sub_department_rules = jsonb_set(s.sub_department_rules,
                                      ARRAY[dept_key, 'next_sequence'],
                                      to_jsonb(seq + 1), true),
        updated_at = now()
    WHERE id = s.id;
  ELSE
    seq := s.next_sequence;
    -- Atomically increment the sequence
    UPDATE public.employee_number_settings
    SET next_sequence = next_sequence + 1,
        updated_at = now()
    WHERE id = s.id;
  END IF;

  IF format = 'SEQUENCE' THEN
    candidate := lpad(seq::text, digits, '0');
  ELSE
    candidate := prefix || '-' || lpad(seq::text, digits, '0');
  END IF;

  -- Ensure uniqueness; loop if collision
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = 'SEQUENCE' THEN
      candidate := lpad(seq::text, digits, '0');
    ELSE
      candidate := prefix || '-' || lpad(seq::text, digits, '0');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;


ALTER FUNCTION "public"."generate_employee_number"("in_sub_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid", "in_prefix_override" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_temp_password"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password TEXT := '';
    i INTEGER;
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    FOR i IN 1..16 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    RETURN password;
END;
$_$;


ALTER FUNCTION "public"."generate_temp_password"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_temp_password"() IS 'Generate a secure temporary password';



CREATE OR REPLACE FUNCTION "public"."get_auth_org_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'organization_id'),
    (auth.jwt() ->> 'organization_id'),
    (auth.jwt() ->> 'org_id')
  )::uuid;
END;
$$;


ALTER FUNCTION "public"."get_auth_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_total_payroll"("org_id" "uuid") RETURNS numeric
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(sum(total_gross), 0)::numeric
  from public.pay_runs
  where organization_id = org_id
$$;


ALTER FUNCTION "public"."get_org_total_payroll"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_super_admin_setup_status"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    super_admin_count INTEGER;
    setup_complete BOOLEAN;
    result JSON;
BEGIN
    -- Count super admins
    SELECT COUNT(*) INTO super_admin_count
    FROM public.users 
    WHERE role = 'super_admin' AND is_active = true;
    
    -- Check if setup is complete (super admin has logged in)
    SELECT COUNT(*) > 0 INTO setup_complete
    FROM public.users 
    WHERE role = 'super_admin' 
    AND is_active = true 
    AND last_login IS NOT NULL;
    
    result := json_build_object(
        'super_admin_count', super_admin_count,
        'setup_complete', setup_complete,
        'needs_initial_setup', super_admin_count > 0 AND NOT setup_complete
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_super_admin_setup_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_super_admin_setup_status"() IS 'Get the current status of super admin setup';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)
  FROM public.notifications
  WHERE user_id = _user_id
    AND read_at IS NULL
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_diagnostic_data"("_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    result JSONB;
    v_user_id UUID;
    auth_user RECORD;
    profile_record RECORD;
    org_user_record RECORD;
    invite_record RECORD;
BEGIN
    -- 1. Find the user ID from auth.users (case-insensitive)
    SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
    INTO auth_user
    FROM auth.users 
    WHERE email = LOWER(_email)
    LIMIT 1;

    IF NOT FOUND THEN
        -- Try exact match if lower failed (just in case)
        SELECT id, email, confirmed_at, last_sign_in_at, created_at, raw_user_meta_data 
        INTO auth_user
        FROM auth.users 
        WHERE email = _email
        LIMIT 1;
    END IF;

    IF auth_user.id IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found in auth.users', 'searched_email', _email);
    END IF;

    v_user_id := auth_user.id;

    -- 2. Get User Profile
    SELECT * INTO profile_record FROM public.user_profiles WHERE id = v_user_id;

    -- 3. Get Org User status
    SELECT * INTO org_user_record FROM public.org_users WHERE user_id = v_user_id;

    -- 4. Get Invitations
    SELECT * INTO invite_record FROM public.user_invites WHERE email ILIKE _email ORDER BY created_at DESC LIMIT 1;

    -- Build the result blob
    result := jsonb_build_object(
        'auth_user', jsonb_build_object(
            'id', auth_user.id,
            'email', auth_user.email,
            'confirmed_at', auth_user.confirmed_at,
            'last_sign_in_at', auth_user.last_sign_in_at,
            'created_at', auth_user.created_at,
            'meta_org_id', auth_user.raw_user_meta_data->>'organization_id'
        ),
        'profile', CASE WHEN profile_record.id IS NOT NULL THEN 
            jsonb_build_object(
                'id', profile_record.id,
                'email', profile_record.email,
                'organization_id', profile_record.organization_id,
                'role', profile_record.role,
                'locked_at', profile_record.locked_at,
                'failed_attempts', profile_record.failed_login_attempts
            )
        ELSE NULL END,
        'org_user', CASE WHEN org_user_record.id IS NOT NULL THEN
            jsonb_build_object(
                'status', org_user_record.status,
                'org_id', org_user_record.org_id
            )
        ELSE NULL END,
        'invitation', CASE WHEN invite_record.id IS NOT NULL THEN
            jsonb_build_object(
                'status', invite_record.status,
                'expires_at', invite_record.expires_at,
                'tenant_id', invite_record.tenant_id
            )
        ELSE NULL END
    );

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_diagnostic_data"("_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id 
  FROM public.user_profiles 
  WHERE id = _user_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_org_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT (SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1);
$$;


ALTER FUNCTION "public"."get_user_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"("user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.users WHERE id = user_id);
END;
$$;


ALTER FUNCTION "public"."get_user_organization_id"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_organization_id"("user_id" "uuid") IS 'Safe RLS helper to get user organization without recursion.';



CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT role::text FROM public.role_assignments WHERE user_id = auth.uid() AND is_active = true ORDER BY assigned_at DESC LIMIT 1),
    (SELECT role::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    'employee'
  );
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_sub_department_id"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT sub_department_id FROM public.users WHERE id = user_id);
END;
$$;


ALTER FUNCTION "public"."get_user_sub_department_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id UUID;
  raw_role TEXT;
  safe_role TEXT;
BEGIN
  BEGIN
    org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    org_id := NULL;
  END;

  raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- Normalize invitation/non-standard roles to valid values
  safe_role := CASE
    WHEN raw_role IN ('super_admin', 'org_admin', 'user') THEN raw_role
    WHEN raw_role IN ('admin', 'organization_admin') THEN 'org_admin'
    ELSE 'user'
  END;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    safe_role,
    org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    role = EXCLUDED.role,
    organization_id = COALESCE(public.user_profiles.organization_id, EXCLUDED.organization_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payroll_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_payroll_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_org_role"("p_org_id" "uuid", "p_role_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.org_users ou
      join public.org_user_roles our on our.org_user_id = ou.id
      join public.org_roles r on r.id = our.role_id
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.status = 'active'
        and r.key = any(p_role_keys)
    );
$$;


ALTER FUNCTION "public"."has_any_org_role"("p_org_id" "uuid", "p_role_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_company_membership"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_company_memberships ucm
      where ucm.user_id = auth.uid()
        and ucm.company_id = p_company_id
    );
$$;


ALTER FUNCTION "public"."has_company_membership"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_grant"("p_org_id" "uuid", "p_scope_type" "text", "p_scope_key" "text", "p_company_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    public.is_platform_admin()
    or (
      not exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'deny'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
      and exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'allow'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
    );
$$;


ALTER FUNCTION "public"."has_grant"("p_org_id" "uuid", "p_scope_type" "text", "p_scope_key" "text", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_role_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.org_users ou
      join public.org_user_roles our on our.org_user_id = ou.id
      join public.org_roles r on r.id = our.role_id
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.status = 'active'
        and r.key = p_role_key
    );
$$;


ALTER FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_role_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  SELECT public.has_permission($2, NULL, NULL, $1);
$_$;


ALTER FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text" DEFAULT NULL::"text", "_scope_id" "uuid" DEFAULT NULL::"uuid", "_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- 1. PLATFORM BYPASS: Platform Admins have full access
  IF public.is_platform_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit DENY grants (User-specific or Role-based)
  -- Deny always wins. Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = 'DENY'
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check: Only consider if NOT expired
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN FALSE;
  END IF;

  -- 3. Check for Role-based permissions within Scope
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_assignments ra
    JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code AND ra.org_id = rrp.org_id
    WHERE ra.user_id = _user_id
      AND rrp.permission_key = _permission_key
      AND (
        -- Scope Resolution Logic
        _scope_type IS NULL
        OR ra.scope_type = 'GLOBAL'
        OR (ra.scope_type = _scope_type AND (_scope_id IS NULL OR ra.scope_id = _scope_id))
        OR (ra.scope_type = 'ORGANIZATION' AND _scope_type IN ('COMPANY', 'PROJECT'))
        OR (ra.scope_type = 'COMPANY' AND _scope_type = 'PROJECT')
      )
  ) INTO v_has_perm;

  IF v_has_perm THEN
    RETURN TRUE;
  END IF;

  -- 4. Check for explicit ALLOW grants
  -- Includes expiration check.
  IF EXISTS (
    SELECT 1 FROM public.rbac_grants g
    LEFT JOIN public.rbac_assignments a ON (
        -- Role-based grant: User must have the role assigned
        (g.role_code = a.role_code AND a.user_id = _user_id)
    )
    WHERE g.permission_key = _permission_key
      AND g.effect = 'ALLOW'
      AND (g.user_id = _user_id OR a.user_id = _user_id)
      -- Expiration check
      AND (g.valid_until IS NULL OR g.valid_until > now())
      -- Scope resolution
      AND (
        _scope_type IS NULL
        OR g.scope_type = _scope_type AND (_scope_id IS NULL OR g.scope_id = _scope_id)
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text", "_scope_id" "uuid", "_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text", "_scope_id" "uuid", "_user_id" "uuid") IS 'Evaluates effective permission by checking Platform Admin status, explicit DENY grants, Role-based permissions, and explicit ALLOW grants with support for temporary expiration.';



CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_failed_login_attempts"("_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;


ALTER FUNCTION "public"."increment_failed_login_attempts"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer DEFAULT 200, "p_older_than_days" integer DEFAULT 30, "p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_require_expired" boolean DEFAULT true, "p_include_auth_only" boolean DEFAULT false) RETURNS TABLE("source" "text", "invite_id" "uuid", "email" "text", "invite_status" "text", "invite_created_at" timestamp with time zone, "invite_expires_at" timestamp with time zone, "auth_user_id" "uuid", "auth_created_at" timestamp with time zone, "invited_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone, "has_password" boolean, "protected_ref" "jsonb", "eligible" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  with pending_invites as (
    select
      ui.id as invite_id,
      ui.email,
      ui.status::text as invite_status,
      ui.created_at as invite_created_at,
      ui.expires_at as invite_expires_at
    from public.user_invites ui
    where ui.status = 'pending'
      and (p_tenant_id is null or ui.tenant_id = p_tenant_id)
      and (p_older_than_days is null or ui.created_at < now() - make_interval(days => p_older_than_days))
      and (not p_require_expired or ui.expires_at < now())
    order by ui.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  auth_only as (
    select
      null::uuid as invite_id,
      au.email,
      'pending'::text as invite_status,
      au.created_at as invite_created_at,
      null::timestamptz as invite_expires_at
    from auth.users au
    where p_include_auth_only = true
      and au.invited_at is not null
      and au.confirmed_at is null
      and au.last_sign_in_at is null
      and coalesce(nullif(au.encrypted_password, ''), '') = ''
      and (p_older_than_days is null or au.created_at < now() - make_interval(days => p_older_than_days))
      and (p_tenant_id is null or lower(au.raw_user_meta_data->>'organization_id') = lower(p_tenant_id::text))
      and not exists (
        select 1
        from public.user_invites ui
        where lower(ui.email) = lower(au.email)
          and ui.status in ('pending','accepted','expired','revoked')
      )
    order by au.created_at asc
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
  ),
  combined as (
    select 'user_invites'::text as source, * from pending_invites
    union all
    select 'auth_only'::text as source, * from auth_only
  ),
  joined as (
    select
      c.source,
      c.invite_id,
      c.email,
      c.invite_status,
      c.invite_created_at,
      c.invite_expires_at,
      au.id as auth_user_id,
      au.created_at as auth_created_at,
      au.invited_at,
      au.confirmed_at,
      au.last_sign_in_at,
      (coalesce(nullif(au.encrypted_password, ''), '') <> '') as has_password
    from combined c
    left join auth.users au
      on lower(au.email) = lower(c.email)
  )
  select
    j.source,
    j.invite_id,
    j.email,
    j.invite_status,
    j.invite_created_at,
    j.invite_expires_at,
    j.auth_user_id,
    j.auth_created_at,
    j.invited_at,
    j.confirmed_at,
    j.last_sign_in_at,
    j.has_password,
    ref.protected_ref,
    (
      j.invite_status = 'pending'
      and (
        (j.source = 'user_invites')
        or (j.source = 'auth_only' and p_include_auth_only = true)
      )
      and (j.auth_user_id is null or (
        j.invited_at is not null
        and j.confirmed_at is null
        and j.last_sign_in_at is null
        and j.has_password = false
      ))
      and ref.protected_ref is null
    ) as eligible
  from joined j
  left join lateral (
    select public.invite_cleanup_find_protected_fk_ref(j.auth_user_id) as protected_ref
  ) ref on true;
$$;


ALTER FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer, "p_older_than_days" integer, "p_tenant_id" "uuid", "p_require_expired" boolean, "p_include_auth_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $_$
declare
  ref record;
  hit boolean;
  allow_tables text[] := array[
    'public.user_invites',
    'public.user_profiles',
    'public.profiles',
    'public.org_users',
    'public.org_user_roles',
    'public.user_roles',
    'public.user_company_memberships',
    'public.org_license_assignments',
    'public.access_grants',
    'public.notifications',
    'public.auth_events',
    'public.cleanup_logs'
  ];
begin
  if p_user_id is null then
    return null;
  end if;

  for ref in
    select
      kcu.table_schema,
      kcu.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'auth'
      and ccu.table_name = 'users'
  loop
    if (ref.table_schema || '.' || ref.table_name) = any(allow_tables) then
      continue;
    end if;

    execute format(
      'select exists(select 1 from %I.%I where %I = $1 limit 1)',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into hit using p_user_id;

    if hit then
      return jsonb_build_object(
        'schema', ref.table_schema,
        'table', ref.table_name,
        'column', ref.column_name
      );
    end if;
  end loop;

  return null;
end;
$_$;


ALTER FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_apply_holiday(p_project_id, p_holiday_date, p_name, p_country);
end;
$$;


ALTER FUNCTION "public"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_apply_leave(p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason);
end;
$$;


ALTER FUNCTION "public"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_assign_shift(p_employee_id, p_project_id, p_shift_id, p_start, p_end);
end;
$$;


ALTER FUNCTION "public"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "status" "ippms"."ippms_attendance_status", "daily_rate_snapshot" numeric, "work_day_id" "uuid", "attendance_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_daily_payrun_rows(p_project_id, p_start, p_end);
end;
$$;


ALTER FUNCTION "public"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_generate_attendance_template"("p_project_id" "uuid") RETURNS TABLE("employee_id" "uuid", "attendance_date" "date", "status" "text", "shift_id" "uuid", "hours_worked" numeric, "overtime_hours" numeric, "remarks" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
  select * from ippms.ippms_generate_attendance_template(p_project_id);
$$;


ALTER FUNCTION "public"."ippms_generate_attendance_template"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_generate_piecework_template"("p_project_id" "uuid") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
  select * from ippms.ippms_generate_piecework_template(p_project_id);
$$;


ALTER FUNCTION "public"."ippms_generate_piecework_template"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "ippms"."ippms_attendance_records"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_get_attendance(p_project_id, p_start, p_end, p_employee_id);
end;
$$;


ALTER FUNCTION "public"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "ippms"."ippms_piece_work_entries"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_get_piece_entries(p_project_id, p_start, p_end, p_employee_id);
end;
$$;


ALTER FUNCTION "public"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_get_shifts"("p_project_id" "uuid") RETURNS SETOF "ippms"."ippms_shifts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_get_shifts(p_project_id);
end;
$$;


ALTER FUNCTION "public"."ippms_get_shifts"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "project_id" "uuid", "work_date" "date", "work_type" "ippms"."ippms_work_type", "attendance_status" "ippms"."ippms_attendance_status", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric, "is_locked" boolean, "payrun_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_get_work_days(p_project_id, p_start, p_end, p_employee_id);
end;
$$;


ALTER FUNCTION "public"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_import_attendance_template(p_project_id, p_payload);
end;
$$;


ALTER FUNCTION "public"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_import_piecework_template(p_project_id, p_payload);
end;
$$;


ALTER FUNCTION "public"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  perform ippms.ippms_lock_daily_payrun(p_payrun_id, p_work_day_ids);
end;
$$;


ALTER FUNCTION "public"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  perform ippms.ippms_lock_piece_payrun(p_payrun_id, p_piece_entry_ids);
end;
$$;


ALTER FUNCTION "public"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") RETURNS TABLE("employee_id" "uuid", "work_date" "date", "piece_id" "uuid", "quantity" numeric, "rate_snapshot" numeric, "piece_entry_id" "uuid", "work_day_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return query select * from ippms.ippms_piece_payrun_rows(p_project_id, p_start, p_end);
end;
$$;


ALTER FUNCTION "public"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_save_attendance_bulk(p_project_id, p_records);
end;
$$;


ALTER FUNCTION "public"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_save_piece_entries(p_project_id, p_records);
end;
$$;


ALTER FUNCTION "public"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ippms'
    AS $$
begin
  return ippms.ippms_update_work_type(p_employee_id, p_project_id, p_work_date, p_work_type);
end;
$$;


ALTER FUNCTION "public"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_first_login"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT last_login IS NULL 
        FROM public.users 
        WHERE id = user_id
    );
END;
$$;


ALTER FUNCTION "public"."is_first_login"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_first_login"("user_id" "uuid") IS 'Check if this is the users first login';



CREATE OR REPLACE FUNCTION "public"."is_ho_manager"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role') IN (
    'Super Admin', 'Organization Admin', 'Payroll Manager',
    'super_admin', 'admin', 'manager', 'payroll_manager',
    'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'COMPANY_PAYROLL_ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."is_ho_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select
    public.is_platform_admin()
    or public.has_org_role(p_org_id, 'ORG_OWNER')
    or public.has_org_role(p_org_id, 'ORG_ADMIN');
$$;


ALTER FUNCTION "public"."is_org_admin"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"("_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- If we're checking the current user and have a JWT, check it first for speed
  IF _user_id = auth.uid() AND current_setting('request.jwt.claims', true) IS NOT NULL THEN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean;
    IF v_is_admin IS TRUE THEN RETURN TRUE; END IF;
  END IF;

  -- Reliable DB fallback
  SELECT (raw_app_meta_data ->> 'is_platform_admin')::boolean
  INTO v_is_admin
  FROM auth.users
  WHERE id = _user_id;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_platform_admin"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_access_control_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor text := coalesce(auth.jwt()->>'email', auth.uid()::text);
  org_id uuid := null;
  details jsonb;
  action text;
  resource text;
begin
  if tg_table_name = 'org_users' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_user_roles' then
    select ou.org_id into org_id
    from public.org_users ou
    where ou.id = coalesce(new.org_user_id, old.org_user_id)
    limit 1;
  elsif tg_table_name = 'org_licenses' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'org_license_assignments' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'access_grants' then
    org_id := coalesce(new.org_id, old.org_id);
  elsif tg_table_name = 'user_company_memberships' then
    select c.organization_id into org_id
    from public.companies c
    where c.id = coalesce(new.company_id, old.company_id)
    limit 1;
  end if;

  resource := tg_table_name;
  if tg_op = 'INSERT' then
    action := resource || '.create';
    details := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    action := resource || '.update';
    details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    action := resource || '.delete';
    details := to_jsonb(old);
  end if;

  insert into public.audit_logs (integration_name, action, user_id, resource, details, timestamp, result)
  values ('access_control', action, actor, resource,
    jsonb_build_object('org_id', org_id, 'table', tg_table_name, 'op', tg_op, 'row', details),
    now(), 'success');

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."log_access_control_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_employee_number_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  IF NEW.employee_number IS DISTINCT FROM OLD.employee_number THEN
    INSERT INTO public.employee_number_history (employee_id, old_employee_number, new_employee_number, changed_by, reason)
    VALUES (NEW.id, OLD.employee_number, NEW.employee_number, NULL, 'Manual or system change');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_employee_number_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO database_health_log (
    health_score, health_status, critical_issues_count,
    total_checks, passed_checks, report_data
  ) VALUES (
    p_health_score, p_health_status, p_critical_issues_count,
    p_total_checks, p_passed_checks, p_report_data
  );
END;
$$;


ALTER FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = _user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("_notification_id" "uuid", "_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = _notification_id
    AND user_id = _user_id
    AND read_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("_notification_id" "uuid", "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending approval'; 
    END IF;

    -- Verify User
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'Not authorized to reject this step';
    END IF;

    -- Update Step
    UPDATE public.payrun_approval_steps
    SET 
        status = 'rejected',
        actioned_at = now(),
        actioned_by = auth.uid(),
        comments = comments_input
    WHERE id = v_step.id;

    -- Update Payrun
    UPDATE public.pay_runs
    SET 
        approval_status = 'rejected',
        status = 'rejected',
        approval_last_action_at = now()
    WHERE id = payrun_id_input;
    
    -- Notify Creator
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        v_payrun.created_by,
        'payroll_alert',
        'Payrun Rejected',
        'Your payrun was rejected at Level ' || v_payrun.approval_current_level || '. Reason: ' || COALESCE(comments_input, 'None'),
        jsonb_build_object('payrun_id', payrun_id_input)
    );

    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."reject_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_failed_login_attempts"("_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = 0, updated_at = NOW()
  WHERE id = _user_id;
END;
$$;


ALTER FUNCTION "public"."reset_failed_login_attempts"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."return_payrun_to_draft"("payrun_id_input" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_payrun RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    
    -- Only allow if rejected (or maybe pending if admin? Sticking to plan: rejected)
    IF v_payrun.approval_status != 'rejected' THEN
        RAISE EXCEPTION 'Only rejected payruns can be returned to draft. Current status: %', v_payrun.approval_status;
    END IF;
    
    -- Check permissions: Creator or Admin
    IF v_payrun.created_by != auth.uid() AND NOT public.check_is_org_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to reset this payrun';
    END IF;

    -- 1. DELETE approval steps
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    -- 2. Reset Payrun
    UPDATE public.pay_runs
    SET 
        approval_status = 'draft',
        status = 'draft',
        approval_current_level = NULL,
        approval_submitted_at = NULL,
        approval_submitted_by = NULL,
        approval_last_action_at = NULL,
        approved_at = NULL,
        approved_by = NULL
    WHERE id = payrun_id_input;
    
    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."return_payrun_to_draft"("payrun_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_categories"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.employee_categories (organization_id, key, label, description)
    VALUES 
        (org_id, 'head_office', 'Head Office', 'Corporate and administrative staff'),
        (org_id, 'projects', 'Projects', 'Field and contract staff')
    ON CONFLICT (organization_id, key) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."seed_default_categories"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- In a real implementation, this would send an email
    -- For now, we'll just log it
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent,
        timestamp,
        result
    ) VALUES (
        (SELECT id FROM public.users WHERE email = user_email LIMIT 1),
        'setup_email_sent',
        'system',
        json_build_object('email', user_email, 'temp_password', temp_password),
        '127.0.0.1',
        'System',
        NOW(),
        'success'
    );
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") IS 'Send setup email to super admin';



CREATE OR REPLACE FUNCTION "public"."set_employee_number_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.employee_number IS NULL OR length(trim(NEW.employee_number)) = 0 THEN
    NEW.employee_number := public.generate_employee_number(
      NEW.sub_department,
      NEW.country,
      NEW.employee_type,
      NEW.pay_group_id,
      NEW.number_prefix_override
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_employee_number_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_now"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."set_updated_at_now"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_payrun_for_approval"("payrun_id_input" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_payrun RECORD;
    v_workflow_id uuid;
    v_step RECORD;
    v_org_id uuid;
    v_next_approver_id uuid;
    v_config_id uuid;
    v_is_enabled boolean;
    v_wf_id uuid;
    v_global_enabled boolean;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    IF v_payrun.status NOT IN ('draft', 'rejected') AND v_payrun.approval_status NOT IN ('draft', 'rejected') THEN
         RAISE EXCEPTION 'Payrun must be in draft or rejected status to submit. Current status: %', v_payrun.status;
    END IF;
    
    SELECT organization_id INTO v_org_id FROM public.pay_groups WHERE id = v_payrun.pay_group_id;
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = auth.uid();
    END IF;

    SELECT pac.id, pac.workflow_id, pac.is_enabled INTO v_config_id, v_wf_id, v_is_enabled
    FROM public.payroll_approval_configs pac
    JOIN public.payroll_approval_categories pbc ON pbc.config_id = pac.id
    JOIN public.employee_categories ec ON ec.id = pbc.category_id
    WHERE pac.organization_id = v_org_id
      AND (ec.key = v_payrun.sub_type OR (v_payrun.sub_type IS NULL AND ec.key = v_payrun.category))
      AND pac.is_enabled = true
    LIMIT 1;

    SELECT payroll_approvals_enabled INTO v_global_enabled FROM public.org_settings WHERE organization_id = v_org_id;

    IF v_global_enabled = false THEN
        v_workflow_id := NULL;
    ELSIF v_config_id IS NOT NULL THEN
        IF v_is_enabled = true THEN v_workflow_id := v_wf_id; ELSE v_workflow_id := NULL; END IF;
    ELSE
        v_workflow_id := NULL;
    END IF;

    IF v_workflow_id IS NULL THEN
        UPDATE public.pay_runs
        SET approval_status = 'approved', status = 'approved',
            approval_current_level = NULL, approval_submitted_at = now(),
            approval_submitted_by = auth.uid(), approval_last_action_at = now(),
            approved_at = now(), approved_by = auth.uid()
        WHERE id = payrun_id_input;
        RETURN jsonb_build_object('success', true, 'status', 'auto_approved');
    END IF;
    
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    FOR v_step IN 
        SELECT * FROM public.approval_workflow_steps WHERE workflow_id = v_workflow_id ORDER BY level ASC 
    LOOP
        INSERT INTO public.payrun_approval_steps (payrun_id, level, approver_user_id, approver_role, status)
        VALUES (payrun_id_input, v_step.level, v_step.approver_user_id, v_step.approver_role, 'pending');
        IF v_step.level = 1 THEN v_next_approver_id := v_step.approver_user_id; END IF;
    END LOOP;
    
    UPDATE public.pay_runs
    SET approval_status = 'pending_approval', status = 'pending_approval',
        approval_current_level = 1, approval_submitted_at = now(),
        approval_submitted_by = auth.uid(), approval_last_action_at = now(),
        approved_at = NULL, approved_by = NULL
    WHERE id = payrun_id_input;
    
    IF v_next_approver_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (v_next_approver_id, 'approval_request', 'Payrun Approval Required',
            'A payrun requires your approval (Level 1).',
            jsonb_build_object('payrun_id', payrun_id_input, 'type', 'payroll_approval'));
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'submitted', 'next_approver', v_next_approver_id, 'workflow_id', v_workflow_id);
END;
$$;


ALTER FUNCTION "public"."submit_payrun_for_approval"("payrun_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_legacy_pay_group_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.pay_group_master_id IS NOT NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_legacy_pay_group_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_pay_group_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If pay_group_master_id is set but pay_group_id is null, sync it
  IF NEW.pay_group_master_id IS NOT NULL AND NEW.pay_group_id IS NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  -- If pay_group_id is set but pay_group_master_id is null, sync it
  ELSIF NEW.pay_group_id IS NOT NULL AND NEW.pay_group_master_id IS NULL THEN
    SELECT pgm.id INTO NEW.pay_group_master_id
    FROM public.pay_group_master pgm
    WHERE pgm.source_id = NEW.pay_group_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_pay_group_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_rbac_to_auth_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_roles JSONB;
    v_permissions JSONB;
    v_is_platform_admin BOOLEAN;
    v_org_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN v_user_id := OLD.user_id; ELSE v_user_id := NEW.user_id; END IF;

    -- Collect roles
    SELECT jsonb_agg(jsonb_build_object('role', role_code, 'scope_type', scope_type, 'scope_id', scope_id, 'org_id', org_id)) 
    INTO v_roles FROM public.rbac_assignments WHERE user_id = v_user_id;

    -- Collect permissions
    SELECT jsonb_agg(DISTINCT rp.permission_key) 
    INTO v_permissions FROM public.rbac_assignments a
    JOIN public.rbac_role_permissions rp ON rp.role_code = a.role_code AND rp.org_id = a.org_id
    WHERE a.user_id = v_user_id;

    -- Check platform admin
    v_is_platform_admin := public.is_platform_admin(v_user_id);
    
    -- Get primary organization_id
    SELECT organization_id INTO v_org_id FROM public.user_profiles WHERE id = v_user_id;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'rbac_roles', coalesce(v_roles, '[]'::jsonb),
            'rbac_permissions', coalesce(v_permissions, '[]'::jsonb),
            'is_platform_admin', v_is_platform_admin,
            'organization_id', v_org_id
        )
    WHERE id = v_user_id;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_rbac_to_auth_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_rbac_to_jwt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update auth.users app_metadata with role assignments and permissions
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_roles}',
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', ra.role_code,
          'scope_type', ra.scope_type,
          'scope_id', ra.scope_id
        )
      )
      FROM public.rbac_assignments ra
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_permissions}',
    (
      SELECT jsonb_agg(DISTINCT rrp.permission_key)
      FROM public.rbac_assignments ra
      JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{is_platform_admin}',
    to_jsonb(
      EXISTS (
        SELECT 1
        FROM public.rbac_assignments ra
        JOIN public.rbac_roles rr ON ra.role_code = rr.code
        WHERE ra.user_id = NEW.user_id
          AND rr.tier = 'PLATFORM'
          AND ra.scope_type = 'GLOBAL'
      )
    )
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_rbac_to_jwt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_timesheet_total_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.timesheets
  SET total_hours = (
    SELECT COALESCE(SUM(hours_worked), 0)
    FROM public.timesheet_entries
    WHERE timesheet_id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
  )
  WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_timesheet_total_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_profile_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.user_profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_profile_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_email_handler"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_url text;
    v_payload jsonb;
BEGIN
    -- This URL points to the Cloud Edge Function
    v_url := 'https://sbphmrjoappwlervnbtm.supabase.co/functions/v1/trigger-approval-email';
    
    -- Construct Payload
    IF TG_TABLE_NAME = 'notifications' AND NEW.type = 'approval_request' THEN
        -- TRANSFORM to mock 'payrun_approval_steps' payload
        -- Use json_build_object to construct the record as the Edge Function expects it
        v_payload := jsonb_build_object(
            'type', 'INSERT',
            'table', 'payrun_approval_steps',
            'schema', TG_TABLE_SCHEMA,
            'record', jsonb_build_object(
                'status', 'pending',
                'approver_user_id', NEW.user_id,
                'payrun_id', (NEW.metadata->>'payrun_id')::uuid
            ),
            'old_record', null
        );
    ELSE
        -- STANDARD generic payload for other tables (pay_runs, payrun_approval_steps)
        v_payload := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW),
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
        );
    END IF;

    -- Call Edge Function via pg_net
    -- We assume pg_net is enabled (checked in previous migration)
    
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) 
        ),
        body := v_payload
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_email_handler"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF gross_pay < 100000 THEN RETURN 0; END IF;
  IF gross_pay < 200000 THEN RETURN 5000; END IF;
  IF gross_pay < 300000 THEN RETURN 10000; END IF;
  IF gross_pay < 400000 THEN RETURN 20000; END IF;
  IF gross_pay < 500000 THEN RETURN 30000; END IF;
  IF gross_pay < 600000 THEN RETURN 40000; END IF;
  IF gross_pay < 700000 THEN RETURN 60000; END IF;
  IF gross_pay < 800000 THEN RETURN 70000; END IF;
  IF gross_pay < 900000 THEN RETURN 80000; END IF;
  IF gross_pay < 1000000 THEN RETURN 90000; END IF;
  RETURN 100000;
END;
$$;


ALTER FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_banks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_banks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payslip_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payslip_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_onboarding_steps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Update manager_assigned step
    IF NEW.responsible_manager_id IS DISTINCT FROM OLD.responsible_manager_id THEN
        UPDATE public.project_onboarding_steps
        SET completed = (NEW.responsible_manager_id IS NOT NULL),
            completed_at = CASE WHEN NEW.responsible_manager_id IS NOT NULL THEN now() ELSE NULL END,
            updated_at = now()
        WHERE project_id = NEW.id AND step_key = 'manager_assigned';
    END IF;

    -- Update pay_types_configured step
    IF (NEW.project_type IS DISTINCT FROM OLD.project_type)
       OR (NEW.supports_all_pay_types IS DISTINCT FROM OLD.supports_all_pay_types)
       OR (NEW.allowed_pay_types IS DISTINCT FROM OLD.allowed_pay_types) THEN
        UPDATE public.project_onboarding_steps
        SET completed = (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)),
            completed_at = CASE WHEN (NEW.project_type IS NOT NULL AND (NEW.supports_all_pay_types = true OR NEW.allowed_pay_types IS NOT NULL)) THEN now() ELSE NULL END,
            updated_at = now()
        WHERE project_id = NEW.id AND step_key = 'pay_types_configured';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_onboarding_steps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pay_group_id"("pay_group_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM public.pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM public.expatriate_pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- If not found in either table, return false
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."validate_pay_group_id"("pay_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_paygroup_employees_pay_group_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Skip validation if pay_group_master_id is set (new schema)
  -- In the new schema, pay_group_master_id is the source of truth
  IF NEW.pay_group_master_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip validation if pay_group_id is null
  IF NEW.pay_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only validate pay_group_id if pay_group_master_id is NOT set (legacy records)
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM expatriate_pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- If not found in either table, raise exception
  RAISE EXCEPTION 'Pay group ID % does not exist in pay_groups or expatriate_pay_groups table', NEW.pay_group_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_paygroup_employees_pay_group_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_rbac_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. Ensure User belongs to the Org (unless platform admin/sentinel)
  IF NEW.org_id != '00000000-0000-0000-0000-000000000000' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = NEW.user_id AND organization_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'User does not belong to the target organization';
    END IF;
  END IF;

  -- 2. Ensure Scope belongs to the Org
  IF NEW.scope_type = 'COMPANY' THEN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION 'Target company does not belong to the assignment organization';
    END IF;
  ELSIF NEW.scope_type = 'PROJECT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.scope_id AND organization_id = NEW.org_id) THEN
      RAISE EXCEPTION 'Target project does not belong to the assignment organization';
    END IF;
  ELSIF NEW.scope_type = 'ORGANIZATION' THEN
    IF NEW.scope_id != NEW.org_id THEN
      RAISE EXCEPTION 'Organization scope ID must match the assignment organization ID';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_rbac_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_single_paygroup_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  -- Only check for active assignments
  IF NEW.active = true THEN
    -- Check if employee is already in another active pay group
    IF EXISTS (
      SELECT 1 FROM public.paygroup_employees 
      WHERE employee_id = NEW.employee_id 
        AND active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Employee is already assigned to another active pay group. Only one pay group per employee is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_single_paygroup_assignment"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_employee_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_employee_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "holiday_date" "date" NOT NULL,
    "country" "text",
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "leave_type_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "ippms"."ippms_leave_status" DEFAULT 'PENDING'::"ippms"."ippms_leave_status",
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "leave_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "ippms"."ippms_leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_leave_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "paid" boolean DEFAULT false,
    "requires_approval" boolean DEFAULT true,
    "max_days_per_year" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_leave_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_piece_work_catalogue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "unit_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_piece_work_catalogue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_piece_work_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "piece_id" "uuid" NOT NULL,
    "rate" numeric(12,2) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_piece_work_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ippms"."ippms_work_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "work_type" "ippms"."ippms_work_type" NOT NULL,
    "attendance_id" "uuid",
    "piece_entry_id" "uuid",
    "payrun_id" "uuid",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ippms"."ippms_work_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role_id" "uuid",
    "scope_type" "text" NOT NULL,
    "scope_key" "text" NOT NULL,
    "effect" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "access_grants_effect_check" CHECK (("effect" = ANY (ARRAY['allow'::"text", 'deny'::"text"]))),
    CONSTRAINT "access_grants_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['org'::"text", 'company'::"text", 'module'::"text", 'project_type'::"text", 'action'::"text"])))
);


ALTER TABLE "public"."access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_id" "uuid",
    "rule_name" character varying(100) NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "message" "text" NOT NULL,
    "triggered_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alert_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_logs" IS 'Log of triggered alerts';



CREATE TABLE IF NOT EXISTS "public"."alert_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "condition" character varying(50) NOT NULL,
    "threshold" numeric(10,2) NOT NULL,
    "enabled" boolean DEFAULT true,
    "notification_channels" "text"[] DEFAULT '{}'::"text"[],
    "escalation_level" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alert_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_rules" IS 'Rules for triggering alerts based on integration health';



CREATE TABLE IF NOT EXISTS "public"."approval_workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "approver_user_id" "uuid",
    "approver_role" "text",
    "sequence_number" integer NOT NULL,
    "notify_email" boolean DEFAULT true,
    "notify_in_app" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "approver_type" "text" DEFAULT 'role'::"text",
    "fallback_user_id" "uuid",
    CONSTRAINT "approval_workflow_steps_approver_type_check" CHECK (("approver_type" = ANY (ARRAY['role'::"text", 'individual'::"text", 'hybrid'::"text"]))),
    CONSTRAINT "approval_workflow_steps_level_check" CHECK (("level" >= 1))
);


ALTER TABLE "public"."approval_workflow_steps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."approval_workflow_steps"."approver_type" IS 'How approver is selected: role (position-based), individual (specific user), hybrid (role with individual fallback)';



COMMENT ON COLUMN "public"."approval_workflow_steps"."fallback_user_id" IS 'Fallback user for hybrid approver type when role has no assignee';



CREATE TABLE IF NOT EXISTS "public"."approval_workflow_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "workflow_snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."approval_workflow_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."approval_workflow_versions" IS 'Historical versions of workflows for audit trail and in-flight approval protection';



COMMENT ON COLUMN "public"."approval_workflow_versions"."workflow_snapshot" IS 'Complete JSON snapshot of workflow configuration and all steps at this version';



CREATE TABLE IF NOT EXISTS "public"."approval_workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "applies_to_scopes" "jsonb" DEFAULT '[]'::"jsonb",
    "version" integer DEFAULT 1
);


ALTER TABLE "public"."approval_workflows" OWNER TO "postgres";


COMMENT ON COLUMN "public"."approval_workflows"."applies_to_scopes" IS 'Array of payroll action scopes this workflow covers';



COMMENT ON COLUMN "public"."approval_workflows"."version" IS 'Workflow version number, incremented on each edit';



CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "date" "date" NOT NULL,
    "check_in" time without time zone,
    "check_out" time without time zone,
    "total_hours" numeric(5,2) DEFAULT 0,
    "overtime_hours" numeric(5,2) DEFAULT 0,
    "status" character varying(20) NOT NULL,
    "leave_type" character varying(50),
    "remarks" "text",
    "synced_from_zoho" boolean DEFAULT false,
    "synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'half-day'::character varying, 'holiday'::character varying])::"text"[])))
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."attendance_records" IS 'Attendance records synced from Zoho People';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "action" character varying(100) NOT NULL,
    "user_id" character varying(100),
    "resource" character varying(100) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "timestamp" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "result" character varying(20),
    CONSTRAINT "audit_logs_result_check" CHECK ((("result")::"text" = ANY ((ARRAY['success'::character varying, 'failure'::character varying, 'denied'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for all user actions and system events';



CREATE TABLE IF NOT EXISTS "public"."auth_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "timestamp_utc" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "geo_location" "jsonb",
    "user_agent" "text",
    "success" boolean NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."auth_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "swift_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."banks" OWNER TO "postgres";


COMMENT ON TABLE "public"."banks" IS 'Bank information organized by country';



COMMENT ON COLUMN "public"."banks"."name" IS 'Bank name';



COMMENT ON COLUMN "public"."banks"."country_code" IS 'ISO country code (e.g., UG, KE, TZ)';



COMMENT ON COLUMN "public"."banks"."swift_code" IS 'SWIFT/BIC code (optional)';



CREATE TABLE IF NOT EXISTS "public"."benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cost" numeric(10,2) NOT NULL,
    "cost_type" "text" DEFAULT 'fixed'::"text" NOT NULL,
    "benefit_type" "public"."benefit_type" DEFAULT 'other'::"public"."benefit_type" NOT NULL,
    "applicable_countries" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "benefits_cost_type_check" CHECK (("cost_type" = ANY (ARRAY['fixed'::"text", 'percentage'::"text"])))
);


ALTER TABLE "public"."benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleanup_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text" DEFAULT 'invite_cleanup'::"text" NOT NULL,
    "action" "text" NOT NULL,
    "email" "text",
    "auth_user_id" "uuid",
    "invite_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."cleanup_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "country_id" "uuid",
    "currency" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_code" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Companies belong to organizations. GWAZU is the default company.';



COMMENT ON COLUMN "public"."companies"."short_code" IS 'Short code used for ID/prefix generation e.g., QSS';



CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" DEFAULT 'SimplePay Solutions'::"text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "tax_id" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#3366CC'::"text",
    "secondary_color" "text" DEFAULT '#666666'::"text",
    "accent_color" "text" DEFAULT '#FF6B35'::"text",
    "include_logo" boolean DEFAULT true,
    "show_company_details" boolean DEFAULT true,
    "add_confidentiality_footer" boolean DEFAULT true,
    "include_generated_date" boolean DEFAULT true,
    "show_page_numbers" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_unit_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_unit_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company_unit_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "active" boolean DEFAULT true,
    "category_id" "uuid",
    CONSTRAINT "company_units_kind_check" CHECK ((("kind" IS NULL) OR ("kind" = ANY (ARRAY['head_office'::"text", 'project'::"text"])))),
    CONSTRAINT "org_units_kind_check" CHECK (("kind" = ANY (ARRAY['head_office'::"text", 'project'::"text"])))
);


ALTER TABLE "public"."company_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_units" IS 'Company units belong to companies. Company Units 1-4 are created under GWAZU.';



COMMENT ON COLUMN "public"."company_units"."company_id" IS 'Reference to the company this unit belongs to';



COMMENT ON COLUMN "public"."company_units"."description" IS 'Optional description for the company unit';



COMMENT ON COLUMN "public"."company_units"."active" IS 'Whether the company unit is active';



CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "country_code" "text",
    "employment_type" "text",
    "body_html" "text" DEFAULT ''::"text" NOT NULL,
    "placeholders" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "contract_rate" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "project_hours" numeric(8,2) DEFAULT 0.00,
    "milestone_completion" numeric(5,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "withholding_tax" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "contractor_fees" numeric(12,2) DEFAULT 0.00,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "contract_type" character varying(50) DEFAULT 'hourly'::character varying,
    "project_id" "uuid",
    "invoice_number" character varying(100),
    "payment_terms" character varying(50) DEFAULT 'net_30'::character varying,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_pay_run_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."contractor_pay_run_items" IS 'Pay run items for contractors with project-based billing';



CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."countries" IS 'Global list of countries available in the system';



COMMENT ON COLUMN "public"."countries"."name" IS 'Full country name';



COMMENT ON COLUMN "public"."countries"."code" IS 'ISO 3166-1 alpha-2 country code';



CREATE TABLE IF NOT EXISTS "public"."database_health_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_date" timestamp with time zone DEFAULT "now"(),
    "health_score" integer,
    "health_status" "text",
    "critical_issues_count" integer,
    "total_checks" integer,
    "passed_checks" integer,
    "report_data" "jsonb"
);


ALTER TABLE "public"."database_health_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "key" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_events_category_check" CHECK (("category" = ANY (ARRAY['auth'::"text", 'payroll'::"text", 'system'::"text", 'approval'::"text"])))
);


ALTER TABLE "public"."email_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "event_key" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_msg_id" "text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    CONSTRAINT "email_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_placeholders" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "example_value" "text",
    "category" "text" NOT NULL,
    "is_locked" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_placeholders_category_check" CHECK (("category" = ANY (ARRAY['organization'::"text", 'employee'::"text", 'payroll'::"text", 'approval'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."email_placeholders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "event_key" "text" NOT NULL,
    "subject_template" "text" NOT NULL,
    "body_html_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "design" "jsonb",
    "version" integer DEFAULT 1
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_triggers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."email_triggers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "contract_number" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "auto_renew" boolean DEFAULT false NOT NULL,
    "salary_snapshot" "jsonb",
    "terms_snapshot" "jsonb",
    "body_html" "text",
    "signed_by_employee_at" timestamp with time zone,
    "signed_by_employer_at" timestamp with time zone,
    "signed_by_employer_name" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_contracts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'signed'::"text", 'active'::"text", 'expired'::"text", 'terminated'::"text"])))
);


ALTER TABLE "public"."employee_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "pay_type" "public"."pay_type" DEFAULT 'hourly'::"public"."pay_type" NOT NULL,
    "pay_rate" numeric(10,2) NOT NULL,
    "country" "text" NOT NULL,
    "pay_group_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "middle_name" "text",
    "last_name" "text",
    "currency" "text",
    "employee_type" "text" DEFAULT 'local'::"text" NOT NULL,
    "gender" "text",
    "date_of_birth" "date",
    "national_id" "text",
    "tin" "text",
    "nssf_number" "text",
    "passport_number" "text",
    "bank_name" "text",
    "bank_branch" "text",
    "account_number" "text",
    "account_type" "text",
    "sub_department" "text",
    "project" "text",
    "employee_number" "text" NOT NULL,
    "social_security_number" "text",
    "employee_category" "text",
    "employment_status" "text" DEFAULT 'Active'::"text",
    "organization_id" "uuid" NOT NULL,
    "employee_type_id" "uuid",
    "category" "text",
    "sub_type" "text",
    "pay_frequency" "text",
    "company_unit_id" "uuid",
    "company_id" "uuid",
    "project_id" "uuid",
    "sub_department_id" "uuid",
    "number_prefix_override" "text",
    "date_joined" "date",
    "probation_end_date" "date",
    "probation_status" "text" DEFAULT 'not_applicable'::"text",
    "probation_notes" "text",
    "contract_type" "text" DEFAULT 'monthly'::"text",
    CONSTRAINT "check_employees_category" CHECK ((("employee_category" IS NULL) OR ("employee_category" = ANY (ARRAY['Intern'::"text", 'Trainee'::"text", 'Temporary'::"text", 'Permanent'::"text", 'On Contract'::"text", 'Casual'::"text"])))),
    CONSTRAINT "check_employees_status" CHECK (("employment_status" = ANY (ARRAY['Active'::"text", 'Terminated'::"text", 'Deceased'::"text", 'Resigned'::"text", 'Probation'::"text", 'Notice Period'::"text"]))),
    CONSTRAINT "employees_category_check" CHECK ((("category" = ANY (ARRAY['head_office'::"text", 'projects'::"text"])) OR ("category" IS NULL))),
    CONSTRAINT "employees_contract_type_check" CHECK (("contract_type" = ANY (ARRAY['monthly'::"text", 'variable'::"text"]))),
    CONSTRAINT "employees_employee_type_check" CHECK (((("category" = 'head_office'::"text") AND ("employee_type" = ANY (ARRAY['regular'::"text", 'expatriate'::"text", 'interns'::"text"]))) OR (("category" = 'projects'::"text") AND ("employee_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))) OR (("category" IS NULL) AND ("employee_type" IS NULL)))),
    CONSTRAINT "employees_pay_frequency_check" CHECK ((("pay_frequency" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"])) OR ("pay_frequency" IS NULL))),
    CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."employee_type" IS 'Employee type: Local or Expatriate';



COMMENT ON COLUMN "public"."employees"."gender" IS 'Employee gender: Male, Female, or Other';



COMMENT ON COLUMN "public"."employees"."date_of_birth" IS 'Employee date of birth';



COMMENT ON COLUMN "public"."employees"."national_id" IS 'National ID or identification number';



COMMENT ON COLUMN "public"."employees"."tin" IS 'Tax Identification Number';



COMMENT ON COLUMN "public"."employees"."nssf_number" IS 'Social Security/NSSF number';



COMMENT ON COLUMN "public"."employees"."passport_number" IS 'Passport number for international employees';



COMMENT ON COLUMN "public"."employees"."bank_name" IS 'Employee bank name for salary payments';



COMMENT ON COLUMN "public"."employees"."bank_branch" IS 'Bank branch for salary payments';



COMMENT ON COLUMN "public"."employees"."account_number" IS 'Bank account number for salary payments';



COMMENT ON COLUMN "public"."employees"."account_type" IS 'Bank account type (Savings, Current, Salary Account)';



COMMENT ON COLUMN "public"."employees"."sub_department" IS 'Legacy/Text field for sub-department (if applicable)';



COMMENT ON COLUMN "public"."employees"."employee_number" IS 'System-wide unique employee identifier (e.g., EMP-001)';



COMMENT ON COLUMN "public"."employees"."employee_category" IS 'Employee category: Intern, Trainee, Temporary, Permanent, On Contract, Casual';



COMMENT ON COLUMN "public"."employees"."employment_status" IS 'Employment status: Active, Terminated, Deceased, Resigned, Probation, Notice Period';



COMMENT ON COLUMN "public"."employees"."category" IS 'Employee category: head_office or projects (only editable from employee module)';



COMMENT ON COLUMN "public"."employees"."sub_type" IS 'Employee sub-type matching paygroup structure';



COMMENT ON COLUMN "public"."employees"."pay_frequency" IS 'Pay frequency for Manpower employees: daily, bi_weekly, or monthly';



COMMENT ON COLUMN "public"."employees"."sub_department_id" IS 'Reference to the sub-department the employee belongs to';



COMMENT ON COLUMN "public"."employees"."number_prefix_override" IS 'Optional override prefix for employee_number (e.g., QSS-HO or QSS-PR)';



COMMENT ON COLUMN "public"."employees"."date_joined" IS 'Date when employee joined the organization (separate from created_at which is when record was added)';



COMMENT ON CONSTRAINT "employees_employee_type_check" ON "public"."employees" IS 'Employee type must match category: head_office (regular, expatriate, interns) or projects (manpower, ippms, expatriate)';



CREATE OR REPLACE VIEW "public"."employee_master" WITH ("security_invoker"='true') AS
 SELECT "id",
    "organization_id"
   FROM "public"."employees" "e";


ALTER VIEW "public"."employee_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_number_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "old_employee_number" "text",
    "new_employee_number" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "reason" "text"
);


ALTER TABLE "public"."employee_number_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_number_history" IS 'Audit trail for employee number changes';



CREATE TABLE IF NOT EXISTS "public"."employee_number_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number_format" "text" DEFAULT 'PREFIX-SEQUENCE'::"text" NOT NULL,
    "default_prefix" "text" DEFAULT 'EMP'::"text" NOT NULL,
    "sequence_digits" integer DEFAULT 3 NOT NULL,
    "use_sub_department_prefix" boolean DEFAULT false NOT NULL,
    "include_country_code" boolean DEFAULT false NOT NULL,
    "use_employment_type" boolean DEFAULT false NOT NULL,
    "custom_prefix_per_pay_group" boolean DEFAULT false NOT NULL,
    "custom_format" "text",
    "next_sequence" integer DEFAULT 1 NOT NULL,
    "sub_department_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "country_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_number_settings_next_sequence_check" CHECK (("next_sequence" > 0)),
    CONSTRAINT "employee_number_settings_sequence_digits_check" CHECK ((("sequence_digits" >= 1) AND ("sequence_digits" <= 10)))
);


ALTER TABLE "public"."employee_number_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_number_settings" IS 'Company-wide employee numbering configuration';



COMMENT ON COLUMN "public"."employee_number_settings"."use_sub_department_prefix" IS 'Whether to use sub-department name as employee number prefix';



COMMENT ON COLUMN "public"."employee_number_settings"."sub_department_rules" IS 'Per-sub-department employee numbering rules';



CREATE TABLE IF NOT EXISTS "public"."pay_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"public"."pay_frequency",
    "default_tax_percentage" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."pay_group_type" DEFAULT 'local'::"public"."pay_group_type" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "category" "text",
    "employee_type" "text",
    "piece_type" "text",
    "default_piece_rate" numeric(12,2),
    "minimum_pieces" integer,
    "maximum_pieces" integer,
    "project_id" "uuid",
    "tax_country" "text" NOT NULL,
    "pay_type" "text",
    "project_type" "text",
    CONSTRAINT "check_category_employee_type" CHECK (((("category" = 'head_office'::"text") AND ("employee_type" = ANY (ARRAY['regular'::"text", 'expatriate'::"text", 'interns'::"text"]))) OR (("category" = 'projects'::"text") AND ("employee_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))) OR (("category" IS NULL) AND ("employee_type" IS NULL)))),
    CONSTRAINT "check_category_sub_type" CHECK (((("category" = 'head_office'::"text") AND ("employee_type" = ANY (ARRAY['regular'::"text", 'expatriate'::"text", 'interns'::"text"]))) OR (("category" = 'projects'::"text") AND ("employee_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))) OR (("category" IS NULL) AND ("employee_type" IS NULL)))),
    CONSTRAINT "check_ippms_pay_type" CHECK (((("employee_type" = 'ippms'::"text") AND ("pay_type" = ANY (ARRAY['piece_rate'::"text", 'daily_rate'::"text"]))) OR ("employee_type" IS DISTINCT FROM 'ippms'::"text"))),
    CONSTRAINT "check_pay_frequency" CHECK (((("employee_type" = 'manpower'::"text") AND ("pay_frequency" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"]))) OR (("employee_type" <> 'manpower'::"text") AND ("pay_frequency" IS NULL)))),
    CONSTRAINT "check_tax_country_required" CHECK ((("tax_country" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "tax_country")) = 2))),
    CONSTRAINT "pay_groups_category_check" CHECK (("category" = ANY (ARRAY['head_office'::"text", 'projects'::"text"]))),
    CONSTRAINT "pay_groups_pay_frequency_check" CHECK ((("pay_frequency" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text", 'weekly'::"text", 'biweekly'::"text", 'custom'::"text", 'Daily Rate'::"text", 'Monthly'::"text"])) OR ("pay_frequency" IS NULL))),
    CONSTRAINT "pay_groups_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['hourly'::"text", 'salary'::"text", 'piece_rate'::"text", 'daily_rate'::"text"]))),
    CONSTRAINT "pay_groups_project_type_check" CHECK ((("project_type" IS NULL) OR ("project_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))))
);


ALTER TABLE "public"."pay_groups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pay_groups"."pay_frequency" IS 'Pay frequency for Manpower sub-type: daily, bi_weekly, or monthly';



COMMENT ON COLUMN "public"."pay_groups"."type" IS 'Pay group type: local, expatriate, contractor, intern, temporary';



COMMENT ON COLUMN "public"."pay_groups"."category" IS 'Main category: head_office or projects';



COMMENT ON COLUMN "public"."pay_groups"."employee_type" IS 'Sub-type: regular, expatriate, interns (head_office) or manpower, ippms, expatriate (projects)';



COMMENT ON COLUMN "public"."pay_groups"."piece_type" IS 'Unit of measurement for piece rate calculations (crates, boxes, units, etc.)';



COMMENT ON COLUMN "public"."pay_groups"."default_piece_rate" IS 'Default rate per piece/unit for piece rate pay groups';



COMMENT ON COLUMN "public"."pay_groups"."minimum_pieces" IS 'Minimum pieces required per pay period (optional, for validation)';



COMMENT ON COLUMN "public"."pay_groups"."maximum_pieces" IS 'Maximum pieces allowed per pay period (optional, for validation)';



COMMENT ON COLUMN "public"."pay_groups"."tax_country" IS 'Tax country code (required for all pay group types) - determines which country''s tax regulations apply';



COMMENT ON COLUMN "public"."pay_groups"."project_type" IS 'Links to project''s employee type when category = projects';



CREATE TABLE IF NOT EXISTS "public"."paygroup_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "notes" "text",
    "removed_at" timestamp with time zone,
    "pay_group_master_id" "uuid"
);


ALTER TABLE "public"."paygroup_employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."paygroup_employees"."active" IS 'Indicates if the assignment is active (true) or soft-deleted (false)';



COMMENT ON COLUMN "public"."paygroup_employees"."removed_at" IS 'Timestamp when the assignment was soft-deleted, null for active assignments';



CREATE OR REPLACE VIEW "public"."employee_pay_groups" WITH ("security_invoker"='true') AS
 SELECT "peg"."id",
    "peg"."pay_group_id",
    "peg"."employee_id",
    "peg"."assigned_at" AS "assigned_on",
    "peg"."removed_at" AS "unassigned_on",
    "pg"."organization_id",
    "e"."id" AS "emp_id",
    "e"."first_name" AS "emp_first_name",
    "e"."middle_name" AS "emp_middle_name",
    "e"."last_name" AS "emp_last_name",
    "e"."email" AS "emp_email",
    "e"."pay_type" AS "emp_pay_type",
    "e"."pay_rate" AS "emp_pay_rate",
    "e"."currency" AS "emp_currency",
    "e"."country" AS "emp_country",
    "e"."employee_type" AS "emp_employee_type"
   FROM (("public"."paygroup_employees" "peg"
     LEFT JOIN "public"."employees" "e" ON (("e"."id" = "peg"."employee_id")))
     LEFT JOIN "public"."pay_groups" "pg" ON (("pg"."id" = "peg"."pay_group_id")));


ALTER VIEW "public"."employee_pay_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."employee_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paygroup_id" "text",
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "exchange_rate_to_local" numeric(12,4) DEFAULT 0 NOT NULL,
    "tax_country" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."expatriate_pay_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_run_item_allowances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expatriate_pay_run_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expatriate_pay_run_item_allowances" OWNER TO "postgres";


COMMENT ON TABLE "public"."expatriate_pay_run_item_allowances" IS 'Stores multiple named allowances per expatriate pay run item (e.g., Housing, Transport, Medical)';



CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid",
    "employee_id" "uuid",
    "expatriate_pay_group_id" "uuid",
    "daily_rate" numeric(12,2) NOT NULL,
    "days_worked" integer DEFAULT 0 NOT NULL,
    "allowances_foreign" numeric(12,2) DEFAULT 0,
    "net_foreign" numeric(12,2) NOT NULL,
    "net_local" numeric(12,2) NOT NULL,
    "gross_local" numeric(12,2) NOT NULL,
    "tax_country" "text" NOT NULL,
    "exchange_rate_to_local" numeric(12,4) NOT NULL,
    "currency" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "exchange_rate" numeric DEFAULT 0,
    "local_gross_pay" numeric DEFAULT 0,
    "local_net_pay" numeric DEFAULT 0,
    "base_currency" "text" DEFAULT 'UGX'::"text",
    "housing_allowance" numeric(12,2) DEFAULT 0.00,
    "transport_allowance" numeric(12,2) DEFAULT 0.00,
    "medical_allowance" numeric(12,2) DEFAULT 0.00,
    "education_allowance" numeric(12,2) DEFAULT 0.00,
    "gross_foreign" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "foreign_currency" character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "local_currency" character varying(3) DEFAULT 'UGX'::character varying NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 15.00,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."expatriate_pay_run_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."expatriate_pay_run_items" IS 'Pay run items for expatriate employees with dual currency support';



CREATE TABLE IF NOT EXISTS "public"."expatriate_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" NOT NULL,
    "flat_tax_rate" numeric,
    "apply_flat_tax" boolean DEFAULT false NOT NULL,
    "social_security_treatment" "text" DEFAULT 'full'::"text" NOT NULL,
    "social_security_reduced_rate" numeric,
    "exempt_lst" boolean DEFAULT false NOT NULL,
    "exempt_nhif" boolean DEFAULT false NOT NULL,
    "exempt_housing_levy" boolean DEFAULT false NOT NULL,
    "housing_allowance_percent" numeric DEFAULT 0,
    "education_allowance_percent" numeric DEFAULT 0,
    "travel_allowance_percent" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expatriate_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_group_company_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "company_unit_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."head_office_pay_group_company_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "removed_at" timestamp with time zone,
    "added_by" "uuid"
);


ALTER TABLE "public"."head_office_pay_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_expatriates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'expatriate'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "exchange_rate_to_local" numeric(12,4) DEFAULT 0 NOT NULL,
    "tax_country" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_expatriates_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_expatriates_employee_type_check" CHECK (("employee_type" = 'expatriate'::"text"))
);


ALTER TABLE "public"."head_office_pay_groups_expatriates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_interns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'intern'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_interns_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_interns_employee_type_check" CHECK (("employee_type" = 'intern'::"text"))
);


ALTER TABLE "public"."head_office_pay_groups_interns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_regular" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'regular'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_regular_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_regular_employee_type_check" CHECK (("employee_type" = 'regular'::"text"))
);


ALTER TABLE "public"."head_office_pay_groups_regular" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "basic_pay" numeric(12,2) DEFAULT 0,
    "allowances" numeric(12,2) DEFAULT 0,
    "gross_pay" numeric(12,2) DEFAULT 0,
    "nssf" numeric(12,2) DEFAULT 0,
    "paye" numeric(12,2) DEFAULT 0,
    "other_deductions" numeric(12,2) DEFAULT 0,
    "total_deductions" numeric(12,2) DEFAULT 0,
    "net_pay" numeric(12,2) DEFAULT 0,
    "currency" "text",
    "exchange_rate" numeric(12,4),
    "net_foreign" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."head_office_pay_run_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."head_office_pay_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "pay_run_id" "text",
    "pay_period_start" "date" NOT NULL,
    "pay_period_end" "date" NOT NULL,
    "pay_run_date" "date" DEFAULT CURRENT_DATE,
    "status" "text" DEFAULT 'draft'::"text",
    "total_gross_pay" numeric(12,2) DEFAULT 0,
    "total_deductions" numeric(12,2) DEFAULT 0,
    "total_net_pay" numeric(12,2) DEFAULT 0,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."head_office_pay_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impersonation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "super_admin_id" "uuid" NOT NULL,
    "target_user_id" "uuid",
    "target_organization_id" "uuid",
    "target_role" "text" NOT NULL,
    "impersonation_start" timestamp with time zone NOT NULL,
    "impersonation_end" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."impersonation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "last_sync" timestamp with time zone,
    "uptime" numeric(5,2) DEFAULT 0,
    "api_response_time" integer DEFAULT 0,
    "error_rate" numeric(5,2) DEFAULT 0,
    "total_syncs" integer DEFAULT 0,
    "successful_syncs" integer DEFAULT 0,
    "failed_syncs" integer DEFAULT 0,
    "checked_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "integration_health_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['healthy'::character varying, 'warning'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."integration_health" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_health" IS 'Health monitoring data for integrations';



CREATE TABLE IF NOT EXISTS "public"."integration_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token_type" character varying(20) DEFAULT 'Bearer'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_tokens" IS 'Stores OAuth tokens for external integrations';



CREATE TABLE IF NOT EXISTS "public"."intern_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "stipend_amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "learning_hours" numeric(8,2) DEFAULT 0.00,
    "project_hours" numeric(8,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "internship_duration_months" integer,
    "mentor_id" "uuid",
    "sub_department" character varying(100),
    "learning_objectives" "text"[],
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."intern_pay_run_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."intern_pay_run_items" IS 'Pay run items for interns with stipend and learning tracking';



COMMENT ON COLUMN "public"."intern_pay_run_items"."sub_department" IS 'Department/Sub-department for intern payroll item';



CREATE TABLE IF NOT EXISTS "public"."items_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "unit" "text" DEFAULT 'unit'::"text",
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."items_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."local_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "basic_salary" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "overtime_hours" numeric(8,2) DEFAULT 0.00,
    "overtime_rate" numeric(10,2) DEFAULT 0.00,
    "pieces_completed" integer,
    "piece_rate" numeric(10,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "benefit_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "custom_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "total_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "nssf_employee" numeric(12,2) DEFAULT 0.00,
    "nssf_employer" numeric(12,2) DEFAULT 0.00,
    "paye_tax" numeric(12,2) DEFAULT 0.00,
    "local_currency" character varying(3) DEFAULT 'UGX'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."local_pay_run_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."local_pay_run_items" IS 'Pay run items for local employees with standard payroll calculations';



CREATE TABLE IF NOT EXISTS "public"."lst_employee_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "annual_amount" numeric NOT NULL,
    "months" integer NOT NULL,
    "start_month" "date" NOT NULL,
    "distribution" "text" NOT NULL,
    "custom_amounts" "jsonb",
    "percentages" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lst_employee_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."lst_employee_assignments" IS 'LST plan assignments per employee';



CREATE TABLE IF NOT EXISTS "public"."lst_payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" DEFAULT 'Uganda'::"text" NOT NULL,
    "method" "text" DEFAULT 'official_brackets'::"text" NOT NULL,
    "annual_amount" numeric DEFAULT 0 NOT NULL,
    "months" integer DEFAULT 3 NOT NULL,
    "distribution" "text" DEFAULT 'equal'::"text" NOT NULL,
    "custom_amounts" "jsonb",
    "percentages" "jsonb",
    "start_month" "date" NOT NULL,
    "apply_future" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lst_payment_plans_months_check" CHECK ((("months" >= 1) AND ("months" <= 24)))
);


ALTER TABLE "public"."lst_payment_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."lst_payment_plans" IS 'LST payment plan templates for batches';



CREATE TABLE IF NOT EXISTS "public"."pay_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "pay_period_start" "date" NOT NULL,
    "pay_period_end" "date" NOT NULL,
    "pay_group_id" "uuid",
    "status" "public"."pay_run_status" DEFAULT 'draft'::"public"."pay_run_status" NOT NULL,
    "total_gross_pay" numeric(12,2) DEFAULT 0.00,
    "total_deductions" numeric(12,2) DEFAULT 0.00,
    "total_net_pay" numeric(12,2) DEFAULT 0.00,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pay_run_id" character varying(50),
    "pay_group_master_id" "uuid",
    "payroll_type" "text",
    "days_worked" numeric DEFAULT 0,
    "exchange_rate" numeric DEFAULT 0,
    "organization_id" "uuid" NOT NULL,
    "category" "text",
    "sub_type" "text",
    "pay_frequency" "text",
    "company_id" "uuid",
    "total_gross" numeric,
    "total_net" numeric,
    "payroll_status" "text",
    "pay_type" "text",
    "employee_type" "text",
    "project_id" "uuid",
    "approval_status" "text",
    "approval_current_level" integer,
    "approval_submitted_at" timestamp with time zone,
    "approval_submitted_by" "uuid",
    "approval_last_action_at" timestamp with time zone,
    CONSTRAINT "pay_runs_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['draft'::"text", 'pending_approval'::"text", 'approved'::"text", 'rejected'::"text", 'locked'::"text"]))),
    CONSTRAINT "pay_runs_category_check" CHECK (("category" = ANY (ARRAY['head_office'::"text", 'projects'::"text"]))),
    CONSTRAINT "pay_runs_pay_frequency_check" CHECK ((("pay_frequency" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"])) OR ("pay_frequency" IS NULL))),
    CONSTRAINT "pay_runs_payroll_type_check" CHECK ((("payroll_type" = ANY (ARRAY['regular'::"text", 'expatriate'::"text", 'piece_rate'::"text", 'intern'::"text"])) OR ("payroll_type" IS NULL)))
);


ALTER TABLE "public"."pay_runs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pay_runs"."pay_run_id" IS 'Unique identifier for pay run in format [Prefix]-[YYYYMMDD]-[HHMMSS]';



COMMENT ON COLUMN "public"."pay_runs"."category" IS 'Pay run category derived from paygroup (head_office or projects)';



COMMENT ON COLUMN "public"."pay_runs"."sub_type" IS 'Pay run sub-type derived from paygroup';



COMMENT ON COLUMN "public"."pay_runs"."pay_frequency" IS 'Pay frequency for Manpower pay runs: daily, bi_weekly, or monthly';



COMMENT ON COLUMN "public"."pay_runs"."project_id" IS 'Project linkage for project-based pay runs (manpower/ippms/expatriate projects)';



CREATE OR REPLACE VIEW "public"."master_payrolls" WITH ("security_invoker"='true') AS
 SELECT "id",
    "organization_id",
    "pay_group_id",
    "pay_period_start",
    "pay_period_end",
    "total_gross",
    "total_net",
    "payroll_status",
    0 AS "total_employees"
   FROM "public"."pay_runs" "pr";


ALTER VIEW "public"."master_payrolls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_channels_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'webhook'::character varying, 'slack'::character varying])::"text"[])))
);


ALTER TABLE "public"."notification_channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_channels" IS 'Channels for sending alerts and notifications';



CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "trigger_event" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "module" "text" DEFAULT 'payroll_approvals'::"text" NOT NULL,
    "available_variables" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['security_alert'::"text", 'account_locked'::"text", 'account_unlocked'::"text", 'login_alert'::"text", 'system_update'::"text", 'payroll_alert'::"text", 'approval_request'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'In-app notification system for security alerts and system messages';



COMMENT ON COLUMN "public"."notifications"."metadata" IS 'Additional notification data (e.g., related user ID, event ID, action links)';



CREATE TABLE IF NOT EXISTS "public"."org_license_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seat_type" "text" DEFAULT 'default'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."org_license_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_licenses" (
    "org_id" "uuid" NOT NULL,
    "seat_limit" integer DEFAULT 0 NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_licenses_seat_limit_check" CHECK (("seat_limit" >= 0))
);


ALTER TABLE "public"."org_licenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "system_defined" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "max_approval_levels" integer DEFAULT 5 NOT NULL,
    "approvals_sequential" boolean DEFAULT true NOT NULL,
    "approvals_allow_delegation" boolean DEFAULT true NOT NULL,
    "approvals_rejection_comment_required" boolean DEFAULT true NOT NULL,
    "approvals_visibility_non_admin" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payroll_approvals_enabled" boolean DEFAULT false,
    "approvals_enabled_scopes" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "org_settings_max_approval_levels_check" CHECK ((("max_approval_levels" >= 1) AND ("max_approval_levels" <= 20)))
);


ALTER TABLE "public"."org_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."org_settings"."payroll_approvals_enabled" IS 'Global toggle to enable/disable payroll approvals for the organization';



COMMENT ON COLUMN "public"."org_settings"."approvals_enabled_scopes" IS 'Array of payroll action scopes that require approval: payroll_run_creation, payroll_run_finalization, payroll_reruns, payroll_adjustments, payroll_overrides, backdated_changes';



CREATE TABLE IF NOT EXISTS "public"."org_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."org_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "org_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'invited'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."org_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "lockout_threshold" integer DEFAULT 5 NOT NULL,
    "email_alerts_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_security_settings_lockout_threshold_check" CHECK ((("lockout_threshold" >= 3) AND ("lockout_threshold" <= 10)))
);


ALTER TABLE "public"."organization_security_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_company_id" "uuid"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."default_company_id" IS 'Default company ID for this organization. Used to auto-select company in forms.';



CREATE TABLE IF NOT EXISTS "public"."pay_calculation_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "pay_run_id" "uuid",
    "input_data" "jsonb" NOT NULL,
    "output_data" "jsonb" NOT NULL,
    "calculation_type" "text" DEFAULT 'payroll_calculation'::"text",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pay_calculation_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."pay_calculation_audit_log" IS 'Audit log for payroll calculations performed by Edge Functions';



CREATE TABLE IF NOT EXISTS "public"."pay_group_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "source_table" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "country" "text",
    "currency" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "sub_type" "text",
    "pay_frequency" "text",
    "pay_type" "text",
    "employee_type" "text",
    "organization_id" "uuid",
    CONSTRAINT "pay_group_master_category_check" CHECK (("category" = ANY (ARRAY['head_office'::"text", 'projects'::"text"]))),
    CONSTRAINT "pay_group_master_pay_frequency_check" CHECK ((("pay_frequency" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"])) OR ("pay_frequency" IS NULL))),
    CONSTRAINT "pay_group_master_type_check" CHECK (("type" = ANY (ARRAY['regular'::"text", 'expatriate'::"text", 'piece_rate'::"text", 'intern'::"text"])))
);


ALTER TABLE "public"."pay_group_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_item_custom_deductions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'deduction'::"text" NOT NULL,
    CONSTRAINT "pay_item_custom_deductions_type_check" CHECK (("type" = ANY (ARRAY['deduction'::"text", 'benefit'::"text", 'allowance'::"text"])))
);


ALTER TABLE "public"."pay_item_custom_deductions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "hours_worked" numeric(8,2),
    "pieces_completed" integer,
    "gross_pay" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "benefit_deductions" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_deductions" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."pay_item_status" DEFAULT 'draft'::"public"."pay_item_status" NOT NULL,
    "employer_contributions" numeric DEFAULT 0.00 NOT NULL,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."pay_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."paygroup_employees_legacy" WITH ("security_invoker"='true') AS
 SELECT "id",
    "employee_id",
    "active",
    "assigned_at",
    "removed_at",
    "assigned_by",
    "notes",
    "pay_group_master_id" AS "paygroup_id",
    "pay_group_master_id",
    "pay_group_id"
   FROM "public"."paygroup_employees" "pe";


ALTER VIEW "public"."paygroup_employees_legacy" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."paygroup_employees_view" WITH ("security_invoker"='true') AS
 SELECT "peg"."id" AS "assignment_id",
    "peg"."employee_id",
    "peg"."pay_group_id",
    COALESCE("peg"."active", true) AS "active",
    "pg"."name" AS "pay_group_name",
    COALESCE("lower"(("pg"."type")::"text"), 'local'::"text") AS "pay_group_type",
    "pg"."category",
    "pg"."employee_type",
    "pg"."pay_frequency",
    "pg"."pay_type"
   FROM ("public"."paygroup_employees" "peg"
     JOIN "public"."pay_groups" "pg" ON (("pg"."id" = "peg"."pay_group_id")));


ALTER VIEW "public"."paygroup_employees_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."paygroup_summary_view" WITH ("security_invoker"='true') AS
 SELECT "pg"."id",
    NULL::"text" AS "paygroup_id",
    "pg"."name",
    COALESCE(("pg"."type")::"text", 'regular'::"text") AS "type",
    "pg"."country",
    NULL::"text" AS "currency",
    'active'::"text" AS "status",
    COALESCE("employee_counts"."employee_count", (0)::bigint) AS "employee_count",
    "pg"."created_at",
    "pg"."updated_at",
    "pg"."pay_frequency",
    "pg"."default_tax_percentage",
    NULL::numeric AS "exchange_rate_to_local",
    NULL::numeric AS "default_daily_rate",
    NULL::"text" AS "tax_country",
    "pg"."description" AS "notes"
   FROM ("public"."pay_groups" "pg"
     LEFT JOIN ( SELECT "paygroup_employees"."pay_group_id",
            "count"(*) AS "employee_count"
           FROM "public"."paygroup_employees"
          WHERE ("paygroup_employees"."active" = true)
          GROUP BY "paygroup_employees"."pay_group_id") "employee_counts" ON (("employee_counts"."pay_group_id" = "pg"."id")))
UNION ALL
 SELECT "epg"."id",
    "epg"."paygroup_id",
    "epg"."name",
    'expatriate'::"text" AS "type",
    "epg"."country",
    "epg"."currency",
    'active'::"text" AS "status",
    COALESCE("employee_counts"."employee_count", (0)::bigint) AS "employee_count",
    "epg"."created_at",
    "epg"."updated_at",
    NULL::"text" AS "pay_frequency",
    NULL::numeric AS "default_tax_percentage",
    "epg"."exchange_rate_to_local",
    NULL::numeric AS "default_daily_rate",
    "epg"."tax_country",
    "epg"."notes"
   FROM ("public"."expatriate_pay_groups" "epg"
     LEFT JOIN ( SELECT "paygroup_employees"."pay_group_id",
            "count"(*) AS "employee_count"
           FROM "public"."paygroup_employees"
          WHERE ("paygroup_employees"."active" = true)
          GROUP BY "paygroup_employees"."pay_group_id") "employee_counts" ON (("employee_counts"."pay_group_id" = "epg"."id")));


ALTER VIEW "public"."paygroup_summary_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."paygroup_summary_view" IS 'Unified view of pay groups (regular and expatriate) with employee counts';



CREATE TABLE IF NOT EXISTS "public"."payroll_approval_categories" (
    "config_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."payroll_approval_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."payroll_approval_categories" IS 'Maps employee categories to a specific approval configuration. Category ID is UNIQUE to prevent overlap.';



CREATE TABLE IF NOT EXISTS "public"."payroll_approval_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "workflow_id" "uuid",
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payroll_approval_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."payroll_approval_configs" IS 'Configuration for specific payroll streams/types (e.g., Head Office, Manpower)';



CREATE TABLE IF NOT EXISTS "public"."payroll_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "use_strict_mode" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payroll_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payrun_approval_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payrun_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "approver_user_id" "uuid",
    "approver_role" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "actioned_at" timestamp with time zone,
    "actioned_by" "uuid",
    "comments" "text",
    "original_approver_id" "uuid",
    "delegated_by" "uuid",
    "delegated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "workflow_version" integer,
    "override_reason" "text",
    "override_by" "uuid",
    "override_at" timestamp with time zone,
    CONSTRAINT "payrun_approval_steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'skipped'::"text", 'approved_overridden'::"text"])))
);


ALTER TABLE "public"."payrun_approval_steps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payrun_approval_steps"."workflow_version" IS 'Snapshot of workflow version used for this approval instance';



COMMENT ON COLUMN "public"."payrun_approval_steps"."override_reason" IS 'Mandatory reason if approval was overridden';



COMMENT ON COLUMN "public"."payrun_approval_steps"."override_by" IS 'User who performed the override (Super Admin or Tenant Admin)';



COMMENT ON COLUMN "public"."payrun_approval_steps"."override_at" IS 'Timestamp when override was performed';



CREATE TABLE IF NOT EXISTS "public"."payrun_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payrun_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslip_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "pay_run_id" "uuid",
    "employee_id" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "export_format" "text" DEFAULT 'pdf'::"text" NOT NULL,
    "file_size" integer,
    "created_by" "uuid"
);


ALTER TABLE "public"."payslip_generations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslip_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "config" "jsonb" NOT NULL,
    "user_id" "uuid",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payslip_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource" character varying(100) NOT NULL,
    "permission" character varying(100) NOT NULL,
    "has_permission" boolean NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."permission_cache" IS 'Cached permission check results for performance';



CREATE TABLE IF NOT EXISTS "public"."platform_admin_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "device_name" "text",
    "browser" "text",
    "os" "text",
    "approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admin_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."platform_admin_role" DEFAULT 'super_admin'::"public"."platform_admin_role" NOT NULL,
    "allowed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_admins" IS 'Global platform administrators with cross-tenant access.';



CREATE TABLE IF NOT EXISTS "public"."platform_email_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "provider_name" "text" DEFAULT 'resend'::"text" NOT NULL,
    "default_from_name" "text" DEFAULT 'PayRun Pro'::"text" NOT NULL,
    "default_from_email" "text" DEFAULT 'no-reply@payroll.flipafrica.app'::"text" NOT NULL,
    "default_reply_to" "text",
    "enforce_identity" boolean DEFAULT true NOT NULL,
    "rate_limit_per_tenant" integer DEFAULT 1000 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."platform_email_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."probation_reminder_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."probation_reminder_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "failed_login_attempts" integer DEFAULT 0 NOT NULL,
    "locked_at" timestamp with time zone,
    "organization_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_onboarding_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "step_key" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_onboarding_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_type" "text",
    "project_subtype" "text",
    "allowed_pay_types" "text"[],
    "supports_all_pay_types" boolean DEFAULT false NOT NULL,
    "organization_id" "uuid",
    "responsible_manager_id" "uuid",
    "client_name" "text",
    "location" "text",
    "contract_value" numeric,
    CONSTRAINT "projects_project_subtype_check" CHECK (("project_subtype" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "projects_project_type_check" CHECK (("project_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."project_type" IS 'Project (Employee) Type: manpower | ippms | expatriate';



COMMENT ON COLUMN "public"."projects"."project_subtype" IS 'For manpower projects: daily | bi_weekly | monthly';



COMMENT ON COLUMN "public"."projects"."allowed_pay_types" IS 'Specific pay types allowed; NULL when supports_all_pay_types = true';



COMMENT ON COLUMN "public"."projects"."supports_all_pay_types" IS 'If TRUE, all pay types for project_type are allowed';



CREATE TABLE IF NOT EXISTS "public"."rbac_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "scope_type" "text" NOT NULL,
    "scope_id" "uuid",
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid",
    CONSTRAINT "rbac_assignments_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['GLOBAL'::"text", 'ORGANIZATION'::"text", 'COMPANY'::"text", 'PROJECT'::"text", 'SELF'::"text"])))
);


ALTER TABLE "public"."rbac_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "role_code" "text",
    "permission_key" "text" NOT NULL,
    "scope_type" "text" NOT NULL,
    "scope_id" "uuid" NOT NULL,
    "effect" "text" NOT NULL,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    CONSTRAINT "rbac_grants_check" CHECK (((("user_id" IS NOT NULL) AND ("role_code" IS NULL)) OR (("user_id" IS NULL) AND ("role_code" IS NOT NULL)))),
    CONSTRAINT "rbac_grants_effect_check" CHECK (("effect" = ANY (ARRAY['ALLOW'::"text", 'DENY'::"text"]))),
    CONSTRAINT "rbac_grants_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['ORGANIZATION'::"text", 'COMPANY'::"text", 'PROJECT'::"text"])))
);


ALTER TABLE "public"."rbac_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_permissions" (
    "key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rbac_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_role_permissions" (
    "role_code" "text" NOT NULL,
    "permission_key" "text" NOT NULL,
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."rbac_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rbac_roles" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "tier" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid" NOT NULL,
    CONSTRAINT "rbac_roles_org_id_check" CHECK (((("tier" = 'PLATFORM'::"text") AND ("org_id" = '00000000-0000-0000-0000-000000000000'::"uuid")) OR (("tier" <> 'PLATFORM'::"text") AND ("org_id" <> '00000000-0000-0000-0000-000000000000'::"uuid") AND ("org_id" IS NOT NULL)))),
    CONSTRAINT "rbac_roles_tier_check" CHECK (("tier" = ANY (ARRAY['PLATFORM'::"text", 'ORGANIZATION'::"text", 'COMPANY'::"text", 'PROJECT'::"text", 'SELF'::"text"])))
);


ALTER TABLE "public"."rbac_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(50) NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_assignments_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying])::"text"[])))
);


ALTER TABLE "public"."role_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_assignments" IS 'History of role assignments and changes';



CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "org_id" "uuid",
    "event_type" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "category" "text" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "company_unit_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."sub_departments" OWNER TO "postgres";


COMMENT ON TABLE "public"."sub_departments" IS 'Sub-Departments within a company unit';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Active user sessions for security management';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "role" character varying(50) NOT NULL,
    "organization_id" "uuid",
    "sub_department_id" character varying(100),
    "manager_id" "uuid",
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "two_factor_enabled" boolean DEFAULT false,
    "session_timeout" integer DEFAULT 480,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "restrictions" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User accounts with role-based access control';



COMMENT ON COLUMN "public"."users"."sub_department_id" IS 'Reference to the sub-department the user belongs to';



CREATE OR REPLACE VIEW "public"."super_admin_dashboard" WITH ("security_invoker"='true') AS
 SELECT "u"."id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."role",
    "u"."is_active",
    "u"."two_factor_enabled",
    "u"."last_login",
    "u"."created_at",
    "count"(DISTINCT "s"."id") AS "active_sessions",
    "count"(DISTINCT "al"."id") AS "recent_activity_count"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."user_sessions" "s" ON ((("u"."id" = "s"."user_id") AND ("s"."is_active" = true))))
     LEFT JOIN "public"."audit_logs" "al" ON (((("u"."id")::"text" = ("al"."user_id")::"text") AND ("al"."timestamp" >= ("now"() - '24:00:00'::interval)))))
  WHERE (("u"."role")::"text" = 'super_admin'::"text")
  GROUP BY "u"."id", "u"."email", "u"."first_name", "u"."last_name", "u"."role", "u"."is_active", "u"."two_factor_enabled", "u"."last_login", "u"."created_at";


ALTER VIEW "public"."super_admin_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "enabled" boolean DEFAULT true,
    "frequency" character varying(20) NOT NULL,
    "direction" character varying(20) NOT NULL,
    "data_mapping" "jsonb" DEFAULT '[]'::"jsonb",
    "filters" "jsonb" DEFAULT '{}'::"jsonb",
    "retry_attempts" integer DEFAULT 3,
    "timeout" integer DEFAULT 30000,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_configurations_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying, 'bidirectional'::character varying])::"text"[]))),
    CONSTRAINT "sync_configurations_frequency_check" CHECK ((("frequency")::"text" = ANY ((ARRAY['realtime'::character varying, 'hourly'::character varying, 'daily'::character varying, 'weekly'::character varying])::"text"[])))
);


ALTER TABLE "public"."sync_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_configurations" IS 'Configuration for data synchronization between systems';



CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_id" character varying(100) NOT NULL,
    "type" character varying(50) NOT NULL,
    "direction" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "records_processed" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_logs" IS 'Logs of synchronization operations';



CREATE TABLE IF NOT EXISTS "public"."tenant_email_settings" (
    "org_id" "uuid" NOT NULL,
    "emails_enabled" boolean DEFAULT true NOT NULL,
    "use_custom_sender" boolean DEFAULT false NOT NULL,
    "custom_from_name" "text",
    "custom_from_email" "text",
    "custom_reply_to" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."tenant_email_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timesheet_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."timesheet_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timesheet_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timesheet_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "hours_worked" numeric(5,2) NOT NULL,
    "department" "text" NOT NULL,
    "task_description" "text" NOT NULL,
    "linked_pay_run_id" "uuid",
    "is_aggregated" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_in" "text",
    "time_out" "text",
    "employee_sign" "text",
    "supervisor_comments" "text",
    "supervisor_sign" "text",
    CONSTRAINT "timesheet_entries_hours_worked_check" CHECK ((("hours_worked" > (0)::numeric) AND ("hours_worked" <= (24)::numeric)))
);


ALTER TABLE "public"."timesheet_entries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."timesheet_entries"."time_in" IS 'Time employee started work (HH:MM 24h format)';



COMMENT ON COLUMN "public"."timesheet_entries"."time_out" IS 'Time employee finished work (HH:MM 24h format)';



COMMENT ON COLUMN "public"."timesheet_entries"."employee_sign" IS 'Employee acknowledgment/signature text or initials';



COMMENT ON COLUMN "public"."timesheet_entries"."supervisor_comments" IS 'Supervisor review comments added during approval';



COMMENT ON COLUMN "public"."timesheet_entries"."supervisor_sign" IS 'Supervisor and HR sign-off confirmation during approval';



CREATE TABLE IF NOT EXISTS "public"."timesheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "reviewer_notes" "text",
    "total_hours" numeric(8,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "timesheets_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."timesheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_company_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_company_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "inviter_id" "uuid",
    "tenant_id" "uuid",
    "role_data" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_management_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "department" "text",
    "phone" "text",
    "invited_by" "uuid",
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_management_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_management_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone" "text",
    "department" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "full_name" "text",
    "email" "text",
    "role" "text",
    CONSTRAINT "user_management_profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."user_management_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "dashboard_config" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'User-specific preferences and dashboard configuration';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "activated_at" timestamp with time zone
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variable_item_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "work_log_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "catalog_item_id" "uuid",
    "item_name" "text" NOT NULL,
    "item_unit" "text" DEFAULT 'unit'::"text",
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "quantity" numeric(10,3) DEFAULT 0 NOT NULL,
    "total_cost" numeric(14,2) DEFAULT 0,
    "work_date" "date" NOT NULL,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."variable_item_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variable_pay_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "pay_group_id" "uuid",
    "cycle_name" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "total_daily_cost" numeric(14,2) DEFAULT 0,
    "total_piece_cost" numeric(14,2) DEFAULT 0,
    "total_allowances" numeric(14,2) DEFAULT 0,
    "total_net_pay" numeric(14,2) DEFAULT 0,
    "notes" "text",
    "locked_by" "uuid",
    "locked_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "variable_pay_cycles_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'locked'::"text", 'processed'::"text"])))
);


ALTER TABLE "public"."variable_pay_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variable_pay_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "days_present" integer DEFAULT 0,
    "total_daily_pay" numeric(14,2) DEFAULT 0,
    "total_piece_pay" numeric(14,2) DEFAULT 0,
    "allowance_house" numeric(14,2) DEFAULT 0,
    "allowance_travel" numeric(14,2) DEFAULT 0,
    "allowance_airtime" numeric(14,2) DEFAULT 0,
    "allowance_medical" numeric(14,2) DEFAULT 0,
    "allowance_seating" numeric(14,2) DEFAULT 0,
    "gross_pay" numeric(14,2) DEFAULT 0,
    "tax_deduction" numeric(14,2) DEFAULT 0,
    "nssf_employee" numeric(14,2) DEFAULT 0,
    "other_deductions" numeric(14,2) DEFAULT 0,
    "net_pay" numeric(14,2) DEFAULT 0,
    "work_log_validated" boolean DEFAULT false,
    "validation_errors" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."variable_pay_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variable_work_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "attendance_status" "text" DEFAULT 'present'::"text" NOT NULL,
    "hours_worked" numeric(6,2) DEFAULT 8,
    "daily_rate" numeric(14,2) DEFAULT 0,
    "daily_cost" numeric(14,2) DEFAULT 0,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "variable_work_logs_attendance_status_check" CHECK (("attendance_status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'leave'::"text", 'half_day'::"text"])))
);


ALTER TABLE "public"."variable_work_logs" OWNER TO "postgres";


ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_employee_shifts"
    ADD CONSTRAINT "ippms_employee_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_holidays"
    ADD CONSTRAINT "ippms_holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_leave_requests"
    ADD CONSTRAINT "ippms_leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_leave_types"
    ADD CONSTRAINT "ippms_leave_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_piece_work_catalogue"
    ADD CONSTRAINT "ippms_piece_work_catalogue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_piece_work_rates"
    ADD CONSTRAINT "ippms_piece_work_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_shifts"
    ADD CONSTRAINT "ippms_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ippms"."ippms_holidays"
    ADD CONSTRAINT "uniq_holiday_per_project" UNIQUE ("project_id", "holiday_date");



ALTER TABLE ONLY "ippms"."ippms_leave_types"
    ADD CONSTRAINT "uniq_leave_code" UNIQUE ("code");



ALTER TABLE ONLY "ippms"."ippms_piece_work_catalogue"
    ADD CONSTRAINT "uniq_piece_catalogue_code" UNIQUE ("code");



ALTER TABLE ONLY "ippms"."ippms_piece_work_rates"
    ADD CONSTRAINT "uniq_piece_rate_window" UNIQUE ("employee_id", "project_id", "piece_id", "start_date");



ALTER TABLE ONLY "ippms"."ippms_employee_shifts"
    ADD CONSTRAINT "uniq_shift_assignment" UNIQUE ("employee_id", "project_id", "shift_id", "start_date");



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "uniq_work_day" UNIQUE ("employee_id", "project_id", "work_date");



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_logs"
    ADD CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_rules"
    ADD CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_workflow_steps"
    ADD CONSTRAINT "approval_workflow_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_workflow_steps"
    ADD CONSTRAINT "approval_workflow_steps_workflow_id_level_key" UNIQUE ("workflow_id", "level");



ALTER TABLE ONLY "public"."approval_workflow_versions"
    ADD CONSTRAINT "approval_workflow_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_workflow_versions"
    ADD CONSTRAINT "approval_workflow_versions_workflow_id_version_key" UNIQUE ("workflow_id", "version");



ALTER TABLE ONLY "public"."approval_workflows"
    ADD CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_events"
    ADD CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_name_country_code_key" UNIQUE ("name", "country_code");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benefits"
    ADD CONSTRAINT "benefits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleanup_logs"
    ADD CONSTRAINT "cleanup_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_unit_categories"
    ADD CONSTRAINT "company_unit_categories_company_unit_id_category_id_key" UNIQUE ("company_unit_id", "category_id");



ALTER TABLE ONLY "public"."company_unit_categories"
    ADD CONSTRAINT "company_unit_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_units"
    ADD CONSTRAINT "company_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_pay_run_items"
    ADD CONSTRAINT "contractor_pay_run_items_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."contractor_pay_run_items"
    ADD CONSTRAINT "contractor_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."database_health_log"
    ADD CONSTRAINT "database_health_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_departments"
    ADD CONSTRAINT "departments_name_company_unit_id_key" UNIQUE ("name", "company_unit_id");



ALTER TABLE ONLY "public"."sub_departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_placeholders"
    ADD CONSTRAINT "email_placeholders_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_org_id_event_key_key" UNIQUE ("org_id", "event_key");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_triggers"
    ADD CONSTRAINT "email_triggers_org_id_event_key_key" UNIQUE ("org_id", "event_key");



ALTER TABLE ONLY "public"."email_triggers"
    ADD CONSTRAINT "email_triggers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_categories"
    ADD CONSTRAINT "employee_categories_organization_id_key_key" UNIQUE ("organization_id", "key");



ALTER TABLE ONLY "public"."employee_categories"
    ADD CONSTRAINT "employee_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_contracts"
    ADD CONSTRAINT "employee_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_number_history"
    ADD CONSTRAINT "employee_number_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_number_settings"
    ADD CONSTRAINT "employee_number_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_types"
    ADD CONSTRAINT "employee_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."employee_types"
    ADD CONSTRAINT "employee_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_pay_groups"
    ADD CONSTRAINT "expatriate_pay_groups_paygroup_id_key" UNIQUE ("paygroup_id");



ALTER TABLE ONLY "public"."expatriate_pay_groups"
    ADD CONSTRAINT "expatriate_pay_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_pay_run_item_allowances"
    ADD CONSTRAINT "expatriate_pay_run_item_allowances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_policies"
    ADD CONSTRAINT "expatriate_policies_country_key" UNIQUE ("country");



ALTER TABLE ONLY "public"."expatriate_policies"
    ADD CONSTRAINT "expatriate_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_group_company_units"
    ADD CONSTRAINT "head_office_pay_group_company_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_group_members"
    ADD CONSTRAINT "head_office_pay_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_expatriates"
    ADD CONSTRAINT "head_office_pay_groups_expatriates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_interns"
    ADD CONSTRAINT "head_office_pay_groups_interns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_regular"
    ADD CONSTRAINT "head_office_pay_groups_regular_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_run_items"
    ADD CONSTRAINT "head_office_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."head_office_pay_runs"
    ADD CONSTRAINT "head_office_pay_runs_pay_run_id_key" UNIQUE ("pay_run_id");



ALTER TABLE ONLY "public"."head_office_pay_runs"
    ADD CONSTRAINT "head_office_pay_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_health"
    ADD CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_tokens"
    ADD CONSTRAINT "integration_tokens_integration_name_key" UNIQUE ("integration_name");



ALTER TABLE ONLY "public"."integration_tokens"
    ADD CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intern_pay_run_items"
    ADD CONSTRAINT "intern_pay_run_items_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."intern_pay_run_items"
    ADD CONSTRAINT "intern_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items_catalog"
    ADD CONSTRAINT "items_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."local_pay_run_items"
    ADD CONSTRAINT "local_pay_run_items_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."local_pay_run_items"
    ADD CONSTRAINT "local_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_plan_id_employee_id_key" UNIQUE ("plan_id", "employee_id");



ALTER TABLE ONLY "public"."lst_payment_plans"
    ADD CONSTRAINT "lst_payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_channels"
    ADD CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_org_id_trigger_event_key" UNIQUE NULLS NOT DISTINCT ("org_id", "trigger_event");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_license_assignments"
    ADD CONSTRAINT "org_license_assignments_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_license_assignments"
    ADD CONSTRAINT "org_license_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_licenses"
    ADD CONSTRAINT "org_licenses_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."org_roles"
    ADD CONSTRAINT "org_roles_org_id_key_key" UNIQUE ("org_id", "key");



ALTER TABLE ONLY "public"."org_roles"
    ADD CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_user_roles"
    ADD CONSTRAINT "org_user_roles_org_user_id_role_id_key" UNIQUE ("org_user_id", "role_id");



ALTER TABLE ONLY "public"."org_user_roles"
    ADD CONSTRAINT "org_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_security_settings"
    ADD CONSTRAINT "organization_security_settings_org_id_key" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."organization_security_settings"
    ADD CONSTRAINT "organization_security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_group_master"
    ADD CONSTRAINT "pay_group_master_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."pay_group_master"
    ADD CONSTRAINT "pay_group_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_group_master"
    ADD CONSTRAINT "pay_group_master_type_source_table_source_id_key" UNIQUE ("type", "source_table", "source_id");



ALTER TABLE ONLY "public"."pay_groups"
    ADD CONSTRAINT "pay_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_item_custom_deductions"
    ADD CONSTRAINT "pay_item_custom_deductions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pay_run_id_key" UNIQUE ("pay_run_id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_approval_categories"
    ADD CONSTRAINT "payroll_approval_categories_pkey" PRIMARY KEY ("config_id", "category_id");



ALTER TABLE ONLY "public"."payroll_approval_configs"
    ADD CONSTRAINT "payroll_approval_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_configurations"
    ADD CONSTRAINT "payroll_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_payrun_id_level_key" UNIQUE ("payrun_id", "level");



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslip_templates"
    ADD CONSTRAINT "payslip_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_cache"
    ADD CONSTRAINT "permission_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admin_devices"
    ADD CONSTRAINT "platform_admin_devices_device_id_key" UNIQUE ("device_id");



ALTER TABLE ONLY "public"."platform_admin_devices"
    ADD CONSTRAINT "platform_admin_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_email_settings"
    ADD CONSTRAINT "platform_email_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."probation_reminder_logs"
    ADD CONSTRAINT "probation_reminder_logs_employee_id_reminder_type_key" UNIQUE ("employee_id", "reminder_type");



ALTER TABLE ONLY "public"."probation_reminder_logs"
    ADD CONSTRAINT "probation_reminder_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_onboarding_steps"
    ADD CONSTRAINT "project_onboarding_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_onboarding_steps"
    ADD CONSTRAINT "project_onboarding_steps_project_id_step_key_key" UNIQUE ("project_id", "step_key");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_user_id_role_code_scope_type_scope_id_key" UNIQUE ("user_id", "role_code", "scope_type", "scope_id");



ALTER TABLE ONLY "public"."rbac_grants"
    ADD CONSTRAINT "rbac_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rbac_permissions"
    ADD CONSTRAINT "rbac_permissions_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "public"."rbac_permissions"
    ADD CONSTRAINT "rbac_permissions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_pkey" PRIMARY KEY ("role_code", "permission_key", "org_id");



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_unique" UNIQUE ("role_code", "permission_key", "org_id");



ALTER TABLE ONLY "public"."rbac_roles"
    ADD CONSTRAINT "rbac_roles_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."rbac_roles"
    ADD CONSTRAINT "rbac_roles_pkey" PRIMARY KEY ("code", "org_id");



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_category_key_key" UNIQUE ("user_id", "category", "key");



ALTER TABLE ONLY "public"."sync_configurations"
    ADD CONSTRAINT "sync_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_email_settings"
    ADD CONSTRAINT "tenant_email_settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."timesheet_departments"
    ADD CONSTRAINT "timesheet_departments_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."timesheet_departments"
    ADD CONSTRAINT "timesheet_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_timesheet_id_work_date_key" UNIQUE ("timesheet_id", "work_date");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "unique_employee_in_paygroup" UNIQUE ("employee_id", "pay_group_id");



COMMENT ON CONSTRAINT "unique_employee_in_paygroup" ON "public"."paygroup_employees" IS 'Ensures each employee can only be assigned to a pay group once';



ALTER TABLE ONLY "public"."user_company_memberships"
    ADD CONSTRAINT "user_company_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_company_memberships"
    ADD CONSTRAINT "user_company_memberships_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."user_invites"
    ADD CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_management_invitations"
    ADD CONSTRAINT "user_management_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_management_invitations"
    ADD CONSTRAINT "user_management_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_management_profiles"
    ADD CONSTRAINT "user_management_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_management_profiles"
    ADD CONSTRAINT "user_management_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variable_item_logs"
    ADD CONSTRAINT "variable_item_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variable_pay_cycles"
    ADD CONSTRAINT "variable_pay_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variable_pay_summaries"
    ADD CONSTRAINT "variable_pay_summaries_cycle_id_employee_id_key" UNIQUE ("cycle_id", "employee_id");



ALTER TABLE ONLY "public"."variable_pay_summaries"
    ADD CONSTRAINT "variable_pay_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variable_work_logs"
    ADD CONSTRAINT "variable_work_logs_cycle_id_employee_id_work_date_key" UNIQUE ("cycle_id", "employee_id", "work_date");



ALTER TABLE ONLY "public"."variable_work_logs"
    ADD CONSTRAINT "variable_work_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ippms_attendance_payrun" ON "ippms"."ippms_attendance_records" USING "btree" ("payrun_id") WHERE ("payrun_id" IS NOT NULL);



CREATE INDEX "idx_ippms_attendance_project_date" ON "ippms"."ippms_attendance_records" USING "btree" ("project_id", "attendance_date");



CREATE INDEX "idx_ippms_employee_shifts_emp" ON "ippms"."ippms_employee_shifts" USING "btree" ("employee_id", "project_id", "start_date");



CREATE INDEX "idx_ippms_holidays_date" ON "ippms"."ippms_holidays" USING "btree" ("holiday_date");



CREATE INDEX "idx_ippms_leave_requests_emp" ON "ippms"."ippms_leave_requests" USING "btree" ("employee_id", "start_date", "end_date");



CREATE INDEX "idx_ippms_piece_entries_payrun" ON "ippms"."ippms_piece_work_entries" USING "btree" ("payrun_id") WHERE ("payrun_id" IS NOT NULL);



CREATE INDEX "idx_ippms_piece_entries_project_date" ON "ippms"."ippms_piece_work_entries" USING "btree" ("project_id", "work_date");



CREATE INDEX "idx_ippms_work_days_payrun" ON "ippms"."ippms_work_days" USING "btree" ("payrun_id") WHERE ("payrun_id" IS NOT NULL);



CREATE INDEX "idx_ippms_work_days_project_date" ON "ippms"."ippms_work_days" USING "btree" ("project_id", "work_date");



CREATE INDEX "idx_access_grants_company" ON "public"."access_grants" USING "btree" ("org_id", "company_id");



CREATE INDEX "idx_access_grants_org" ON "public"."access_grants" USING "btree" ("org_id");



CREATE INDEX "idx_access_grants_scope" ON "public"."access_grants" USING "btree" ("scope_type", "scope_key");



CREATE INDEX "idx_access_grants_user" ON "public"."access_grants" USING "btree" ("org_id", "user_id");



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at");



CREATE INDEX "idx_activity_logs_org_id" ON "public"."activity_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_activity_logs_org_user" ON "public"."activity_logs" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_alert_logs_rule_id" ON "public"."alert_logs" USING "btree" ("rule_id");



CREATE INDEX "idx_alert_logs_triggered_at" ON "public"."alert_logs" USING "btree" ("triggered_at");



CREATE INDEX "idx_approval_categories_cat" ON "public"."payroll_approval_categories" USING "btree" ("category_id");



CREATE INDEX "idx_approval_configs_org" ON "public"."payroll_approval_configs" USING "btree" ("organization_id");



CREATE INDEX "idx_approval_workflows_org_scopes" ON "public"."approval_workflows" USING "gin" ("applies_to_scopes");



CREATE INDEX "idx_attendance_records_employee_date" ON "public"."attendance_records" USING "btree" ("employee_id", "date");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_action_timestamp" ON "public"."audit_logs" USING "btree" ("action", "timestamp");



CREATE INDEX "idx_audit_logs_integration_action" ON "public"."audit_logs" USING "btree" ("integration_name", "action");



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource");



CREATE INDEX "idx_audit_logs_result" ON "public"."audit_logs" USING "btree" ("result");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_auth_events_org_user" ON "public"."auth_events" USING "btree" ("org_id", "user_id");



CREATE INDEX "idx_auth_events_timestamp" ON "public"."auth_events" USING "btree" ("timestamp_utc");



CREATE INDEX "idx_banks_country_code" ON "public"."banks" USING "btree" ("country_code");



CREATE INDEX "idx_banks_name" ON "public"."banks" USING "btree" ("name");



CREATE INDEX "idx_cleanup_logs_auth_user_id" ON "public"."cleanup_logs" USING "btree" ("auth_user_id");



CREATE INDEX "idx_cleanup_logs_created_at" ON "public"."cleanup_logs" USING "btree" ("created_at");



CREATE INDEX "idx_cleanup_logs_email" ON "public"."cleanup_logs" USING "btree" ("email");



CREATE INDEX "idx_cleanup_logs_invite_id" ON "public"."cleanup_logs" USING "btree" ("invite_id");



CREATE INDEX "idx_companies_org" ON "public"."companies" USING "btree" ("organization_id");



CREATE INDEX "idx_companies_org_id" ON "public"."companies" USING "btree" ("organization_id");



CREATE INDEX "idx_companies_short_code" ON "public"."companies" USING "btree" ("lower"("short_code"));



CREATE INDEX "idx_company_units_active" ON "public"."company_units" USING "btree" ("active");



CREATE INDEX "idx_company_units_company_id" ON "public"."company_units" USING "btree" ("company_id");



CREATE INDEX "idx_contract_templates_org" ON "public"."contract_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_contractor_pay_run_items_employee_id" ON "public"."contractor_pay_run_items" USING "btree" ("employee_id");



CREATE INDEX "idx_contractor_pay_run_items_pay_run_id" ON "public"."contractor_pay_run_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_contractor_pay_run_items_project_id" ON "public"."contractor_pay_run_items" USING "btree" ("project_id");



CREATE INDEX "idx_contractor_pay_run_items_status" ON "public"."contractor_pay_run_items" USING "btree" ("status");



CREATE INDEX "idx_countries_code" ON "public"."countries" USING "btree" ("code");



CREATE INDEX "idx_countries_name" ON "public"."countries" USING "btree" ("name");



CREATE INDEX "idx_custom_deductions_pay_item_id" ON "public"."pay_item_custom_deductions" USING "btree" ("pay_item_id");



CREATE INDEX "idx_email_outbox_org" ON "public"."email_outbox" USING "btree" ("org_id");



CREATE INDEX "idx_email_outbox_status" ON "public"."email_outbox" USING "btree" ("status");



CREATE INDEX "idx_employee_contracts_employee" ON "public"."employee_contracts" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_contracts_org" ON "public"."employee_contracts" USING "btree" ("organization_id");



CREATE INDEX "idx_employee_contracts_status" ON "public"."employee_contracts" USING "btree" ("status");



CREATE INDEX "idx_employees_category_sub_type" ON "public"."employees" USING "btree" ("category", "sub_type");



CREATE INDEX "idx_employees_company" ON "public"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_date_joined" ON "public"."employees" USING "btree" ("date_joined");



CREATE INDEX "idx_employees_employee_category" ON "public"."employees" USING "btree" ("employee_category");



CREATE INDEX "idx_employees_employee_type" ON "public"."employees" USING "btree" ("employee_type");



CREATE INDEX "idx_employees_employment_status" ON "public"."employees" USING "btree" ("employment_status");



CREATE INDEX "idx_employees_national_id" ON "public"."employees" USING "btree" ("national_id");



CREATE INDEX "idx_employees_nssf_number" ON "public"."employees" USING "btree" ("nssf_number");



CREATE INDEX "idx_employees_org_id" ON "public"."employees" USING "btree" ("organization_id");



CREATE INDEX "idx_employees_probation_end_date" ON "public"."employees" USING "btree" ("probation_end_date") WHERE ("probation_end_date" IS NOT NULL);



CREATE INDEX "idx_employees_project_id" ON "public"."employees" USING "btree" ("project_id");



CREATE INDEX "idx_employees_ssn" ON "public"."employees" USING "btree" ("social_security_number");



CREATE INDEX "idx_employees_sub_department" ON "public"."employees" USING "btree" ("sub_department");



CREATE INDEX "idx_employees_tin" ON "public"."employees" USING "btree" ("tin");



CREATE INDEX "idx_expatriate_allowances_item_id" ON "public"."expatriate_pay_run_item_allowances" USING "btree" ("expatriate_pay_run_item_id");



CREATE INDEX "idx_expatriate_allowances_name" ON "public"."expatriate_pay_run_item_allowances" USING "btree" ("name");



CREATE INDEX "idx_expatriate_pay_groups_country" ON "public"."expatriate_pay_groups" USING "btree" ("country");



CREATE INDEX "idx_expatriate_pay_groups_currency" ON "public"."expatriate_pay_groups" USING "btree" ("currency");



CREATE INDEX "idx_expatriate_pay_groups_org_id" ON "public"."expatriate_pay_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_expatriate_pay_groups_tax_country" ON "public"."expatriate_pay_groups" USING "btree" ("tax_country");



CREATE INDEX "idx_expatriate_pay_run_items_days_worked" ON "public"."expatriate_pay_run_items" USING "btree" ("days_worked");



CREATE INDEX "idx_expatriate_pay_run_items_employee_id" ON "public"."expatriate_pay_run_items" USING "btree" ("employee_id");



CREATE INDEX "idx_expatriate_pay_run_items_exchange_rate" ON "public"."expatriate_pay_run_items" USING "btree" ("exchange_rate");



CREATE INDEX "idx_expatriate_pay_run_items_expatriate_pay_group_id" ON "public"."expatriate_pay_run_items" USING "btree" ("expatriate_pay_group_id");



CREATE INDEX "idx_expatriate_pay_run_items_org_id" ON "public"."expatriate_pay_run_items" USING "btree" ("organization_id");



CREATE INDEX "idx_expatriate_pay_run_items_pay_group_id" ON "public"."expatriate_pay_run_items" USING "btree" ("expatriate_pay_group_id");



CREATE INDEX "idx_expatriate_pay_run_items_pay_run_id" ON "public"."expatriate_pay_run_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_expatriate_pay_run_items_status" ON "public"."expatriate_pay_run_items" USING "btree" ("status");



CREATE INDEX "idx_health_log_date" ON "public"."database_health_log" USING "btree" ("check_date" DESC);



CREATE INDEX "idx_ho_members_employee" ON "public"."head_office_pay_group_members" USING "btree" ("employee_id");



CREATE INDEX "idx_ho_members_group" ON "public"."head_office_pay_group_members" USING "btree" ("pay_group_id");



CREATE UNIQUE INDEX "idx_ho_members_unique_active" ON "public"."head_office_pay_group_members" USING "btree" ("pay_group_id", "employee_id") WHERE ("active" = true);



CREATE INDEX "idx_ho_runs_organization" ON "public"."head_office_pay_runs" USING "btree" ("organization_id");



CREATE INDEX "idx_ho_units_group" ON "public"."head_office_pay_group_company_units" USING "btree" ("pay_group_id");



CREATE INDEX "idx_impersonation_logs_super_admin_id" ON "public"."impersonation_logs" USING "btree" ("super_admin_id");



CREATE INDEX "idx_impersonation_logs_target_org_id" ON "public"."impersonation_logs" USING "btree" ("target_organization_id");



CREATE INDEX "idx_integration_health_name_checked" ON "public"."integration_health" USING "btree" ("integration_name", "checked_at");



CREATE INDEX "idx_integration_tokens_name" ON "public"."integration_tokens" USING "btree" ("integration_name");



CREATE INDEX "idx_intern_pay_run_items_employee_id" ON "public"."intern_pay_run_items" USING "btree" ("employee_id");



CREATE INDEX "idx_intern_pay_run_items_mentor_id" ON "public"."intern_pay_run_items" USING "btree" ("mentor_id");



CREATE INDEX "idx_intern_pay_run_items_pay_run_id" ON "public"."intern_pay_run_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_intern_pay_run_items_status" ON "public"."intern_pay_run_items" USING "btree" ("status");



CREATE INDEX "idx_items_catalog_org" ON "public"."items_catalog" USING "btree" ("organization_id");



CREATE INDEX "idx_items_catalog_project" ON "public"."items_catalog" USING "btree" ("project_id");



CREATE INDEX "idx_local_pay_run_items_employee_id" ON "public"."local_pay_run_items" USING "btree" ("employee_id");



CREATE INDEX "idx_local_pay_run_items_pay_run_id" ON "public"."local_pay_run_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_local_pay_run_items_status" ON "public"."local_pay_run_items" USING "btree" ("status");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_org_license_assignments_org" ON "public"."org_license_assignments" USING "btree" ("org_id");



CREATE INDEX "idx_org_license_assignments_user" ON "public"."org_license_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_org_roles_org" ON "public"."org_roles" USING "btree" ("org_id");



CREATE INDEX "idx_org_settings_org_id" ON "public"."org_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_org_user_roles_org_user" ON "public"."org_user_roles" USING "btree" ("org_user_id");



CREATE INDEX "idx_org_user_roles_role" ON "public"."org_user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_org_users_org" ON "public"."org_users" USING "btree" ("org_id");



CREATE INDEX "idx_org_users_user" ON "public"."org_users" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_active" ON "public"."organizations" USING "btree" ("active");



CREATE INDEX "idx_organizations_default_company_id" ON "public"."organizations" USING "btree" ("default_company_id");



CREATE INDEX "idx_pay_calculation_audit_calculated_at" ON "public"."pay_calculation_audit_log" USING "btree" ("calculated_at");



CREATE INDEX "idx_pay_calculation_audit_employee_id" ON "public"."pay_calculation_audit_log" USING "btree" ("employee_id");



CREATE INDEX "idx_pay_calculation_audit_pay_run_id" ON "public"."pay_calculation_audit_log" USING "btree" ("pay_run_id");



CREATE INDEX "idx_pay_group_master_category_sub_type" ON "public"."pay_group_master" USING "btree" ("category", "sub_type");



CREATE INDEX "idx_pay_group_master_source" ON "public"."pay_group_master" USING "btree" ("source_table", "source_id");



CREATE INDEX "idx_pay_group_master_type_active" ON "public"."pay_group_master" USING "btree" ("type", "active");



CREATE INDEX "idx_pay_groups_category_employee_type" ON "public"."pay_groups" USING "btree" ("category", "employee_type");



CREATE INDEX "idx_pay_groups_category_project_type" ON "public"."pay_groups" USING "btree" ("category", "project_type");



CREATE INDEX "idx_pay_groups_category_sub_type" ON "public"."pay_groups" USING "btree" ("category", "employee_type");



CREATE INDEX "idx_pay_groups_ippms_pay_type" ON "public"."pay_groups" USING "btree" ("pay_type") WHERE ("employee_type" = 'ippms'::"text");



CREATE INDEX "idx_pay_groups_org_id" ON "public"."pay_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_pay_groups_pay_frequency" ON "public"."pay_groups" USING "btree" ("pay_frequency") WHERE ("pay_frequency" IS NOT NULL);



CREATE INDEX "idx_pay_groups_piece_type" ON "public"."pay_groups" USING "btree" ("piece_type") WHERE ("piece_type" IS NOT NULL);



CREATE INDEX "idx_pay_groups_project_filters" ON "public"."pay_groups" USING "btree" ("project_type", "pay_type", "project_id");



CREATE INDEX "idx_pay_groups_project_id" ON "public"."pay_groups" USING "btree" ("project_id");



CREATE INDEX "idx_pay_groups_project_type_pay_type" ON "public"."pay_groups" USING "btree" ("project_type", "pay_type") WHERE ("project_type" IS NOT NULL);



CREATE INDEX "idx_pay_groups_tax_country" ON "public"."pay_groups" USING "btree" ("tax_country");



CREATE INDEX "idx_pay_groups_type" ON "public"."pay_groups" USING "btree" ("type");



CREATE INDEX "idx_pay_items_employee_id" ON "public"."pay_items" USING "btree" ("employee_id");



CREATE INDEX "idx_pay_items_org_id" ON "public"."pay_items" USING "btree" ("organization_id");



CREATE INDEX "idx_pay_items_pay_run_id" ON "public"."pay_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_pay_items_status" ON "public"."pay_items" USING "btree" ("status");



CREATE INDEX "idx_pay_runs_category_sub_type" ON "public"."pay_runs" USING "btree" ("category", "sub_type");



CREATE INDEX "idx_pay_runs_company" ON "public"."pay_runs" USING "btree" ("company_id");



CREATE INDEX "idx_pay_runs_days_worked" ON "public"."pay_runs" USING "btree" ("days_worked");



CREATE INDEX "idx_pay_runs_exchange_rate" ON "public"."pay_runs" USING "btree" ("exchange_rate");



CREATE INDEX "idx_pay_runs_master" ON "public"."pay_runs" USING "btree" ("pay_group_master_id");



CREATE INDEX "idx_pay_runs_org" ON "public"."pay_runs" USING "btree" ("organization_id");



CREATE INDEX "idx_pay_runs_org_id" ON "public"."pay_runs" USING "btree" ("organization_id");



CREATE INDEX "idx_pay_runs_pay_frequency" ON "public"."pay_runs" USING "btree" ("pay_frequency") WHERE ("pay_frequency" IS NOT NULL);



CREATE INDEX "idx_pay_runs_pay_group_master_id" ON "public"."pay_runs" USING "btree" ("pay_group_master_id");



CREATE INDEX "idx_pay_runs_pay_run_id" ON "public"."pay_runs" USING "btree" ("pay_run_id");



CREATE INDEX "idx_pay_runs_pay_type" ON "public"."pay_runs" USING "btree" ("pay_type");



CREATE INDEX "idx_pay_runs_payroll_type" ON "public"."pay_runs" USING "btree" ("payroll_type");



CREATE INDEX "idx_pay_runs_project_id" ON "public"."pay_runs" USING "btree" ("project_id");



CREATE INDEX "idx_paygroup_employees_active" ON "public"."paygroup_employees" USING "btree" ("active");



CREATE INDEX "idx_paygroup_employees_employee_id" ON "public"."paygroup_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_paygroup_employees_employee_id_all" ON "public"."paygroup_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_paygroup_employees_pay_group_id" ON "public"."paygroup_employees" USING "btree" ("pay_group_id");



CREATE INDEX "idx_paygroup_employees_pay_group_master_id" ON "public"."paygroup_employees" USING "btree" ("pay_group_master_id");



CREATE INDEX "idx_paygroup_employees_removed_at" ON "public"."paygroup_employees" USING "btree" ("removed_at");



CREATE INDEX "idx_payroll_approval_categories_config" ON "public"."payroll_approval_categories" USING "btree" ("config_id");



CREATE INDEX "idx_payroll_approval_configs_org" ON "public"."payroll_approval_configs" USING "btree" ("organization_id");



CREATE INDEX "idx_payrun_employees_employee_id" ON "public"."payrun_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_payrun_employees_pay_group_id" ON "public"."payrun_employees" USING "btree" ("pay_group_id");



CREATE INDEX "idx_payrun_employees_pay_run_id" ON "public"."payrun_employees" USING "btree" ("pay_run_id");



CREATE INDEX "idx_payrun_steps_override_by" ON "public"."payrun_approval_steps" USING "btree" ("override_by") WHERE ("override_by" IS NOT NULL);



CREATE INDEX "idx_payrun_steps_status" ON "public"."payrun_approval_steps" USING "btree" ("status");



CREATE INDEX "idx_payslip_generations_employee_id" ON "public"."payslip_generations" USING "btree" ("employee_id");



CREATE INDEX "idx_payslip_generations_pay_run_id" ON "public"."payslip_generations" USING "btree" ("pay_run_id");



CREATE INDEX "idx_payslip_generations_template_id" ON "public"."payslip_generations" USING "btree" ("template_id");



CREATE INDEX "idx_payslip_templates_is_default" ON "public"."payslip_templates" USING "btree" ("user_id", "is_default");



CREATE INDEX "idx_payslip_templates_user_id" ON "public"."payslip_templates" USING "btree" ("user_id");



CREATE INDEX "idx_permission_cache_expires" ON "public"."permission_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_permission_cache_resource" ON "public"."permission_cache" USING "btree" ("resource");



CREATE INDEX "idx_permission_cache_user" ON "public"."permission_cache" USING "btree" ("user_id");



CREATE INDEX "idx_pge_active" ON "public"."paygroup_employees" USING "btree" ("active");



CREATE INDEX "idx_pge_employee" ON "public"."paygroup_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_pge_group" ON "public"."paygroup_employees" USING "btree" ("pay_group_id");



CREATE INDEX "idx_pgm_ippms_pay_type" ON "public"."pay_group_master" USING "btree" ("pay_type");



CREATE UNIQUE INDEX "idx_platform_settings_singleton" ON "public"."platform_email_settings" USING "btree" ((true));



CREATE INDEX "idx_probation_reminder_logs_employee" ON "public"."probation_reminder_logs" USING "btree" ("employee_id");



CREATE INDEX "idx_project_onboarding_steps_project_id" ON "public"."project_onboarding_steps" USING "btree" ("project_id");



CREATE INDEX "idx_projects_project_type" ON "public"."projects" USING "btree" ("project_type");



CREATE INDEX "idx_projects_status_type" ON "public"."projects" USING "btree" ("status", "project_type");



CREATE INDEX "idx_projects_type" ON "public"."projects" USING "btree" ("project_type", "project_subtype");



CREATE INDEX "idx_role_assignments_active" ON "public"."role_assignments" USING "btree" ("is_active");



CREATE INDEX "idx_role_assignments_assigned_at" ON "public"."role_assignments" USING "btree" ("assigned_at");



CREATE INDEX "idx_role_assignments_role" ON "public"."role_assignments" USING "btree" ("role");



CREATE INDEX "idx_role_assignments_user" ON "public"."role_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_sync_logs_started_at" ON "public"."sync_logs" USING "btree" ("started_at");



CREATE INDEX "idx_sync_logs_sync_id" ON "public"."sync_logs" USING "btree" ("sync_id");



CREATE INDEX "idx_timesheet_entries_date" ON "public"."timesheet_entries" USING "btree" ("work_date");



CREATE INDEX "idx_timesheet_entries_emp" ON "public"."timesheet_entries" USING "btree" ("employee_id");



CREATE INDEX "idx_timesheet_entries_sheet" ON "public"."timesheet_entries" USING "btree" ("timesheet_id");



CREATE INDEX "idx_timesheets_employee_id" ON "public"."timesheets" USING "btree" ("employee_id");



CREATE INDEX "idx_timesheets_organization" ON "public"."timesheets" USING "btree" ("organization_id");



CREATE INDEX "idx_timesheets_status" ON "public"."timesheets" USING "btree" ("status");



CREATE INDEX "idx_ucm_company" ON "public"."user_company_memberships" USING "btree" ("company_id");



CREATE INDEX "idx_ucm_user" ON "public"."user_company_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_umi_email" ON "public"."user_management_invitations" USING "btree" ("email");



CREATE INDEX "idx_umi_status" ON "public"."user_management_invitations" USING "btree" ("status");



CREATE INDEX "idx_umi_token" ON "public"."user_management_invitations" USING "btree" ("token");



CREATE INDEX "idx_ump_username" ON "public"."user_management_profiles" USING "btree" ("username");



CREATE INDEX "idx_user_profiles_org_id" ON "public"."user_profiles" USING "btree" ("organization_id");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_user_sessions_expires" ON "public"."user_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_user_sessions_token" ON "public"."user_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_user_sessions_user" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_login" ON "public"."users" USING "btree" ("last_login");



CREATE INDEX "idx_users_manager" ON "public"."users" USING "btree" ("manager_id");



CREATE INDEX "idx_users_organization" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_role_active" ON "public"."users" USING "btree" ("role", "is_active");



CREATE INDEX "idx_users_sub_department" ON "public"."users" USING "btree" ("sub_department_id");



CREATE INDEX "idx_variable_item_logs_cycle" ON "public"."variable_item_logs" USING "btree" ("cycle_id");



CREATE INDEX "idx_variable_item_logs_employee" ON "public"."variable_item_logs" USING "btree" ("employee_id");



CREATE INDEX "idx_variable_pay_cycles_org" ON "public"."variable_pay_cycles" USING "btree" ("organization_id");



CREATE INDEX "idx_variable_pay_cycles_project" ON "public"."variable_pay_cycles" USING "btree" ("project_id");



CREATE INDEX "idx_variable_pay_summaries_cycle" ON "public"."variable_pay_summaries" USING "btree" ("cycle_id");



CREATE INDEX "idx_variable_work_logs_cycle" ON "public"."variable_work_logs" USING "btree" ("cycle_id");



CREATE INDEX "idx_variable_work_logs_employee" ON "public"."variable_work_logs" USING "btree" ("employee_id");



CREATE INDEX "idx_workflow_steps_approver_type" ON "public"."approval_workflow_steps" USING "btree" ("approver_type");



CREATE INDEX "idx_workflow_versions_workflow_id" ON "public"."approval_workflow_versions" USING "btree" ("workflow_id");



CREATE INDEX "platform_admin_devices_admin_id_idx" ON "public"."platform_admin_devices" USING "btree" ("admin_id");



CREATE UNIQUE INDEX "platform_admins_auth_user_id_idx" ON "public"."platform_admins" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_paygroup_employees_employee_active" ON "public"."paygroup_employees" USING "btree" ("employee_id") WHERE ("active" = true);



CREATE UNIQUE INDEX "unique_active_employee_paygroup" ON "public"."paygroup_employees" USING "btree" ("employee_id") WHERE ("active" = true);



COMMENT ON INDEX "public"."unique_active_employee_paygroup" IS 'Ensures each employee can only be in one active pay group at a time';



CREATE UNIQUE INDEX "uq_employee_number_settings_singleton" ON "public"."employee_number_settings" USING "btree" ((true));



CREATE UNIQUE INDEX "uq_employees_employee_number" ON "public"."employees" USING "btree" ("employee_number");



CREATE OR REPLACE TRIGGER "trg_attendance_updated_at" BEFORE UPDATE ON "ippms"."ippms_attendance_records" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_employee_shifts_updated_at" BEFORE UPDATE ON "ippms"."ippms_employee_shifts" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_holidays_updated_at" BEFORE UPDATE ON "ippms"."ippms_holidays" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leave_requests_updated_at" BEFORE UPDATE ON "ippms"."ippms_leave_requests" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leave_types_updated_at" BEFORE UPDATE ON "ippms"."ippms_leave_types" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_piece_entries_updated_at" BEFORE UPDATE ON "ippms"."ippms_piece_work_entries" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_piece_rates_updated_at" BEFORE UPDATE ON "ippms"."ippms_piece_work_rates" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_shifts_updated_at" BEFORE UPDATE ON "ippms"."ippms_shifts" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_work_days_updated_at" BEFORE UPDATE ON "ippms"."ippms_work_days" FOR EACH ROW EXECUTE FUNCTION "ippms"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "rbac_assignments_sync_jwt" AFTER INSERT OR DELETE OR UPDATE ON "public"."rbac_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_rbac_to_jwt"();



CREATE OR REPLACE TRIGGER "set_sub_departments_updated_at" BEFORE UPDATE ON "public"."sub_departments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_management_profiles_updated_at" BEFORE UPDATE ON "public"."user_management_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "sync_timesheet_hours_after_entry" AFTER INSERT OR DELETE OR UPDATE ON "public"."timesheet_entries" FOR EACH ROW EXECUTE FUNCTION "public"."sync_timesheet_total_hours"();



CREATE OR REPLACE TRIGGER "tr_email_approval_step" AFTER INSERT OR UPDATE ON "public"."payrun_approval_steps" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_email_handler"();



CREATE OR REPLACE TRIGGER "tr_email_notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW WHEN (("new"."type" = ANY (ARRAY['approval_request'::"text", 'security_alert'::"text", 'account_locked'::"text"]))) EXECUTE FUNCTION "public"."trigger_email_handler"();



CREATE OR REPLACE TRIGGER "tr_email_payrun_status" AFTER UPDATE ON "public"."pay_runs" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."trigger_email_handler"();



CREATE OR REPLACE TRIGGER "tr_payroll_approval_configs_updated_at" BEFORE UPDATE ON "public"."payroll_approval_configs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_payroll_config_updated_at"();



CREATE OR REPLACE TRIGGER "tr_workflow_version_snapshot" AFTER INSERT OR UPDATE ON "public"."approval_workflows" FOR EACH ROW EXECUTE FUNCTION "public"."create_workflow_version_snapshot"();



CREATE OR REPLACE TRIGGER "trg_audit_access_grants" AFTER INSERT OR DELETE OR UPDATE ON "public"."access_grants" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_audit_org_license_assignments" AFTER INSERT OR DELETE OR UPDATE ON "public"."org_license_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_audit_org_licenses" AFTER INSERT OR UPDATE ON "public"."org_licenses" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_audit_org_user_roles" AFTER INSERT OR DELETE ON "public"."org_user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_audit_org_users" AFTER INSERT OR DELETE OR UPDATE ON "public"."org_users" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_audit_rbac_assignments" AFTER INSERT OR DELETE OR UPDATE ON "public"."rbac_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_rbac_assignments"();



CREATE OR REPLACE TRIGGER "trg_audit_rbac_grants" AFTER INSERT OR UPDATE ON "public"."rbac_grants" FOR EACH ROW EXECUTE FUNCTION "public"."audit_rbac_grants"();



CREATE OR REPLACE TRIGGER "trg_audit_rbac_roles" AFTER INSERT OR DELETE OR UPDATE ON "public"."rbac_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_rbac_changes"();



CREATE OR REPLACE TRIGGER "trg_audit_user_company_memberships" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_company_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."log_access_control_audit"();



CREATE OR REPLACE TRIGGER "trg_create_project_onboarding_steps" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."create_project_onboarding_steps"();



CREATE OR REPLACE TRIGGER "trg_enforce_pay_run_security" BEFORE DELETE OR UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_pay_run_security"();



CREATE OR REPLACE TRIGGER "trg_enforce_unique_paygroup" BEFORE INSERT OR UPDATE ON "public"."paygroup_employees" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_unique_paygroup_assignment"();



CREATE OR REPLACE TRIGGER "trg_items_catalog_updated_at" BEFORE UPDATE ON "public"."items_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "trg_log_employee_number_change" AFTER UPDATE OF "employee_number" ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."log_employee_number_change"();



CREATE OR REPLACE TRIGGER "trg_set_employee_number_before_insert" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_employee_number_before_insert"();



CREATE OR REPLACE TRIGGER "trg_sync_legacy_pay_group_id" BEFORE INSERT OR UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_legacy_pay_group_id"();



CREATE OR REPLACE TRIGGER "trg_sync_pay_group_columns" BEFORE INSERT OR UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_pay_group_columns"();



CREATE OR REPLACE TRIGGER "trg_update_project_onboarding_steps" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_onboarding_steps"();



CREATE OR REPLACE TRIGGER "trg_validate_paygroup_employees_pay_group_id" BEFORE INSERT OR UPDATE ON "public"."paygroup_employees" FOR EACH ROW EXECUTE FUNCTION "public"."validate_paygroup_employees_pay_group_id"();



CREATE OR REPLACE TRIGGER "trg_validate_rbac_assignment" BEFORE INSERT OR UPDATE ON "public"."rbac_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_rbac_assignment"();



CREATE OR REPLACE TRIGGER "trg_validate_single_paygroup" BEFORE INSERT OR UPDATE ON "public"."paygroup_employees" FOR EACH ROW EXECUTE FUNCTION "public"."validate_single_paygroup_assignment"();



CREATE OR REPLACE TRIGGER "trg_variable_item_logs_updated_at" BEFORE UPDATE ON "public"."variable_item_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "trg_variable_pay_cycles_updated_at" BEFORE UPDATE ON "public"."variable_pay_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "trg_variable_pay_summaries_updated_at" BEFORE UPDATE ON "public"."variable_pay_summaries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "trg_variable_work_logs_updated_at" BEFORE UPDATE ON "public"."variable_work_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_now"();



CREATE OR REPLACE TRIGGER "update_banks_updated_at_trigger" BEFORE UPDATE ON "public"."banks" FOR EACH ROW EXECUTE FUNCTION "public"."update_banks_updated_at"();



CREATE OR REPLACE TRIGGER "update_benefits_updated_at" BEFORE UPDATE ON "public"."benefits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_settings_updated_at" BEFORE UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contract_templates_updated_at" BEFORE UPDATE ON "public"."contract_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_contracts_updated_at" BEFORE UPDATE ON "public"."employee_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_number_settings_updated_at" BEFORE UPDATE ON "public"."employee_number_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expatriate_policies_updated_at" BEFORE UPDATE ON "public"."expatriate_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_groups_updated_at" BEFORE UPDATE ON "public"."pay_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_items_updated_at" BEFORE UPDATE ON "public"."pay_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_runs_updated_at" BEFORE UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payslip_templates_updated_at" BEFORE UPDATE ON "public"."payslip_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_payslip_templates_updated_at"();



CREATE OR REPLACE TRIGGER "update_project_onboarding_steps_updated_at" BEFORE UPDATE ON "public"."project_onboarding_steps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_timesheet_entries_updated_at" BEFORE UPDATE ON "public"."timesheet_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_timesheets_updated_at" BEFORE UPDATE ON "public"."timesheets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_payrun_id_fkey" FOREIGN KEY ("payrun_id") REFERENCES "public"."pay_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "ippms"."ippms_attendance_records"
    ADD CONSTRAINT "ippms_attendance_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "ippms"."ippms_shifts"("id");



ALTER TABLE ONLY "ippms"."ippms_employee_shifts"
    ADD CONSTRAINT "ippms_employee_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_employee_shifts"
    ADD CONSTRAINT "ippms_employee_shifts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_employee_shifts"
    ADD CONSTRAINT "ippms_employee_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "ippms"."ippms_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_holidays"
    ADD CONSTRAINT "ippms_holidays_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ippms"."ippms_leave_requests"
    ADD CONSTRAINT "ippms_leave_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "ippms"."ippms_leave_requests"
    ADD CONSTRAINT "ippms_leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_leave_requests"
    ADD CONSTRAINT "ippms_leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "ippms"."ippms_leave_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "ippms"."ippms_leave_requests"
    ADD CONSTRAINT "ippms_leave_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_payrun_id_fkey" FOREIGN KEY ("payrun_id") REFERENCES "public"."pay_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "ippms"."ippms_piece_work_catalogue"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_piece_work_entries"
    ADD CONSTRAINT "ippms_piece_work_entries_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "ippms"."ippms_piece_work_rates"
    ADD CONSTRAINT "ippms_piece_work_rates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_piece_work_rates"
    ADD CONSTRAINT "ippms_piece_work_rates_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "ippms"."ippms_piece_work_catalogue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_piece_work_rates"
    ADD CONSTRAINT "ippms_piece_work_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_shifts"
    ADD CONSTRAINT "ippms_shifts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "ippms"."ippms_attendance_records"("id");



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_payrun_id_fkey" FOREIGN KEY ("payrun_id") REFERENCES "public"."pay_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_piece_entry_id_fkey" FOREIGN KEY ("piece_entry_id") REFERENCES "ippms"."ippms_piece_work_entries"("id");



ALTER TABLE ONLY "ippms"."ippms_work_days"
    ADD CONSTRAINT "ippms_work_days_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."org_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."alert_logs"
    ADD CONSTRAINT "alert_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_workflow_steps"
    ADD CONSTRAINT "approval_workflow_steps_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_workflow_steps"
    ADD CONSTRAINT "approval_workflow_steps_fallback_user_id_fkey" FOREIGN KEY ("fallback_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approval_workflow_steps"
    ADD CONSTRAINT "approval_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_workflow_versions"
    ADD CONSTRAINT "approval_workflow_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_workflow_versions"
    ADD CONSTRAINT "approval_workflow_versions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_workflows"
    ADD CONSTRAINT "approval_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_events"
    ADD CONSTRAINT "auth_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."auth_events"
    ADD CONSTRAINT "auth_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_unit_categories"
    ADD CONSTRAINT "company_unit_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."employee_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_unit_categories"
    ADD CONSTRAINT "company_unit_categories_company_unit_id_fkey" FOREIGN KEY ("company_unit_id") REFERENCES "public"."company_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_units"
    ADD CONSTRAINT "company_units_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."employee_categories"("id");



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_pay_run_items"
    ADD CONSTRAINT "contractor_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_pay_run_items"
    ADD CONSTRAINT "contractor_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_departments"
    ADD CONSTRAINT "departments_company_unit_id_fkey" FOREIGN KEY ("company_unit_id") REFERENCES "public"."company_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_event_key_fkey" FOREIGN KEY ("event_key") REFERENCES "public"."email_events"("key");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_triggers"
    ADD CONSTRAINT "email_triggers_event_key_fkey" FOREIGN KEY ("event_key") REFERENCES "public"."email_events"("key");



ALTER TABLE ONLY "public"."email_triggers"
    ADD CONSTRAINT "email_triggers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employee_categories"
    ADD CONSTRAINT "employee_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_contracts"
    ADD CONSTRAINT "employee_contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_contracts"
    ADD CONSTRAINT "employee_contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_contracts"
    ADD CONSTRAINT "employee_contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_number_history"
    ADD CONSTRAINT "employee_number_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_unit_id_fkey" FOREIGN KEY ("company_unit_id") REFERENCES "public"."company_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("sub_department_id") REFERENCES "public"."sub_departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_employee_type_id_fkey" FOREIGN KEY ("employee_type_id") REFERENCES "public"."employee_types"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expatriate_pay_run_item_allowances"
    ADD CONSTRAINT "expatriate_pay_run_item_allowan_expatriate_pay_run_item_id_fkey" FOREIGN KEY ("expatriate_pay_run_item_id") REFERENCES "public"."expatriate_pay_run_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_item_allowances"
    ADD CONSTRAINT "expatriate_pay_run_item_allowances_item_id_fkey" FOREIGN KEY ("expatriate_pay_run_item_id") REFERENCES "public"."expatriate_pay_run_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_expatriate_pay_group_id_fkey" FOREIGN KEY ("expatriate_pay_group_id") REFERENCES "public"."expatriate_pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "fk_companies_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_units"
    ADD CONSTRAINT "fk_company_units_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_groups"
    ADD CONSTRAINT "fk_expatriate_pay_groups_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "fk_expatriate_pay_run_items_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_groups"
    ADD CONSTRAINT "fk_pay_groups_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "fk_pay_items_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "fk_pay_runs_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "fk_pay_runs_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "fk_pay_runs_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."head_office_pay_group_company_units"
    ADD CONSTRAINT "head_office_pay_group_company_units_company_unit_id_fkey" FOREIGN KEY ("company_unit_id") REFERENCES "public"."company_units"("id");



ALTER TABLE ONLY "public"."head_office_pay_group_members"
    ADD CONSTRAINT "head_office_pay_group_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_group_members"
    ADD CONSTRAINT "head_office_pay_group_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."head_office_pay_groups_expatriates"
    ADD CONSTRAINT "head_office_pay_groups_expatriates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_expatriates"
    ADD CONSTRAINT "head_office_pay_groups_expatriates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_expatriates"
    ADD CONSTRAINT "head_office_pay_groups_expatriates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_interns"
    ADD CONSTRAINT "head_office_pay_groups_interns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_interns"
    ADD CONSTRAINT "head_office_pay_groups_interns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_interns"
    ADD CONSTRAINT "head_office_pay_groups_interns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_regular"
    ADD CONSTRAINT "head_office_pay_groups_regular_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_regular"
    ADD CONSTRAINT "head_office_pay_groups_regular_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_groups_regular"
    ADD CONSTRAINT "head_office_pay_groups_regular_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."head_office_pay_run_items"
    ADD CONSTRAINT "head_office_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."head_office_pay_run_items"
    ADD CONSTRAINT "head_office_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."head_office_pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."head_office_pay_runs"
    ADD CONSTRAINT "head_office_pay_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_runs"
    ADD CONSTRAINT "head_office_pay_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."head_office_pay_runs"
    ADD CONSTRAINT "head_office_pay_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_target_organization_id_fkey" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."impersonation_logs"
    ADD CONSTRAINT "impersonation_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."intern_pay_run_items"
    ADD CONSTRAINT "intern_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intern_pay_run_items"
    ADD CONSTRAINT "intern_pay_run_items_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."intern_pay_run_items"
    ADD CONSTRAINT "intern_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items_catalog"
    ADD CONSTRAINT "items_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items_catalog"
    ADD CONSTRAINT "items_catalog_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."local_pay_run_items"
    ADD CONSTRAINT "local_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."local_pay_run_items"
    ADD CONSTRAINT "local_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."lst_payment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_license_assignments"
    ADD CONSTRAINT "org_license_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_license_assignments"
    ADD CONSTRAINT "org_license_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_license_assignments"
    ADD CONSTRAINT "org_license_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_licenses"
    ADD CONSTRAINT "org_licenses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_roles"
    ADD CONSTRAINT "org_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_units"
    ADD CONSTRAINT "org_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_user_roles"
    ADD CONSTRAINT "org_user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_user_roles"
    ADD CONSTRAINT "org_user_roles_org_user_id_fkey" FOREIGN KEY ("org_user_id") REFERENCES "public"."org_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_user_roles"
    ADD CONSTRAINT "org_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."org_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_users"
    ADD CONSTRAINT "org_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_security_settings"
    ADD CONSTRAINT "organization_security_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_default_company_id_fkey" FOREIGN KEY ("default_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_group_master"
    ADD CONSTRAINT "pay_group_master_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_groups"
    ADD CONSTRAINT "pay_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pay_item_custom_deductions"
    ADD CONSTRAINT "pay_item_custom_deductions_pay_item_id_fkey" FOREIGN KEY ("pay_item_id") REFERENCES "public"."pay_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_approval_submitted_by_fkey" FOREIGN KEY ("approval_submitted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pay_group_master_id_fkey" FOREIGN KEY ("pay_group_master_id") REFERENCES "public"."pay_group_master"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_pay_group_master_id_fkey" FOREIGN KEY ("pay_group_master_id") REFERENCES "public"."pay_group_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_approval_categories"
    ADD CONSTRAINT "payroll_approval_categories_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."payroll_approval_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_approval_configs"
    ADD CONSTRAINT "payroll_approval_configs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id");



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_actioned_by_fkey" FOREIGN KEY ("actioned_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_delegated_by_fkey" FOREIGN KEY ("delegated_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_original_approver_id_fkey" FOREIGN KEY ("original_approver_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_override_by_fkey" FOREIGN KEY ("override_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payrun_approval_steps"
    ADD CONSTRAINT "payrun_approval_steps_payrun_id_fkey" FOREIGN KEY ("payrun_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."payslip_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_templates"
    ADD CONSTRAINT "payslip_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_cache"
    ADD CONSTRAINT "permission_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admin_devices"
    ADD CONSTRAINT "platform_admin_devices_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_email_settings"
    ADD CONSTRAINT "platform_email_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."probation_reminder_logs"
    ADD CONSTRAINT "probation_reminder_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."probation_reminder_logs"
    ADD CONSTRAINT "probation_reminder_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_onboarding_steps"
    ADD CONSTRAINT "project_onboarding_steps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_role_fkey" FOREIGN KEY ("role_code", "org_id") REFERENCES "public"."rbac_roles"("code", "org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_assignments"
    ADD CONSTRAINT "rbac_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_grants"
    ADD CONSTRAINT "rbac_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rbac_grants"
    ADD CONSTRAINT "rbac_grants_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."rbac_permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_grants"
    ADD CONSTRAINT "rbac_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."rbac_permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_role_permissions"
    ADD CONSTRAINT "rbac_role_permissions_role_fkey" FOREIGN KEY ("role_code", "org_id") REFERENCES "public"."rbac_roles"("code", "org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rbac_roles"
    ADD CONSTRAINT "rbac_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_email_settings"
    ADD CONSTRAINT "tenant_email_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timesheet_departments"
    ADD CONSTRAINT "timesheet_departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_linked_pay_run_id_fkey" FOREIGN KEY ("linked_pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_company_memberships"
    ADD CONSTRAINT "user_company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_company_memberships"
    ADD CONSTRAINT "user_company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invites"
    ADD CONSTRAINT "user_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_invites"
    ADD CONSTRAINT "user_invites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."user_management_invitations"
    ADD CONSTRAINT "user_management_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."pay_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variable_item_logs"
    ADD CONSTRAINT "variable_item_logs_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."items_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variable_item_logs"
    ADD CONSTRAINT "variable_item_logs_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."variable_pay_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_item_logs"
    ADD CONSTRAINT "variable_item_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_item_logs"
    ADD CONSTRAINT "variable_item_logs_work_log_id_fkey" FOREIGN KEY ("work_log_id") REFERENCES "public"."variable_work_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_pay_cycles"
    ADD CONSTRAINT "variable_pay_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_pay_cycles"
    ADD CONSTRAINT "variable_pay_cycles_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variable_pay_cycles"
    ADD CONSTRAINT "variable_pay_cycles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variable_pay_summaries"
    ADD CONSTRAINT "variable_pay_summaries_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."variable_pay_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_pay_summaries"
    ADD CONSTRAINT "variable_pay_summaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_work_logs"
    ADD CONSTRAINT "variable_work_logs_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."variable_pay_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variable_work_logs"
    ADD CONSTRAINT "variable_work_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE "ippms"."ippms_attendance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_attendance_select_self" ON "ippms"."ippms_attendance_records" FOR SELECT USING (("ippms"."is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "ippms_attendance_records"."employee_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ippms_attendance_write_admin" ON "ippms"."ippms_attendance_records" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_employee_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_employee_shifts_read" ON "ippms"."ippms_employee_shifts" FOR SELECT USING (("ippms"."is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "ippms_employee_shifts"."employee_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ippms_employee_shifts_write" ON "ippms"."ippms_employee_shifts" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_holidays" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_holidays_read" ON "ippms"."ippms_holidays" FOR SELECT USING (true);



CREATE POLICY "ippms_holidays_write" ON "ippms"."ippms_holidays" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_leave_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_leave_requests_select" ON "ippms"."ippms_leave_requests" FOR SELECT USING (("ippms"."is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "ippms_leave_requests"."employee_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ippms_leave_requests_write" ON "ippms"."ippms_leave_requests" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_leave_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_leave_types_read" ON "ippms"."ippms_leave_types" FOR SELECT USING (true);



CREATE POLICY "ippms_leave_types_write" ON "ippms"."ippms_leave_types" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "ippms_piece_catalogue_read" ON "ippms"."ippms_piece_work_catalogue" FOR SELECT USING (true);



CREATE POLICY "ippms_piece_catalogue_write" ON "ippms"."ippms_piece_work_catalogue" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "ippms_piece_entries_select_self" ON "ippms"."ippms_piece_work_entries" FOR SELECT USING (("ippms"."is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "ippms_piece_work_entries"."employee_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ippms_piece_entries_write_admin" ON "ippms"."ippms_piece_work_entries" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "ippms_piece_rates_read" ON "ippms"."ippms_piece_work_rates" FOR SELECT USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "ippms_piece_rates_write" ON "ippms"."ippms_piece_work_rates" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_piece_work_catalogue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ippms"."ippms_piece_work_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ippms"."ippms_piece_work_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ippms"."ippms_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_shifts_read" ON "ippms"."ippms_shifts" FOR SELECT USING (true);



CREATE POLICY "ippms_shifts_write" ON "ippms"."ippms_shifts" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "ippms"."ippms_work_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ippms_work_days_select_self" ON "ippms"."ippms_work_days" FOR SELECT USING (("ippms"."is_privileged"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "ippms_work_days"."employee_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ippms_work_days_write_admin" ON "ippms"."ippms_work_days" USING (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (("ippms"."is_privileged"() OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Admin access to alert logs" ON "public"."alert_logs" USING (true);



CREATE POLICY "Admin access to alert rules" ON "public"."alert_rules" USING (true);



CREATE POLICY "Admin access to attendance records" ON "public"."attendance_records" USING (true);



CREATE POLICY "Admin access to audit logs" ON "public"."audit_logs" USING (true);



CREATE POLICY "Admin access to integration data" ON "public"."integration_tokens" USING (true);



CREATE POLICY "Admin access to integration health" ON "public"."integration_health" USING (true);



CREATE POLICY "Admin access to notification channels" ON "public"."notification_channels" USING (true);



CREATE POLICY "Admin access to sync configurations" ON "public"."sync_configurations" USING (true);



CREATE POLICY "Admin access to sync logs" ON "public"."sync_logs" USING (true);



CREATE POLICY "Admins and HR can view invitations" ON "public"."user_management_invitations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'hr'::"text", 'super_admin'::"text", 'org_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Admins and Inviter can update invites (revoke)" ON "public"."user_invites" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."platform_admins"
  WHERE (("platform_admins"."auth_user_id" = "auth"."uid"()) AND ("platform_admins"."allowed" = true)))) OR (("tenant_id" IS NOT NULL) AND "public"."is_org_admin"("tenant_id")) OR ("inviter_id" = "auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."platform_admins"
  WHERE (("platform_admins"."auth_user_id" = "auth"."uid"()) AND ("platform_admins"."allowed" = true)))) OR (("tenant_id" IS NOT NULL) AND "public"."is_org_admin"("tenant_id")) OR ("inviter_id" = "auth"."uid"())));



CREATE POLICY "Admins can delete invites" ON "public"."user_invites" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admins can insert invites" ON "public"."user_invites" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Admins can manage categories" ON "public"."employee_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['ORG_ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))));



CREATE POLICY "Admins can manage role assignments" ON "public"."rbac_assignments" USING ("public"."has_permission"("auth"."uid"(), 'admin.assign_roles'::"text"));



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view all invites" ON "public"."user_invites" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admins can view all role assignments" ON "public"."role_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view all sessions" ON "public"."user_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Allow Org Admins to Insert Memberships" ON "public"."user_company_memberships" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text", 'org_admin'::"text", 'org_owner'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"))))));



CREATE POLICY "Allow all access to benefits" ON "public"."benefits" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to company settings" ON "public"."company_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to employee_number_settings" ON "public"."employee_number_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to employees" ON "public"."employees" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to expatriate policies" ON "public"."expatriate_policies" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to expatriate_pay_run_item_allowances" ON "public"."expatriate_pay_run_item_allowances" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay groups" ON "public"."pay_groups" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay items" ON "public"."pay_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay runs" ON "public"."pay_runs" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay_item_custom_deductions" ON "public"."pay_item_custom_deductions" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to project_onboarding_steps" ON "public"."project_onboarding_steps" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to projects" ON "public"."projects" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all authenticated users to read countries" ON "public"."countries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to create company units" ON "public"."company_units" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert companies" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to manage paygroup employees" ON "public"."paygroup_employees" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to manage payroll configs" ON "public"."payroll_configurations" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to read companies" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read company units" ON "public"."company_units" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read countries" ON "public"."countries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update companies" ON "public"."companies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update company units" ON "public"."company_units" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view paygroup employees" ON "public"."paygroup_employees" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to view payroll configs" ON "public"."payroll_configurations" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Approval Steps Readable by Relevant Users" ON "public"."payrun_approval_steps" FOR SELECT TO "authenticated" USING (("public"."check_is_org_admin"("auth"."uid"()) OR ("approver_user_id" = "auth"."uid"()) OR ("original_approver_id" = "auth"."uid"()) OR ("payrun_id" IN ( SELECT "pay_runs"."id"
   FROM "public"."pay_runs"
  WHERE ("pay_runs"."created_by" = "auth"."uid"())))));



CREATE POLICY "Approvers Can Act on Their Steps" ON "public"."payrun_approval_steps" FOR UPDATE TO "authenticated" USING ((("approver_user_id" = "auth"."uid"()) OR "public"."check_is_org_admin"("auth"."uid"()))) WITH CHECK ((("approver_user_id" = "auth"."uid"()) OR "public"."check_is_org_admin"("auth"."uid"())));



CREATE POLICY "Authenticated users can delete categories" ON "public"."company_unit_categories" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert banks" ON "public"."banks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert categories" ON "public"."company_unit_categories" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can update banks" ON "public"."banks" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view audit logs" ON "public"."pay_calculation_audit_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view banks" ON "public"."banks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view categories" ON "public"."company_unit_categories" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Categories Managed by Admins" ON "public"."payroll_approval_categories" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Categories Readable by Org Members" ON "public"."payroll_approval_categories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payroll_approval_configs" "c"
  WHERE (("c"."id" = "payroll_approval_categories"."config_id") AND ("c"."organization_id" IN ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
        UNION
         SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))))));



CREATE POLICY "Categories mapping manageable by admins" ON "public"."payroll_approval_categories" USING ((("config_id" IN ( SELECT "payroll_approval_configs"."id"
   FROM "public"."payroll_approval_configs"
  WHERE ("payroll_approval_configs"."organization_id" IN ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))) AND ("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"()))));



CREATE POLICY "Categories mapping viewable by org members" ON "public"."payroll_approval_categories" FOR SELECT USING (("config_id" IN ( SELECT "payroll_approval_configs"."id"
   FROM "public"."payroll_approval_configs"
  WHERE ("payroll_approval_configs"."organization_id" IN ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Configs Managed by Admins" ON "public"."payroll_approval_configs" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Configs Readable by Org Members" ON "public"."payroll_approval_configs" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
UNION
 SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Configs are manageable by admins" ON "public"."payroll_approval_configs" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Configs are viewable by org members" ON "public"."payroll_approval_configs" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Employees can manage own entries" ON "public"."timesheet_entries" USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))) WITH CHECK (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



CREATE POLICY "Employees can manage own timesheets" ON "public"."timesheets" USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))) WITH CHECK (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



CREATE POLICY "Enable delete access for authenticated users" ON "public"."sub_departments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."contractor_pay_run_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_groups" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_run_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."intern_pay_run_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."local_pay_run_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."sub_departments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."contractor_pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_groups" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."intern_pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."local_pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_groups" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_run_items" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."contractor_pay_run_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."expatriate_pay_run_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."intern_pay_run_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."local_pay_run_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."sub_departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."sub_departments" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."contractor_pay_run_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_groups" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_run_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."intern_pay_run_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."local_pay_run_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Everyone can read email events" ON "public"."email_events" FOR SELECT USING (true);



CREATE POLICY "Everyone can read placeholders" ON "public"."email_placeholders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Manage HO Company Units" ON "public"."head_office_pay_group_company_units" TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['Super Admin'::"text", 'Organization Admin'::"text", 'Payroll Manager'::"text"])) AND ((EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_regular"
  WHERE (("head_office_pay_groups_regular"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_regular"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_interns"
  WHERE (("head_office_pay_groups_interns"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_interns"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_expatriates"
  WHERE (("head_office_pay_groups_expatriates"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_expatriates"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))))));



CREATE POLICY "Manage HO Payruns" ON "public"."head_office_pay_runs" TO "authenticated" USING (((("organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text")) AND (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['Super Admin'::"text", 'Organization Admin'::"text", 'Payroll Manager'::"text"]))));



CREATE POLICY "Org Admins can view profiles in their organization" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("organization_id" IS NOT NULL) AND "public"."is_org_admin"("organization_id"))));



CREATE POLICY "Org Admins manage their settings" ON "public"."tenant_email_settings" USING ("public"."is_org_admin"("org_id")) WITH CHECK ("public"."is_org_admin"("org_id"));



CREATE POLICY "Org Admins manage triggers" ON "public"."email_triggers" USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "Org Admins update own templates" ON "public"."email_templates" FOR UPDATE USING ((("org_id" IS NOT NULL) AND "public"."is_org_admin"("org_id")));



CREATE POLICY "Org Admins view own logs" ON "public"."email_outbox" FOR SELECT USING ("public"."is_org_admin"("org_id"));



CREATE POLICY "Org Admins write own templates" ON "public"."email_templates" FOR INSERT WITH CHECK ((("org_id" IS NOT NULL) AND "public"."is_org_admin"("org_id")));



CREATE POLICY "Org Settings Readable by Org Members" ON "public"."org_settings" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Org Settings Start/Update by Super Admin Only" ON "public"."org_settings" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"()))) WITH CHECK (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Org admins can manage contracts" ON "public"."employee_contracts" USING ("public"."is_org_admin"("organization_id")) WITH CHECK ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Org admins can manage departments" ON "public"."timesheet_departments" USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Org admins can manage templates" ON "public"."contract_templates" USING ("public"."is_org_admin"("organization_id")) WITH CHECK ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Org admins can update timesheets" ON "public"."timesheets" FOR UPDATE USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Org admins can view all entries" ON "public"."timesheet_entries" FOR SELECT USING (("timesheet_id" IN ( SELECT "t"."id"
   FROM ("public"."timesheets" "t"
     JOIN "public"."user_profiles" "up" ON (("up"."organization_id" = "t"."organization_id")))
  WHERE ("up"."id" = "auth"."uid"()))));



CREATE POLICY "Org admins can view all timesheets" ON "public"."timesheets" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Org members can read departments" ON "public"."timesheet_departments" FOR SELECT USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Org members can view contracts" ON "public"."employee_contracts" FOR SELECT USING (("organization_id" = "public"."current_org_id"()));



CREATE POLICY "Org members can view templates" ON "public"."contract_templates" FOR SELECT USING (("organization_id" = "public"."current_org_id"()));



CREATE POLICY "Organization admins can view organization users" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."check_is_org_super_admin"("auth"."uid"()) AND ("organization_id" = "public"."get_user_organization_id"("auth"."uid"()))));



CREATE POLICY "Platform admins readable by platform admins" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."platform_admins" "platform_admins_1"
  WHERE (("platform_admins_1"."auth_user_id" = "auth"."uid"()) AND ("platform_admins_1"."allowed" = true))))));



CREATE POLICY "Service role can insert audit logs" ON "public"."pay_calculation_audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Sub-Department managers can view sub-department users" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."check_is_org_admin"("auth"."uid"()) AND (("sub_department_id")::"text" = "public"."get_user_sub_department_id"("auth"."uid"()))));



CREATE POLICY "Super admins can manage all roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can view all rbac assignments" ON "public"."rbac_assignments" TO "authenticated" USING ("public"."check_is_super_admin"("auth"."uid"()));



CREATE POLICY "Super admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can view all users" ON "public"."users" TO "authenticated" USING ("public"."check_is_super_admin"("auth"."uid"()));



CREATE POLICY "System can manage permission cache" ON "public"."permission_cache" USING (true);



CREATE POLICY "Templates managed by Org Admins" ON "public"."notification_templates" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Templates readable by Org Members" ON "public"."notification_templates" FOR SELECT TO "authenticated" USING ((("org_id" IS NULL) OR ("org_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())
UNION
 SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own payslip templates" ON "public"."payslip_templates" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own settings" ON "public"."settings" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert payslip generations" ON "public"."payslip_generations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own payslip templates" ON "public"."payslip_templates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."settings" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own legacy role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own rbac assignments" ON "public"."rbac_assignments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own payslip templates" ON "public"."payslip_templates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."settings" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view categories for their organization" ON "public"."employee_categories" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payslip generations for their templates" ON "public"."payslip_generations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payslip_templates"
  WHERE (("payslip_templates"."id" = "payslip_generations"."template_id") AND ("payslip_templates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own payslip templates" ON "public"."payslip_templates" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own permission cache" ON "public"."permission_cache" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own role assignments" ON "public"."rbac_assignments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_permission"("auth"."uid"(), 'admin.manage_users'::"text")));



CREATE POLICY "Users can view their own role assignments" ON "public"."role_assignments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."settings" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "View HO Company Units" ON "public"."head_office_pay_group_company_units" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_regular"
  WHERE (("head_office_pay_groups_regular"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_regular"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_interns"
  WHERE (("head_office_pay_groups_interns"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_interns"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."head_office_pay_groups_expatriates"
  WHERE (("head_office_pay_groups_expatriates"."id" = "head_office_pay_group_company_units"."pay_group_id") AND (("head_office_pay_groups_expatriates"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text")))))));



CREATE POLICY "View HO Payrun Items" ON "public"."head_office_pay_run_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."head_office_pay_runs"
  WHERE (("head_office_pay_runs"."id" = "head_office_pay_run_items"."pay_run_id") AND (("head_office_pay_runs"."organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text"))))));



CREATE POLICY "View HO Payruns" ON "public"."head_office_pay_runs" FOR SELECT USING ((("organization_id")::"text" = ("auth"."jwt"() ->> 'org_id'::"text")));



CREATE POLICY "Workflow Steps Managed by Super Admins" ON "public"."approval_workflow_steps" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Workflow Steps Readable by Org Members" ON "public"."approval_workflow_steps" FOR SELECT TO "authenticated" USING (("workflow_id" IN ( SELECT "approval_workflows"."id"
   FROM "public"."approval_workflows"
  WHERE ("approval_workflows"."org_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "Workflow Versions Managed by Admins" ON "public"."approval_workflow_versions" FOR INSERT TO "authenticated" WITH CHECK (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Workflow Versions Readable by Org Members" ON "public"."approval_workflow_versions" FOR SELECT TO "authenticated" USING (("workflow_id" IN ( SELECT "approval_workflows"."id"
   FROM "public"."approval_workflows"
  WHERE ("approval_workflows"."org_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "Workflows Managed by Super Admins" ON "public"."approval_workflows" TO "authenticated" USING (("public"."check_is_super_admin"("auth"."uid"()) OR "public"."check_is_org_super_admin"("auth"."uid"())));



CREATE POLICY "Workflows Readable by Org Members" ON "public"."approval_workflows" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."access_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_insert_authenticated" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "activity_logs_insert_policy" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "admin_write_employee_types" ON "public"."employee_types" TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."alert_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_workflow_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_workflow_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_workflows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_events_insert_policy" ON "public"."auth_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated_read_employee_types" ON "public"."employee_types" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."benefits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleanup_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cleanup_logs_platform_admin_select" ON "public"."cleanup_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."platform_admins" "pa"
  WHERE (("pa"."allowed" = true) AND (("pa"."auth_user_id" = "auth"."uid"()) OR ("lower"("pa"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))))))));



CREATE POLICY "cleanup_logs_service_role_all" ON "public"."cleanup_logs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_select_policy" ON "public"."companies" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'organization_id'::"text"))::"uuid") AND "public"."has_permission"('companies.view'::"text", 'COMPANY'::"text", "id"))));



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_unit_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_units_select_by_membership" ON "public"."company_units" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_company_memberships" "m"
  WHERE (("m"."company_id" = "company_units"."company_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."contract_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."database_health_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "database_health_log_admin_select" ON "public"."database_health_log" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "database_health_log_service_insert" ON "public"."database_health_log" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'service'::"text") = 'internal'::"text"));



CREATE POLICY "delete paygroup_employees" ON "public"."paygroup_employees" FOR DELETE USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."email_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_placeholders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_triggers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_number_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_number_history_all" ON "public"."employee_number_history" USING (true) WITH CHECK (true);



ALTER TABLE "public"."employee_number_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_number_settings_all" ON "public"."employee_number_settings" USING (true) WITH CHECK (true);



ALTER TABLE "public"."employee_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_select_by_membership" ON "public"."employees" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_company_memberships" "m"
  WHERE (("m"."company_id" = "employees"."company_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "employees_select_policy" ON "public"."employees" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'organization_id'::"text"))::"uuid") AND ("public"."has_permission"('people.view'::"text", 'ORGANIZATION'::"text", "organization_id") OR (("company_id" IS NOT NULL) AND "public"."has_permission"('people.view'::"text", 'COMPANY'::"text", "company_id"))))));



ALTER TABLE "public"."expatriate_pay_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_pay_run_item_allowances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_group_company_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_groups_expatriates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_groups_interns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_groups_regular" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."head_office_pay_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ho_membership_manage_policy" ON "public"."head_office_pay_group_members" TO "authenticated" USING (("public"."is_platform_admin"() OR ("public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "public"."get_auth_org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "head_office_pay_group_members"."employee_id") AND ("e"."organization_id" = "public"."get_auth_org_id"()))))))) WITH CHECK (("public"."is_platform_admin"() OR ("public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "public"."get_auth_org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "head_office_pay_group_members"."employee_id") AND ("e"."organization_id" = "public"."get_auth_org_id"())))))));



CREATE POLICY "ho_membership_select_policy" ON "public"."head_office_pay_group_members" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."id" = "head_office_pay_group_members"."employee_id") AND ("e"."organization_id" = "public"."get_auth_org_id"()) AND ("public"."has_permission"('people.view'::"text", 'ORGANIZATION'::"text", "e"."organization_id") OR "public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "e"."organization_id")))))));



CREATE POLICY "ho_pg_expatriates_manage_policy" ON "public"."head_office_pay_groups_expatriates" TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = "public"."get_auth_org_id"()) AND "public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "organization_id"))));



CREATE POLICY "ho_pg_expatriates_select_policy" ON "public"."head_office_pay_groups_expatriates" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR ("organization_id" = "public"."get_auth_org_id"())));



CREATE POLICY "ho_pg_interns_manage_policy" ON "public"."head_office_pay_groups_interns" TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = "public"."get_auth_org_id"()) AND "public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "organization_id"))));



CREATE POLICY "ho_pg_interns_select_policy" ON "public"."head_office_pay_groups_interns" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR ("organization_id" = "public"."get_auth_org_id"())));



CREATE POLICY "ho_pg_regular_manage_policy" ON "public"."head_office_pay_groups_regular" TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = "public"."get_auth_org_id"()) AND "public"."has_permission"('payroll.prepare'::"text", 'ORGANIZATION'::"text", "organization_id"))));



CREATE POLICY "ho_pg_regular_select_policy" ON "public"."head_office_pay_groups_regular" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR ("organization_id" = "public"."get_auth_org_id"())));



ALTER TABLE "public"."impersonation_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impersonation_logs_insert_super_admin_only" ON "public"."impersonation_logs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "impersonation_logs_select_super_admin_only" ON "public"."impersonation_logs" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "insert paygroup_employees" ON "public"."paygroup_employees" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."integration_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."intern_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_catalog_delete" ON "public"."items_catalog" FOR DELETE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "items_catalog_insert" ON "public"."items_catalog" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "items_catalog_select" ON "public"."items_catalog" FOR SELECT USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "items_catalog_update" ON "public"."items_catalog" FOR UPDATE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



ALTER TABLE "public"."local_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lst_employee_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lst_employee_assignments_no_client_write" ON "public"."lst_employee_assignments" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "lst_employee_assignments_select_authenticated" ON "public"."lst_employee_assignments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."is_active" = true)))));



ALTER TABLE "public"."lst_payment_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lst_payment_plans_no_client_write" ON "public"."lst_payment_plans" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "lst_payment_plans_select_public" ON "public"."lst_payment_plans" FOR SELECT USING (true);



ALTER TABLE "public"."notification_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_admins_hr_read_user_management_profiles" ON "public"."user_management_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'hr'::"text", 'super_admin'::"text"]))))));



ALTER TABLE "public"."org_license_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_licenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_members_view_reminder_logs" ON "public"."probation_reminder_logs" FOR SELECT TO "authenticated" USING (("organization_id" = "public"."current_org_id"()));



CREATE POLICY "org_mutate_super_admin_only" ON "public"."organizations" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."org_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_select_member_or_super_admin" ON "public"."organizations" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text") OR ("id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid") OR ("id" IN ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())))));



ALTER TABLE "public"."org_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select_policy" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR "public"."has_permission"('organizations.view'::"text", 'ORGANIZATION'::"text", "id")));



ALTER TABLE "public"."pay_calculation_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_group_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_item_custom_deductions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pay_runs_select_by_org_claim" ON "public"."pay_runs" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'org_id'::"text") IS NOT NULL) AND ((("auth"."jwt"() ->> 'org_id'::"text"))::"uuid" = "organization_id")));



CREATE POLICY "pay_runs_select_policy" ON "public"."pay_runs" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'organization_id'::"text"))::"uuid") AND "public"."has_permission"('payroll.view'::"text", 'ORGANIZATION'::"text", "organization_id"))));



ALTER TABLE "public"."paygroup_employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_approval_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_approval_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payrun_approval_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payrun_employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payrun_employees_no_client_write" ON "public"."payrun_employees" TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "payrun_employees_select_authenticated" ON "public"."payrun_employees" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."is_active" = true)))));



ALTER TABLE "public"."payslip_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payslip_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pgm_delete" ON "public"."pay_group_master" FOR DELETE USING (true);



CREATE POLICY "pgm_insert" ON "public"."pay_group_master" FOR INSERT WITH CHECK (true);



CREATE POLICY "pgm_select" ON "public"."pay_group_master" FOR SELECT USING (true);



CREATE POLICY "pgm_update" ON "public"."pay_group_master" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."platform_admin_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_email_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."probation_reminder_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_onboarding_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_select_policy" ON "public"."projects" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR (("organization_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'organization_id'::"text"))::"uuid") AND "public"."has_permission"('projects.view'::"text", 'PROJECT'::"text", "id"))));



ALTER TABLE "public"."rbac_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_assignments_select_policy" ON "public"."rbac_assignments" FOR SELECT TO "authenticated" USING (("public"."is_platform_admin"() OR ("user_id" = "auth"."uid"()) OR "public"."has_permission"('admin.manage_users'::"text", 'ORGANIZATION'::"text", "org_id")));



ALTER TABLE "public"."rbac_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rbac_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_permissions_delete" ON "public"."rbac_permissions" FOR DELETE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_permissions_insert" ON "public"."rbac_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_permissions_select" ON "public"."rbac_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_permissions_update" ON "public"."rbac_permissions" FOR UPDATE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



ALTER TABLE "public"."rbac_role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_role_permissions_delete" ON "public"."rbac_role_permissions" FOR DELETE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_role_permissions_insert" ON "public"."rbac_role_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_role_permissions_select" ON "public"."rbac_role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_role_permissions_update" ON "public"."rbac_role_permissions" FOR UPDATE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



ALTER TABLE "public"."rbac_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rbac_roles_delete" ON "public"."rbac_roles" FOR DELETE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_roles_insert" ON "public"."rbac_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_is_org_super_admin"("auth"."uid"()));



CREATE POLICY "rbac_roles_select" ON "public"."rbac_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rbac_roles_update" ON "public"."rbac_roles" FOR UPDATE TO "authenticated" USING ("public"."check_is_org_super_admin"("auth"."uid"()));



ALTER TABLE "public"."role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_manage_reminder_logs" ON "public"."probation_reminder_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_manage_user_management_profiles" ON "public"."user_management_profiles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_email_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheet_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheet_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ucm_admin_delete" ON "public"."user_company_memberships" FOR DELETE TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"))))));



CREATE POLICY "ucm_admin_insert" ON "public"."user_company_memberships" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"))))));



CREATE POLICY "ucm_admin_update" ON "public"."user_company_memberships" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid")))))) WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"))))));



CREATE POLICY "ucm_manage_org_admin" ON "public"."user_company_memberships" TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid")))))) WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['super_admin'::"text", 'organization_admin'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "user_company_memberships"."company_id") AND ("c"."organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid"))))));



CREATE POLICY "ucm_select_own" ON "public"."user_company_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "update paygroup_employees" ON "public"."paygroup_employees" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."user_company_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_management_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_management_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_mutate_own_or_super_admin" ON "public"."user_profiles" TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text") OR ("id" = "auth"."uid"()))) WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text") OR ("id" = "auth"."uid"())));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."variable_item_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variable_item_logs_delete" ON "public"."variable_item_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_item_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_item_logs_insert" ON "public"."variable_item_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_item_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_item_logs_select" ON "public"."variable_item_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_item_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_item_logs_update" ON "public"."variable_item_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_item_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "public"."variable_pay_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variable_pay_cycles_delete" ON "public"."variable_pay_cycles" FOR DELETE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "variable_pay_cycles_insert" ON "public"."variable_pay_cycles" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "variable_pay_cycles_select" ON "public"."variable_pay_cycles" FOR SELECT USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "variable_pay_cycles_update" ON "public"."variable_pay_cycles" FOR UPDATE USING (("organization_id" = ( SELECT "user_profiles"."organization_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = "auth"."uid"())
 LIMIT 1)));



ALTER TABLE "public"."variable_pay_summaries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variable_pay_summaries_insert" ON "public"."variable_pay_summaries" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_pay_summaries"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_pay_summaries_select" ON "public"."variable_pay_summaries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_pay_summaries"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_pay_summaries_update" ON "public"."variable_pay_summaries" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_pay_summaries"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



ALTER TABLE "public"."variable_work_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "variable_work_logs_delete" ON "public"."variable_work_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_work_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_work_logs_insert" ON "public"."variable_work_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_work_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_work_logs_select" ON "public"."variable_work_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_work_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "variable_work_logs_update" ON "public"."variable_work_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."variable_pay_cycles" "vpc"
  WHERE (("vpc"."id" = "variable_work_logs"."cycle_id") AND ("vpc"."organization_id" = ( SELECT "user_profiles"."organization_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."id" = "auth"."uid"())
         LIMIT 1))))));



CREATE POLICY "view paygroup_employees" ON "public"."paygroup_employees" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))) OR ("assigned_by" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





















































































































































































































GRANT ALL ON FUNCTION "public"."activate_invited_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."activate_invited_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_invited_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_rbac_assignments"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_rbac_assignments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_rbac_assignments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_rbac_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_rbac_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_rbac_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_rbac_grants"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_rbac_grants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_rbac_grants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_perform_action"("p_org_id" "uuid", "p_company_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_perform_action"("p_org_id" "uuid", "p_company_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_perform_action"("p_org_id" "uuid", "p_company_id" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_org_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_org_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_org_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_org_super_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_super_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_super_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_super_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_project_onboarding_steps"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_project_onboarding_steps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_project_onboarding_steps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_workflow_version_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_workflow_version_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_version_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delegate_approval_step"("payrun_id_input" "uuid", "new_approver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delegate_approval_step"("payrun_id_input" "uuid", "new_approver_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delegate_approval_step"("payrun_id_input" "uuid", "new_approver_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_pay_run_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_pay_run_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_pay_run_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_sub_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid", "in_prefix_override" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_sub_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid", "in_prefix_override" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_sub_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid", "in_prefix_override" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_total_payroll"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_total_payroll"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_total_payroll"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_diagnostic_data"("_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_diagnostic_data"("_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_diagnostic_data"("_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_id"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_organization"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_sub_department_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_sub_department_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_sub_department_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payroll_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payroll_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payroll_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_org_role"("p_org_id" "uuid", "p_role_keys" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_org_role"("p_org_id" "uuid", "p_role_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_org_role"("p_org_id" "uuid", "p_role_keys" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_company_membership"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_company_membership"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_company_membership"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_grant"("p_org_id" "uuid", "p_scope_type" "text", "p_scope_key" "text", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_grant"("p_org_id" "uuid", "p_scope_type" "text", "p_scope_key" "text", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_grant"("p_org_id" "uuid", "p_scope_type" "text", "p_scope_key" "text", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_role_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_role_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_role_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_user_id" "uuid", "p_permission_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text", "_scope_id" "uuid", "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text", "_scope_id" "uuid", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("_permission_key" "text", "_scope_type" "text", "_scope_id" "uuid", "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_failed_login_attempts"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_failed_login_attempts"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_failed_login_attempts"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer, "p_older_than_days" integer, "p_tenant_id" "uuid", "p_require_expired" boolean, "p_include_auth_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer, "p_older_than_days" integer, "p_tenant_id" "uuid", "p_require_expired" boolean, "p_include_auth_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer, "p_older_than_days" integer, "p_tenant_id" "uuid", "p_require_expired" boolean, "p_include_auth_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_cleanup_candidates"("p_limit" integer, "p_older_than_days" integer, "p_tenant_id" "uuid", "p_require_expired" boolean, "p_include_auth_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_cleanup_find_protected_fk_ref"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_apply_holiday"("p_project_id" "uuid", "p_holiday_date" "date", "p_name" "text", "p_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_apply_leave"("p_employee_id" "uuid", "p_project_id" "uuid", "p_leave_type_id" "uuid", "p_start" "date", "p_end" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_assign_shift"("p_employee_id" "uuid", "p_project_id" "uuid", "p_shift_id" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_daily_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_generate_attendance_template"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_generate_attendance_template"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_generate_attendance_template"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_generate_piecework_template"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_generate_piecework_template"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_generate_piecework_template"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_get_attendance"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_get_piece_entries"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_get_shifts"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_get_shifts"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_get_shifts"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_get_work_days"("p_project_id" "uuid", "p_start" "date", "p_end" "date", "p_employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_import_attendance_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_import_piecework_template"("p_project_id" "uuid", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_lock_daily_payrun"("p_payrun_id" "uuid", "p_work_day_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_lock_piece_payrun"("p_payrun_id" "uuid", "p_piece_entry_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_piece_payrun_rows"("p_project_id" "uuid", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_save_attendance_bulk"("p_project_id" "uuid", "p_records" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_save_piece_entries"("p_project_id" "uuid", "p_records" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") TO "anon";
GRANT ALL ON FUNCTION "public"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ippms_update_work_type"("p_employee_id" "uuid", "p_project_id" "uuid", "p_work_date" "date", "p_work_type" "ippms"."ippms_work_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_ho_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_ho_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ho_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_access_control_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_access_control_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_access_control_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("_notification_id" "uuid", "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("_notification_id" "uuid", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("_notification_id" "uuid", "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_payrun_step"("payrun_id_input" "uuid", "comments_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_failed_login_attempts"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_failed_login_attempts"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_failed_login_attempts"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."return_payrun_to_draft"("payrun_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."return_payrun_to_draft"("payrun_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."return_payrun_to_draft"("payrun_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_categories"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_categories"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_categories"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_now"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_payrun_for_approval"("payrun_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_payrun_for_approval"("payrun_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_payrun_for_approval"("payrun_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_legacy_pay_group_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_legacy_pay_group_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_legacy_pay_group_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_pay_group_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_pay_group_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_pay_group_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_rbac_to_auth_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_rbac_to_auth_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_rbac_to_auth_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_rbac_to_jwt"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_rbac_to_jwt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_rbac_to_jwt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_timesheet_total_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_timesheet_total_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_timesheet_total_hours"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_profile_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_profile_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_profile_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_email_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_email_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_email_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_banks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_banks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_banks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_onboarding_steps"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_onboarding_steps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_onboarding_steps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_pay_group_id"("pay_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pay_group_id"("pay_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pay_group_id"("pay_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_paygroup_employees_pay_group_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_paygroup_employees_pay_group_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_paygroup_employees_pay_group_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_rbac_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_rbac_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_rbac_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_single_paygroup_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_single_paygroup_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_single_paygroup_assignment"() TO "service_role";






























GRANT ALL ON TABLE "public"."access_grants" TO "anon";
GRANT ALL ON TABLE "public"."access_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."access_grants" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."alert_logs" TO "anon";
GRANT ALL ON TABLE "public"."alert_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_logs" TO "service_role";



GRANT ALL ON TABLE "public"."alert_rules" TO "anon";
GRANT ALL ON TABLE "public"."alert_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_rules" TO "service_role";



GRANT ALL ON TABLE "public"."approval_workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."approval_workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_workflow_steps" TO "service_role";



GRANT ALL ON TABLE "public"."approval_workflow_versions" TO "anon";
GRANT ALL ON TABLE "public"."approval_workflow_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_workflow_versions" TO "service_role";



GRANT ALL ON TABLE "public"."approval_workflows" TO "anon";
GRANT ALL ON TABLE "public"."approval_workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_workflows" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."auth_events" TO "anon";
GRANT ALL ON TABLE "public"."auth_events" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_events" TO "service_role";



GRANT ALL ON TABLE "public"."banks" TO "anon";
GRANT ALL ON TABLE "public"."banks" TO "authenticated";
GRANT ALL ON TABLE "public"."banks" TO "service_role";



GRANT ALL ON TABLE "public"."benefits" TO "anon";
GRANT ALL ON TABLE "public"."benefits" TO "authenticated";
GRANT ALL ON TABLE "public"."benefits" TO "service_role";



GRANT ALL ON TABLE "public"."cleanup_logs" TO "anon";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_unit_categories" TO "anon";
GRANT ALL ON TABLE "public"."company_unit_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."company_unit_categories" TO "service_role";



GRANT ALL ON TABLE "public"."company_units" TO "anon";
GRANT ALL ON TABLE "public"."company_units" TO "authenticated";
GRANT ALL ON TABLE "public"."company_units" TO "service_role";



GRANT ALL ON TABLE "public"."contract_templates" TO "anon";
GRANT ALL ON TABLE "public"."contract_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_templates" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."contractor_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."database_health_log" TO "anon";
GRANT ALL ON TABLE "public"."database_health_log" TO "authenticated";
GRANT ALL ON TABLE "public"."database_health_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_events" TO "anon";
GRANT ALL ON TABLE "public"."email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."email_events" TO "service_role";



GRANT ALL ON TABLE "public"."email_outbox" TO "anon";
GRANT ALL ON TABLE "public"."email_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."email_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."email_placeholders" TO "anon";
GRANT ALL ON TABLE "public"."email_placeholders" TO "authenticated";
GRANT ALL ON TABLE "public"."email_placeholders" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."email_triggers" TO "anon";
GRANT ALL ON TABLE "public"."email_triggers" TO "authenticated";
GRANT ALL ON TABLE "public"."email_triggers" TO "service_role";



GRANT ALL ON TABLE "public"."employee_categories" TO "anon";
GRANT ALL ON TABLE "public"."employee_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_categories" TO "service_role";



GRANT ALL ON TABLE "public"."employee_contracts" TO "anon";
GRANT ALL ON TABLE "public"."employee_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."employee_master" TO "anon";
GRANT ALL ON TABLE "public"."employee_master" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_master" TO "service_role";



GRANT ALL ON TABLE "public"."employee_number_history" TO "anon";
GRANT ALL ON TABLE "public"."employee_number_history" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_number_history" TO "service_role";



GRANT ALL ON TABLE "public"."employee_number_settings" TO "anon";
GRANT ALL ON TABLE "public"."employee_number_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_number_settings" TO "service_role";



GRANT ALL ON TABLE "public"."pay_groups" TO "anon";
GRANT ALL ON TABLE "public"."pay_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_groups" TO "service_role";



GRANT ALL ON TABLE "public"."paygroup_employees" TO "anon";
GRANT ALL ON TABLE "public"."paygroup_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."paygroup_employees" TO "service_role";



GRANT ALL ON TABLE "public"."employee_pay_groups" TO "anon";
GRANT ALL ON TABLE "public"."employee_pay_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_pay_groups" TO "service_role";



GRANT ALL ON TABLE "public"."employee_types" TO "anon";
GRANT ALL ON TABLE "public"."employee_types" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_types" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_pay_run_item_allowances" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_pay_run_item_allowances" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_pay_run_item_allowances" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_policies" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_policies" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_group_company_units" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_group_company_units" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_group_company_units" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_group_members" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_groups_expatriates" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_groups_expatriates" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_groups_expatriates" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_groups_interns" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_groups_interns" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_groups_interns" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_groups_regular" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_groups_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_groups_regular" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."head_office_pay_runs" TO "anon";
GRANT ALL ON TABLE "public"."head_office_pay_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."head_office_pay_runs" TO "service_role";



GRANT ALL ON TABLE "public"."impersonation_logs" TO "anon";
GRANT ALL ON TABLE "public"."impersonation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."impersonation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."integration_health" TO "anon";
GRANT ALL ON TABLE "public"."integration_health" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_health" TO "service_role";



GRANT ALL ON TABLE "public"."integration_tokens" TO "anon";
GRANT ALL ON TABLE "public"."integration_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."intern_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."intern_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."intern_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."items_catalog" TO "anon";
GRANT ALL ON TABLE "public"."items_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."items_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."local_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."local_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."local_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "anon";
GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."lst_payment_plans" TO "anon";
GRANT ALL ON TABLE "public"."lst_payment_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."lst_payment_plans" TO "service_role";



GRANT ALL ON TABLE "public"."pay_runs" TO "anon";
GRANT ALL ON TABLE "public"."pay_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_runs" TO "service_role";



GRANT ALL ON TABLE "public"."master_payrolls" TO "anon";
GRANT ALL ON TABLE "public"."master_payrolls" TO "authenticated";
GRANT ALL ON TABLE "public"."master_payrolls" TO "service_role";



GRANT ALL ON TABLE "public"."notification_channels" TO "anon";
GRANT ALL ON TABLE "public"."notification_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_channels" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."org_license_assignments" TO "anon";
GRANT ALL ON TABLE "public"."org_license_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."org_license_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."org_licenses" TO "anon";
GRANT ALL ON TABLE "public"."org_licenses" TO "authenticated";
GRANT ALL ON TABLE "public"."org_licenses" TO "service_role";



GRANT ALL ON TABLE "public"."org_roles" TO "anon";
GRANT ALL ON TABLE "public"."org_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."org_roles" TO "service_role";



GRANT ALL ON TABLE "public"."org_settings" TO "anon";
GRANT ALL ON TABLE "public"."org_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."org_settings" TO "service_role";



GRANT ALL ON TABLE "public"."org_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."org_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."org_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."org_users" TO "anon";
GRANT ALL ON TABLE "public"."org_users" TO "authenticated";
GRANT ALL ON TABLE "public"."org_users" TO "service_role";



GRANT ALL ON TABLE "public"."organization_security_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."pay_group_master" TO "anon";
GRANT ALL ON TABLE "public"."pay_group_master" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_group_master" TO "service_role";



GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "anon";
GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "service_role";



GRANT ALL ON TABLE "public"."pay_items" TO "anon";
GRANT ALL ON TABLE "public"."pay_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_items" TO "service_role";



GRANT ALL ON TABLE "public"."paygroup_employees_legacy" TO "anon";
GRANT ALL ON TABLE "public"."paygroup_employees_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."paygroup_employees_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."paygroup_employees_view" TO "anon";
GRANT ALL ON TABLE "public"."paygroup_employees_view" TO "authenticated";
GRANT ALL ON TABLE "public"."paygroup_employees_view" TO "service_role";



GRANT ALL ON TABLE "public"."paygroup_summary_view" TO "anon";
GRANT ALL ON TABLE "public"."paygroup_summary_view" TO "authenticated";
GRANT ALL ON TABLE "public"."paygroup_summary_view" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_approval_categories" TO "anon";
GRANT ALL ON TABLE "public"."payroll_approval_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_approval_categories" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_approval_configs" TO "anon";
GRANT ALL ON TABLE "public"."payroll_approval_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_approval_configs" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_configurations" TO "anon";
GRANT ALL ON TABLE "public"."payroll_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."payrun_approval_steps" TO "anon";
GRANT ALL ON TABLE "public"."payrun_approval_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."payrun_approval_steps" TO "service_role";



GRANT ALL ON TABLE "public"."payrun_employees" TO "anon";
GRANT ALL ON TABLE "public"."payrun_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."payrun_employees" TO "service_role";



GRANT ALL ON TABLE "public"."payslip_generations" TO "anon";
GRANT ALL ON TABLE "public"."payslip_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."payslip_generations" TO "service_role";



GRANT ALL ON TABLE "public"."payslip_templates" TO "anon";
GRANT ALL ON TABLE "public"."payslip_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."payslip_templates" TO "service_role";



GRANT ALL ON TABLE "public"."permission_cache" TO "anon";
GRANT ALL ON TABLE "public"."permission_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_cache" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admin_devices" TO "anon";
GRANT ALL ON TABLE "public"."platform_admin_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admin_devices" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."platform_email_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_email_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_email_settings" TO "service_role";



GRANT ALL ON TABLE "public"."probation_reminder_logs" TO "anon";
GRANT ALL ON TABLE "public"."probation_reminder_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."probation_reminder_logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_onboarding_steps" TO "anon";
GRANT ALL ON TABLE "public"."project_onboarding_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."project_onboarding_steps" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_assignments" TO "anon";
GRANT ALL ON TABLE "public"."rbac_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_grants" TO "anon";
GRANT ALL ON TABLE "public"."rbac_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_grants" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rbac_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rbac_roles" TO "anon";
GRANT ALL ON TABLE "public"."rbac_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."rbac_roles" TO "service_role";



GRANT ALL ON TABLE "public"."role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."sub_departments" TO "anon";
GRANT ALL ON TABLE "public"."sub_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_departments" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."sync_configurations" TO "anon";
GRANT ALL ON TABLE "public"."sync_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_email_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_email_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_email_settings" TO "service_role";



GRANT ALL ON TABLE "public"."timesheet_departments" TO "anon";
GRANT ALL ON TABLE "public"."timesheet_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheet_departments" TO "service_role";



GRANT ALL ON TABLE "public"."timesheet_entries" TO "anon";
GRANT ALL ON TABLE "public"."timesheet_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheet_entries" TO "service_role";



GRANT ALL ON TABLE "public"."timesheets" TO "anon";
GRANT ALL ON TABLE "public"."timesheets" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheets" TO "service_role";



GRANT ALL ON TABLE "public"."user_company_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_company_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_company_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_invites" TO "anon";
GRANT ALL ON TABLE "public"."user_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invites" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_management_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_management_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."variable_item_logs" TO "anon";
GRANT ALL ON TABLE "public"."variable_item_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."variable_item_logs" TO "service_role";



GRANT ALL ON TABLE "public"."variable_pay_cycles" TO "anon";
GRANT ALL ON TABLE "public"."variable_pay_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."variable_pay_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."variable_pay_summaries" TO "anon";
GRANT ALL ON TABLE "public"."variable_pay_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."variable_pay_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."variable_work_logs" TO "anon";
GRANT ALL ON TABLE "public"."variable_work_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."variable_work_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































