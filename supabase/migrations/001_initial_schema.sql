-- doc-platform database schema (PostgreSQL) - Simplified Folder/Document structure
-- Location: supabase/migrations/001_initial_schema.sql

-- =========================================================================
-- BƯỚC 1: XÓA SẠCH CẤU TRÚC PHỨC TẠP CŨ
-- =========================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.wiki_documents cascade;
drop table if exists public.folders cascade;
drop table if exists public.profiles cascade;
drop type if exists user_role cascade;

-- Dọn dẹp user ladochoi@gmail.com cũ nếu có trong auth.users để tạo mới sạch sẽ
delete from auth.users where email = 'ladochoi@gmail.com';

-- =========================================================================
-- BƯỚC 2: KHỞI TẠO CẤU TRÚC THƯ MỤC & TÀI LIỆU ĐƠN GIẢN
-- =========================================================================

-- Kích hoạt tiện ích mã hóa
create extension if not exists "pgcrypto";

-- Bảng Profiles lưu thông tin cá nhân (Đồng bộ 1:1 từ auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- Bảng Folders hỗ trợ lồng nhau (Folder & Sub-folders)
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade, -- Liên kết đến thư mục cha (cho phép lồng vô hạn)
  created_at timestamptz not null default now()
);

-- Bảng Wiki Documents thuộc về thư mục
create table public.wiki_documents (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete cascade, -- Liên kết đến thư mục chứa tệp này
  title text not null,
  slug text not null unique,
  content text not null, -- Markdown
  file_url text, -- File đính kèm từ Supabase Storage
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
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Bật Row Level Security (RLS) bảo mật mức tài khoản
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.wiki_documents enable row level security;

-- Quyền truy cập: Chỉ cần Đã Đăng Nhập là có toàn quyền (Xem, Thêm, Sửa, Xóa) cho mục đích cá nhân
create policy "authenticated_full_profiles" on public.profiles for all using (auth.role() = 'authenticated');
create policy "authenticated_full_folders" on public.folders for all using (auth.role() = 'authenticated');
create policy "authenticated_full_wiki" on public.wiki_documents for all using (auth.role() = 'authenticated');

-- =========================================================================
-- BƯỚC 3: NẠP SẴN CẤU TRÚC THƯ MỤC & FILE CHO LUỒNG ETL CỦA PHÒNG DATA
-- =========================================================================

-- 1. Tạo các Thư mục gốc (Root Folders) cho 5 chặng của luồng ETL
insert into public.folders (id, name, parent_id) values
  ('11111111-1111-1111-1111-000000000001', '01. Data Extraction (Bronze)', null),
  ('11111111-1111-1111-1111-000000000002', '02. dbt Transformation (Silver-Gold)', null),
  ('11111111-1111-1111-1111-000000000003', '03. Serving Layer (Synapse SQL)', null),
  ('11111111-1111-1111-1111-000000000004', '04. Semantic Layer (AAS)', null),
  ('11111111-1111-1111-1111-000000000005', '05. BI Reporting (Power BI)', null);

-- 2. Tạo các Thư mục con (Sub-folders)
insert into public.folders (id, name, parent_id) values
  -- Thư mục con của 01. Data Extraction
  ('22222222-2222-2222-2222-000000000011', 'Synapse Pipelines', '11111111-1111-1111-1111-000000000001'),
  ('22222222-2222-2222-2222-000000000012', 'AX ERP Source DB', '11111111-1111-1111-1111-000000000001'),
  -- Thư mục con của 02. dbt Transformation
  ('22222222-2222-2222-2222-000000000021', 'dbt Models & Lineage', '11111111-1111-1111-1111-000000000002'),
  ('22222222-2222-2222-2222-000000000022', 'Databricks Jobs API', '11111111-1111-1111-1111-000000000002'),
  -- Thư mục con của 03. Serving Layer
  ('22222222-2222-2222-2222-000000000031', 'External Tables DDL', '11111111-1111-1111-1111-000000000003'),
  -- Thư mục con của 04. Semantic Layer
  ('22222222-2222-2222-2222-000000000041', 'AAS Models & DAX', '11111111-1111-1111-1111-000000000004'),
  ('22222222-2222-2222-2222-000000000042', 'Refresh Schedules', '11111111-1111-1111-1111-000000000004'),
  -- Thư mục con của 05. BI Reporting
  ('22222222-2222-2222-2222-000000000051', 'Power BI QC Checklists', '11111111-1111-1111-1111-000000000005');

-- 3. Tạo sẵn các file Hướng dẫn vận hành đặt vào các Thư mục tương ứng
insert into public.wiki_documents (id, folder_id, title, slug, content, file_url) values
  -- File đặt trong 01. Extraction -> AX ERP Source DB
  (
    '33333333-3333-3333-3333-000000000001',
    '22222222-2222-2222-2222-000000000012',
    'AX Data Extraction Setup & Troubleshooting',
    'ax-data-extraction-guide',
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
  
  -- File đặt trong 02. dbt -> Databricks Jobs API
  (
    '33333333-3333-3333-3333-000000000002',
    '22222222-2222-2222-2222-000000000022',
    'Synapse Trigger Databricks Job API Integration',
    'synapse-databricks-trigger-api',
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

  -- File đặt trong 02. dbt -> dbt Models & Lineage
  (
    '33333333-3333-3333-3333-000000000003',
    '22222222-2222-2222-2222-000000000021',
    'dbt Transformations on Azure Databricks (Bronze -> Gold)',
    'dbt-transformations-databricks',
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

  -- File đặt trong 03. Serving -> External Tables DDL
  (
    '33333333-3333-3333-3333-000000000004',
    '22222222-2222-2222-2222-000000000031',
    'Synapse Serverless External Tables Configuration',
    'synapse-external-tables-config',
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

  -- File đặt trong 04. Semantic -> Refresh Schedules
  (
    '33333333-3333-3333-3333-000000000005',
    '22222222-2222-2222-2222-000000000042',
    'Analysis Services Tabular Model Processing Runbook',
    'analysis-services-tabular-processing',
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

  -- File đặt trong 05. Reporting -> Power BI QC Checklists
  (
    '33333333-3333-3333-3333-000000000006',
    '22222222-2222-2222-2222-000000000051',
    'Power BI Live Connection & Report Updates Guidelines',
    'power-bi-live-connection-guidelines',
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
-- BƯỚC 4: TẠO USER LADOCHOI ĐỒNG BỘ HOÀN CHỈNH (BYPASS CONFIRMATION)
-- LƯU Ý: ĐỂ CHẮC CHẮN TRÁNH LỖI SCHEMA, CHÚNG TA THÊM ĐẦY ĐỦ CÁC CỘT HỆ THỐNG
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
  phone,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ladochoi@gmail.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"CoolBlood"}',
  now(),
  now(),
  false,
  null,
  '',
  '',
  '',
  ''
);
