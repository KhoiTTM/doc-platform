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
  Info,
  ArrowRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";

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

export default function DashboardPage() {
  const supabase = createClient();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Tree & Navigation States
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "11111111-1111-1111-1111-000000000001": true, // Auto-expand chặng 1
    "11111111-1111-1111-1111-000000000002": true, // Auto-expand chặng 2
  });
  const [activeDoc, setActiveDoc] = useState<DocumentType | null>(null);

  // Inline Creation States
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined); // undefined means not creating
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creatingDocFolderId, setCreatingDocFolderId] = useState<string | null | undefined>(undefined); // undefined means not creating

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  // Fetch data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: foldersData } = await supabase.from("folders").select("*").order("name");
      const { data: docsData } = await supabase.from("wiki_documents").select("*").order("title");

      setFolders(foldersData || []);
      setDocuments(docsData || []);

      // If activeDoc is set, update it with fresh data
      if (activeDoc) {
        const fresh = docsData?.find(d => d.id === activeDoc.id);
        if (fresh) setActiveDoc(fresh);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeDoc]);

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
      if (parentId) {
        setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
      }
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
      setIsEditing(true); // Open in edit mode immediately
      setEditTitle(data.title);
      setEditContent(data.content);
      setEditFileUrl(data.file_url || "");
      setEditFolderId(data.folder_id);
    } catch (err) {
      alert("Lỗi khi tạo tài liệu (có thể trùng tiêu đề)!");
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

  // Start Editing Helper
  const startEditing = (doc: DocumentType) => {
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditFileUrl(doc.file_url || "");
    setEditFolderId(doc.folder_id);
    setIsEditing(true);
  };

  // SVG steps definitions for beautiful pipeline view
  const etlSteps = [
    { num: 1, name: "Bronze Extraction", platform: "Azure Synapse / AX DB", folderId: "11111111-1111-1111-1111-000000000001" },
    { num: 2, name: "Databricks Trigger", platform: "API Integration", folderId: "22222222-2222-2222-2222-000000000022" },
    { num: 3, name: "dbt Transformation", platform: "Databricks Silver/Gold", folderId: "11111111-1111-1111-1111-000000000002" },
    { num: 4, name: "Serving Layer", platform: "Synapse Serverless External", folderId: "11111111-1111-1111-1111-000000000003" },
    { num: 5, name: "Semantic AAS", platform: "Analysis Services Model", folderId: "11111111-1111-1111-1111-000000000004" },
    { num: 6, name: "Power BI Live", platform: "Power BI Live reports", folderId: "11111111-1111-1111-1111-000000000005" },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT EXPLORER PANEL */}
      <aside className="w-80 border-r border-slate-900 bg-slate-950/20 shrink-0 flex flex-col overflow-hidden">
        {/* Explorer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/40 shrink-0">
          <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
            Document Explorer
          </span>
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
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-xs text-slate-500">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-500 border-t-transparent" />
              Đang tải tài liệu...
            </div>
          ) : (
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
              {/* 1. Folders rendering */}
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

              {/* 2. Root Level direct documents */}
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
          )}
        </div>
      </aside>

      {/* RIGHT WORKSPACE / PANEL */}
      <section className="flex-1 bg-slate-950/45 flex flex-col overflow-hidden">
        {activeDoc ? (
          /* DOCUMENT EDITOR / VIEW WORKSPACE */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Doc Sub-Header / Tool Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <Folder className="h-3.5 w-3.5 text-sky-500" />
                <span>
                  {folders.find(f => f.id === activeDoc.folder_id)?.name || "Root Workspace"}
                </span>
                <span>/</span>
                <span className="text-slate-300 font-bold">{activeDoc.title}</span>
              </div>

              <div className="flex items-center gap-2">
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

            {/* Document Workspace Core Scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 1. EDIT MODE */}
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Edit title */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tiêu đề tài liệu</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-base text-white font-bold outline-none focus:border-sky-500 transition-all"
                      />
                    </div>

                    {/* Edit folder mapping */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Vị trí lưu trữ (Folder)</label>
                        <select
                          value={editFolderId || ""}
                          onChange={(e) => setEditFolderId(e.target.value || null)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-sky-500 transition-all"
                        >
                          <option value="">-- Root Workspace --</option>
                          {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Reference file attachment url */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đường dẫn tệp đính kèm (Storage URL)</label>
                        <input
                          type="text"
                          placeholder="https://supabase.co/storage/v1/object/public/manuals/..."
                          value={editFileUrl}
                          onChange={(e) => setEditFileUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-300 outline-none focus:border-sky-500 transition-all placeholder:text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Markdown Body Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nội dung tài liệu (Markdown)</label>
                        <span className="text-[10px] text-slate-600 font-semibold">Hỗ trợ đầy đủ cú pháp Markdown</span>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={22}
                        className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-4 py-4 text-xs font-mono text-slate-200 outline-none focus:border-sky-500 transition-all resize-y leading-relaxed"
                        placeholder="# Hướng dẫn vận hành..."
                      />
                    </div>
                  </div>
                ) : (
                  /* 2. READ MODE */
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Header Details */}
                    <div className="border-b border-slate-900/60 pb-5">
                      <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                        {activeDoc.title}
                      </h1>
                      <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          Last Updated: {new Date(activeDoc.updated_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Attachment widget if activeDoc.file_url exists */}
                    {activeDoc.file_url && (
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-sky-950/20 bg-sky-950/5 shadow-md shadow-sky-500/2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow">
                            <Layers className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-300">Tài liệu vận hành đính kèm (PDF/Word/Excel)</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-sm sm:max-w-md mt-0.5">{activeDoc.file_url}</p>
                          </div>
                        </div>
                        <a
                          href={activeDoc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-[10px] font-black text-white tracking-wide transition-all shadow shadow-sky-500/15"
                        >
                          TẢI XUỐNG TỆP
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Render Content Markdown Body */}
                    <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed prose-headings:font-display prose-headings:font-black prose-headings:tracking-tight prose-headings:text-white prose-a:text-sky-400 prose-code:text-sky-300 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-900/60 prose-pre:rounded-2xl">
                      <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ETL PROCESS DASHBOARD (LANDING VIEW) */
          <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-12 flex flex-col justify-between">
            <div className="max-w-5xl mx-auto w-full space-y-12">
              
              {/* Dashboard Hero */}
              <div className="text-center sm:text-left space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 text-[10px] font-black tracking-wider text-sky-400 uppercase">
                  <Activity className="h-3 w-3" />
                  Active Workspace
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Hệ thống Tài liệu Kỹ thuật <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">ETL Data Platform</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
                  Chào mừng đến với Wiki vận hành nội bộ của phòng dữ liệu. Đây là nơi lưu trữ toàn bộ sơ đồ cấu trúc, cẩm nang xử lý sự cố, tài liệu kỹ thuật và checklist kiểm định chất lượng (QC) cho toàn bộ luồng ETL từ AX ERP đến Power BI.
                </p>
              </div>

              {/* ETL Flow Map Overview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-sky-400" />
                    <span className="text-xs font-black tracking-wider uppercase text-slate-300">
                      Sơ đồ Tổng quan Vận hành (ETL Full Flow)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 italic">Nhấp vào một bước để xem thư mục tương ứng</span>
                </div>

                {/* Pipeline visual blocks */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {etlSteps.map((step) => {
                    return (
                      <div
                        key={step.num}
                        onClick={() => {
                          toggleFolder(step.folderId);
                          // Select the first document in this folder if exists
                          const targetDoc = documents.find(d => d.folder_id === step.folderId);
                          if (targetDoc) {
                            setActiveDoc(targetDoc);
                          } else {
                            // Scroll to/open explorer
                            setExpandedFolders(prev => ({ ...prev, [step.folderId]: true }));
                          }
                        }}
                        className="group flex flex-col justify-between p-3.5 rounded-2xl border border-slate-900 bg-slate-950/50 hover:border-slate-800 hover:bg-slate-900/40 text-left cursor-pointer transition-all duration-300 relative overflow-hidden"
                      >
                        {/* Glow indicator if has documents */}
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-sky-500/20 group-hover:bg-sky-500/30 transition-all rounded-bl-xl" />

                        <div className="space-y-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-500 group-hover:border-sky-500/30 group-hover:text-sky-400 transition-all shrink-0">
                            {step.num}
                          </span>
                          <p className="text-xs font-black text-white tracking-tight leading-snug group-hover:text-sky-300 transition-colors mt-2">{step.name}</p>
                          <p className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors">{step.platform}</p>
                        </div>

                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-700 group-hover:text-sky-500 mt-4 transition-all">
                          Xem tài liệu
                          <ArrowRight className="h-2.5 w-2.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick statistics & guides */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Stat 1 */}
                <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-950/20">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cấu trúc thư mục</p>
                    <p className="text-base font-black text-white mt-0.5">{folders.length} Thư mục hoạt động</p>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-950/20">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tổng số tài liệu</p>
                    <p className="text-base font-black text-white mt-0.5">{documents.length} Cẩm nang kỹ thuật</p>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-950/20">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tình trạng lưu trữ</p>
                    <p className="text-base font-black text-white mt-0.5">Vận hành nội bộ</p>
                  </div>
                </div>
              </div>

              {/* Operational Guide Panel */}
              <div className="p-5 rounded-2xl border border-slate-900 bg-slate-950/40 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-white">Hướng dẫn vận hành hệ thống Wiki cá nhân:</p>
                  <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc leading-relaxed pt-1.5">
                    <li>Sử dụng cột **Explorer** bên trái để duyệt các chặng thư mục. Nhấp chọn tài liệu để đọc.</li>
                    <li>Để **Thêm tài liệu hoặc Thư mục con**, di chuột vào dòng thư mục tương ứng và click biểu tượng tương ứng hiện lên ở góc phải.</li>
                    <li>Tất cả tài liệu được biên soạn bằng cú pháp **Markdown chuẩn**. Khi chỉnh sửa, anh có thể dán đường dẫn file PDF/Word/Excel đã upload lên Supabase Storage vào mục *&quot;Đường dẫn tệp đính kèm&quot;* để liên kết xem/tải trực quan.</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Dashboard Footer */}
            <div className="text-center text-[10px] text-slate-700 mt-16">
              Hệ thống wiki vận hành ETL. Bản quyền thuộc phòng Data.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
