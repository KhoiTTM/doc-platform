# AX Data Platform - Document & Operations Center (Doc-Platform)
## 📋 Project Implementation Plan & Roadmap

Welcome to the roadmap for **doc-platform**, a modern, premium web application designed specifically to serve as the unified Documentation, Monitoring, and Operations Hub for your end-to-end AX Data Platform. 

As a **Data Engineer**, **DataOps**, and **QC Analyst**, you manage a sophisticated pipeline: from raw source extractions to Spark-based Databricks transformations via dbt, leading to Synapse SQL layer query optimization, and concluding with a scheduled Analysis Services (AAS) tabular model serving live Power BI dashboards.

This plan details how we will build an interactive, production-grade portal that not only stores static documents but also acts as an **active operations dashboard** where you can track pipeline health, audit SLA parameters (like the critical 08:00 AM AS Refresh), browse DBT schemas, and verify QC check status.

---

## 🏗️ 1. Core Architecture & Technology Stack

To ensure total alignment and effortless code reuse, we will mirror the premium architecture of your reference project `edu-platform`, with upgraded schemas and custom dark-theme telemetry dashboards.

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `15.5.18` | Dynamic React-based server/client application architecture |
| **Styling** | Tailwind CSS | `3.4.17` | Sleek modern aesthetics, harmonious dark palette, and glassmorphism |
| **Language** | TypeScript | `^5.7.2` | Strong typing for tables, profiles, runs, and configurations |
| **Database** | PostgreSQL (Supabase) | `^2.47.10` | Real-time tables, Auth, and Row-Level Security (RLS) |
| **Icons** | Lucide React | `^1.16.0` | Elegant, clean UI icons |
| **Hosting** | Vercel | Production | Serverless Next.js optimization with rapid CD/CI deployment |

---

## 🗄️ 2. Supabase Database Schema (Migrations)

Below is the proposed SQL migration file (`supabase/migrations/001_initial_schema.sql`). It sets up profiles, roles (Data Engineer, DataOps, QC), pipeline steps, running logs (to monitor the 6-stage ETL), services inventory, dbt models registry, and wiki documents.

### Migration Script: `001_initial_schema.sql`

```sql
-- doc-platform initial database schema (PostgreSQL)
-- Locations: supabase/migrations/001_initial_schema.sql

-- Extensions
create extension if not exists "pgcrypto";

-- User Roles Type Definition
create type user_role as enum ('data_engineer', 'data_ops', 'qc_analyst', 'viewer');

-- 1. PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- 2. SERVICES INVENTORY (Section 5.1 of ETL document)
create table if not exists public.services_inventory (
  id uuid primary key default gen_random_uuid(),
  platform text not null,                -- e.g., 'Azure Data Platform', 'Databricks Lakehouse', 'On-Premises'
  layer text not null,                   -- e.g., 'Orchestration', 'Compute', 'Semantic Layer', 'Storage'
  service_name text not null,            -- e.g., 'Azure Databricks', 'Synapse External Tables'
  purpose text not null,
  connection_template text,             -- Safe placeholder configuration / connection string template
  documentation_url text,                -- Reference link to wiki article
  status text not null default 'active', -- 'active', 'under_maintenance', 'deprecated'
  updated_at timestamptz not null default now()
);

-- 3. ETL PIPELINE STEPS (Section 3 of ETL document)
create table if not exists public.pipeline_steps (
  step_number int primary key check (step_number between 1 and 6),
  step_name text not null,
  platform text not null,
  trigger_type text not null,
  sla_minutes int not null,
  critical_level text not null default 'High', -- 'High', 'Medium', 'Low'
  dependency_logic text,
  description text
);

-- 4. PIPELINE RUN LOGS (Daily Operational Tracking)
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  step_number int not null references public.pipeline_steps(step_number) on delete cascade,
  status text not null check (status in ('pending', 'running', 'success', 'failed', 'sla_breached')),
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes int,
  triggered_by text default 'Synapse Scheduler',
  error_message text,
  log_snippet text,
  created_at timestamptz not null default now(),
  unique (run_date, step_number)
);

-- 5. DBT MODELS DIRECTORY (Transformation tracking)
create table if not exists public.dbt_models (
  id uuid primary key default gen_random_uuid(),
  model_name text not null unique,        -- e.g., 'dim_customer', 'fct_sales'
  layer text not null check (layer in ('bronze', 'silver', 'gold')),
  source_tables text[],                  -- Array of input AX tables (e.g., {'SalesTable', 'InventTrans'})
  target_delta_path text,                -- ADLS path
  description text,
  schema_definition jsonb,               -- JSON structure of fields and data types
  last_compiled_at timestamptz default now()
);

-- 6. QC AUDIT CHECKS (Daily QC Reports)
create table if not exists public.qc_audits (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  model_name text not null references public.dbt_models(model_name) on delete cascade,
  rule_name text not null,               -- e.g., 'null_check_customer_id', 'row_count_anomaly'
  status text not null check (status in ('pass', 'warning', 'fail')),
  rows_checked bigint not null,
  failure_count bigint not null default 0,
  details jsonb,
  checked_at timestamptz not null default now()
);

-- 7. WIKI ARTICLES (Collaborative Wiki & Runbooks)
create table if not exists public.wiki_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null check (category in ('infrastructure', 'dbt', 'operations', 'qc_testing', 'general')),
  content text not null,                 -- Markdown documentation content
  author_id uuid references public.profiles(id) on delete set null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- AUTOMATION & TRIGGERS
-- =========================================================================

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
  -- Automatically map role if metadata metadata is available
  assigned_role := coalesce(
    nullif(trim(new.raw_user_meta_data->>'role'), '')::user_role,
    'viewer'::user_role
  );

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    role = coalesce(public.profiles.role, excluded.role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.services_inventory enable row level security;
alter table public.pipeline_steps enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.dbt_models enable row level security;
alter table public.qc_audits enable row level security;
alter table public.wiki_documents enable row level security;

-- Viewer Policy (Select is allowed for all authenticated users)
create policy "allow_read_all_auth" on public.services_inventory for select using (auth.role() = 'authenticated');
create policy "allow_read_all_steps" on public.pipeline_steps for select using (auth.role() = 'authenticated');
create policy "allow_read_all_runs" on public.pipeline_runs for select using (auth.role() = 'authenticated');
create policy "allow_read_all_models" on public.dbt_models for select using (auth.role() = 'authenticated');
create policy "allow_read_all_qc" on public.qc_audits for select using (auth.role() = 'authenticated');
create policy "allow_read_all_wiki" on public.wiki_documents for select using (auth.role() = 'authenticated');
create policy "allow_read_own_profile" on public.profiles for select using (auth.uid() = id);

-- Write/Modify Policies based on Roles
-- 1. Data Engineer & DataOps can manage services, steps, and runs
create policy "ops_engineer_write_services" on public.services_inventory
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops')
    )
  );

create policy "ops_engineer_write_steps" on public.pipeline_steps
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops')
    )
  );

create policy "ops_engineer_write_runs" on public.pipeline_runs
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops')
    )
  );

-- 2. QC Analysts & Data Engineers can manage dbt models and qc audits
create policy "qc_engineer_write_models" on public.dbt_models
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'qc_analyst')
    )
  );

create policy "qc_engineer_write_audits" on public.qc_audits
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'qc_analyst')
    )
  );

-- 3. Collaborative Wiki: All Data Engineers, DataOps, and QC Analysts can write & update docs
create policy "staff_write_wiki" on public.wiki_documents
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops', 'qc_analyst')
    )
  );

-- Profile Update
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- =========================================================================
-- SEED DATA: PIPELINE STEPS
-- =========================================================================

insert into public.pipeline_steps (step_number, step_name, platform, trigger_type, sla_minutes, critical_level, dependency_logic, description) values
  (1, 'AX Data Extraction', 'Synapse Pipeline', 'Scheduled (06:00 AM)', 45, 'High', 'None', 'Extract incremental / full data from AX ERP and store raw files into ADLS Gen2 Bronze layer.'),
  (2, 'Trigger Databricks Job', 'Synapse Pipeline', 'API Call', 2, 'High', 'On Success of Step 1', 'Synapse calls Databricks Job API after extraction completes successfully.'),
  (3, 'dbt Model Execution', 'Azure Databricks', 'Internal Job Task', 30, 'High', 'On Success of Step 2', 'dbt runs Bronze → Silver → Gold transformations on Azure Databricks Spark SQL Warehouse.'),
  (4, 'Gold Data Availability', 'Synapse SQL External', 'Automatic', 1, 'High', 'Automatic path-mapping', 'Synapse serverless views and external tables read latest Gold data paths automatically.'),
  (5, 'Analysis Services Refresh', 'AS Tabular Model', 'Scheduled (08:00 AM)', 20, 'High', 'None (Vulnerability: runs strictly at 08:00 AM)', 'Process semantic model so latest Gold data is loaded into the AAS tabular database.'),
  (6, 'Power BI Live Report Ready', 'Power BI Services', 'Automatic', 1, 'High', 'On Success of Step 5', 'Power BI reports query latest processed AS model via active live connection.');
```

---

## 📂 3. Web Application Folder Structure

This structure maps exactly to the Next.js `App Router` standard, keeping files cleanly separated and highly modular.

```text
doc-platform/
├── app/
│   ├── globals.css                # Custom HSL design tokens, global utility classes
│   ├── layout.tsx                 # Base Outfit/Geist fonts, global layout shell
│   ├── page.tsx                   # Main Marketing landing page & Auth redirection
│   ├── login/
│   │   └── page.tsx               # Sign In / Sign Up, role selection UI
│   └── (dashboard)/
│       ├── layout.tsx             # Collapsible Navigation Sidebar, Header, Profile display
│       ├── page.tsx               # Operational Overview (ETL Status Monitor, SLA Breach Clocks)
│       ├── etl-flow/
│       │   └── page.tsx           # Interactive flowchart & operational runbooks for Steps 1-6
│       ├── services/
│       │   └── page.tsx           # Catalog of all 12 services, details, configurations
│       ├── dbt-models/
│       │   ├── page.tsx           # Bronze, Silver, Gold schemas, dependency lineages
│       │   └── [modelName]/
│       │       └── page.tsx       # Deep details, query schemas, upstream/downstream maps
│       ├── qc-audits/
│       │   └── page.tsx           # Quality checks dashboard, daily checklists, null/anomaly logs
│       └── wiki/
│           ├── page.tsx           # Collaborative articles directory (Infrastructure, Operations)
│           ├── new/
│           │   └── page.tsx       # Markdown Editor for creating document guidelines
│           └── [slug]/
│               └── page.tsx       # Wiki viewer, edit mode toggle
├── components/
│   ├── ui/                        # Bespoke sleek components (no heavy external component packages)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── progress.tsx
│   │   └── badge.tsx
│   ├── pipeline-visualizer.tsx    # Live animated ETL flowchart (SVG/Tailwind transition based)
│   ├── sla-warning-widget.tsx     # Custom clock depicting current time vs. 08:00 AM threat
│   └── sidebar.tsx                # Dashboard sidebar with active route highlights
├── lib/
│   └── supabase/
│       ├── client.ts              # Browser-side Supabase SSR Client
│       ├── server.ts              # Server Component Supabase Client
│       └── middleware.ts          # Session validator & path protect (Data Engineering redirect rules)
├── types/
│   └── database.ts                # TypeScript interface mappings of DB Schemas
├── middleware.ts                  # Root middleware calling session updates
├── tailwind.config.ts             # Harmonious HSL colors & display typography settings
├── tsconfig.json                  # TypeScript Compiler settings
└── package.json                   # Dependencies
```

---

## 🎨 4. Design Language & Visual Aesthetics

To create an absolute **"WOW" effect** for the Data Platform team, we will employ a cutting-edge, tech-futuristic **DataOps & Cyberpunk Theme**.

*   **Harmony of Dark Gradients**: The dominant background is an ultra-deep slate blue (`#020617` / `slate-950`) fading into `#0f172a`.
*   **Vibrant State Colors**:
    *   `Success / Healthy`: Emerald Mint (`#10b981`).
    *   `Running / Transforming`: Cyber Indigo/Sky Blue (`#38bdf8`).
    *   `SLA Breached / Danger`: Crimson Rose (`#f43f5e`).
    *   `Warning / Delayed`: Warm Amber (`#f59e0b`).
*   **Glassmorphism & Shadows**: Cards will feature `bg-slate-900/45`, border borders of `border-slate-800/80`, a slight backdrop blur (`backdrop-blur-md`), and high-end glowing drop shadows (`shadow-[0_0_25px_-5px_rgba(56,189,248,0.15)]`).
*   **Aesthetics Micro-Animations**:
    *   Pipeline nodes that glow and pulsate when "Active".
    *   Animated SVG paths connecting the nodes to show data flowing (e.g. Bronze -> Silver -> Gold).
    *   SLA warning widgets with ticking count-downs.

---

## 🚀 5. Feature Highlights & Interactive Dashboards

### 🎛️ Feature A: The Live Pipeline Visualizer (`/dashboard`)
*   Instead of static diagrams, users see the **6 steps as interactive nodes**.
*   Each step displays its name, platform, trigger source, and active status for the current day.
*   Clicking any step opens a slide-out panel containing:
    *   **Runbook**: Steps to recover if it fails.
    *   **Logs**: Interactive code logs mimicking Synapse error traces or Databricks Spark exceptions.
    *   **Owner**: The designated contact person (Data Engineer or DataOps).

### ⏰ Feature B: The 08:00 AM SLA Critical Alerts (`/dashboard`)
*   Highlighting **Important Note 6.4**: The Analysis Services (AS) refresh triggers strictly at 08:00 AM, independent of the dbt finish time.
*   **Interactive Simulation Widget**: Shows if dbt run (Step 3) exceeds its usual duration or AX Extract (Step 1) starts late.
*   **Action Plan Launcher**: Displays a glowing red alert banner when a delay occurs, with a one-click button to trigger a manual runbook or notify stakeholders.

### 🧪 Feature C: QC & DBT Governance Center (`/dashboard/qc-audits`)
*   A summary page where the **QC Analyst** can check the data validations.
*   Lists all dbt models and schemas (Bronze/Silver/Gold) with the last row counts, null values percent, and uniqueness check results.
*   An operational release checklist that ensures the pipeline has been verified before deploying to Vercel/Supabase Production.

### 📝 Feature D: Collaborative Markdown Wiki (`/dashboard/wiki`)
*   A dedicated writing center where members can add technical guides.
*   Categorized into Infrastructure, dbt Models, Operations, and QC Testing.
*   Integrated with Supabase Auth roles: only logged-in specialists can add or edit documents.

---

## 📅 6. Step-by-Step Implementation Roadmap

We will build the foundation and components sequentially:

### Phase 1: Environment & Authentication (Day 1)
1. Initialize the Next.js workspace mirroring `edu-platform` config styles.
2. Spin up the Supabase database and execute the `001_initial_schema.sql` migration.
3. Configure `.env.local` variables for local and production environments.
4. Establish the Client, Server, and Middleware Supabase handlers.
5. Create the high-end dark landing page (`/`) and a premium interactive login portal (`/login`).

### Phase 2: Live Pipeline Visualizer & Operations Dashboard (Day 2)
1. Build components: Sidebar Navigation, Layout wrappers, and Custom UI elements.
2. Develop the **Live Pipeline Visualizer** with SVG animated lines and status alerts.
3. Implement the **SLA Clock Monitor** detailing daily success, elapsed runtimes, and SLA compliance metrics.
4. Set up mock pipeline triggers allowing users to simulate running steps (Step 1 -> 6) and visualize failures/SLA breaches.

### Phase 3: Services & DBT Models Directory (Day 3)
1. Render the **Services Inventory** catalog showing connection details, network maps, and endpoints securely.
2. Build the **DBT Schema Browser** demonstrating Bronze, Silver, and Gold delta layers.
3. Hook up details cards outlining schemas, source AX tables, and Delta paths.

### Phase 4: QC Audits & Collaborative Wiki (Day 4)
1. Build the **QC Dashboard** showcasing check results (pass/fail/warning indicators) and rows audited.
2. Construct the **Markdown Wiki** directory, enabling document viewing and dynamic markdown page generation.
3. Implement a sleek markdown editor enabling staff (Engineers/Ops/QC) to create, edit, and pin pages.

### Phase 5: Production Deployment & Verification (Day 5)
1. Integrate final RLS security configurations.
2. Ensure full styling responsiveness across desktop, tablet, and mobile displays.
3. Deploy the application stack onto Vercel.
4. Perform final QC end-to-end audits.

---

## 🤝 7. Ready to Start?

I am fully prepared to write the source codes, styling sheets, backend server functions, and database migrations.

Please let me know if you would like me to begin by **initializing the project files, configuring environment keys, or creating the base Supabase migrations**! Let's build a masterpiece!
