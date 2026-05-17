-- doc-platform initial database schema (PostgreSQL) - RESET & REBUILD SCRIPT
-- Location: supabase/migrations/001_initial_schema.sql

-- =========================================================================
-- BƯỚC 1: XÓA SẠCH CẤU TRÚC LỖI CŨ (Để tránh lỗi 'already exists' khi chạy lại)
-- =========================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.wiki_documents cascade;
drop table if exists public.pipeline_steps cascade;
drop table if exists public.profiles cascade;
drop type if exists user_role cascade;

-- Xóa tài khoản ladochoi@gmail.com cũ trong auth.users nếu đã tạo lỗi trước đó
delete from auth.users where email = 'ladochoi@gmail.com';

-- =========================================================================
-- BƯỚC 2: KHỞI TẠO CẤU TRÚC MỚI CHUẨN XÁC
-- =========================================================================

-- Kích hoạt tiện ích mã hóa
create extension if not exists "pgcrypto";

-- Định nghĩa các Vai trò Chuyên môn
create type user_role as enum ('data_engineer', 'data_ops', 'qc_analyst', 'viewer');

-- Bảng Profiles (Đồng bộ 1:1 với auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Bảng 6 Bước Pipeline
create table public.pipeline_steps (
  step_number int primary key check (step_number between 1 and 6),
  step_name text not null,
  platform text not null,
  trigger_type text not null,
  sla_minutes int not null,
  critical_level text not null default 'High',
  dependency_logic text,
  description text
);

-- Bảng Wiki Tài liệu / Hướng dẫn Vận hành
create table public.wiki_documents (
  id uuid primary key default gen_random_uuid(),
  step_number int references public.pipeline_steps(step_number) on delete set null,
  title text not null,
  slug text not null unique,
  category text not null check (category in ('infrastructure', 'dbt', 'operations', 'qc_testing', 'general')),
  content text not null,
  file_url text,
  author_id uuid references public.profiles(id) on delete set null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger tự động đồng bộ tài khoản auth.users sang public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Thiết lập bảo mật Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.pipeline_steps enable row level security;
alter table public.wiki_documents enable row level security;

-- Cấp quyền đọc ghi chuẩn hóa
create policy "allow_read_all_steps" on public.pipeline_steps for select using (auth.role() = 'authenticated');
create policy "allow_read_all_wiki" on public.wiki_documents for select using (auth.role() = 'authenticated');
create policy "allow_read_own_profile" on public.profiles for select using (auth.uid() = id);

create policy "ops_engineer_write_steps" on public.pipeline_steps
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops')
    )
  );

create policy "staff_write_wiki" on public.wiki_documents
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('data_engineer', 'data_ops', 'qc_analyst')
    )
  );

create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- =========================================================================
-- BƯỚC 3: NẠP DỮ LIỆU ĐẶC THẢ LUỒNG ETL (SEED STEPS & WIKIS)
-- =========================================================================

-- Seed data: Pipeline Steps
insert into public.pipeline_steps (step_number, step_name, platform, trigger_type, sla_minutes, critical_level, dependency_logic, description) values
  (1, 'AX Data Extraction', 'Synapse Pipeline', 'Scheduled (06:00 AM)', 45, 'High', 'None', 'Extract incremental / full data from AX ERP and store raw files into ADLS Gen2 Bronze layer.'),
  (2, 'Trigger Databricks Job', 'Synapse Pipeline', 'API Call', 2, 'High', 'On Success of Step 1', 'Synapse calls Databricks Job API after extraction completes successfully.'),
  (3, 'dbt Model Execution', 'Azure Databricks', 'Internal Job Task', 30, 'High', 'On Success of Step 2', 'dbt runs Bronze → Silver → Gold transformations on Azure Databricks Spark SQL Warehouse.'),
  (4, 'Gold Data Availability', 'Synapse SQL External', 'Automatic', 1, 'High', 'Automatic path-mapping', 'Synapse serverless views and external tables read latest Gold data paths automatically.'),
  (5, 'Analysis Services Refresh', 'AS Tabular Model', 'Scheduled (08:00 AM)', 20, 'High', 'None (Vulnerability: runs strictly at 08:00 AM)', 'Process semantic model so latest Gold data is loaded into the AAS tabular database.'),
  (6, 'Power BI Live Report Ready', 'Power BI Services', 'Automatic', 1, 'High', 'On Success of Step 5', 'Power BI reports query latest processed AS model via active live connection.');

-- Seed data: Detailed Viet Wikis
insert into public.wiki_documents (id, step_number, title, slug, category, content, file_url) values
  (
    '11111111-1111-1111-1111-111111111111',
    1,
    'AX Data Extraction Setup & Troubleshooting',
    'ax-data-extraction-guide',
    'infrastructure',
    '# Hướng dẫn Vận hành AX Data Extraction

Dữ liệu nguồn được trích xuất hàng ngày lúc **06:00 AM** từ hệ thống ERP AX thông qua Azure Synapse Integration Runtime (Gateway).

## 1. Cấu hình Pipeline
- **Platform**: Azure Synapse Pipeline / ADF
- **Trigger**: Schedule Trigger (`06:00 AM` Daily)
- **SLA**: 45 phút (Kết thúc trước `06:45 AM`)
- **Output**: Raw Bronze Parquet files tại `adls2://bronze/ax/`

## 2. Các lỗi thường gặp và cách xử lý (Troubleshooting)
### Lỗi 1: Self-hosted Integration Runtime (Gateway) Disconnected
- **Triệu chứng**: Pipeline báo lỗi *"Gateway not reachable"* hoặc treo vô thời hạn.
- **Cách khắc phục**:
  1. Đăng nhập vào Server On-Premises đang host Gateway.
  2. Mở *Microsoft Integration Runtime Configuration Manager*.
  3. Kiểm tra xem service đang `Running` hay không. Nếu không, ấn `Start`.
  4. Nếu Gateway bị lỗi chứng chỉ, lấy lại Authentication Key trên Azure Portal và dán vào phần đăng ký lại.

### Lỗi 2: AX Database khóa bảng (Deadlock) do chạy bảo trì
- **Triệu chứng**: Pipeline bị timeout sau 45 phút.
- **Cách khắc phục**: Liên hệ đội Database Admin của AX để kiểm tra các tiến trình bảo trì (Maintenance jobs). Chạy lại pipeline thủ công sau khi AX ERP mở khóa.',
    null
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    2,
    'Synapse Trigger Databricks Job API Integration',
    'synapse-databricks-trigger-api',
    'operations',
    '# Hướng dẫn Kết nối & Trigger Databricks Job từ Synapse

Sau khi Step 1 thành công, Synapse sẽ gửi một API Call tới Azure Databricks để kích hoạt dbt run job.

## 1. Cơ chế Trigger
- **Trigger Type**: Web Activity / Webhook trong Synapse.
- **Endpoint**: `https://<databricks-instance>/api/2.1/jobs/run-now`
- **Method**: POST
- **Headers**:
  - `Authorization: Bearer <Key-Vault-Secret>`
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "job_id": 12345,
    "notebook_params": {
      "run_date": "@{pipeline().TriggerTime}"
    }
  }
  ```

## 2. Hướng dẫn sửa đổi Key Vault Token
Khi Databricks Personal Access Token (PAT) hết hạn:
1. Đăng nhập vào Databricks Workspace ➜ User Settings ➜ Developer ➜ Access Tokens.
2. Tạo Token mới và lưu vào Azure Key Vault dưới tên Secret `databricks-token`.
3. Synapse sẽ tự động nạp Token mới trong lượt chạy tiếp theo thông qua Key Vault Integration.',
    null
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    3,
    'dbt Transformations on Azure Databricks (Bronze -> Gold)',
    'dbt-transformations-databricks',
    'dbt',
    '# Quy trình Biến đổi Dữ liệu với dbt thông qua Databricks

dbt (data build tool) chịu trách nhiệm chính trong việc đọc dữ liệu thô tại tầng Bronze, làm sạch, chuẩn hóa và đưa lên các bảng Delta Lake (Silver & Gold).

## 1. Cấu trúc các Layer dữ liệu
1. **Bronze Layer**: Định dạng parquet thô từ nguồn AX.
2. **Silver Layer**: Bảng Delta Lake, làm sạch dữ liệu, áp dụng kiểu dữ liệu đúng (Datatypes), loại bỏ null không hợp lệ.
3. **Gold Layer**: Bảng Delta Lake thiết kế theo Star Schema (Facts & Dimensions), sẵn sàng cho Power BI query.

## 2. Lệnh vận hành dbt chính
- **Chạy toàn bộ models**: `dbt run`
- **Kiểm tra chất lượng dữ liệu (QC Checks)**: `dbt test`
- **Tạo tài liệu lineage**: `dbt docs generate`

## 3. Khắc phục lỗi khi dbt Run thất bại
- **Lỗi 1: Schema mismatch**: Xảy ra khi nguồn AX thay đổi cấu trúc bảng.
  - *Giải pháp*: Cập nhật schema trong file `src_ax.yml` của dbt và chạy lại lệnh `dbt run --select +model_bi_loi`.
- **Lỗi 2: Spark Cluster Out of Memory (OOM)**:
  - *Giải pháp*: Tăng kích thước cluster trong Azure Databricks Job Settings hoặc tối ưu hóa truy vấn Spark SQL (sử dụng partition và partition pruning).',
    null
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    4,
    'Synapse Serverless External Tables Configuration',
    'synapse-external-tables-config',
    'infrastructure',
    '# Cấu hình Lớp Serving với Synapse External Tables

Tầng Gold lưu trữ dữ liệu dạng Deltatable trên ADLS Gen2. Để Analysis Services có thể truy vấn bằng SQL tiêu chuẩn, chúng ta tạo các External Tables trên Synapse Serverless SQL.

## 1. Mẫu tập lệnh khởi tạo External Table
Để tạo hoặc cập nhật External Table trỏ tới Delta Lake:

```sql
CREATE EXTERNAL TABLE bi.dim_customer (
    [CustomerId] VARCHAR(50),
    [CustomerName] NVARCHAR(200),
    [CustomerGroup] VARCHAR(50)
)
WITH (
    LOCATION = ''gold/dim_customer/'',
    DATA_SOURCE = ADLS_Gen2_Gold,
    FILE_FORMAT = DeltaFormat
);
```

## 2. Lưu ý quan trọng
- Luôn kiểm tra xem `DATA_SOURCE` và `FILE_FORMAT` đã được tạo sẵn trong Database chưa.
- Nếu không truy cập được dữ liệu, kiểm tra quyền hạn Managed Identity của Synapse Workspace trên ADLS Gen2 container (phải có quyền *Storage Blob Data Contributor*).',
    null
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    5,
    'Analysis Services Tabular Model Processing Runbook',
    'analysis-services-tabular-processing',
    'operations',
    '# Hướng dẫn Vận hành & Cập nhật Analysis Services (AS) Tabular Model

Tabular Model trên Analysis Services (AAS) thực hiện nén dữ liệu, tính toán các Measure (DAX) nghiệp vụ và cung cấp giao thức truy vấn hiệu năng cao cho Power BI.

## 1. Mốc thời gian & Rủi ro trễ hạn
- **Thời gian chạy**: `08:00 AM` hàng ngày (chạy tự động theo lịch hẹn).
- **⚠️ Rủi ro**: Hiện tại AS Refresh chạy độc lập theo lịch, **không chờ dbt kết thúc**.
- **Cách xử lý khi dbt bị trễ**:
  1. Đăng nhập vào Azure Portal hoặc SSMS (SQL Server Management Studio).
  2. Dừng (Cancel) tiến trình AS Refresh tự động đang chạy nếu phát hiện dbt chưa hoàn thành.
  3. Đợi dbt hoàn thành cập nhật dữ liệu Gold.
  4. Thực hiện kích hoạt xử lý thủ công (Process Full) cho semantic model qua SSMS hoặc gọi API.

## 2. Lệnh XMLA để Refresh thủ công qua SSMS
```json
{
  "refresh": {
    "type": "full",
    "objects": [
      {
        "database": "AX_Sales_Model"
      }
    ]
  }
}
```',
    null
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    6,
    'Power BI Live Connection & Report Updates Guidelines',
    'power-bi-live-connection-guidelines',
    'qc_testing',
    '# Hướng dẫn Tối ưu & QC Báo cáo Power BI Live Connection

Các báo cáo Power BI kết nối trực tiếp đến mô hình AAS (Analysis Services) theo dạng Live Connection.

## 1. Quy tắc QC Báo cáo trước khi bàn giao
- **Thời gian phản hồi trang (Page Load)**: Phải dưới 3 giây đối với mọi bộ lọc (Slicers).
- **Không sử dụng DirectQuery trực tiếp lên Synapse SQL**: Luôn sử dụng Live Connection tới AAS để tránh làm quá tải SQL Serverless Compute và giảm chi phí truy vấn.
- **Kiểm định dữ liệu (QC Check)**: Đối chiếu doanh thu/tồn kho giữa Power BI và AX ERP gốc. Sai số cho phép là `0%`.

## 2. Cách xử lý khi Báo cáo hiển thị dữ liệu cũ (Stale Data)
Nếu người dùng báo cáo dữ liệu chưa cập nhật sau 08:30 AM:
1. Truy cập **doc-platform** mục Dashboard để xem bước 5 (AS Refresh) đã hoàn thành thành công hay chưa.
2. Nếu bước 5 thành công nhưng dữ liệu vẫn cũ, có nghĩa dbt bị trễ hạn trước đó. Tiến hành chạy lại AS Refresh thủ công.',
    null
  );

-- =========================================================================
-- BƯỚC 4: TẠO USER LADOCHOI ĐÃ XÁC NHẬN EMAIL (BYPASS CONFIRMATION)
-- =========================================================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_super_admin,
  phone
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ladochoi@gmail.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"CoolBlood","role":"data_engineer"}',
  now(),
  now(),
  false,
  null
);
