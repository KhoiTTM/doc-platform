-- Migration: Create platform_monitor_logs table, RLS, functions and seed realistic records
-- Table: platform_monitor_logs
CREATE TABLE IF NOT EXISTS public.platform_monitor_logs (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  
  -- Classification
  source        TEXT NOT NULL,         -- 'databricks' | 'azure' | 'synapse' | 'powerbi'
  category      TEXT NOT NULL,         -- e.g., 'job_run', 'cost_daily', etc.
  
  -- Core fields
  job_name      TEXT NOT NULL,         -- human-readable identifier
  status        TEXT NOT NULL,         -- 'success' | 'failed' | 'running' | 'warning'
  severity      TEXT DEFAULT 'INFO',   -- 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  duration      INTEGER DEFAULT 0,     -- execution duration in seconds
  started_at    TIMESTAMPTZ,           -- when the event started
  message       TEXT,                  -- detailed description
  
  -- Optional numeric metric
  metric_value  DOUBLE PRECISION       -- cost in USD, hours stale, failure count, etc.
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_logs_source_category ON public.platform_monitor_logs(source, category);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.platform_monitor_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_status ON public.platform_monitor_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON public.platform_monitor_logs(severity);

-- Enable RLS
ALTER TABLE public.platform_monitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon & authenticated) to insert logs via API
CREATE POLICY "Allow insert" ON public.platform_monitor_logs 
  FOR INSERT WITH CHECK (true);

-- Allow anyone (anon & authenticated) to read logs
CREATE POLICY "Allow read" ON public.platform_monitor_logs 
  FOR SELECT USING (true);

-- Get source health summary database function
CREATE OR REPLACE FUNCTION public.get_source_health()
RETURNS TABLE (
  source TEXT,
  total_24h BIGINT,
  success_24h BIGINT,
  failed_24h BIGINT,
  success_rate NUMERIC,
  last_check TIMESTAMPTZ,
  last_status TEXT
) AS $$
  WITH ranked AS (
    SELECT
      source,
      status,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY source ORDER BY created_at DESC) AS rn
    FROM public.platform_monitor_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT
    r.source,
    COUNT(*) AS total_24h,
    COUNT(*) FILTER (WHERE status = 'success') AS success_24h,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_24h,
    ROUND(COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS success_rate,
    MAX(created_at) AS last_check,
    MAX(CASE WHEN rn = 1 THEN status END) AS last_status
  FROM ranked r
  GROUP BY r.source;
$$ LANGUAGE SQL;

-- Seed dynamic, realistic records relative to CURRENT_TIME
INSERT INTO public.platform_monitor_logs (source, category, job_name, status, severity, duration, started_at, message, metric_value)
VALUES 
  -- Databricks Logs
  ('databricks', 'job_run', 'dbt_update_data', 'success', 'INFO', 996, NOW() - INTERVAL '5 minutes', 'Job dbt_update_data completed successfully. Duration: 996s. 45,210 rows synchronized.', NULL),
  ('databricks', 'cost_daily', 'cost:workspace_daily', 'warning', 'WARNING', 0, NOW() - INTERVAL '10 minutes', 'Daily cost: $23.81 (7d avg: $6.20) ANOMALY: 3.8x average!', 23.81),
  ('databricks', 'idle_session', 'idle:minhkhoi:notebook_12', 'failed', 'ERROR', 1800, NOW() - INTERVAL '30 minutes', 'Notebook session inactive for 30 mins wasting computing power. Cost: $4.50 USD.', 4.50),
  ('databricks', 'table_freshness', 'freshness:gold.sales.orders_fact', 'success', 'INFO', 0, NOW() - INTERVAL '1 hour', 'Gold table gold.sales.orders_fact updated on time. Stale: 0.1 hours.', 0.1),
  ('databricks', 'pipeline', 'pipeline:SDP_Finance_Extract', 'success', 'INFO', 340, NOW() - INTERVAL '2 hours', 'SDP pipeline extraction completed. All sources mapping succeeded.', NULL),

  -- Azure Logs
  ('azure', 'resource_health', 'azure:sql-server-prod', 'success', 'INFO', 0, NOW() - INTERVAL '8 minutes', 'Azure SQL Server sql-server-prod is healthy. Connectivity at 99.98% SLA.', NULL),
  ('azure', 'cost_daily', 'cost:azure_subscription', 'success', 'INFO', 0, NOW() - INTERVAL '12 minutes', 'Daily Azure cost: $145.20 (Within normal bounds of 7d avg $148.50)', 145.20),
  ('azure', 'alert', 'alert:CPU_Usage_Web_App', 'failed', 'CRITICAL', 0, NOW() - INTERVAL '45 minutes', 'Critical Alert CPU_Usage_Web_App fired. CPU exceeded 95% threshold on instance web-prod-01.', NULL),

  -- Synapse Logs
  ('synapse', 'pipeline_run', 'syn:ETL_CustomerMaster', 'success', 'INFO', 320, NOW() - INTERVAL '15 minutes', 'Pipeline ETL_CustomerMaster succeeded. Duration: 320s. Rows: 15,420.', NULL),
  ('synapse', 'spark_job', 'syn:spark:Bronze_AX_Sales', 'success', 'INFO', 450, NOW() - INTERVAL '1 hour', 'Synapse Spark Job Bronze_AX_Sales finished successfully. Output: delta format.', NULL),
  ('synapse', 'cost_daily', 'cost:synapse_workspace', 'success', 'INFO', 0, NOW() - INTERVAL '2 hours', 'Synapse Workspace daily cost: $12.45', 12.45),

  -- Power BI Logs
  ('powerbi', 'dataset_refresh', 'pbi:Sales Analytics/Daily Sales', 'failed', 'ERROR', 45, NOW() - INTERVAL '18 minutes', 'Dataset Daily Sales refresh failed: Timeout after 45s. Source: SQL Server connection error.', 45.0),
  ('powerbi', 'report_usage', 'pbi:usage:Finance Dashboard', 'success', 'INFO', 0, NOW() - INTERVAL '25 minutes', 'Finance Dashboard viewed 245 times today.', 245.0),
  ('powerbi', 'gateway_health', 'pbi:gateway:Local_AD_Gateway', 'success', 'INFO', 0, NOW() - INTERVAL '2 hours', 'Local Active Directory Gateway is online and active.', NULL);
