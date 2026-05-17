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
  CheckSquare,
  Briefcase,
  Flame,
  Search,
  Check,
  FileCode
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
  const [activeTab, setActiveTab] = useState<"home" | "operations" | "projects" | "incidents" | "wiki">("home");

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
      <nav className="w-16 border-r border-slate-900 bg-slate-950 flex flex-col items-center py-6 gap-6 shrink-0 relative z-20">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg mb-4 shrink-0">
          <Activity className="h-5 w-5 animate-pulse" />
        </div>

        {/* Tab Buttons */}
        <button
          onClick={() => { setActiveTab("home"); setSearchQuery(""); }}
          className={`p-3 rounded-2xl transition-all ${
            activeTab === "home"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
          }`}
          title="Trang chủ (Dashboard)"
        >
          <LayoutDashboard className="h-5 w-5" />
        </button>

        <button
          onClick={() => { setActiveTab("operations"); setSearchQuery(""); }}
          className={`p-3 rounded-2xl transition-all ${
            activeTab === "operations"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
          }`}
          title="Vận hành Daily Tasks"
        >
          <CheckSquare className="h-5 w-5" />
        </button>

        <button
          onClick={() => { setActiveTab("projects"); setSearchQuery(""); }}
          className={`p-3 rounded-2xl transition-all ${
            activeTab === "projects"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
          }`}
          title="Dự án Portfolio"
        >
          <Briefcase className="h-5 w-5" />
        </button>

        <button
          onClick={() => { setActiveTab("incidents"); setSearchQuery(""); }}
          className={`p-3 rounded-2xl transition-all relative ${
            activeTab === "incidents"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
          }`}
          title="Incident Hub (Sự cố)"
        >
          <Flame className="h-5 w-5" />
          {activeIncidents.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab("wiki"); setSearchQuery(""); }}
          className={`p-3 rounded-2xl transition-all ${
            activeTab === "wiki"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
          }`}
          title="Tài nguyên Wiki & Flow"
        >
          <BookOpen className="h-5 w-5" />
        </button>
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
                              <button type="button" onClick={() => insertMarkdown("**", "**")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chữ Đậm"><Bold className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("*", "*")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chữ Nghiêng"><Italic className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("# ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tiêu Đề 1"><Heading1 className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("## ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tiêu Đề 2"><Heading2 className="h-3.5 w-3.5" /></button>
                              <div className="h-4 w-px bg-slate-900" />
                              <button type="button" onClick={() => insertMarkdown("| Tiêu đề | Cột 2 |\n|---|---|\n| Giá trị 1 | Giá trị 2 |", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chèn Bảng"><TableIcon className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("```sql\n", "\n```")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Khối SQL Code"><CodeIcon className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("- ", "\n")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Danh Sách Dòng"><ListIcon className="h-3.5 w-3.5" /></button>
                              <div className="h-4 w-px bg-slate-900" />
                              <button type="button" onClick={() => insertMarkdown("<span style='color: #38bdf8'>", "</span>")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Tô màu chữ Xanh"><Paintbrush className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("<div align='center'>\n", "\n</div>")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Canh Giữa"><AlignCenter className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => insertMarkdown("![Chú thích hình ảnh](url_hình_ảnh_ở_đây)", "")} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-900" title="Chèn Hình Ảnh"><ImageIcon className="h-3.5 w-3.5" /></button>
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
                                <button type="button" onClick={() => insertMarkdown('![Mô tả ảnh](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800)')} className="p-1.5 rounded hover:bg-slate-900 text-slate-400" title="Ảnh"><ImageIcon className="h-3.5 w-3.5" /></button>
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
          </>
        )}
      </div>
    </div>
  );
}
