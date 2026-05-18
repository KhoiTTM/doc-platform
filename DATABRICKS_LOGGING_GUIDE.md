# Hướng dẫn Tích hợp & Đẩy Log từ Azure Databricks sang Supabase (WorkOS Portal)
> **Dành cho Data Engineer / DataOps** để giám sát tự động trạng thái vận hành của Spark Cluster, dbt Ingestion và các tiến trình ETL của hệ thống AX Data Platform.

Để tích hợp hệ thống Azure Databricks vào cổng giám sát tập trung **WorkOS Platform**, các bản ghi nhật ký vận hành cần được đẩy trực tiếp vào bảng **`platform_monitor_logs`** trên Supabase. 

Do bảng `platform_monitor_logs` đã được hợp nhất hóa để phục vụ đa nguồn (Databricks, Azure ADF, Synapse, Power BI), các tiến trình Databricks **bắt buộc phải cung cấp đầy đủ các cột phân lớp** (`source`, `category`) để tránh lỗi vi phạm ràng buộc `NOT NULL` của Database.

Dưới đây là các phương pháp tích hợp thực tế đã được chuẩn hóa.

---

## 🔒 1. Quản lý Bảo mật Thông tin (Khuyến nghị)
Không bao giờ được hardcode trực tiếp **Supabase URL** và **Anon Key** vào Notebook. Hãy lưu trữ chúng vào **Azure Key Vault**, sau đó liên kết với Databricks thông qua **Secret Scope**.

```python
# Lấy thông tin kết nối an toàn từ Secret Scope của Databricks
SUPABASE_URL = dbutils.secrets.get(scope="kv-doc-platform-scope", key="supabase-url")
SUPABASE_KEY = dbutils.secrets.get(scope="kv-doc-platform-scope", key="supabase-anon-key")
```

---

## 🐍 Phương pháp 1: Sử dụng Python Requests (Khuyên dùng)
Đây là cách tối ưu nhất cho các Databricks Notebook chạy **PySpark / Python**. Sử dụng thư viện `requests` giúp đẩy log cực nhanh qua REST API mà không cần cài driver JDBC cồng kềnh.

Lớp tiện ích `SupabaseWorkOSLogger` dưới đây được thiết kế defensive: **bắt toàn bộ ngoại lệ kết nối mạng để không bao giờ làm gián đoạn hay crash pipeline dữ liệu chính của bạn** nếu Supabase gặp sự cố.

### Code mẫu chuẩn hóa trong Databricks Notebook:

```python
import time
import requests
from datetime import datetime, timezone

class SupabaseWorkOSLogger:
    def __init__(self, supabase_url, supabase_key, job_name, category="job_run"):
        self.supabase_url = supabase_url.rstrip('/')
        self.supabase_key = supabase_key
        self.job_name = job_name
        self.category = category  # 'job_run' | 'cost_daily' | 'idle_session' | 'table_freshness' | 'pipeline'
        self.endpoint = f"{self.supabase_url}/rest/v1/platform_monitor_logs"
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal" # Tối ưu hóa băng thông & tốc độ phản hồi
        }
        self.start_time = None
        self.started_at_str = None

    def start(self):
        """Đánh dấu bắt đầu tiến trình chạy"""
        self.start_time = time.time()
        self.started_at_str = datetime.now(timezone.utc).isoformat()
        
        # Ghi nhận log trạng thái 'running' ban đầu lên portal
        self.log(
            status="running",
            severity="INFO",
            duration=0,
            message=f"Pipeline '{self.job_name}' đã được kích hoạt thành công trên Spark cluster."
        )

    def log(self, status, severity="INFO", duration=0, message="", metric_value=None):
        """Đẩy log trực tiếp lên bảng platform_monitor_logs của Supabase"""
        payload = {
            "source": "databricks",        # Bắt buộc cho việc định tuyến sang tab Databricks
            "category": self.category,      # Bắt buộc (ví dụ: 'job_run')
            "job_name": self.job_name,      # Tên Job hiển thị trên Dashboard
            "status": status,              # 'success' | 'failed' | 'running' | 'warning'
            "severity": severity,          # 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
            "duration": int(duration),     # Thời gian chạy (giây)
            "started_at": self.started_at_str or datetime.now(timezone.utc).isoformat(),
            "message": str(message),
            "metric_value": metric_value   # Giá trị số tùy chọn (ví dụ: chi phí USD, hoặc giờ trễ dữ liệu)
        }
        
        try:
            response = requests.post(
                url=self.endpoint,
                headers=self.headers,
                json=payload,
                timeout=10 # Timeout 10s tránh làm treo tiến trình ETL chính
            )
            response.raise_for_status()
        except Exception as e:
            # Chỉ ghi nhận cảnh báo ra log cluster, tuyệt đối không để crash pipeline chính
            print(f"[Supabase Ingestion Warning]: Không thể đẩy log lên WorkOS Portal: {str(e)}")

    def stop_with_success(self, success_message="Tiến trình hoàn thành xuất sắc!", metric_value=None):
        """Kết thúc và ghi log thành công"""
        duration = time.time() - self.start_time if self.start_time else 0
        self.log(
            status="success",
            severity="INFO",
            duration=duration,
            message=success_message,
            metric_value=metric_value
        )

    def stop_with_failure(self, error_message, severity="ERROR", metric_value=None):
        """Kết thúc và ghi log lỗi"""
        duration = time.time() - self.start_time if self.start_time else 0
        self.log(
            status="failed",
            severity=severity,
            duration=duration,
            message=f"🚨 Tiến trình bị hủy do lỗi nghiêm trọng!\nChi tiết: {error_message}",
            metric_value=metric_value
        )
```

### Sử dụng thực tế trong Databricks Notebook:

```python
# 1. Khởi tạo logger giám sát chạy Job ETL
logger = SupabaseWorkOSLogger(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_KEY,
    job_name="Databricks-Gold-FactSales-Update",
    category="job_run"
)

# 2. Đánh dấu chạy và push log 'running'
logger.start()

try:
    # ----------------------------------------------------
    # KHU VỰC THỰC THI PYSPARK CODE CHÍNH CỦA BẠN:
    print("Đang đọc Delta tables Silver...")
    # df_silver = spark.read.table("silver.sales_orders")
    time.sleep(6) # Giả lập Spark Transformation chạy 6 giây
    
    # Ghi nhận kết quả
    rows_written = 24500
    # ----------------------------------------------------
    
    # 3. Gửi thông tin thành công lên WorkOS Portal
    logger.stop_with_success(
        success_message=f"Hoàn thành tổng hợp dữ liệu Gold FactSales. Ghi thành công {rows_written:,} dòng dữ liệu.",
        metric_value=rows_written
    )

except Exception as ex:
    # 4. Ghi nhận sự cố lập tức lên Incident Dashboard của WorkOS
    logger.stop_with_failure(error_message=str(ex), severity="CRITICAL")
    raise ex
```

---

## 🗃️ Phương pháp 2: Sử dụng JDBC / Spark PostgreSQL Connector
Nếu muốn ghi log trực tiếp qua Spark DataFrame, bạn có thể ghi dữ liệu Spark DataFrame trực tiếp vào bảng Postgres `public.platform_monitor_logs`.

> [!IMPORTANT]
> Databricks Cluster cần được mở Port `5432` đi ra ngoài internet và đã cài thư viện Maven `org.postgresql:postgresql` trên cluster.

```python
from datetime import datetime
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, TimestampType

# 1. Định nghĩa Schema khớp chính xác với bảng platform_monitor_logs
schema = StructType([
    StructField("source", StringType(), False),
    StructField("category", StringType(), False),
    StructField("job_name", StringType(), False),
    StructField("status", StringType(), False),
    StructField("severity", StringType(), True),
    StructField("duration", IntegerType(), True),
    StructField("started_at", TimestampType(), True),
    StructField("message", StringType(), True),
    StructField("metric_value", DoubleType(), True)
])

# 2. Tạo record log
log_data = [(
    "databricks",
    "job_run",
    "Spark-Bronze-AX-Customers",
    "success",
    "INFO",
    184, 
    datetime.now(),
    "Spark SQL job hoàn tất kết xuất dữ liệu khách hàng từ AX ERP sang Delta Table.",
    15420.0 # Lưu trữ metric dòng dữ liệu
)]

log_df = spark.createDataFrame(log_data, schema=schema)

# 3. Cấu hình kết nối PostgreSQL Supabase
db_properties = {
    "user": "postgres.ljqycbcvqfdgekufwolw", # Dự án Supabase của bạn
    "password": "YOUR_DATABASE_PASSWORD",
    "driver": "org.postgresql.Driver"
}
jdbc_url = "jdbc:postgresql://db.ljqycbcvqfdgekufwolw.supabase.co:5432/postgres"

# Ghi DataFrame trực tiếp vào bảng
log_df.write \
    .jdbc(url=jdbc_url, table="public.platform_monitor_logs", properties=db_properties, mode="append")
```

---

## 🛠️ Phương pháp 3: Sử dụng post-hook trong dbt (Data Build Tool)
Nếu Databricks orchestrator của bạn được vận hành bằng **dbt CLI**, bạn có thể cấu hình tự động chèn log vào Supabase sau mỗi lần mô hình biên dịch hoàn tất thông qua cài đặt `post-hook` trong file `dbt_project.yml`.

### Cấu hình trong `dbt_project.yml`:

```yaml
models:
  ax_data_platform:
    +post-hook:
      - "INSERT INTO public.platform_monitor_logs (source, category, job_name, status, severity, duration, started_at, message, metric_value) 
         VALUES ('databricks', 'job_run', 'dbt-Gold-Analytics-Compile', 'success', 'INFO', 45, CURRENT_TIMESTAMP, 'dbt compiled successfully. Materialized schema {{ this.name }} to Lakehouse Delta format.', 0)"
```

---

## 🔍 Kiểm tra trạng thái trên Cổng thông tin (WorkOS Portal)
Sau khi thiết lập, các bản ghi log từ Azure Databricks sẽ ngay lập tức:
1. **Được chèn thời gian thực** vào Supabase.
2. **Được hiển thị trực quan** ngay lập tức trên trang **"Giám sát Logs"** nhờ kết nối WebSockets thời gian thực siêu nhạy.
3. **Cập nhật KPIs tức thì** trên màn hình Tổng Quan giúp các kỹ sư dữ liệu nắm bắt tức thì tình trạng sức khỏe của hệ thống!
