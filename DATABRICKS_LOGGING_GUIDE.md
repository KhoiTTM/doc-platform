# 📘 Hướng dẫn Tích hợp & Đẩy Log từ Azure Databricks sang Supabase
> **Dành cho Data Engineer / DataOps** để giám sát tự động trạng thái vận hành của Spark Cluster, dbt Transformation và các tiến trình ETL của hệ thống AX Data Platform.

Khi Azure Databricks thực thi các Job (notebook, file python hoặc dbt run), chúng ta có thể đẩy nhật ký (telemetry logs) trực tiếp vào bảng `databricks_job_logs` trên Supabase. Vì Supabase cung cấp một REST API (thông qua PostgREST) cực kỳ gọn nhẹ, cách tối ưu nhất là sử dụng thư viện **Python Requests** (không cần cài driver JDBC cồng kềnh).

Dưới đây là 3 phương pháp tích hợp thực tế kèm theo code mẫu chi tiết.

---

## 🔒 1. Quản lý Bảo mật Thông tin (Khuyến nghị)
Không bao giờ được hardcode **Supabase URL** và **Anon Key** trực tiếp vào Notebook. Hãy lưu trữ chúng vào **Azure Key Vault**, sau đó liên kết với Databricks thông qua **Secret Scope**.

Trong Databricks Notebook, lấy thông tin bảo mật bằng cách sử dụng `dbutils`:
```python
# Lấy thông tin kết nối từ Azure Key Vault qua Secret Scope của Databricks
SUPABASE_URL = dbutils.secrets.get(scope="kv-doc-platform-scope", key="supabase-url")
SUPABASE_KEY = dbutils.secrets.get(scope="kv-doc-platform-scope", key="supabase-anon-key")
```

---

## 🐍 Phương pháp 1: Sử dụng Python Requests (Tối ưu & Gọn nhẹ nhất)
Đây là cách khuyên dùng cho các Databricks Notebook viết bằng **PySpark / Python**. 

Đoạn code dưới đây định nghĩa một Lớp Tiện ích (`SupabaseLogger`) giúp ghi nhận mốc thời gian bắt đầu, tính toán thời gian chạy (duration) và đẩy log lên Supabase một cách bất đồng bộ để **không bao giờ làm gián đoạn (crash) pipeline chính** nếu mạng bị lỗi.

### Code mẫu trong Databricks Notebook:

```python
import time
import requests
from datetime import datetime, timezone

class SupabaseLogger:
    def __init__(self, supabase_url, supabase_key, job_name):
        self.supabase_url = supabase_url.rstrip('/')
        self.supabase_key = supabase_key
        self.job_name = job_name
        self.endpoint = f"{self.supabase_url}/rest/v1/databricks_job_logs"
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal" # Tối ưu hóa hiệu năng, giảm băng thông phản hồi
        }
        self.start_time = None
        self.started_at_str = None

    def start(self):
        """Đánh dấu bắt đầu tiến trình"""
        self.start_time = time.time()
        self.started_at_str = datetime.now(timezone.utc).isoformat()
        
        # Ghi nhận log trạng thái 'running' ban đầu
        self.log(
            status="running",
            severity="INFO",
            duration=0,
            message=f"Pipeline '{self.job_name}' đã được kích hoạt thành công trên Spark cluster."
        )

    def log(self, status, severity, duration, message):
        """Đẩy log trực tiếp lên Supabase"""
        payload = {
            "job_name": self.job_name,
            "status": status,          # 'success' | 'failed' | 'running'
            "severity": severity,      # 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
            "duration": int(duration), # Thời gian tính bằng giây
            "started_at": self.started_at_str or datetime.now(timezone.utc).isoformat(),
            "message": str(message)
        }
        
        try:
            # Gửi HTTP POST request tới API của Supabase
            response = requests.post(
                url=self.endpoint,
                headers=self.headers,
                json=payload,
                timeout=10 # Tránh treo tiến trình ETL chính nếu mất kết nối
            )
            response.raise_for_status()
        except Exception as e:
            # Phòng thủ lỗi: chỉ in ra màn hình cảnh báo, không để lỗi đẩy log làm sập cả Job ETL chính
            print(f"[Supabase Logging Warning]: Không thể đẩy log lên Supabase: {str(e)}")

    def stop_with_success(self, success_message="Tiến trình hoàn thành xuất sắc!"):
        """Đánh dấu kết thúc thành công"""
        duration = time.time() - self.start_time if self.start_time else 0
        self.log(
            status="success",
            severity="INFO",
            duration=duration,
            message=success_message
        )

    def stop_with_failure(self, error_message, severity="ERROR"):
        """Đánh dấu kết thúc thất bại"""
        duration = time.time() - self.start_time if self.start_time else 0
        self.log(
            status="failed",
            severity=severity,
            duration=duration,
            message=f"🚨 Tiến trình bị hủy do gặp lỗi nghiêm trọng!\nChi tiết: {error_message}"
        )

# ==========================================
# SỬ DỤNG THỰC TẾ TRONG PIPELINE INGESTION:
# ==========================================

# 1. Khởi tạo logger
logger = SupabaseLogger(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_KEY,
    job_name="AX-Bronze-Ingestion"
)

# 2. Đánh dấu bắt đầu chạy
logger.start()

try:
    # ----------------------------------------------------
    # KHU VỰC CHẠY CODE PYSPARK CHÍNH CỦA BẠN:
    print("Đang đọc dữ liệu từ nguồn AX ERP...")
    # df = spark.read.format("sqlserver").load()
    time.sleep(5) # Giả lập tiến trình đọc dữ liệu mất 5 giây
    
    print("Đang ghi dữ liệu vào Delta Lakehouse Bronze...")
    # df.write.format("delta").mode("append").save("/mnt/bronze/erp_orders")
    # ----------------------------------------------------
    
    # 3. Ghi log thành công
    logger.stop_with_success("Đã tải thành công 45,210 dòng dữ liệu từ AX ERP vào Bronze Lakehouse.")

except Exception as ex:
    # 4. Ghi log thất bại nếu gặp lỗi trong try block
    logger.stop_with_failure(error_message=str(ex), severity="CRITICAL")
    raise ex
```

---

## 🗃️ Phương pháp 2: Sử dụng JDBC / Spark PostgreSQL Connector
Nếu anh muốn ghi log trực tiếp bằng DataFrame của Spark SQL, anh có thể sử dụng driver PostgreSQL của Spark.

> [!NOTE]
> Để dùng cách này, Cluster Databricks của anh cần được cấu hình mở cổng kết nối tới Port `5432` của database Supabase và đã cài đặt thư viện Maven `org.postgresql:postgresql` trên cluster.

### Code mẫu ghi log bằng Spark Write:

```python
# Tạo DataFrame log bằng PySpark
log_data = [(
    "dbt-Silver-Incremental-Core",
    "success",
    "INFO",
    124, # duration tính theo giây
    datetime.now(),
    "Spark SQL job hoàn tất kết xuất dữ liệu sang Silver Delta Table."
)]

columns = ["job_name", "status", "severity", "duration", "started_at", "message"]
log_df = spark.createDataFrame(log_data, schema=columns)

# Cấu hình kết nối Database Supabase
db_properties = {
    "user": "postgres.your-supabase-project-id", # Lấy thông tin từ Supabase Database Settings
    "password": "your-db-password",
    "driver": "org.postgresql.Driver"
}
jdbc_url = "jdbc:postgresql://db.your-supabase-project-id.supabase.co:5432/postgres"

# Ghi đè hoặc append vào bảng databricks_job_logs
log_df.write \
    .jdbc(url=jdbc_url, table="public.databricks_job_logs", properties=db_properties, mode="append")
```

---

## 🛠️ Phương pháp 3: Sử dụng post-hook trong dbt (Data Build Tool)
Nếu Databricks Job của anh được điều khiển bằng **dbt**, anh có thể chèn log trực tiếp sau khi hoàn thành chạy các models (dbt run) thông qua cấu hình **post-hook** trong tệp `dbt_project.yml`.

> [!TIP]
> Phương pháp này phù hợp cho việc giám sát tự động các tầng Silver/Gold khi biên dịch bảng logic.

### Cấu hình trong `dbt_project.yml`:

```yaml
# Mỗi khi dbt hoàn tất chạy mô hình, tự động chèn 1 bản ghi vào Supabase
models:
  ax_data_platform:
    +post-hook:
      - "INSERT INTO public.databricks_job_logs (job_name, status, severity, duration, started_at, message) 
         VALUES ('dbt-Silver-Transformation', 'success', 'INFO', 45, CURRENT_TIMESTAMP, 'dbt compiled successfully. Materialized schema {{ this.name }} to Delta Table format.')"
```

---

## 🔍 Kiểm tra trạng thái trên Cổng thông tin (Work OS Portal)
Sau khi thiết lập một trong các phương pháp trên, các bản ghi log từ Azure Databricks sẽ ngay lập tức:
1.  **Được chèn thời gian thực** vào cơ sở dữ liệu Supabase.
2.  **Được tải lại tự động** trên trang **"Giám sát Databricks"** của Work OS Portal sau mỗi 10 giây.
3.  **Tự động cập nhật tỉ lệ thành công** và thời gian chạy trung bình của hệ thống Data Platform tại Dashboard chính!
