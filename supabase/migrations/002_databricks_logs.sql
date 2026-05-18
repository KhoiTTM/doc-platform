-- Create databricks_job_logs table
CREATE TABLE IF NOT EXISTS public.databricks_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  duration INTEGER NOT NULL, -- Duration in seconds
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.databricks_job_logs ENABLE ROW LEVEL SECURITY;

-- Drop Policy if exists
DROP POLICY IF EXISTS "Allow all databricks_job_logs" ON public.databricks_job_logs;

-- Create policy for all
CREATE POLICY "Allow all databricks_job_logs" ON public.databricks_job_logs FOR ALL USING (true) WITH CHECK (true);

-- Seed realistic Databricks logs relative to current time
INSERT INTO public.databricks_job_logs (job_name, status, severity, duration, started_at, message) VALUES
  ('AX-Bronze-Ingestion', 'success', 'INFO', 345, NOW() - INTERVAL '5 minutes', 'Successfully ingested 42,105 rows from ERP source AX DB. No schemas drifts detected.'),
  ('dbt-Silver-Incremental-Core', 'running', 'INFO', 124, NOW() - INTERVAL '2 minutes', 'Running model: stg_ax_sales_orders (2/14 models built successfully)...'),
  ('Gold-AAS-Tabular-Refresh', 'failed', 'CRITICAL', 45, NOW() - INTERVAL '15 minutes', 'Failed to connect to Azure AAS endpoint: AAS-Tabular-Live-Connection. Timeout exceeded during execution.'),
  ('AX-Bronze-Ingestion', 'success', 'INFO', 360, NOW() - INTERVAL '1 hour', 'Daily incremental ingest run complete. All source tables mapped correctly.'),
  ('dbt-Silver-Incremental-Core', 'failed', 'ERROR', 640, NOW() - INTERVAL '2 hours', 'dbt test error: duplicate key violates unique constraint in silver.orders_fact. Pipeline aborted.'),
  ('Databricks-Spark-Cluster-Prewarm', 'success', 'INFO', 180, NOW() - INTERVAL '3 hours', 'Cluster drivers provisioned successfully. 4 worker nodes warmed and scaling up.'),
  ('Gold-AAS-Tabular-Refresh', 'success', 'INFO', 1240, NOW() - INTERVAL '4 hours', 'AAS Model chặng 5 live connection refreshed successfully. SLA 08:00 AM target met.'),
  ('AX-Bronze-Ingestion', 'success', 'INFO', 332, NOW() - INTERVAL '6 hours', 'Scheduled run succeeded. AX ERP buffer loaded to Bronze Lakehouse.'),
  ('dbt-Silver-Incremental-Core', 'success', 'INFO', 580, NOW() - INTERVAL '7 hours', 'All 14 dbt models compiled and materialized into delta table format.'),
  ('Gold-AAS-Tabular-Refresh', 'failed', 'WARNING', 12, NOW() - INTERVAL '12 hours', 'AAS Trigger response warning: AAS instance under heavy concurrency. Retrying step in 30 seconds.');
