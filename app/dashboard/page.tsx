"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Activity, 
  ExternalLink, 
  Layers, 
  BookOpen, 
  ArrowRight,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Table as TableIcon,
  Code as CodeIcon,
  List as ListIcon,
  Paintbrush,
  AlignCenter,
  AlertTriangle,
  Image as ImageIcon,
  LayoutDashboard,
  CheckCircle,
  CheckSquare,
  Briefcase,
  Flame,
  Search,
  Check,
  FileCode,
  Cpu,
  Terminal,
  RefreshCw,
  Play,
  DollarSign,
  Settings,
  BarChart3,
  Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Global constant for ETL pipeline steps
const etlSteps = [
  { num: 1, name: "Bronze Extraction", platform: "Azure Synapse / AX DB", folderId: "11111111-1111-1111-1111-000000000001" },
  { num: 2, name: "Databricks Trigger", platform: "API Integration", folderId: "22222222-2222-2222-2222-000000000022" },
  { num: 3, name: "dbt Transformation", platform: "Databricks Silver/Gold", folderId: "11111111-1111-1111-1111-000000000002" },
  { num: 4, name: "Serving Layer", platform: "Synapse Serverless External", folderId: "11111111-1111-1111-1111-000000000003" },
  { num: 5, name: "Semantic AAS", platform: "Analysis Services Model", folderId: "11111111-1111-1111-1111-000000000004" },
  { num: 6, name: "Power BI Live", platform: "Power BI Live reports", folderId: "11111111-1111-1111-1111-000000000005" },
];

// Types
interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
}

interface DocumentType {
  id: string;
  folder_id: string | null;
  title: string;
  slug: string;
  content: string;
  file_url: string | null;
  updated_at: string;
}

interface TaskType {
  id: string;
  title: string;
  due_date: string;
  status: string; // 'todo' or 'done'
  assignee: string;
  bu: string;
  requester: string;
  request_date: string;
  completion_date: string | null;
  details_markdown: string;
}

interface ProjectType {
  id: string;
  name: string;
  department: string;
  goals: string;
  brd_content: string;
  lineage: string;
  bi_link: string;
}

interface IncidentType {
  id: string;
  title: string;
  symptom: string;
  root_cause: string;
  fix_logic: string;
  status: string; // 'pending' or 'fixed'
  created_at: string;
}

interface DatabricksLogType {
  id: string;
  created_at: string;
  source: 'databricks' | 'azure' | 'synapse' | 'powerbi';
  category: string;
  job_name: string;
  status: 'success' | 'failed' | 'running' | 'warning';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  duration: number;
  started_at: string;
  message: string;
  metric_value: number | null;
}



export default function DashboardPage() {
  const supabase = createClient();
  
  // Core Data States
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [incidents, setIncidents] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab Control
  const [activeTab, setActiveTab] = useState<"home" | "operations" | "projects" | "incidents" | "wiki" | "databricks">("databricks");

  // Databricks Logs Telemetry states
  const [databricksLogs, setDatabricksLogs] = useState<DatabricksLogType[]>([]);
  const [dbLogsLoading, setDbLogsLoading] = useState(false);
  const [dbLogsFilterStatus, setDbLogsFilterStatus] = useState<string>("all");
  const [dbLogsFilterSeverity, setDbLogsFilterSeverity] = useState<string>("all");
  const [dbLogsFilterPlatform, setDbLogsFilterPlatform] = useState<string>("all");
  const [dbLogsSearch, setDbLogsSearch] = useState<string>("");
  const [dbSubTab, setDbSubTab] = useState<"dashboard" | "logs" | "cost" | "jobs" | "settings">("dashboard");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProject, setActiveProject] = useState<ProjectType | null>(null);

  // Wiki Tree & Navigation States
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "11111111-1111-1111-1111-000000000001": true, // Auto-expand chặng 1
    "11111111-1111-1111-1111-000000000002": true, // Auto-expand chặng 2
  });
  const [activeDoc, setActiveDoc] = useState<DocumentType | null>(null);

  // Wiki Creation & Editing States
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creatingDocFolderId, setCreatingDocFolderId] = useState<string | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  // Operations (Tasks) Form States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskBU, setNewTaskBU] = useState("Data Engineering");
  const [newTaskRequester, setNewTaskRequester] = useState("CoolBlood");
  const [taskCreateLoading, setTaskCreateLoading] = useState(false);

  // Active Task Detail Workspace States
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskBU, setEditTaskBU] = useState("");
  const [editTaskRequester, setEditTaskRequester] = useState("");
  const [editTaskMarkdown, setEditTaskMarkdown] = useState("");

  // Incidents Form States
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentSymptom, setNewIncidentSymptom] = useState("");
  const [newIncidentRootCause, setNewIncidentRootCause] = useState("");
  const [newIncidentFixLogic, setNewIncidentFixLogic] = useState("");
  const [newIncidentStatus, setNewIncidentStatus] = useState("fixed");
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  // Fetch all databases - Decoupled to run exactly once and protect performance
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: foldersData } = await supabase.from("folders").select("*").order("name");
      const { data: docsData } = await supabase.from("wiki_documents").select("*").order("title");
      
      // Safely fetch additional tables (allowing graceful degradation if tables are still generating)
      const { data: tasksData } = await supabase.from("daily_tasks").select("*").order("due_date", { ascending: false });
      const { data: projectsData } = await supabase.from("projects").select("*").order("name");
      const { data: incidentsData } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });

      setFolders(foldersData || []);
      setDocuments(docsData || []);
      setTasks(tasksData || []);
      setProjects(projectsData || []);
      setIncidents(incidentsData || []);

      // Pre-select first project
      if (projectsData && projectsData.length > 0 && !activeProject) {
        setActiveProject(projectsData[0]);
      }
    } catch (err) {
      console.error("Error loading operational databases:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ==================== WORKOS TELEMETRY LOGS WORKSPACE ====================

  // Fetch all platform telemetry logs from Supabase public.platform_monitor_logs
  const loadDatabricksLogs = useCallback(async () => {
    try {
      setDbLogsLoading(true);
      const { data, error } = await supabase
        .from("platform_monitor_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("platform_monitor_logs table not active yet or error. Clean empty state.", error);
        setDatabricksLogs([]);
      } else {
        setDatabricksLogs((data as DatabricksLogType[]) || []);
      }
    } catch (err) {
      console.warn("Error running platform logs fetch:", err);
      setDatabricksLogs([]);
    } finally {
      setDbLogsLoading(false);
    }
  }, [supabase]);

  // Load logs initially
  useEffect(() => {
    loadDatabricksLogs();
  }, [loadDatabricksLogs]);

  // Auto-refresh fallback every 1 hour (3600s)
  useEffect(() => {
    const timer = setInterval(() => {
      loadDatabricksLogs();
    }, 3600000);

    return () => clearInterval(timer);
  }, [loadDatabricksLogs]);

  // Supabase Real-time WebSocket Subscription
  useEffect(() => {
    const channel = supabase
      .channel("monitor-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_monitor_logs" },
        (payload) => {
          setDatabricksLogs(prev => {
            if (prev.some(log => log.id === payload.new.id)) return prev;
            return [payload.new as DatabricksLogType, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Quick Action: Simulate & Trigger Pipeline Log based on WorkOS specification
  async function handleTriggerJob(jobName: string) {
    let source: "databricks" | "azure" | "synapse" | "powerbi" = "databricks";
    let category = "job_run";
    let status: "success" | "failed" | "running" | "warning" = "running";
    let severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO";
    let duration = 0;
    let message = "";
    let metricValue: number | null = null;

    if (jobName.includes("ADF:") || jobName.includes("azure")) {
      source = "azure";
      category = "resource_health";
      status = "success";
      severity = "INFO";
      message = `Azure Resource health status updated for '${jobName}'. SLA verified at 99.99%.`;
    } else if (jobName.includes("PowerBI:") || jobName.includes("pbi")) {
      source = "powerbi";
      category = "dataset_refresh";
      status = "failed";
      severity = "ERROR";
      duration = 45;
      metricValue = 45.0;
      message = `Dataset refresh failed: Timeout after 45s. SQL Server connection timeout exceeded.`;
    } else if (jobName.includes("Synapse:") || jobName.includes("syn")) {
      source = "synapse";
      category = "pipeline_run";
      status = "success";
      severity = "INFO";
      duration = 320;
      message = `Pipeline run finished successfully. Duration: 320s. 15,420 records synchronized.`;
    } else if (jobName.includes("Anomaly") || jobName.includes("cost")) {
      source = "databricks";
      category = "cost_daily";
      status = "warning";
      severity = "WARNING";
      metricValue = 23.81;
      message = "Daily workspace cost: $23.81 (7d avg: $6.20) ANOMALY: 3.8x average!";
    } else {
      source = "databricks";
      category = "job_run";
      status = "success";
      severity = "INFO";
      duration = 996;
      message = "Job 'dbt_update_data' completed successfully. Duration: 996s. 45,210 rows synchronized.";
    }

    const newLog = {
      source,
      category,
      job_name: jobName,
      status,
      severity,
      duration,
      started_at: new Date().toISOString(),
      message,
      metric_value: metricValue
    };

    try {
      const { data, error } = await supabase
        .from("platform_monitor_logs")
        .insert(newLog)
        .select()
        .single();

      if (!error && data) {
        setDatabricksLogs(prev => [data as DatabricksLogType, ...prev]);
      } else {
        const localLog: DatabricksLogType = {
          id: `local-${Math.random().toString(36).substring(2)}`,
          created_at: new Date().toISOString(),
          ...newLog
        };
        setDatabricksLogs(prev => [localLog, ...prev]);
      }
    } catch {
      const localLog: DatabricksLogType = {
        id: `local-${Math.random().toString(36).substring(2)}`,
        created_at: new Date().toISOString(),
        ...newLog
      };
      setDatabricksLogs(prev => [localLog, ...prev]);
    }
  }

  // Quick Action: Clear all logs
  async function handleResetLogs() {
    try {
      await supabase.from("platform_monitor_logs").delete().neq("id", "0");
      setDatabricksLogs([]);
    } catch {
      setDatabricksLogs([]);
    }
  }

  // Folder Actions
  async function handleCreateFolder(parentId: string | null) {
    if (!newFolderName.trim()) return;
    try {
      const { error } = await supabase.from("folders").insert({
        name: newFolderName.trim(),
        parent_id: parentId
      });
      if (error) throw error;
      setNewFolderName("");
      setCreatingFolderParentId(undefined);
      await loadData();
    } catch (err) {
      alert("Lỗi khi tạo thư mục!");
      console.error(err);
    }
  }

  // Document Actions
  async function handleCreateDocument(folderId: string | null) {
    if (!newDocTitle.trim()) return;
    try {
      const slug = newDocTitle.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      const { data, error } = await supabase.from("wiki_documents").insert({
        title: newDocTitle.trim(),
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
        folder_id: folderId,
        content: `# ${newDocTitle.trim()}\n\n*Bắt đầu soạn thảo tài liệu vận hành tại đây...*`
      }).select().single();

      if (error) throw error;
      setNewDocTitle("");
      setCreatingDocFolderId(undefined);
      await loadData();
      setActiveDoc(data);
      setIsEditing(true);
      setEditTitle(data.title);
      setEditContent(data.content);
      setEditFileUrl(data.file_url || "");
      setEditFolderId(data.folder_id);
    } catch (err) {
      alert("Lỗi khi tạo tài liệu!");
      console.error(err);
    }
  }

  // Update Actions
  async function handleUpdateDocument() {
    if (!activeDoc) return;
    try {
      const { error } = await supabase.from("wiki_documents").update({
        title: editTitle.trim(),
        content: editContent,
        file_url: editFileUrl.trim() || null,
        folder_id: editFolderId
      }).eq("id", activeDoc.id);

      if (error) throw error;
      
      setActiveDoc(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        content: editContent,
        file_url: editFileUrl.trim() || null,
        folder_id: editFolderId,
        updated_at: new Date().toISOString()
      } : null);

      setIsEditing(false);
      await loadData();
    } catch (err) {
      alert("Lỗi khi cập nhật tài liệu!");
      console.error(err);
    }
  }

  // Delete Actions
  async function handleDeleteDocument(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) return;
    try {
      const { error } = await supabase.from("wiki_documents").delete().eq("id", id);
      if (error) throw error;
      setActiveDoc(null);
      setIsEditing(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const startEditing = (doc: DocumentType) => {
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditFileUrl(doc.file_url || "");
    setEditFolderId(doc.folder_id);
    setIsEditing(true);
  };

  // Live Markdown Insertion helper
  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setEditContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // Live Markdown Insertion helper for Tasks
  const insertTaskMarkdown = (before: string, after: string = "") => {
    const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setEditTaskMarkdown(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // Image Upload and Local Picker States
  const [imageTarget, setImageTarget] = useState<"wiki" | "task" | null>(null);

  const triggerImagePicker = (target: "wiki" | "task") => {
    setImageTarget(target);
    setTimeout(() => {
      document.getElementById("image-file-picker")?.click();
    }, 50);
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let imageUrl = "";

      // 1. Try uploading to Supabase public bucket "wiki"
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from("wiki")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from("wiki")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      } else {
        // 2. Graceful Fallback: read local file as Base64 Data URL
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // 3. Insert markdown format
      const imgMarkdown = `![${file.name.split(".")[0]}](${imageUrl})`;
      if (imageTarget === "wiki") {
        insertMarkdown(imgMarkdown, "");
      } else if (imageTarget === "task") {
        insertTaskMarkdown(imgMarkdown, "");
      }
    } catch (err) {
      console.error("Error loading image file:", err);
      alert("Lỗi khi xử lý tải hình ảnh!");
    } finally {
      setImageTarget(null);
      e.target.value = "";
    }
  }

  // Operations: Toggle Daily Task Status (Todo <-> Done)
  async function handleToggleTask(task: TaskType) {
    try {
      const newStatus = task.status === "todo" ? "done" : "todo";
      const completionDate = newStatus === "done" ? new Date().toISOString().split("T")[0] : null;
      const { error } = await supabase
        .from("daily_tasks")
        .update({ status: newStatus, completion_date: completionDate })
        .eq("id", task.id);
      
      if (error) throw error;
      
      // Update local state dynamically
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completion_date: completionDate } : t));
      
      // Sync active task
      if (activeTask && activeTask.id === task.id) {
        setActiveTask(prev => prev ? { ...prev, status: newStatus, completion_date: completionDate } : null);
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  }

  // Operations: Create operational task
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      setTaskCreateLoading(true);
      const { data, error } = await supabase
        .from("daily_tasks")
        .insert({
          title: newTaskTitle.trim(),
          bu: newTaskBU.trim(),
          requester: newTaskRequester.trim(),
          due_date: new Date().toISOString().split("T")[0],
          request_date: new Date().toISOString().split("T")[0],
          status: "todo"
        })
        .select()
        .single();
      
      if (error) throw error;
      setNewTaskTitle("");
      setTasks(prev => [data, ...prev]);
    } catch (err) {
      alert("Lỗi khi thêm task!");
      console.error(err);
    } finally {
      setTaskCreateLoading(false);
    }
  }

  // Operations: Update Task Details (Markdown and metadata)
  async function handleUpdateTaskDetails() {
    if (!activeTask) return;
    try {
      const { error } = await supabase
        .from("daily_tasks")
        .update({
          title: editTaskTitle.trim(),
          bu: editTaskBU.trim(),
          requester: editTaskRequester.trim(),
          details_markdown: editTaskMarkdown
        })
        .eq("id", activeTask.id);

      if (error) throw error;

      setActiveTask(prev => prev ? {
        ...prev,
        title: editTaskTitle.trim(),
        bu: editTaskBU.trim(),
        requester: editTaskRequester.trim(),
        details_markdown: editTaskMarkdown
      } : null);

      setIsEditingTask(false);
      await loadData();
    } catch (err) {
      alert("Lỗi khi cập nhật chi tiết tác vụ!");
      console.error(err);
    }
  }

  const startEditingTask = (task: TaskType) => {
    setEditTaskTitle(task.title);
    setEditTaskBU(task.bu || "Data");
    setEditTaskRequester(task.requester || "CoolBlood");
    setEditTaskMarkdown(task.details_markdown || "# Mô tả chi tiết Yêu cầu & Giải pháp...");
    setIsEditingTask(true);
  };

  // Operations: Delete task
  async function handleDeleteTask(id: string) {
    if (!confirm("Xóa tác vụ này?")) return;
    try {
      const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
      if (activeTask && activeTask.id === id) {
        setActiveTask(null);
        setIsEditingTask(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Incident: Create Incident Case
  async function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!newIncidentTitle.trim() || !newIncidentSymptom.trim() || !newIncidentRootCause.trim()) {
      alert("Vui lòng nhập đầy đủ Tiêu đề, Triệu chứng và Nguyên nhân!");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("incidents")
        .insert({
          title: newIncidentTitle.trim(),
          symptom: newIncidentSymptom.trim(),
          root_cause: newIncidentRootCause.trim(),
          fix_logic: newIncidentFixLogic.trim(),
          status: newIncidentStatus
        })
        .select()
        .single();

      if (error) throw error;
      
      // Clear forms & update local
      setNewIncidentTitle("");
      setNewIncidentSymptom("");
      setNewIncidentRootCause("");
      setNewIncidentFixLogic("");
      setNewIncidentStatus("fixed");
      setShowIncidentForm(false);
      setIncidents(prev => [data, ...prev]);
    } catch (err) {
      alert("Lỗi khi ghi nhận sự cố!");
      console.error(err);
    }
  }

  // Full-Text Search across database types
  const searchResultsDocs = searchQuery ? documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const searchResultsTasks = searchQuery ? tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const searchResultsIncidents = searchQuery ? incidents.filter(i => 
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.symptom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.root_cause.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const hasSearchResults = searchQuery && (searchResultsDocs.length > 0 || searchResultsTasks.length > 0 || searchResultsIncidents.length > 0);

  // Statistics helpers
  const todayTasks = tasks.filter(t => t.due_date === new Date().toISOString().split("T")[0]);
  const doneTasks = todayTasks.filter(t => t.status === "done").length;
  const todoTasks = todayTasks.filter(t => t.status === "todo").length;
  const activeIncidents = incidents.filter(i => i.status === "pending");

  // Group Projects by Department
  const departments = ["Finance", "Supply Chain", "Sales"];
  const getProjectsByDept = (dept: string) => projects.filter(p => p.department === dept);



  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 🧭 PERSISTENT PORTAL TABS LEFT ICON SIDEBAR */}
      <nav className="w-16 hover:w-60 border-r border-slate-900 bg-slate-950 flex flex-col items-stretch py-6 px-3.5 gap-4 shrink-0 relative z-30 transition-all duration-300 group overflow-hidden">
        {/* App Logo / Activity Icon */}
        <div className="flex items-center gap-3.5 px-1.5 mb-6 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shrink-0">
            <Activity className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <span className="font-display font-black text-xs text-white tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            WorkOS
          </span>
        </div>

        {/* Tab Buttons */}
        {[
          { id: "databricks", label: "Platform Monitor", icon: Cpu, tooltip: "Real-time logs & metrics" },
          { id: "home", label: "Dashboard Overview", icon: LayoutDashboard, tooltip: "Metrics & Status" },
          { id: "operations", label: "Daily Operations", icon: CheckSquare, tooltip: "Daily tasks" },
          { id: "projects", label: "Projects Portfolio", icon: Briefcase, tooltip: "Project tracking" },
          { id: "incidents", label: "Incidents Hub", icon: Flame, tooltip: "Active incidents", badge: activeIncidents.length },
          { id: "wiki", label: "Wiki & Knowledge", icon: BookOpen, tooltip: "Documentation & Wiki" }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as "home" | "operations" | "projects" | "incidents" | "wiki" | "databricks"); setSearchQuery(""); }}
              className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all w-full relative ${
                active
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30 border border-transparent"
              }`}
              title={tab.tooltip}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="font-mono text-[10.5px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {tab.label}
              </span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping group-hover:hidden" />
              )}
              {tab.badge && tab.badge > 0 && (
                <span className="hidden group-hover:flex items-center justify-center ml-auto px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-450 border border-rose-500/30 text-[8.5px] font-black font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* CORE WORKSPACE ROUTER */}
      <div className="flex-1 flex overflow-hidden bg-[#020617] relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="text-xs font-semibold text-slate-500">Đang đồng bộ cổng thông tin Portal...</span>
          </div>
        ) : (
          <>
            {/* ==================== TAB 1: TRANG CHỦ ==================== */}
            {activeTab === "home" && (
              <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-12">
                <div className="max-w-5xl mx-auto space-y-10">
                  {/* Hero Greetings */}
                  <div className="space-y-2">
                    <h1 className="font-display text-3xl font-black text-white tracking-tight">
                      Cổng Vận Hành <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">AX Data Portal</span>
                    </h1>
                    <p className="text-xs text-slate-400">Chào mừng trở lại, CoolBlood. Hệ thống giám sát và quản trị tự động luồng ETL của phòng Data.</p>
                  </div>

                  {/* 🔍 LARGE SEARCH BAR */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                      <Search className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm kiếm toàn văn tài liệu kỹ thuật, Daily Task hoặc Sự cố Incident..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500/80 transition-all shadow-xl shadow-slate-950/20"
                    />
                  </div>

                  {/* SEARCH RESULTS VIEW */}
                  {searchQuery && (
                    <div className="glass-card rounded-2xl border border-sky-950/20 p-6 space-y-6 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">Kết quả tìm kiếm cho: &quot;{searchQuery}&quot;</h3>
                        <button onClick={() => setSearchQuery("")} className="text-[10px] font-bold text-slate-500 hover:text-white">Xóa bộ lọc</button>
                      </div>

                      {hasSearchResults ? (
                        <div className="space-y-4">
                          {/* Matching Docs */}
                          {searchResultsDocs.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Tài liệu Wiki ({searchResultsDocs.length})</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {searchResultsDocs.map(doc => (
                                  <button
                                    key={doc.id}
                                    onClick={() => {
                                      setActiveDoc(doc);
                                      setIsEditing(false);
                                      setActiveTab("wiki");
                                    }}
                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/30 text-left transition-all"
                                  >
                                    <span className="text-xs font-bold text-slate-300 truncate pr-4">{doc.title}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-600" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Matching Tasks */}
                          {searchResultsTasks.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Daily Tasks ({searchResultsTasks.length})</span>
                              <div className="space-y-1.5">
                                {searchResultsTasks.map(task => (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-900 bg-slate-950/20"
                                  >
                                    <span className="text-xs text-slate-300 font-semibold">{task.title}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                      task.status === "done"
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                        : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                    }`}>
                                      {task.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Matching Incidents */}
                          {searchResultsIncidents.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Incident Runbooks ({searchResultsIncidents.length})</span>
                              <div className="grid grid-cols-1 gap-2">
                                {searchResultsIncidents.map(inc => (
                                  <button
                                    key={inc.id}
                                    onClick={() => setActiveTab("incidents")}
                                    className="p-3 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/30 text-left transition-all space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black text-rose-400">{inc.title}</span>
                                      <span className="text-[9px] font-bold text-slate-500">{new Date(inc.created_at).toLocaleDateString("vi-VN")}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">Symptom: {inc.symptom}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 py-4 italic text-center">Không tìm thấy kết quả nào trùng khớp.</div>
                      )}
                    </div>
                  )}

                  {/* QUICK LINKS & OPERATIONAL STATS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* STATS 1: Tasks Today */}
                    <div className="glass-card rounded-2xl border border-slate-900 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                          <CheckSquare className="h-4.5 w-4.5" />
                        </div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Tác vụ hôm nay</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-900 text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Hoàn thành</p>
                          <p className="text-lg font-black text-emerald-400 mt-1">{doneTasks}</p>
                        </div>
                        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-900 text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Còn lại</p>
                          <p className="text-lg font-black text-amber-500 mt-1">{todoTasks}</p>
                        </div>
                      </div>
                    </div>

                    {/* STATS 2: Unfixed Incidents */}
                    <div className="glass-card rounded-2xl border border-slate-900 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                          <Flame className="h-4.5 w-4.5" />
                        </div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Incident Chưa fix</h3>
                      </div>
                      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-900 flex items-center justify-between mt-2">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Sự cố đang chờ xử lý</p>
                          <p className="text-lg font-black text-rose-500 mt-1">{activeIncidents.length} Case Study</p>
                        </div>
                        {activeIncidents.length > 0 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping mr-2" />
                        )}
                      </div>
                    </div>

                    {/* QUICK LINKS */}
                    <div className="glass-card rounded-2xl border border-slate-900 p-5 space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Thao Tác Nhanh</h3>
                      <button
                        onClick={() => setActiveTab("operations")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/60 transition-all text-xs font-bold text-slate-300 hover:text-white"
                      >
                        <span>➔ Tạo nhanh Tác vụ</span>
                        <CheckSquare className="h-3.5 w-3.5 text-sky-400" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("wiki");
                          // Select Gold external schema doc
                          const dicDoc = documents.find(d => d.slug.includes("external"));
                          if (dicDoc) setActiveDoc(dicDoc);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/60 transition-all text-xs font-bold text-slate-300 hover:text-white"
                      >
                        <span>➔ Xem Data Dictionary</span>
                        <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE UNFIXED INCIDENTS WARNING FEED */}
                  {activeIncidents.length > 0 && (
                    <div className="p-5 border border-rose-900/40 rounded-2xl bg-rose-950/10 space-y-4">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <AlertTriangle className="h-4.5 w-4.5 animate-bounce" />
                        <span>CẢNH BÁO SỰ CỐ ĐANG HOẠT ĐỘNG (INCIDENTS ALERT)</span>
                      </div>
                      <div className="space-y-2">
                        {activeIncidents.map(inc => (
                          <div
                            key={inc.id}
                            className="p-4 rounded-xl border border-rose-900/30 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-black text-white">{inc.title}</p>
                              <p className="text-[10px] text-slate-400">Triệu chứng: {inc.symptom}</p>
                            </div>
                            <button
                              onClick={() => setActiveTab("incidents")}
                              className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-[10px] font-black text-white shrink-0 transition-all shadow"
                            >
                              Xử lý ngay
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ETL full diagram on main page for premium feel */}
                  <div className="space-y-3">
                    <span className="text-xs font-black tracking-wider uppercase text-slate-400">Luồng Luân Chuyển Dữ liệu (Pipeline Overview)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {etlSteps.map((step) => (
                        <div
                          key={step.num}
                          onClick={() => {
                            setActiveTab("wiki");
                            toggleFolder(step.folderId);
                            const tDoc = documents.find(d => d.folder_id === step.folderId);
                            if (tDoc) setActiveDoc(tDoc);
                          }}
                          className="p-3.5 rounded-2xl border border-slate-900 bg-slate-950/30 hover:border-slate-800 cursor-pointer text-left transition-all"
                        >
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">{step.num}</span>
                          <p className="text-xs font-black text-white mt-2.5 truncate">{step.name}</p>
                          <p className="text-[9px] text-slate-600">{step.platform}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            )}

            {/* ==================== TAB 2: VẬN HÀNH (OPERATIONS) ==================== */}
            {activeTab === "operations" && (
              <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-12">
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
                    <div className="space-y-1">
                      <h1 className="font-display text-2xl font-black text-white">Vận Hành Hệ Thống (Operations)</h1>
                      <p className="text-xs text-slate-400">Danh sách các tác vụ kiểm định chất lượng (QC) và vận hành pipeline hàng ngày.</p>
                    </div>
                  </div>

                  {activeTask ? (
                    <div className="space-y-6 animate-fade-in">
                      {/* Header with Back button */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                        <button
                          onClick={() => { setActiveTask(null); setIsEditingTask(false); }}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl"
                        >
                          <span>← Quay lại danh sách Task</span>
                        </button>
                        <div className="flex items-center gap-2">
                          {isEditingTask ? (
                            <>
                              <button
                                onClick={() => setIsEditingTask(false)}
                                className="px-4 py-1.5 rounded-xl border border-slate-900 hover:border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={handleUpdateTaskDetails}
                                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white shadow shadow-sky-500/10 transition-all flex items-center gap-1"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Lưu Thay Đổi
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditingTask(activeTask)}
                              className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-sky-400" />
                              Chỉnh Sửa Task
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Task Details Info Drawer */}
                      <div className="glass-card rounded-2xl border border-slate-900 p-5 sm:p-6 space-y-5 bg-slate-950/20">
                        {isEditingTask ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 col-span-1 md:col-span-3">
                              <label className="text-[10px] font-black uppercase text-slate-500">Tiêu đề Tác Vụ</label>
                              <input
                                type="text"
                                value={editTaskTitle}
                                onChange={(e) => setEditTaskTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-sky-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-500">BU / Phòng ban yêu cầu</label>
                              <select
                                value={editTaskBU}
                                onChange={(e) => setEditTaskBU(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500 transition-all"
                              >
                                <option value="Data Engineering">Data Engineering</option>
                                <option value="Finance">Finance</option>
                                <option value="Supply Chain">Supply Chain</option>
                                <option value="Sales">Sales</option>
                                <option value="IT Operations">IT Operations</option>
                                <option value="Business Intelligence">Business Intelligence</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-500">Người yêu cầu</label>
                              <input
                                type="text"
                                value={editTaskRequester}
                                onChange={(e) => setEditTaskRequester(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-sky-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-500">Trạng thái hiện tại</label>
                              <div className="h-8.5 flex items-center">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                                  activeTask.status === "done"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                }`}>
                                  {activeTask.status === "done" ? "Đã hoàn thành" : "Đang xử lý (Todo)"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">BU / Phòng ban</p>
                              <p className="text-xs font-black text-white mt-1">{activeTask.bu || "Data"}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Người yêu cầu</p>
                              <p className="text-xs font-black text-white mt-1">{activeTask.requester || "CoolBlood"}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Ngày yêu cầu</p>
                              <p className="text-xs text-slate-300 mt-1">
                                {activeTask.request_date ? new Date(activeTask.request_date).toLocaleDateString("vi-VN") : new Date(activeTask.due_date).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Ngày hoàn thành</p>
                              <p className="text-xs text-slate-300 mt-1">
                                {activeTask.completion_date ? new Date(activeTask.completion_date).toLocaleDateString("vi-VN") : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">Trạng thái</p>
                              <p className="mt-1">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                  activeTask.status === "done"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                }`}>
                                  {activeTask.status}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Markdown Workspace Section */}
                      <div className="grid grid-cols-1 gap-6">
                        {isEditingTask ? (
                          <div className="space-y-3">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Đặc tả Yêu Cầu & Giải Pháp (Markdown Workspace)</span>
                            
                            {/* Live Markdown Toolbar */}
                            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-900 bg-slate-950/80">
                              <button type="button" onClick={() => insertTaskMarkdown("**", "**")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chữ Đậm"><Bold className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("*", "*")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chữ Nghiêng"><Italic className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("# ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tiêu Đề 1"><Heading1 className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("## ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tiêu Đề 2"><Heading2 className="h-3.5 w-3.5" /></button>
                              <div className="h-4 w-px bg-slate-900" />
                              <button type="button" onClick={() => insertTaskMarkdown("| Tiêu đề | Cột 2 |\n|---|---|\n| Giá trị 1 | Giá trị 2 |", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chèn Bảng"><TableIcon className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("```sql\n", "\n```")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Khối SQL Code"><CodeIcon className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("- ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Danh Sách Dòng"><ListIcon className="h-3.5 w-3.5" /></button>
                              <div className="h-4 w-px bg-slate-900" />
                              <button type="button" onClick={() => insertTaskMarkdown("<span style='color: #38bdf8'>", "</span>")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tô màu chữ Xanh"><Paintbrush className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertTaskMarkdown("<div align='center'>\n", "\n</div>")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Canh Giữa"><AlignCenter className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => triggerImagePicker("task")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chèn Hình Ảnh"><ImageIcon className="h-3.5 w-3.5" /></button>
                            </div>

                            <textarea
                              id="markdown-editor"
                              rows={16}
                              value={editTaskMarkdown}
                              onChange={(e) => setEditTaskMarkdown(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-300 outline-none focus:border-sky-500/80 transition-all placeholder:text-slate-700"
                            />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Nội Dung Yêu Cầu & Giải Pháp</span>
                            <div className="glass-card rounded-2xl border border-slate-900 p-6 sm:p-8 bg-slate-950/40 prose prose-invert prose-slate max-w-none text-slate-300">
                              <ReactMarkdown>{activeTask.details_markdown || "*Chưa có mô tả yêu cầu hoặc giải pháp được ghi lại cho task này.*"}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Create New Task Form */}
                      <form onSubmit={handleCreateTask} className="p-4 rounded-2xl border border-slate-900 bg-slate-950/40 flex flex-col md:flex-row gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Thêm tác vụ vận hành mới cho hôm nay..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500 transition-all"
                        />
                        <select
                          value={newTaskBU}
                          onChange={(e) => setNewTaskBU(e.target.value)}
                          className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-sky-500 transition-all"
                        >
                          <option value="Data Engineering">Data Engineering</option>
                          <option value="Finance">Finance</option>
                          <option value="Supply Chain">Supply Chain</option>
                          <option value="Sales">Sales</option>
                          <option value="IT Operations">IT Operations</option>
                          <option value="Business Intelligence">Business Intelligence</option>
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Người yêu cầu..."
                          value={newTaskRequester}
                          onChange={(e) => setNewTaskRequester(e.target.value)}
                          className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500 transition-all md:w-44"
                        />
                        <button
                          type="submit"
                          disabled={taskCreateLoading}
                          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white shadow shadow-sky-500/10 transition-all shrink-0 flex items-center justify-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" />
                          Thêm Tác Vụ
                        </button>
                      </form>

                      {/* Daily Tasks Table */}
                      <div className="glass-card rounded-2xl border border-slate-900 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-950/60 border-b border-slate-900 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                                <th className="p-4 w-12">Trạng thái</th>
                                <th className="p-4">Nhiệm vụ kiểm tra (Tasks)</th>
                                <th className="p-4 w-40">BU / Phòng ban</th>
                                <th className="p-4 w-40">Người yêu cầu</th>
                                <th className="p-4 w-32">Ngày yêu cầu</th>
                                <th className="p-4 w-32">Ngày hoàn thành</th>
                                <th className="p-4 text-right w-16">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 bg-slate-950/10">
                              {tasks.map(task => (
                                <tr 
                                  key={task.id} 
                                  onClick={() => {
                                    setActiveTask(task);
                                    setIsEditingTask(false);
                                  }}
                                  className="hover:bg-slate-900/40 cursor-pointer transition-all"
                                >
                                  <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleToggleTask(task)}
                                      className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all ${
                                        task.status === "done"
                                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                                          : "border-slate-800 hover:border-sky-500/50 text-transparent hover:text-slate-500"
                                      }`}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                  <td className="p-4">
                                    <span className={`font-bold transition-all ${
                                      task.status === "done" ? "text-slate-500 line-through" : "text-white"
                                    }`}>
                                      {task.title}
                                    </span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded bg-sky-950/20 border border-sky-900/40 text-[10px] text-sky-400 font-bold">
                                      {task.bu || "Data"}
                                    </span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap text-slate-300 font-medium">
                                    {task.requester || "CoolBlood"}
                                  </td>
                                  <td className="p-4 text-slate-400 whitespace-nowrap">
                                    {task.request_date ? new Date(task.request_date).toLocaleDateString("vi-VN") : new Date(task.due_date).toLocaleDateString("vi-VN")}
                                  </td>
                                  <td className="p-4 text-slate-400 whitespace-nowrap">
                                    {task.completion_date ? new Date(task.completion_date).toLocaleDateString("vi-VN") : "—"}
                                  </td>
                                  <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/10 transition-all"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {tasks.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-slate-600 italic">
                                    Không có tác vụ nào được ghi nhận.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </main>
            )}

            {/* ==================== TAB 3: DỰ ÁN (PROJECTS PORTFOLIO) ==================== */}
            {activeTab === "projects" && (
              <main className="flex-1 flex overflow-hidden">
                {/* Left Panel: Projects Accordion Group by Department */}
                <aside className="w-80 border-r border-slate-900 bg-slate-950/20 shrink-0 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-900 bg-slate-950/40 shrink-0">
                    <span className="text-xs font-black tracking-wider text-slate-400 uppercase">Các Phòng Ban (Departments)</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {departments.map(dept => {
                      const deptProjects = getProjectsByDept(dept);
                      return (
                        <div key={dept} className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 block">{dept}</span>
                          <div className="space-y-1">
                            {deptProjects.map(proj => (
                              <button
                                key={proj.id}
                                onClick={() => setActiveProject(proj)}
                                className={`w-full text-left p-3 rounded-xl border transition-all text-xs font-bold ${
                                  activeProject?.id === proj.id
                                    ? "border-sky-500/30 bg-sky-500/5 text-sky-400 shadow-md shadow-sky-500/2"
                                    : "border-slate-900 bg-slate-950/30 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                                }`}
                              >
                                {proj.name}
                              </button>
                            ))}
                            {deptProjects.length === 0 && (
                              <div className="text-[10px] text-slate-600 italic px-2">Chưa có dự án nào</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* Right Panel: Project Details */}
                <section className="flex-1 bg-slate-950/15 overflow-y-auto px-6 py-8 sm:px-12">
                  {activeProject ? (
                    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                      {/* Project Header */}
                      <div className="border-b border-slate-900/60 pb-5 space-y-2">
                        <span className="px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-black uppercase tracking-wider">
                          Phòng ban: {activeProject.department}
                        </span>
                        <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">{activeProject.name}</h1>
                      </div>

                      {/* Section 1: Goals */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">1. Mục Tiêu Dự Án (Project Goals)</span>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                          {activeProject.goals}
                        </p>
                      </div>

                      {/* Section 2: Data Lineage */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">2. Luồng Dữ Liệu (Data Lineage)</span>
                        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/30 flex flex-wrap items-center gap-2 text-xs">
                          {activeProject.lineage.split(" -> ").map((step, idx, arr) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-semibold">{step}</span>
                              {idx < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Logic documentation (BRD) */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">3. Tài Liệu Thiết Kế Logic (BRD Specs)</span>
                        <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed prose-headings:font-display prose-headings:font-black prose-headings:text-white prose-a:text-sky-400 prose-code:text-sky-300 bg-slate-950/20 p-5 border border-slate-900 rounded-xl">
                          <ReactMarkdown>{activeProject.brd_content}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Section 4: Live BI link */}
                      <div className="space-y-3 pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">4. Liên Kết Đầu Ra (Output Link)</span>
                        <a
                          href={activeProject.bi_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-xs font-black text-white shadow-lg shadow-sky-500/10 transition-all hover:scale-[1.01]"
                        >
                          LAUNCH POWER BI LIVE REPORT
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 text-xs">Chưa chọn dự án nào.</div>
                  )}
                </section>
              </main>
            )}

            {/* ==================== TAB 4: TRUNG TÂM LỖI (INCIDENT HUB) ==================== */}
            {activeTab === "incidents" && (
              <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
                    <div className="space-y-1">
                      <h1 className="font-display text-2xl font-black text-white">Trung Tâm Xử Lý Sự Cố (Incident Hub)</h1>
                      <p className="text-xs text-slate-400">Nhật ký xử lý, lưu trữ bài học kinh nghiệm và các runbook vá lỗi SQL / dbt chặng ETL.</p>
                    </div>
                    <button
                      onClick={() => setShowIncidentForm(!showIncidentForm)}
                      className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-bold text-sky-400 transition-all shrink-0"
                    >
                      {showIncidentForm ? "Đóng Form" : "➔ Khai báo Sự cố Mới"}
                    </button>
                  </div>

                  {/* Create New Incident Case Study Form */}
                  {showIncidentForm && (
                    <form onSubmit={handleCreateIncident} className="p-6 border border-slate-900 rounded-2xl bg-slate-950/60 space-y-4 animate-fade-in">
                      <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Khai báo sự cố kỹ thuật mới</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tiêu đề sự cố</label>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: Trùng lặp dữ liệu..."
                            value={newIncidentTitle}
                            onChange={(e) => setNewIncidentTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tình trạng (Status)</label>
                          <select
                            value={newIncidentStatus}
                            onChange={(e) => setNewIncidentStatus(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                          >
                            <option value="fixed">Fixed (Đã vá xong)</option>
                            <option value="pending">Pending (Đang theo dõi)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Triệu chứng lỗi (Symptom)</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Ví dụ: Báo cáo Power BI hiển thị doanh thu tăng vọt gấp đôi..."
                          value={newIncidentSymptom}
                          onChange={(e) => setNewIncidentSymptom(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nguyên nhân gốc rễ (Root Cause)</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Ví dụ: dbt incremental chạy bị trùng lặp..."
                          value={newIncidentRootCause}
                          onChange={(e) => setNewIncidentRootCause(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đoạn code SQL / Logic vá lỗi (Fix Logic)</label>
                        <textarea
                          rows={4}
                          placeholder="Nhập code SQL/Python đã sử dụng để sửa..."
                          value={newIncidentFixLogic}
                          onChange={(e) => setNewIncidentFixLogic(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 placeholder:text-slate-600 outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowIncidentForm(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow shadow-rose-500/10"
                        >
                          Khai báo & Lưu Case
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Incidents timeline feed */}
                  <div className="space-y-6">
                    {incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="relative border-l border-slate-900 pl-6 pb-2 space-y-4"
                      >
                        {/* Dot indicator */}
                        <div className={`absolute top-0.5 -left-1.5 w-3 h-3 rounded-full border ${
                          inc.status === "fixed"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                        }`} />

                        <div className="glass-card rounded-2xl border border-slate-900 p-5 sm:p-6 space-y-4 hover:border-slate-800 transition-all">
                          {/* Title block */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/60 pb-3">
                            <h3 className="text-sm font-black text-white">{inc.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                inc.status === "fixed"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                              }`}>
                                {inc.status === "fixed" ? "Vá thành công" : "Đang xử lý"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {new Date(inc.created_at).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                          </div>

                          {/* Symptom -> Root cause */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">🔴 Triệu chứng lỗi (Symptom)</span>
                              <p className="text-xs text-slate-300 leading-relaxed">{inc.symptom}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">🔍 Nguyên nhân gốc (Root Cause)</span>
                              <p className="text-xs text-slate-300 leading-relaxed">{inc.root_cause}</p>
                            </div>
                          </div>

                          {/* Fix SQL Code block */}
                          {inc.fix_logic && (
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5 text-sky-400" />
                                SQL / Logic khắc phục (Fix Logic Runbook)
                              </span>
                              <pre className="p-4 bg-slate-950 border border-slate-900 rounded-xl text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                {inc.fix_logic}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {incidents.length === 0 && (
                      <div className="text-center py-12 text-slate-600 italic">Chưa có case study sự cố nào được ghi nhận.</div>
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* ==================== TAB 5: TÀI NGUYÊN WIKI (DATA ASSETS) ==================== */}
            {activeTab === "wiki" && (
              <div className="flex-1 flex overflow-hidden animate-fade-in">
                {/* LEFT WIKI EXPLORER PANEL */}
                <aside className="w-80 border-r border-slate-900 bg-slate-950/20 shrink-0 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setActiveDoc(null); setIsEditing(false); setActiveTab("home"); }}
                        className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-900 transition-all"
                        title="Quay lại Trang chủ Summary"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                        Doc Explorer
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setCreatingFolderParentId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                        title="Tạo Thư mục Gốc"
                      >
                        <Folder className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setCreatingDocFolderId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                        title="Tạo File Gốc"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Explorer Tree List */}
                  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                    <>
                      {/* Render Root Creation inputs */}
                      {creatingFolderParentId === null && (
                        <div className="p-2 border border-slate-800 rounded-xl bg-slate-900/40 mb-2">
                          <input
                            type="text"
                            required
                            placeholder="Tên thư mục mới..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-600 outline-none mb-1.5"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setCreatingFolderParentId(undefined)} className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-white">Hủy</button>
                            <button onClick={() => handleCreateFolder(null)} className="px-2.5 py-0.5 rounded bg-sky-500 text-[10px] font-bold text-white hover:bg-sky-600">Tạo</button>
                          </div>
                        </div>
                      )}

                      {creatingDocFolderId === null && (
                        <div className="p-2 border border-slate-800 rounded-xl bg-slate-900/40 mb-2">
                          <input
                            type="text"
                            required
                            placeholder="Tên tài liệu mới..."
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-600 outline-none mb-1.5"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setCreatingDocFolderId(undefined)} className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-white">Hủy</button>
                            <button onClick={() => handleCreateDocument(null)} className="px-2.5 py-0.5 rounded bg-indigo-500 text-[10px] font-bold text-white hover:bg-indigo-600">Tạo</button>
                          </div>
                        </div>
                      )}

                      {/* FOLDERS AND DOCUMENTS TREE */}
                      {folders.filter(f => f.parent_id === null).map((rootFolder) => {
                        const isExpanded = expandedFolders[rootFolder.id];
                        const subFolders = folders.filter(sf => sf.parent_id === rootFolder.id);
                        const folderDocs = documents.filter(d => d.folder_id === rootFolder.id);

                        return (
                          <div key={rootFolder.id} className="space-y-0.5">
                            {/* Root Folder Row */}
                            <div className="group flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-900/40 transition-all">
                              <button 
                                onClick={() => toggleFolder(rootFolder.id)}
                                className="flex-1 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white text-left"
                              >
                                <span className="text-slate-500 hover:text-slate-300">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </span>
                                {isExpanded ? <FolderOpen className="h-3.5 w-3.5 text-sky-400 shrink-0" /> : <Folder className="h-3.5 w-3.5 text-sky-500 shrink-0" />}
                                <span className="truncate">{rootFolder.name}</span>
                              </button>

                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                                <button 
                                  onClick={() => setCreatingFolderParentId(rootFolder.id)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                                  title="Tạo Thư mục con"
                                >
                                  <Folder className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => setCreatingDocFolderId(rootFolder.id)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                                  title="Tạo Tài liệu mới"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Sub-Folders & Documents Inside Root Folder */}
                            {isExpanded && (
                              <div className="pl-5 border-l border-slate-900/60 ml-3.5 space-y-0.5 py-0.5">
                                
                                {/* Creation Inputs Inside Root Folder */}
                                {creatingFolderParentId === rootFolder.id && (
                                  <div className="p-2 border border-slate-850 rounded-xl bg-slate-900/30 my-1 mr-1">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Tên thư mục con..."
                                      value={newFolderName}
                                      onChange={(e) => setNewFolderName(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] text-white outline-none mb-1.5"
                                    />
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button onClick={() => setCreatingFolderParentId(undefined)} className="text-[9px] font-bold text-slate-500 hover:text-white">Hủy</button>
                                      <button onClick={() => handleCreateFolder(rootFolder.id)} className="px-2 py-0.5 rounded bg-sky-500 text-[9px] font-bold text-white">Tạo</button>
                                    </div>
                                  </div>
                                )}

                                {creatingDocFolderId === rootFolder.id && (
                                  <div className="p-2 border border-slate-850 rounded-xl bg-slate-900/30 my-1 mr-1">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Tên tài liệu..."
                                      value={newDocTitle}
                                      onChange={(e) => setNewDocTitle(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] text-white outline-none mb-1.5"
                                    />
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button onClick={() => setCreatingDocFolderId(undefined)} className="text-[9px] font-bold text-slate-500 hover:text-white">Hủy</button>
                                      <button onClick={() => handleCreateDocument(rootFolder.id)} className="px-2 py-0.5 rounded bg-indigo-500 text-[9px] font-bold text-white">Tạo</button>
                                    </div>
                                  </div>
                                )}

                                {/* Render Subfolders */}
                                {subFolders.map((subFolder) => {
                                  const isSubExpanded = expandedFolders[subFolder.id];
                                  const subFolderDocs = documents.filter(d => d.folder_id === subFolder.id);

                                  return (
                                    <div key={subFolder.id} className="space-y-0.5">
                                      <div className="group flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-900/30">
                                        <button 
                                          onClick={() => toggleFolder(subFolder.id)}
                                          className="flex-1 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 text-left"
                                        >
                                          <span className="text-slate-600 hover:text-slate-400">
                                            {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          </span>
                                          {isSubExpanded ? <FolderOpen className="h-3 w-3 text-sky-400/80 shrink-0" /> : <Folder className="h-3 w-3 text-sky-500/70 shrink-0" />}
                                          <span className="truncate">{subFolder.name}</span>
                                        </button>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                                          <button 
                                            onClick={() => setCreatingDocFolderId(subFolder.id)}
                                            className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                                            title="Tạo Tài liệu"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {isSubExpanded && (
                                        <div className="pl-4 border-l border-slate-900/40 ml-3 space-y-0.5 py-0.5">
                                          {creatingDocFolderId === subFolder.id && (
                                            <div className="p-2 border border-slate-850 rounded-xl bg-slate-900/30 my-1 mr-1">
                                              <input
                                                type="text"
                                                required
                                                placeholder="Tên tài liệu..."
                                                value={newDocTitle}
                                                onChange={(e) => setNewDocTitle(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] text-white outline-none mb-1.5"
                                              />
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => setCreatingDocFolderId(undefined)} className="text-[9px] font-bold text-slate-500 hover:text-white">Hủy</button>
                                                <button onClick={() => handleCreateDocument(subFolder.id)} className="px-2 py-0.5 rounded bg-indigo-500 text-[9px] font-bold text-white">Tạo</button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Sub-Folder Documents */}
                                          {subFolderDocs.map((doc) => (
                                            <button
                                              key={doc.id}
                                              onClick={() => { setActiveDoc(doc); setIsEditing(false); }}
                                              className={`flex items-center gap-2 w-full rounded-lg px-2.5 py-1 text-left text-xs transition-all ${
                                                activeDoc?.id === doc.id
                                                  ? "bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border-l-2 border-sky-500 text-white font-bold"
                                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                                              }`}
                                            >
                                              <FileText className="h-3 w-3 text-indigo-400 shrink-0" />
                                              <span className="truncate">{doc.title}</span>
                                            </button>
                                          ))}
                                          {subFolderDocs.length === 0 && !creatingDocFolderId && (
                                            <div className="text-[10px] text-slate-600 px-2.5 py-0.5 italic">Thư mục trống</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Direct Documents of Root Folder */}
                                {folderDocs.map((doc) => (
                                  <button
                                    key={doc.id}
                                    onClick={() => { setActiveDoc(doc); setIsEditing(false); }}
                                    className={`flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                                      activeDoc?.id === doc.id
                                        ? "bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border-l-2 border-sky-500 text-white font-bold"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                                    }`}
                                  >
                                    <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                    <span className="truncate">{doc.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Root Level direct documents */}
                      {documents.filter(d => d.folder_id === null).map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => { setActiveDoc(doc); setIsEditing(false); }}
                          className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-left text-xs transition-all ${
                            activeDoc?.id === doc.id
                              ? "bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border-l-2 border-sky-500 text-white font-bold"
                              : "text-slate-300 hover:text-white hover:bg-slate-900/30"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </button>
                      ))}
                    </>
                  </div>
                </aside>

                {/* RIGHT WIKI WORKSPACE PANEL */}
                <section className="flex-1 bg-slate-950/45 flex flex-col overflow-hidden">
                  {activeDoc ? (
                    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                      {/* Doc Header */}
                      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-950/60 shrink-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                          <button 
                            onClick={() => { setActiveDoc(null); setIsEditing(false); setActiveTab("home"); }}
                            className="flex items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors font-bold mr-2 border-r border-slate-900 pr-3 shrink-0"
                          >
                            ← Quay lại Dashboard
                          </button>
                          <Folder className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {folders.find(f => f.id === activeDoc.folder_id)?.name || "Root Workspace"}
                          </span>
                          <span>/</span>
                          <span className="text-slate-300 font-bold truncate max-w-[150px]">{activeDoc.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isEditing ? (
                            <>
                              <button
                                onClick={() => startEditing(activeDoc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/35 hover:bg-slate-900 text-xs font-bold text-sky-400 transition-all"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Chỉnh Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(activeDoc.id)}
                                className="flex items-center justify-center p-1.5 rounded-lg border border-slate-900 hover:border-slate-850 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-all"
                                title="Xóa tài liệu"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleUpdateDocument}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-xs font-bold text-white shadow-lg shadow-sky-500/10 transition-all"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Lưu thay đổi
                              </button>
                              <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/35 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition-all"
                              >
                                <X className="h-3.5 w-3.5" />
                                Hủy
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Workspace Content */}
                      <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 sm:px-12">
                        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4 overflow-hidden">
                          {isEditing ? (
                            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                              <div className="shrink-0">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tiêu đề tài liệu</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-sm text-white font-bold outline-none focus:border-sky-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4 shrink-0">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Vị trí lưu trữ (Folder)</label>
                                  <select
                                    value={editFolderId || ""}
                                    onChange={(e) => setEditFolderId(e.target.value || null)}
                                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-500"
                                  >
                                    <option value="">-- Root Workspace --</option>
                                    {folders.map(f => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đường dẫn tệp đính kèm (Storage URL)</label>
                                  <input
                                    type="text"
                                    placeholder="https://supabase.co/storage/v1/object/public/manuals/..."
                                    value={editFileUrl}
                                    onChange={(e) => setEditFileUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none focus:border-sky-500"
                                  />
                                </div>
                              </div>

                              {/* Markdown Editor Toolbar */}
                              <div className="shrink-0 flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-900 bg-slate-950/60">
                                <button type="button" onClick={() => insertMarkdown("**", "**")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Đậm"><Bold className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown("*", "*")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Nghiêng"><Italic className="h-3.5 w-3.5" /></button>
                                <span className="h-4 w-px bg-slate-900 mx-1" />
                                <button type="button" onClick={() => insertMarkdown("# ")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="H1"><Heading1 className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown("## ")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="H2"><Heading2 className="h-3.5 w-3.5" /></button>
                                <span className="h-4 w-px bg-slate-900 mx-1" />
                                <button type="button" onClick={() => insertMarkdown("- ")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="List"><ListIcon className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown("```code\n", "\n```")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Code"><CodeIcon className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown("\n| Tiêu đề 1 | Tiêu đề 2 |\n|---|---|\n| Dữ liệu 1 | Dữ liệu 2 |\n")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Table"><TableIcon className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => triggerImagePicker("wiki")} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Ảnh"><ImageIcon className="h-3.5 w-3.5" /></button>
                                <span className="h-4 w-px bg-slate-900 mx-1" />
                                <button type="button" onClick={() => insertMarkdown('<span style="color: #38bdf8">', '</span>')} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Màu chữ"><Paintbrush className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown('\n<div align="center">\n', '\n</div>\n')} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Căn giữa"><AlignCenter className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => insertMarkdown('\n> [!NOTE]\n> ')} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Cảnh báo"><AlertTriangle className="h-3.5 w-3.5" /></button>
                              </div>

                              <div className="flex-1 flex flex-col min-h-0">
                                <textarea
                                  id="markdown-editor"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full flex-1 bg-slate-950 border border-slate-900 rounded-2xl px-4 py-4 text-xs font-mono text-slate-200 outline-none focus:border-sky-500 overflow-y-auto resize-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                              <div className="border-b border-slate-900/60 pb-5">
                                <h1 className="font-display text-2xl font-black text-white leading-tight">{activeDoc.title}</h1>
                                <span className="text-[10px] font-bold text-slate-500 mt-2 block">Cập nhật lúc: {new Date(activeDoc.updated_at).toLocaleDateString("vi-VN")}</span>
                              </div>

                              {activeDoc.file_url && (
                                <div className="flex items-center justify-between p-4 rounded-2xl border border-sky-950/20 bg-sky-950/5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400"><Layers className="h-4.5 w-4.5" /></div>
                                    <div>
                                      <p className="text-xs font-black text-slate-300">Tệp đính kèm đi kèm</p>
                                      <p className="text-[10px] text-slate-500 truncate max-w-xs">{activeDoc.file_url}</p>
                                    </div>
                                  </div>
                                  <a href={activeDoc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-[10px] font-black text-white">TẢI TỆP <ExternalLink className="h-3 w-3" /></a>
                                </div>
                              )}

                              <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed prose-headings:font-display prose-headings:text-white prose-a:text-sky-400 prose-code:text-sky-300 prose-pre:bg-slate-950 prose-img:mx-auto prose-img:rounded-2xl">
                                <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* WIKI DASHBOARD DEFAULT INTERACTIVE MAP */
                    <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-12 flex flex-col justify-between">
                      <div className="max-w-4xl mx-auto w-full space-y-12">
                        <div className="space-y-3">
                          <h1 className="font-display text-2xl font-black text-white">Thư viện Tài nguyên Dữ liệu (Wiki Data Assets)</h1>
                          <p className="text-xs text-slate-400">Chọn một tài liệu ở thanh thư mục bên trái để bắt đầu đọc và biên soạn tài liệu.</p>
                        </div>

                        {/* Interactive Steps Map */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          {etlSteps.map((step) => (
                            <div
                              key={step.num}
                              onClick={() => {
                                toggleFolder(step.folderId);
                                const targetDoc = documents.find(d => d.folder_id === step.folderId);
                                if (targetDoc) setActiveDoc(targetDoc);
                              }}
                              className="p-3.5 rounded-2xl border border-slate-900 bg-slate-950/50 hover:border-slate-800 cursor-pointer text-left transition-all"
                            >
                              <span className="text-[9px] font-black text-slate-500">{step.num}</span>
                              <p className="text-xs font-black text-white mt-2 truncate">{step.name}</p>
                              <p className="text-[9px] text-slate-650 mt-1">{step.platform}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==================== TAB 6: WORKOS - REAL-TIME PLATFORM MONITOR PORTAL ==================== */}
            {activeTab === "databricks" && (() => {
              // Inline dynamic math calculations for WorkOS Portal
              const totalLogsCount = databricksLogs.length;
              const failedLogsCount = databricksLogs.filter(log => log.status === "failed" || log.severity === "ERROR" || log.severity === "CRITICAL").length;
              const warningLogsCount = databricksLogs.filter(log => log.status === "warning" || log.severity === "WARNING").length;
              
              // Sum of all daily costs
              const totalCostToday = databricksLogs
                .filter(log => log.category?.includes("cost") && log.metric_value)
                .reduce((sum, log) => sum + (log.metric_value || 0), 0);

              // Helper parser to render sources cleanly
              const getPlatformInfo = (log: DatabricksLogType) => {
                const src = log.source || "databricks";
                if (src === "azure") {
                  return {
                    name: "Azure",
                    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                    badgeBg: "bg-cyan-500",
                    text: "text-cyan-400",
                    border: "border-cyan-500/20"
                  };
                }
                if (src === "powerbi") {
                  return {
                    name: "Power BI",
                    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    badgeBg: "bg-amber-500",
                    text: "text-amber-400",
                    border: "border-amber-500/20"
                  };
                }
                if (src === "synapse") {
                  return {
                    name: "Synapse",
                    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    badgeBg: "bg-purple-500",
                    text: "text-purple-400",
                    border: "border-purple-500/20"
                  };
                }
                return {
                  name: "Databricks",
                  color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                  badgeBg: "bg-indigo-500",
                  text: "text-indigo-400",
                  border: "border-indigo-500/20"
                };
              };

              // Apply search filters
              const filteredLogs = databricksLogs.filter((log) => {
                if (dbLogsFilterPlatform !== "all" && log.source !== dbLogsFilterPlatform) return false;
                if (dbLogsFilterStatus !== "all" && log.status !== dbLogsFilterStatus) return false;
                if (dbLogsFilterSeverity !== "all" && log.severity !== dbLogsFilterSeverity) return false;
                if (dbLogsSearch) {
                  const q = dbLogsSearch.toLowerCase();
                  const nameMatch = log.job_name?.toLowerCase().includes(q);
                  const msgMatch = log.message?.toLowerCase().includes(q);
                  const catMatch = log.category?.toLowerCase().includes(q);
                  if (!nameMatch && !msgMatch && !catMatch) return false;
                }
                return true;
              });

              // Alert logs (WARNING, ERROR, CRITICAL)
              const alertLogs = databricksLogs.filter(log => ["WARNING", "ERROR", "CRITICAL"].includes(log.severity));

              // Compute dynamic health metrics per platform
              const getPlatformHealth = (srcName: "databricks" | "azure" | "synapse" | "powerbi") => {
                const logs = databricksLogs.filter(l => l.source === srcName);
                if (logs.length === 0) return { status: "success", rate: 100, lastCheck: "Chưa có log", total: 0 };
                
                const latest = logs[0];
                const successCount = logs.filter(l => l.status === "success").length;
                const totalRuns = logs.filter(l => ["success", "failed"].includes(l.status)).length;
                const rate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 100;
                
                let healthStatus = "success";
                if (rate < 80 || logs.some(l => l.severity === "CRITICAL" && (Date.now() - new Date(l.created_at).getTime() < 3600000))) {
                  healthStatus = "failed";
                } else if (rate < 95 || logs.some(l => l.severity === "WARNING")) {
                  healthStatus = "warning";
                }

                const elapsedMin = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 60000);
                const lastCheckStr = elapsedMin < 1 ? "Vừa xong" : `${elapsedMin} phút trước`;

                return {
                  status: healthStatus,
                  rate,
                  lastCheck: lastCheckStr,
                  total: logs.length,
                  latestMsg: latest.message
                };
              };

              const dbHealth = getPlatformHealth("databricks");
              const azHealth = getPlatformHealth("azure");
              const synHealth = getPlatformHealth("synapse");
              const pbiHealth = getPlatformHealth("powerbi");

              return (
                <div className="flex-1 flex flex-col overflow-hidden animate-fade-in px-6 py-6 sm:px-10">
                  {/* 📡 WORKOS TELEMETRY HEADER */}
                  <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                        <h1 className="font-display text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                          <Cpu className="h-5 w-5 text-cyan-400" />
                          WORKOS - CỔNG GIÁM SÁT REAL-TIME
                        </h1>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                        [Aggregated unified health telemetry across Databricks, Azure, Synapse & Power BI]
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-cyan-500/20 bg-cyan-950/10 text-[9px] font-black text-cyan-400 tracking-wider font-mono">
                        <RefreshCw className={`h-3 w-3 ${dbLogsLoading ? 'animate-spin text-cyan-400' : ''}`} />
                        WS CONN: LIVE (WS)
                      </div>

                      <button
                        onClick={loadDatabricksLogs}
                        disabled={dbLogsLoading}
                        className="flex items-center justify-center p-1.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
                        title="Tải lại tức thì"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${dbLogsLoading ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        onClick={handleResetLogs}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-900 hover:border-slate-850 hover:bg-rose-950/20 text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-all font-mono"
                        title="Xóa logs khỏi DB"
                      >
                        Xóa Logs
                      </button>
                    </div>
                  </header>

                  {/* 🎛️ PORTAL SUB-NAVIGATION TABS */}
                  <div className="shrink-0 flex items-center gap-1 p-1 bg-slate-950/60 border border-slate-900 rounded-xl mb-4 overflow-x-auto max-w-full">
                    {[
                      { id: "dashboard", label: "Tổng Quan", icon: LayoutDashboard },
                      { id: "logs", label: "Logs Chi Tiết", icon: Terminal },
                      { id: "cost", label: "Phân Tích Chi Phí", icon: DollarSign },
                      { id: "jobs", label: "Tác Vụ & Gantt", icon: BarChart3 },
                      { id: "settings", label: "Cài Đặt & API", icon: Settings }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const active = dbSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setDbSubTab(tab.id as "dashboard" | "logs" | "cost" | "jobs" | "settings")}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            active
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15"
                              : "text-slate-400 hover:text-white hover:bg-slate-900/30 border border-transparent"
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-400 animate-pulse" : "text-slate-400"}`} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* ==================== SUB-TAB 1: DASHBOARD (HOME OVERVIEW) ==================== */}
                  {dbSubTab === "dashboard" && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 pr-1">
                      {/* KPI ROW */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-xl p-3.5">
                          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Logs Hôm Nay</p>
                          <p className="text-xl font-black text-white mt-1 font-mono">{totalLogsCount}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">Ghi nhận từ 4 platforms</p>
                        </div>
                        
                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-xl p-3.5 relative overflow-hidden">
                          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Sự Cố Lỗi (24h)</p>
                          <p className={`text-xl font-black mt-1 font-mono ${failedLogsCount > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}`}>
                            {failedLogsCount} Errors
                          </p>
                          <span className={`text-[9px] font-bold mt-1 block ${failedLogsCount > 0 ? "text-rose-400" : "text-slate-500"}`}>
                            {failedLogsCount > 0 ? "⚠️ Cần kiểm tra khẩn cấp" : "✓ Hệ thống ổn định"}
                          </span>
                        </div>

                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-xl p-3.5">
                          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Cảnh Báo (24h)</p>
                          <p className={`text-xl font-black mt-1 font-mono ${warningLogsCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                            {warningLogsCount} Warnings
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">Cảnh báo tài nguyên & stale</p>
                        </div>

                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-xl p-3.5 relative">
                          <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-mono text-cyan-400">Tổng Chi Phí (24h)</p>
                          <p className="text-xl font-black text-cyan-400 mt-1 font-mono">${totalCostToday.toFixed(2)}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">Đã quy đổi tỷ giá USD</p>
                        </div>
                      </div>

                      {/* HEALTH GRID (ONE CARD PER PLATFORM) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                        {[
                          { id: "databricks", name: "Databricks", health: dbHealth, color: "text-indigo-400", border: "border-indigo-500/20", glow: "shadow-indigo-500/5" },
                          { id: "azure", name: "Azure Cloud", health: azHealth, color: "text-cyan-400", border: "border-cyan-500/20", glow: "shadow-cyan-500/5" },
                          { id: "synapse", name: "Synapse ETL", health: synHealth, color: "text-purple-400", border: "border-purple-500/20", glow: "shadow-purple-500/5" },
                          { id: "powerbi", name: "Power BI Refresh", health: pbiHealth, color: "text-amber-400", border: "border-amber-500/20", glow: "shadow-amber-500/5" }
                        ].map(p => {
                          const statusColor = 
                            p.health.status === "success" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                            p.health.status === "warning" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                            "text-rose-500 border-rose-500/20 bg-rose-500/5";

                          return (
                            <div key={p.id} className={`backdrop-blur-md bg-slate-950/30 border border-slate-900 rounded-2xl p-4.5 transition-all hover:border-slate-800 ${p.glow} shadow-lg`}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${p.color}`}>{p.name}</span>
                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider font-mono ${statusColor}`}>
                                  {p.health.status}
                                </span>
                              </div>

                              <div className="space-y-2 mt-4">
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span>Tỷ lệ thành công (24h)</span>
                                  <span className="font-mono font-bold text-slate-200">{p.health.rate}%</span>
                                </div>
                                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      p.health.rate >= 95 ? "bg-emerald-500" :
                                      p.health.rate >= 80 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${p.health.rate}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[9.5px] text-slate-500 font-mono mt-4 pt-2.5 border-t border-slate-900/60">
                                <span>Check cuối:</span>
                                <span className="text-slate-350">{p.health.lastCheck}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* RECENT ALERTS SECTION */}
                      <div className="flex-1 flex flex-col min-h-[300px] border border-slate-900 rounded-2xl bg-slate-950/15 p-4 overflow-hidden">
                        <div className="shrink-0 flex items-center gap-2 border-b border-slate-900 pb-3 mb-3">
                          <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                          <h2 className="text-xs font-black text-white uppercase tracking-wider">Cảnh Báo Vận Hành Gần Đây (Alerts & Failures - Severity &ge; WARNING)</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                          {alertLogs.length > 0 ? (
                            alertLogs.map((log) => {
                              const pInfo = getPlatformInfo(log);
                              const expanded = expandedLogId === log.id;

                              return (
                                <div key={log.id} className="backdrop-blur-md bg-slate-950/50 border border-slate-900 rounded-xl overflow-hidden hover:border-slate-800 transition-all">
                                  <div 
                                    onClick={() => setExpandedLogId(expanded ? null : log.id)}
                                    className="p-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono ${pInfo.color}`}>
                                        {pInfo.name}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider ${
                                        log.severity === "CRITICAL" ? "bg-rose-500 text-white animate-pulse" :
                                        log.severity === "ERROR" ? "bg-red-500/25 text-rose-400 border border-red-500/20" :
                                        "bg-amber-500/25 text-amber-400 border border-amber-500/20"
                                      }`}>
                                        {log.severity}
                                      </span>
                                      <span className="font-mono text-slate-200 font-black">{log.job_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(log.created_at).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                      <span className="text-[9px] text-cyan-400 hover:underline">
                                        {expanded ? "Thu gọn ▲" : "Xem log ▼"}
                                      </span>
                                    </div>
                                  </div>

                                  {expanded && (
                                    <div className="px-3 pb-3 border-t border-slate-900/60 pt-3 bg-slate-950/80 font-mono text-[10px] text-slate-350 leading-relaxed">
                                      <div className="flex items-start gap-2 p-3.5 rounded-lg border border-slate-900 bg-slate-950">
                                        <Terminal className="h-4 w-4 mt-0.5 text-slate-650 shrink-0" />
                                        <div className="space-y-1.5 w-full">
                                          <p className="text-white font-bold whitespace-pre-wrap">{log.message}</p>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[9px] text-slate-500 border-t border-slate-900/80 mt-2">
                                            <div>Category: <span className="text-slate-300 font-bold">{log.category}</span></div>
                                            <div>Duration: <span className="text-slate-300 font-bold">{log.duration}s</span></div>
                                            <div>Metric Value: <span className="text-cyan-400 font-bold">{log.metric_value !== null ? `$${log.metric_value}` : "N/A"}</span></div>
                                            <div>Status: <span className="text-slate-300 font-bold uppercase">{log.status}</span></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-550">
                              <CheckCircle className="h-8 w-8 text-emerald-500/40 animate-pulse" />
                              <p className="text-xs font-bold text-slate-500">Tuyệt vời! Không có cảnh báo hoặc lỗi nào phát sinh.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ==================== SUB-TAB 2: DETAILED LOGS (TIMELINE LEDGER) ==================== */}
                  {dbSubTab === "logs" && (
                    <div className="flex-1 flex flex-col min-h-0 space-y-4">
                      {/* SIMULATORS CONTROLS BAR (Interactive Simulation Panel) */}
                      <div className="shrink-0 flex flex-col gap-3 p-3.5 border border-slate-900 rounded-xl bg-slate-950/30">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-mono">Simulators (Realtime websocket testing):</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleTriggerJob("ADF: Ingest-ERP-AX-Bronze")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[9px] font-bold text-cyan-400 border border-cyan-500/15 transition-all"
                            >
                              <Play className="h-2.5 w-2.5" />
                              1. Trigger ADF
                            </button>

                            <button
                              onClick={() => handleTriggerJob("Databricks: dbt-Silver-Incremental")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-bold text-indigo-400 border border-indigo-500/15 transition-all"
                            >
                              <Play className="h-2.5 w-2.5" />
                              2. Run Databricks
                            </button>

                            <button
                              onClick={() => handleTriggerJob("PowerBI: Sales_Tabular_Model")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[9px] font-bold text-amber-450 border border-amber-500/15 transition-all"
                            >
                              <Play className="h-2.5 w-2.5" />
                              3. Refresh Power BI
                            </button>

                            <button
                              onClick={() => handleTriggerJob("Databricks: Cost_Workspace_Anomaly")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[9px] font-bold text-rose-450 border border-rose-500/15 transition-all"
                            >
                              <Play className="h-2.5 w-2.5" />
                              4. Trigger Cost Anomaly
                            </button>
                          </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative flex-1 min-w-[150px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Tìm kiếm theo job_name, message, hoặc category..."
                              value={dbLogsSearch}
                              onChange={(e) => setDbLogsSearch(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-650 outline-none focus:border-cyan-500 transition-all font-mono"
                            />
                          </div>

                          <select
                            value={dbLogsFilterPlatform}
                            onChange={(e) => setDbLogsFilterPlatform(e.target.value)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1.5 text-[10.5px] text-slate-350 outline-none focus:border-cyan-500"
                          >
                            <option value="all">Platform: Tất cả</option>
                            <option value="azure">Azure Cloud</option>
                            <option value="databricks">Databricks</option>
                            <option value="synapse">Synapse</option>
                            <option value="powerbi">Power BI</option>
                          </select>

                          <select
                            value={dbLogsFilterStatus}
                            onChange={(e) => setDbLogsFilterStatus(e.target.value)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1.5 text-[10.5px] text-slate-355 outline-none focus:border-cyan-500"
                          >
                            <option value="all">Status: Tất cả</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="running">Running</option>
                            <option value="warning">Warning</option>
                          </select>

                          <select
                            value={dbLogsFilterSeverity}
                            onChange={(e) => setDbLogsFilterSeverity(e.target.value)}
                            className="bg-slate-950 border border-slate-900 rounded-lg px-2.5 py-1.5 text-[10.5px] text-slate-355 outline-none focus:border-cyan-500"
                          >
                            <option value="all">Severity: Tất cả</option>
                            <option value="INFO">INFO</option>
                            <option value="WARNING">WARNING</option>
                            <option value="ERROR">ERROR</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </div>
                      </div>

                      {/* Log stream viewport */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log) => {
                            const platformInfo = getPlatformInfo(log);
                            const relativeTime = (() => {
                              const diffMs = Date.now() - new Date(log.created_at).getTime();
                              const diffMin = Math.floor(diffMs / 60000);
                              if (diffMin < 1) return "Vừa xong";
                              if (diffMin < 60) return `${diffMin} phút trước`;
                              const diffHours = Math.floor(diffMin / 60);
                              if (diffHours < 24) return `${diffHours} giờ trước`;
                              return new Date(log.created_at).toLocaleDateString("vi-VN");
                            })();

                            return (
                              <div
                                key={log.id}
                                className="backdrop-blur-md bg-slate-950/45 border border-slate-900 rounded-xl p-4 hover:border-slate-800 hover:bg-slate-950/65 transition-all duration-300 relative overflow-hidden group"
                              >
                                <div className={`absolute top-0 bottom-0 left-0 w-[3px] ${
                                  log.source === "azure" ? "bg-cyan-500" : 
                                  log.source === "powerbi" ? "bg-amber-500" : 
                                  log.source === "synapse" ? "bg-purple-500" : 
                                  "bg-indigo-500"
                                }`} />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pl-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono ${platformInfo.color}`}>
                                      {platformInfo.name}
                                    </span>

                                    <span className="font-mono text-xs font-black text-white tracking-wider">
                                      {log.job_name}
                                    </span>

                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8.5px] font-black uppercase tracking-wider ${
                                      log.status === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : 
                                      log.status === "failed" ? "border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse" : 
                                      log.status === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" :
                                      "border-sky-500/20 bg-sky-500/10 text-sky-400"
                                    }`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${
                                        log.status === "success" ? "bg-emerald-400" : 
                                        log.status === "failed" ? "bg-rose-450 animate-ping" : 
                                        log.status === "warning" ? "bg-amber-400" :
                                        "bg-sky-450 animate-spin"
                                      }`} />
                                      {log.status}
                                    </span>

                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                      log.severity === "CRITICAL" ? "bg-rose-500/25 text-rose-400 border border-rose-500/30" : 
                                      log.severity === "ERROR" ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                                      log.severity === "WARNING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : 
                                      "bg-slate-900 text-slate-400 border border-slate-800"
                                    }`}>
                                      {log.severity}
                                    </span>
                                  </div>

                                  <span className="text-[9.5px] text-slate-500 font-bold shrink-0 font-mono">
                                    {relativeTime} ({new Date(log.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                                  </span>
                                </div>

                                <div className={`rounded-lg p-3.5 font-mono text-[10.5px] leading-relaxed mb-3 ml-1.5 ${
                                  log.status === "failed" ? "bg-rose-950/15 border border-rose-900/50 text-rose-350" : 
                                  log.status === "warning" ? "bg-amber-950/15 border border-amber-900/50 text-amber-350" :
                                  "bg-slate-950/60 border border-slate-900/30 text-slate-350"
                                }`}>
                                  <div className="flex items-start gap-2">
                                    <Terminal className="h-3.5 w-3.5 mt-0.5 text-slate-500 shrink-0" />
                                    <p className="whitespace-pre-wrap">{log.message}</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold border-t border-slate-900/40 pt-2.5 ml-1.5 font-mono">
                                  <span>Category: <span className="text-slate-350">{log.category}</span></span>
                                  <span>Thời gian chạy: <span className="text-slate-350">{log.duration}s</span></span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3 p-16 border border-dashed border-slate-900 rounded-3xl bg-slate-950/10 text-slate-550">
                            <Cpu className="h-7 w-7 text-slate-700 animate-pulse" />
                            <p className="text-xs font-black">Không tìm thấy bản ghi log nào khớp với bộ lọc.</p>
                            <button
                              onClick={() => { setDbLogsFilterPlatform("all"); setDbLogsFilterStatus("all"); setDbLogsFilterSeverity("all"); setDbLogsSearch(""); }}
                              className="text-[10px] font-bold text-cyan-400 hover:underline"
                            >
                              Reset bộ lọc
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ==================== SUB-TAB 3: COST OVERVIEW (COST MONITORING) ==================== */}
                  {dbSubTab === "cost" && (() => {
                    const costLogs = databricksLogs.filter(log => log.category?.includes("cost"));
                    
                    // Group sums
                    const dbCost = costLogs.filter(l => l.source === "databricks").reduce((s, l) => s + (l.metric_value || 0), 0);
                    const azCost = costLogs.filter(l => l.source === "azure").reduce((s, l) => s + (l.metric_value || 0), 0);
                    const synCost = costLogs.filter(l => l.source === "synapse").reduce((s, l) => s + (l.metric_value || 0), 0);
                    const pbiCost = costLogs.filter(l => l.source === "powerbi").reduce((s, l) => s + (l.metric_value || 0), 0);
                    const grandTotal = dbCost + azCost + synCost + pbiCost || 1;

                    // Cost anomalies
                    const anomalies = costLogs.filter(l => l.severity === "WARNING" || l.severity === "CRITICAL" || l.message?.toLowerCase().includes("anomaly"));

                    return (
                      <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
                        {/* Summary breakdown row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
                          <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5 lg:col-span-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4">Chi Phí Tích Lũy Theo Nguồn (Cost Stack Breakdown)</h3>
                            <div className="space-y-4">
                              {[
                                { name: "Databricks Workspace Cost", val: dbCost, color: "bg-indigo-500", text: "text-indigo-400" },
                                { name: "Azure Subscriptions", val: azCost, color: "bg-cyan-500", text: "text-cyan-400" },
                                { name: "Synapse Workspaces", val: synCost, color: "bg-purple-500", text: "text-purple-400" },
                                { name: "Power BI Capacities", val: pbiCost, color: "bg-amber-500", text: "text-amber-400" }
                              ].map(item => {
                                const percentage = Math.round((item.val / grandTotal) * 100);
                                return (
                                  <div key={item.name} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span className="text-slate-350">{item.name}</span>
                                      <span className={item.text}>${item.val.toFixed(2)} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5 flex flex-col justify-between">
                            <div>
                              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2">Hạn Mức Định Giá</h3>
                              <p className="text-[10px] text-slate-550 leading-relaxed">
                                Hệ thống cảnh báo tự động phát hiện các đột biến chi phí vượt ngưỡng 3x so với trung bình 7 ngày gần nhất.
                              </p>
                            </div>
                            <div className="pt-4 border-t border-slate-900/60 mt-4">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tổng Chi Tiêu 24h</p>
                              <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">${grandTotal.toFixed(2)}</p>
                              <p className="text-[9px] text-emerald-400 font-bold mt-1">✓ Đã tối ưu hóa cụm tự động tắt (Idle Auto-stop)</p>
                            </div>
                          </div>
                        </div>

                        {/* Cost anomalies alerts */}
                        <div className="border border-slate-900 rounded-2xl bg-slate-950/15 p-4 shrink-0">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            Phát Hiện Bất Thường Chi Phí (Cost Anomalies Detected)
                          </h3>

                          <div className="space-y-2">
                            {anomalies.length > 0 ? (
                              anomalies.map(log => (
                                <div key={log.id} className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 flex items-start gap-3">
                                  <AlertTriangle className="h-4.5 w-4.5 mt-0.5 text-rose-500 animate-pulse shrink-0" />
                                  <div>
                                    <p className="text-xs font-black text-white font-mono">{log.job_name} ({log.source.toUpperCase()})</p>
                                    <p className="text-[10.5px] text-rose-350 mt-1 font-mono">{log.message}</p>
                                    <span className="text-[8.5px] text-slate-500 block mt-1">Ghi nhận lúc: {new Date(log.created_at).toLocaleString("vi-VN")}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center text-slate-600 text-[10.5px] font-bold">
                                Không phát hiện bất kỳ đột biến chi phí bất thường nào ngày hôm nay.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ==================== SUB-TAB 4: JOBS & GANTT PERFORMANCE ==================== */}
                  {dbSubTab === "jobs" && (() => {
                    const executionLogs = databricksLogs.filter(log => log.duration > 0 || log.category === "job_run" || log.category === "pipeline_run");
                    
                    // Top failing jobs leaderboard
                    const failFrequency: Record<string, number> = {};
                    databricksLogs.forEach(log => {
                      if (log.status === "failed") {
                        failFrequency[log.job_name] = (failFrequency[log.job_name] || 0) + 1;
                      }
                    });

                    const failingLeaderboard = Object.entries(failFrequency)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5);

                    return (
                      <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Fail leaderboard */}
                          <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                              <Flame className="h-4 w-4 text-rose-500" />
                              Tần Suất Lỗi (Top 5 Failing Pipelines)
                            </h3>

                            <div className="space-y-3">
                              {failingLeaderboard.length > 0 ? (
                                failingLeaderboard.map(([name, count], index) => (
                                  <div key={name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="h-5 w-5 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-[10px]">
                                        {index + 1}
                                      </span>
                                      <span className="font-mono text-slate-300 truncate max-w-[180px]">{name}</span>
                                    </div>
                                    <span className="font-mono font-black text-rose-450">{count} lần thất bại</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-slate-500 font-bold text-center py-6">
                                  Tuyệt vời! Không có pipeline nào bị lặp lại lỗi.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Execution speed metrics */}
                          <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5 lg:col-span-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-cyan-400" />
                              Thời Gian Chạy Trung Bình Từng Hệ Thống (Avg Pipeline Speed)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { name: "Databricks", logs: databricksLogs.filter(l => l.source === "databricks" && l.duration > 0) },
                                { name: "Azure ADF", logs: databricksLogs.filter(l => l.source === "azure" && l.duration > 0) },
                                { name: "Synapse ETL", logs: databricksLogs.filter(l => l.source === "synapse" && l.duration > 0) },
                                { name: "Power BI Refresh", logs: databricksLogs.filter(l => l.source === "powerbi" && l.duration > 0) }
                              ].map(p => {
                                const avg = p.logs.length > 0 ? Math.round(p.logs.reduce((s, l) => s + l.duration, 0) / p.logs.length) : 0;
                                return (
                                  <div key={p.name} className="p-3 border border-slate-900 rounded-xl bg-slate-950/30 text-center">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase block">{p.name}</span>
                                    <span className="text-lg font-black text-white mt-1.5 block font-mono">{avg}s</span>
                                    <span className="text-[8px] text-slate-600 font-mono mt-0.5 block">Dựa trên {p.logs.length} chạy</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Gantt-style timeline checklist */}
                        <div className="border border-slate-900 rounded-2xl bg-slate-950/15 p-4 flex-1 flex flex-col min-h-[300px]">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4">Lịch Sử Thời Gian Thực Thi (Execution Duration Sparkline Timeline)</h3>
                          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                            {executionLogs.length > 0 ? (
                              executionLogs.slice(0, 15).map(log => {
                                const maxDur = Math.max(...executionLogs.map(l => l.duration), 100);
                                const pct = Math.max(Math.min((log.duration / maxDur) * 100, 100), 5);

                                return (
                                  <div key={log.id} className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between font-mono text-[10.5px]">
                                      <span className="text-slate-350 font-bold truncate max-w-[250px]">{log.job_name} ({log.source.toUpperCase()})</span>
                                      <span className="text-slate-400 font-bold font-mono">{log.duration} giây</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-slate-950 h-3 rounded-lg overflow-hidden relative border border-slate-900">
                                        <div 
                                          className={`h-full rounded-lg bg-gradient-to-r ${
                                            log.status === "failed" ? "from-rose-500/20 to-rose-500/40 border-r border-rose-500" :
                                            log.status === "warning" ? "from-amber-500/20 to-amber-500/40 border-r border-amber-500" :
                                            "from-sky-500/20 to-sky-500/45 border-r border-sky-400"
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-slate-500 font-bold text-center py-10">Chưa ghi nhận log thời gian chạy nào.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ==================== SUB-TAB 5: SETTINGS & DEVELOPER INTEGRATION GUIDES ==================== */}
                  {dbSubTab === "settings" && (
                    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
                      {/* Configuration threshold block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Ngưỡng Cảnh Báo Hệ Thống (Alerting Thresholds)</h3>
                          <div className="space-y-3.5">
                            <div>
                              <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ngưỡng Bất Thường Chi Phí (Cost Anomaly Multiplier)</label>
                              <div className="flex items-center gap-2">
                                <input type="text" readOnly value="3.0x Average Cost" className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-400 w-full" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Thời Gian Hết Hạn Dữ Liệu (Freshness Warning Threshold)</label>
                              <div className="flex items-center gap-2">
                                <input type="text" readOnly value="4 Hours Unchanged" className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-400 w-full" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="backdrop-blur-md bg-slate-950/20 border border-slate-900 rounded-2xl p-4.5">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Kênh Nhận Cảnh Báo (Webhook Notification Channels)</h3>
                          <div className="space-y-3.5">
                            <div>
                              <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Discord Webhook Channel</label>
                              <input type="text" readOnly value="https://discord.com/api/webhooks/workos_platform_alarms" className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 w-full" />
                            </div>
                            <div>
                              <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Telegram Alarm Chat ID</label>
                              <input type="text" readOnly value="@workos_etl_incident_alerts" className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 w-full" />
                            </div>
                            <button
                              onClick={() => alert("Simulation webhook alarm dispatched to Discord & Telegram!")}
                              className="w-full text-center px-4 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-950 hover:bg-slate-900 text-[10px] font-bold text-slate-350 transition-all font-mono"
                            >
                              🔔 Gửi Thử Cảnh Báo Webhook (Send Test Webhook)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 📋 DEVELOPER API & PUSH LOGS INTEGRATION GUIDES */}
                      <div className="border border-slate-900 rounded-2xl bg-slate-950/15 p-4 space-y-4">
                        <div className="border-b border-slate-900 pb-3 mb-2">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <FileCode className="h-4.5 w-4.5 text-cyan-400" />
                            Tài Liệu Hướng Dẫn Tích Hợp Đẩy Log (Databricks, ADF, Synapse Push Guides)
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-1">Sao chép các mã nguồn mẫu bên dưới để cấu hình job Cloud tự động đẩy log về Supabase.</p>
                        </div>

                        {/* PYTHON / DATABRICKS NOTEBOOK SCRIPT */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">1. Python Script (Cho Azure Databricks Notebooks / spark jobs)</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`import requests
import datetime

def push_workos_log(source, category, job_name, status, severity, duration, message, metric_value=None):
    url = "<YOUR_SUPABASE_URL>/rest/v1/platform_monitor_logs"
    headers = {
        "apikey": "<YOUR_SUPABASE_ANON_KEY>",
        "Authorization": "Bearer <YOUR_SUPABASE_ANON_KEY>",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    payload = {
        "source": source,
        "category": category,
        "job_name": job_name,
        "status": status,
        "severity": severity,
        "duration": duration,
        "started_at": datetime.datetime.utcnow().isoformat() + "Z",
        "message": message,
        "metric_value": metric_value
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Log pushed. Status code: {response.status_code}")
    except Exception as e:
        print(f"Failed to push log: {e}")

# Ví dụ đẩy log khi spark job thành công
push_workos_log(
    source="databricks",
    category="job_run",
    job_name="dbt_update_data",
    status="success",
    severity="INFO",
    duration=996,
    message="Job 'dbt_update_data' completed successfully. 45,210 rows updated."
)`);
                                alert("Đã sao chép Python script vào Clipboard!");
                              }} 
                              className="text-[8.5px] font-bold text-cyan-400 hover:underline"
                            >
                              Sao Chép (Copy)
                            </button>
                          </div>
                          <pre className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-[9.5px] font-mono text-slate-300 leading-relaxed overflow-x-auto select-all max-h-48 overflow-y-auto">
{`import requests
import datetime

def push_workos_log(source, category, job_name, status, severity, duration, message, metric_value=None):
    url = "<YOUR_SUPABASE_URL>/rest/v1/platform_monitor_logs"
    headers = {
        "apikey": "<YOUR_SUPABASE_ANON_KEY>",
        "Authorization": "Bearer <YOUR_SUPABASE_ANON_KEY>",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    payload = {
        "source": source,
        "category": category,
        "job_name": job_name,
        "status": status,
        "severity": severity,
        "duration": duration,
        "started_at": datetime.datetime.utcnow().isoformat() + "Z",
        "message": message,
        "metric_value": metric_value
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Log pushed. Status code: {response.status_code}")
    except Exception as e:
        print(f"Failed to push log: {e}")`}
                          </pre>
                        </div>

                        {/* CURL / AZURE DATA FACTORY WEB ACTIVITY */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">2. Azure Data Factory Web Activity / cURL Payload (REST API)</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`curl -X POST "<YOUR_SUPABASE_URL>/rest/v1/platform_monitor_logs" \\
  -H "apikey: <YOUR_SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "azure",
    "category": "resource_health",
    "job_name": "azure:sql-server-prod",
    "status": "success",
    "severity": "INFO",
    "duration": 0,
    "started_at": "2026-05-18T03:00:00Z",
    "message": "Azure SQL Server sql-server-prod is healthy.",
    "metric_value": null
  }'`);
                                alert("Đã sao chép cURL command vào Clipboard!");
                              }} 
                              className="text-[8.5px] font-bold text-cyan-400 hover:underline"
                            >
                              Sao Chép (Copy)
                            </button>
                          </div>
                          <pre className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-[9.5px] font-mono text-slate-300 leading-relaxed overflow-x-auto select-all max-h-48 overflow-y-auto">
{`curl -X POST "<YOUR_SUPABASE_URL>/rest/v1/platform_monitor_logs" \\
  -H "apikey: <YOUR_SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "azure",
    "category": "resource_health",
    "job_name": "azure:sql-server-prod",
    "status": "success",
    "severity": "INFO",
    "duration": 0,
    "started_at": "2026-05-18T03:00:00Z",
    "message": "Azure SQL Server sql-server-prod is healthy.",
    "metric_value": null
  }'`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
      
      {/* Hidden File Picker for Image Upload */}
      <input
        type="file"
        id="image-file-picker"
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
