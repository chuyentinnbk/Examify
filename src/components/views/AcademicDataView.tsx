'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import MathText from '@/components/common/MathText';
import PortalModal from '@/components/common/PortalModal';

interface AcademicDoc {
  id: string;
  title: string;
  docType: 'EXAM' | 'LESSON';
  subject: string;
  grade: string;
  semester?: string | null;
  source?: string | null;
  rawContent: string;
  parseStatus: 'PENDING' | 'PARSING' | 'PARSED' | 'FAILED';
  parsedData?: string | null;
  parsedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AiSkillItem {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  grade: string;
  skillInstructions: string;
  fewShotExamples?: string | null;
  isActive: boolean;
  documentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AcademicDataView() {
  const { showToast } = useAppStore();

  // Active Tab: 1 = Raw Data, 2 = Parsed Data, 3 = AI Skills
  const [activeTab, setActiveTab] = useState<'RAW' | 'PARSED' | 'SKILLS'>('RAW');

  // Documents state
  const [documents, setDocuments] = useState<AcademicDoc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Skills state
  const [skills, setSkills] = useState<AiSkillItem[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  // Filters
  const [filterDocType, setFilterDocType] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isViewRawModalOpen, setIsViewRawModalOpen] = useState(false);
  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
  const [isViewSkillModalOpen, setIsViewSkillModalOpen] = useState(false);
  const [activeViewingDoc, setActiveViewingDoc] = useState<AcademicDoc | null>(null);
  const [activeViewingSkill, setActiveViewingSkill] = useState<AiSkillItem | null>(null);

  // Loading actions
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);

  // Form New Doc State
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'EXAM' | 'LESSON'>('EXAM');
  const [newDocSubject, setNewDocSubject] = useState('Toán học');
  const [newDocGrade, setNewDocGrade] = useState('Lớp 12');
  const [newDocSemester, setNewDocSemester] = useState('Học kỳ 1');
  const [newDocSource, setNewDocSource] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);

  // Academic Agent State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentStep, setAgentStep] = useState<
    'INIT' | 'PLANNING' | 'DIGITIZING' | 'SYNTHESIZING' | 'COMPLETED' | 'ERROR'
  >('INIT');
  const [agentMessage, setAgentMessage] = useState('');
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentBlueprint, setAgentBlueprint] = useState<any | null>(null);
  const [agentResultDoc, setAgentResultDoc] = useState<AcademicDoc | null>(null);
  const [agentResultSkill, setAgentResultSkill] = useState<AiSkillItem | null>(null);

  // Form New Skill State
  const [newSkillTitle, setNewSkillTitle] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillSubject, setNewSkillSubject] = useState('Toán học');
  const [newSkillGrade, setNewSkillGrade] = useState('Lớp 12');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');
  const [newSkillFewShot, setNewSkillFewShot] = useState('');
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);

  const subjectsList = [
    'Toán học',
    'Vật lí',
    'Hóa học',
    'Sinh học',
    'Ngữ văn',
    'Tiếng Anh',
    'Lịch sử',
    'Địa lí',
    'Tin học',
    'Giáo dục công dân',
  ];

  const gradesList = [
    'Lớp 12',
    'Lớp 11',
    'Lớp 10',
    'Lớp 9',
    'Lớp 8',
    'Lớp 7',
    'Lớp 6',
    'Lớp 5',
    'Lớp 4',
    'Lớp 3',
    'Lớp 2',
    'Lớp 1',
  ];

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/academic-data/documents', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.documents)) {
        setDocuments(data.data.documents);
        if (!selectedDocId && data.data.documents.length > 0) {
          setSelectedDocId(data.data.documents[0].id);
        }
      }
    } catch {
      showToast('Không thể tải danh sách tài liệu học thuật', 'error');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchSkills = async () => {
    setIsLoadingSkills(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/academic-data/skills', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.skills)) {
        setSkills(data.data.skills);
      }
    } catch {
      showToast('Không thể tải danh sách kỹ năng AI', 'error');
    } finally {
      setIsLoadingSkills(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchSkills();
  }, []);

  // ----------------------------------------------------------------------------
  // Document Operations
  // ----------------------------------------------------------------------------

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung tài liệu', 'warning');
      return;
    }

    setIsSubmittingDoc(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/academic-data/documents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newDocTitle.trim(),
          docType: newDocType,
          subject: newDocSubject,
          grade: newDocGrade,
          semester: newDocSemester,
          source: newDocSource.trim() || undefined,
          rawContent: newDocContent.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.document) {
        showToast('Đã thêm tài liệu học thuật gốc thành công!', 'success');
        setDocuments((prev) => [data.data.document, ...prev]);
        setSelectedDocId(data.data.document.id);
        setIsAddDocModalOpen(false);
        // Reset form
        setNewDocTitle('');
        setNewDocContent('');
        setNewDocSource('');
        setUploadedFileName('');
        setPreviewImage(null);
      } else {
        showToast(data.error || 'Lỗi khi lưu tài liệu', 'error');
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ', 'error');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Xử lý tải file lên (.pdf, .docx, .doc, image, .txt, .md - Tối đa 1GB)
  const processUploadedFile = async (file: File) => {
    const MAX_SIZE = 1024 * 1024 * 1024; // 1GB
    if (file.size > MAX_SIZE) {
      showToast(`Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (1GB).`, 'error');
      return;
    }

    setIsOcrProcessing(true);
    setUploadedFileName(file.name);
    setSelectedUploadFile(file);

    // Nếu là file ảnh, hiển thị preview trước
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }

    try {
      showToast(`Đang đọc và nhận diện nội dung từ "${file.name}"...`, 'info');
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/academic-data/ocr', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data?.text) {
        const extracted = data.data.text;
        setNewDocContent((prev) => {
          if (!prev.trim()) return extracted;
          return `${prev.trim()}\n\n--- [Nội dung từ ${file.name}] ---\n${extracted}`;
        });

        // Tự động gợi ý tiêu đề nếu chưa nhập
        if (!newDocTitle.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setNewDocTitle(cleanName);
        }

        showToast('Trích xuất nội dung bằng AI thành công!', 'success');
      } else {
        showToast(data.error || 'Không thể nhận diện nội dung từ tệp này', 'error');
      }
    } catch {
      showToast('Lỗi khi gửi tệp lên máy chủ nhận diện', 'error');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Xử lý sự kiện dán ảnh từ clipboard (Ctrl+V)
  const handlePasteEvent = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const customName = `anh-chup-man-hinh-${Date.now().toString().slice(-4)}.png`;
          const renamedFile = new File([file], customName, { type: file.type });
          showToast('Phát hiện hình ảnh từ clipboard (Ctrl+V)! Đang đọc OCR...', 'info');
          await processUploadedFile(renamedFile);
          return;
        }
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Autonomous Academic Agent Execution
  // ----------------------------------------------------------------------------

  const runAcademicAgent = async (params: {
    file?: File | null;
    existingDocId?: string;
    title?: string;
    subject?: string;
    grade?: string;
  }) => {
    setIsAgentRunning(true);
    setIsAgentModalOpen(true);
    setAgentProgress(5);
    setAgentStep('INIT');
    setAgentMessage('Khởi động Academic Processing Agent...');
    setAgentLogs(['[AGENT] Khởi tạo phiên làm việc đa luồng với Academic Agent...']);
    setAgentBlueprint(null);
    setAgentResultDoc(null);
    setAgentResultSkill(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      if (params.file) formData.append('file', params.file);
      if (params.existingDocId) formData.append('existingDocId', params.existingDocId);
      if (params.title) formData.append('title', params.title);
      if (params.subject) formData.append('subject', params.subject);
      if (params.grade) formData.append('grade', params.grade);

      const res = await fetch('/api/v1/academic-data/agent', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi máy chủ (${res.status})`);
      }

      if (!res.body) {
        throw new Error('Máy chủ không hỗ trợ luồng dữ liệu SSE');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(trimmed.slice(6));
              if (eventData.step) setAgentStep(eventData.step);
              if (typeof eventData.progress === 'number') setAgentProgress(eventData.progress);
              if (eventData.message) {
                setAgentMessage(eventData.message);
                const timeStr = new Date().toLocaleTimeString('vi-VN');
                setAgentLogs((prev) => [...prev, `[${timeStr}] ${eventData.message}`]);
              }
              if (eventData.details && eventData.step === 'PLANNING') {
                setAgentBlueprint(eventData.details);
              }

              if (eventData.step === 'COMPLETED') {
                showToast('Academic Agent đã số hóa thành công!', 'success');
                if (eventData.result?.document) setAgentResultDoc(eventData.result.document);
                if (eventData.result?.skill) setAgentResultSkill(eventData.result.skill);
                fetchDocuments();
                fetchSkills();
              } else if (eventData.step === 'ERROR') {
                showToast(eventData.message || 'Lỗi khi chạy Agent', 'error');
              }
            } catch {
              // ignore json parse
            }
          }
        }
      }
    } catch (err: any) {
      setAgentStep('ERROR');
      setAgentMessage(err?.message || 'Lỗi kết nối tới Academic Agent');
      setAgentLogs((prev) => [...prev, `[ERROR] ${err?.message || 'Lỗi không xác định'}`]);
      showToast(err?.message || 'Lỗi chạy Agent', 'error');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleDeleteDocument = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu học thuật này?')) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/academic-data/documents/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa tài liệu thành công', 'success');
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (selectedDocId === id) {
          const remain = documents.filter((d) => d.id !== id);
          setSelectedDocId(remain.length > 0 ? remain[0].id : '');
        }
      }
    } catch {
      showToast('Lỗi khi xóa tài liệu', 'error');
    }
  };

  const handleExtractDocument = async (doc: AcademicDoc) => {
    setSelectedDocId(doc.id);
    setActiveTab('PARSED');
    setIsExtracting(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      showToast(`Đang bóc tách dữ liệu AI cho "${doc.title}"...`, 'info');

      const res = await fetch('/api/v1/academic-data/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: doc.id }),
      });

      const data = await res.json();
      if (data.success && data.data?.document) {
        showToast(data.message || 'Bóc tách dữ liệu thành công!', 'success');
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? data.data.document : d))
        );
      } else {
        showToast(data.error || 'Lỗi khi bóc tách dữ liệu', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi bóc tách dữ liệu', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Skill Operations
  // ----------------------------------------------------------------------------

  const handleGenerateSkillFromSelectedDoc = async () => {
    const doc = documents.find((d) => d.id === selectedDocId);
    if (!doc) {
      showToast('Vui lòng chọn một tài liệu đã bóc tách để sinh kỹ năng', 'warning');
      return;
    }

    setIsGeneratingSkill(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      showToast(`AI đang phân tích và viết kỹ năng từ "${doc.title}"...`, 'info');

      const res = await fetch('/api/v1/academic-data/skills/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: doc.id }),
      });

      const data = await res.json();
      if (data.success && data.data?.skill) {
        showToast(data.message || 'Đã viết thành công kỹ năng cho AI!', 'success');
        setSkills((prev) => [data.data.skill, ...prev]);
        setActiveTab('SKILLS');
        setActiveViewingSkill(data.data.skill);
        setIsViewSkillModalOpen(true);
      } else {
        showToast(data.error || 'Lỗi khi viết kỹ năng AI', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi sinh kỹ năng AI', 'error');
    } finally {
      setIsGeneratingSkill(false);
    }
  };

  const handleCreateSkillManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillTitle.trim() || !newSkillInstructions.trim()) {
      showToast('Vui lòng nhập tên kỹ năng và hướng dẫn quy chuẩn sư phạm', 'warning');
      return;
    }

    setIsSubmittingSkill(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let parsedFewShot: any = null;
      if (newSkillFewShot.trim()) {
        try {
          parsedFewShot = JSON.parse(newSkillFewShot);
        } catch {
          parsedFewShot = [{ content: newSkillFewShot.trim() }];
        }
      }

      const res = await fetch('/api/v1/academic-data/skills', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newSkillTitle.trim(),
          description: newSkillDesc.trim() || undefined,
          subject: newSkillSubject,
          grade: newSkillGrade,
          skillInstructions: newSkillInstructions.trim(),
          fewShotExamples: parsedFewShot,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.skill) {
        showToast('Đã tạo kỹ năng AI mới thành công!', 'success');
        setSkills((prev) => [data.data.skill, ...prev]);
        setIsAddSkillModalOpen(false);
        setNewSkillTitle('');
        setNewSkillDesc('');
        setNewSkillInstructions('');
        setNewSkillFewShot('');
      } else {
        showToast(data.error || 'Lỗi khi tạo kỹ năng', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleToggleSkill = async (skill: AiSkillItem) => {
    const newStatus = !skill.isActive;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/academic-data/skills/${skill.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSkills((prev) =>
          prev.map((s) => (s.id === skill.id ? { ...s, isActive: newStatus } : s))
        );
        showToast(
          newStatus
            ? `Đã kích hoạt kỹ năng "${skill.title}"`
            : `Đã tắt kích hoạt kỹ năng "${skill.title}"`,
          'info'
        );
      }
    } catch {
      showToast('Lỗi cập nhật trạng thái kỹ năng', 'error');
    }
  };

  const handleDeleteSkill = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa kỹ năng AI này?')) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/academic-data/skills/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa kỹ năng AI thành công', 'success');
        setSkills((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      showToast('Lỗi khi xóa kỹ năng AI', 'error');
    }
  };

  // ----------------------------------------------------------------------------
  // Filtered Lists
  // ----------------------------------------------------------------------------

  const filteredDocs = documents.filter((doc) => {
    if (filterDocType !== 'ALL' && doc.docType !== filterDocType) return false;
    if (filterSubject !== 'ALL' && doc.subject !== filterSubject) return false;
    if (filterGrade !== 'ALL' && doc.grade !== filterGrade) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q) ||
        doc.grade.toLowerCase().includes(q) ||
        (doc.source && doc.source.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  let selectedParsedData: any = null;
  if (selectedDoc && selectedDoc.parsedData) {
    try {
      selectedParsedData = JSON.parse(selectedDoc.parsedData);
    } catch {
      selectedParsedData = null;
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Title & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Dữ Liệu Học Thuật &amp; Kỹ Năng AI
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Quản lý tài liệu, bóc tách câu hỏi/bài học có cấu trúc và viết kỹ năng sư phạm cho AI
            </p>
          </div>
        </div>

        {/* 3 Main Tabs Switcher & Nạp Dữ Liệu Quick Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('RAW')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'RAW'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">description</span>
              Phần 1: Dữ liệu
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-extrabold">
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PARSED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'PARSED'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">account_tree</span>
              Phần 2: Dữ liệu Tách
              {isExtracting && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('SKILLS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SKILLS'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">psychology</span>
              Phần 3: Kỹ năng AI
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                {skills.length}
              </span>
            </button>
          </div>

          {/* Nút Khởi chạy Autonomous Agent Nổi Bật */}
          <button
            onClick={() => {
              setIsAgentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span>🤖 Academic Agent</span>
          </button>

          {/* Nút Nạp Dữ Liệu Nổi Bật Luôn Hiển Thị Trên Header */}
          <button
            onClick={() => {
              setActiveTab('RAW');
              setIsAddDocModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>+ Nạp Dữ Liệu</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHẦN 1: DỮ LIỆU (ACADEMIC DATA) */}
      {/* ========================================================================= */}
      {activeTab === 'RAW' && (
        <div className="flex flex-col gap-5">
          {/* Action & Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Type Filter */}
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="ALL">Tất cả loại tài liệu</option>
                <option value="EXAM">Đề kiểm tra</option>
                <option value="LESSON">Bài học / Chuyên đề</option>
              </select>

              {/* Subject Filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="ALL">Tất cả môn học</option>
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="ALL">Tất cả khối lớp</option>
                {gradesList.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition w-48 md:w-60"
                />
              </div>
            </div>

            {/* Add New Raw Doc Button */}
            <button
              onClick={() => setIsAddDocModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer self-start lg:self-auto"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>+ Nạp Dữ Liệu</span>
            </button>
          </div>

          {/* Documents Grid / Table */}
          {isLoadingDocs ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <span className="material-symbols-outlined text-4xl text-blue-500 animate-spin">
                progress_activity
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách tài liệu...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có tài liệu học thuật nào</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                Bấm nút &quot;+ Nạp Dữ Liệu&quot; để tải lên đề kiểm tra hoặc tài liệu (hỗ trợ PDF dung lượng đến 1GB, Word, Ảnh) để AI tự động trích xuất và số hóa.
              </p>
              <button
                onClick={() => setIsAddDocModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                <span>+ Nạp Dữ Liệu Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const isExam = doc.docType === 'EXAM';
                const isParsed = doc.parseStatus === 'PARSED';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-5 flex flex-col justify-between transition-all shadow-sm hover:shadow-md group"
                  >
                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isExam
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isExam ? 'Đề kiểm tra' : 'Bài học / Chuyên đề'}
                        </span>

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isParsed
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.parseStatus === 'PARSING'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isParsed
                                ? 'bg-emerald-500'
                                : doc.parseStatus === 'PARSING'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {isParsed
                            ? 'Đã bóc tách'
                            : doc.parseStatus === 'PARSING'
                            ? 'Đang bóc tách...'
                            : 'Chưa bóc tách'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-sm text-slate-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                        {doc.title}
                      </h3>

                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] font-semibold text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100">
                          {doc.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100">
                          {doc.grade}
                        </span>
                        {doc.semester && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100">
                            {doc.semester}
                          </span>
                        )}
                        {doc.source && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 italic">
                            {doc.source}
                          </span>
                        )}
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-500 line-clamp-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 font-mono mb-4">
                        {doc.rawContent}
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActiveViewingDoc(doc);
                            setIsViewRawModalOpen(true);
                          }}
                          title="Xem nội dung gốc"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          title="Xóa tài liệu"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            runAcademicAgent({
                              existingDocId: doc.id,
                              title: doc.title,
                              subject: doc.subject,
                              grade: doc.grade,
                            });
                          }}
                          title="Số hóa đa luồng & Lập kỹ năng AI bằng Autonomous Agent"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">smart_toy</span>
                          <span className="hidden sm:inline">Chạy Agent</span>
                        </button>

                        {/* Main Parse Action Button */}
                        <button
                          onClick={() => handleExtractDocument(doc)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isParsed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isParsed ? 'check_circle' : 'bolt'}
                          </span>
                          {isParsed ? 'Xem Dữ Liệu Tách' : 'Bóc Tách AI'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 2: DỮ LIỆU TÁCH (PARSED & EXTRACTED DATA) */}
      {/* ========================================================================= */}
      {activeTab === 'PARSED' && (
        <div className="flex flex-col gap-5">
          {/* Document Selector Topbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tài liệu đang xem:
              </span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-sm md:max-w-md"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.docType === 'EXAM' ? 'Đề thi' : 'Bài học'}] {d.title} ({d.subject} - {d.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Re-extract button */}
              {selectedDoc && (
                <button
                  onClick={() => handleExtractDocument(selectedDoc)}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      isExtracting ? 'animate-spin text-blue-600' : ''
                    }`}
                  >
                    refresh
                  </span>
                  {isExtracting ? 'Đang bóc tách...' : 'Bóc tách lại'}
                </button>
              )}

              {/* Generate AI Skill Button */}
              {selectedParsedData && (
                <button
                  onClick={handleGenerateSkillFromSelectedDoc}
                  disabled={isGeneratingSkill}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-500/20"
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      isGeneratingSkill ? 'animate-spin' : ''
                    }`}
                  >
                    auto_awesome
                  </span>
                  {isGeneratingSkill ? 'Đang viết kỹ năng...' : 'Tạo Kỹ Năng Cho AI Từ Dữ Liệu Này'}
                </button>
              )}
            </div>
          </div>

          {/* Parsed Result Display */}
          {!selectedDoc ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500">Chưa có tài liệu nào được chọn.</p>
            </div>
          ) : !selectedParsedData ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Tài liệu này chưa được bóc tách dữ liệu
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                Bấm vào nút bên dưới để AI tự động trích xuất các câu hỏi, ma trận độ khó hoặc chủ đề và nội dung trọng tâm.
              </p>
              <button
                onClick={() => handleExtractDocument(selectedDoc)}
                disabled={isExtracting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
              >
                <span className="material-symbols-outlined text-base">bolt</span>
                {isExtracting ? 'Đang bóc tách AI...' : 'Bắt Đầu Bóc Tách Dữ Liệu Ngay'}
              </button>
            </div>
          ) : selectedDoc.docType === 'EXAM' ? (
            /* =============================================================== */
            /* CASE A: ĐỀ KIỂM TRA -> TÁCH CÂU HỎI */
            /* =============================================================== */
            <div className="flex flex-col gap-4">
              {/* Header Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng câu hỏi</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {selectedParsedData.questions?.length || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Trắc nghiệm</span>
                  <p className="text-2xl font-black text-blue-600 mt-1">
                    {
                      selectedParsedData.questions?.filter(
                        (q: any) => q.type === 'MULTIPLE_CHOICE'
                      ).length || 0
                    }
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Đúng / Sai</span>
                  <p className="text-2xl font-black text-purple-600 mt-1">
                    {
                      selectedParsedData.questions?.filter(
                        (q: any) => q.type === 'TRUE_FALSE'
                      ).length || 0
                    }
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Tự luận &amp; Ngắn</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {
                      selectedParsedData.questions?.filter(
                        (q: any) => q.type === 'SHORT_ANSWER' || q.type === 'ESSAY'
                      ).length || 0
                    }
                  </p>
                </div>
              </div>

              {/* Questions List */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">quiz</span>
                    Danh Sách Câu Hỏi Đã Bóc Tách
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    Bóc tách lúc: {selectedDoc.parsedAt ? new Date(selectedDoc.parsedAt).toLocaleString('vi-VN') : 'Mới đây'}
                  </span>
                </div>

                <div className="space-y-4">
                  {(selectedParsedData.questions || []).map((q: any, idx: number) => {
                    const levelLabel =
                      q.cognitiveLevel === 'KNOWLEDGE'
                        ? 'Nhận biết'
                        : q.cognitiveLevel === 'COMPREHENSION'
                        ? 'Thông hiểu'
                        : q.cognitiveLevel === 'APPLICATION'
                        ? 'Vận dụng'
                        : 'Vận dụng cao';

                    const levelClass =
                      q.cognitiveLevel === 'KNOWLEDGE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : q.cognitiveLevel === 'COMPREHENSION'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : q.cognitiveLevel === 'APPLICATION'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200';

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col gap-2.5"
                      >
                        {/* Question Top Tags */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                              Câu {q.questionNumber || idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${levelClass}`}
                            >
                              {levelLabel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {q.type}
                            </span>
                          </div>
                          {q.points && (
                            <span className="text-xs font-bold text-slate-500">
                              {q.points} điểm
                            </span>
                          )}
                        </div>

                        {/* Question Content */}
                        <div className="text-xs md:text-sm font-semibold text-slate-800 leading-relaxed">
                          <MathText content={q.content || ''} />
                        </div>

                        {/* Options if Multiple Choice */}
                        {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isCorrectOpt =
                                q.correctAnswer &&
                                (opt.trim().startsWith(q.correctAnswer) ||
                                  q.correctAnswer === ['A', 'B', 'C', 'D'][optIdx]);

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                                    isCorrectOpt
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                      : 'bg-white text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isCorrectOpt && (
                                    <span className="material-symbols-outlined text-sm text-emerald-600">
                                      check_circle
                                    </span>
                                  )}
                                  <MathText content={opt || ''} />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Answer & Explanation */}
                        {(q.correctAnswer || q.explanation) && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700">
                            {q.correctAnswer && (
                              <p className="font-bold text-blue-900 mb-1">
                                Đáp án đúng: <span className="text-emerald-700">{q.correctAnswer}</span>
                              </p>
                            )}
                            {q.explanation && (
                              <div className="text-slate-600">
                                <span className="font-bold text-slate-700">Lời giải chi tiết: </span>
                                <MathText content={q.explanation || ''} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* CASE B: BÀI HỌC -> TÁCH CHỦ ĐỀ, NỘI DUNG, CÂU HỎI */
            /* =============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Col 1: Main Topics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-blue-600">topic</span>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    1. Các Chủ Đề Chính ({selectedParsedData.mainTopics?.length || 0})
                  </h3>
                </div>

                <div className="space-y-3">
                  {(selectedParsedData.mainTopics || []).map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5"
                    >
                      <h4 className="font-extrabold text-xs text-slate-800">
                        {idx + 1}. {t.title}
                      </h4>
                      {t.summary && (
                        <p className="text-[11px] text-slate-500 font-medium">{t.summary}</p>
                      )}
                      {t.keyConcepts && Array.isArray(t.keyConcepts) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.keyConcepts.map((kc: string, kcIdx: number) => (
                            <span
                              key={kcIdx}
                              className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                            >
                              {kc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 2: Core Knowledge Points */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-purple-600">lightbulb</span>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    2. Nội Dung &amp; Khái Niệm ({selectedParsedData.coreKnowledgePoints?.length || 0})
                  </h3>
                </div>

                <div className="space-y-3">
                  {(selectedParsedData.coreKnowledgePoints || []).map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col gap-1.5"
                    >
                      <h4 className="font-extrabold text-xs text-purple-900">
                        {c.concept}
                      </h4>
                      <div className="text-[11px] text-slate-700 font-medium">
                        <MathText content={c.details || ''} />
                      </div>
                      {c.notes && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-md mt-1 font-semibold">
                          ⚠️ Lưu ý: {c.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 3: Extracted Questions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-emerald-600">assignment</span>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    3. Câu Hỏi &amp; Bài Tập ({selectedParsedData.extractedQuestions?.length || 0})
                  </h3>
                </div>

                <div className="space-y-3">
                  {(selectedParsedData.extractedQuestions || []).map((q: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Câu {idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {q.cognitiveLevel || 'Thông hiểu'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-medium">
                        <MathText content={q.content || ''} />
                      </div>
                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 3: SỬ DỤNG DỮ LIỆU ĐÓ VIẾT KỸ NĂNG CHO AI (AI SKILLS) */}
      {/* ========================================================================= */}
      {activeTab === 'SKILLS' && (
        <div className="flex flex-col gap-5">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-sm md:text-base font-extrabold text-slate-800">
                Kho Kỹ Năng Sư Phạm Dành Cho AI (Pedagogical Skills)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Các kỹ năng được AI trích xuất từ đề thi/bài học gốc để nạp vào động cơ sinh đề khi tạo đề thi mới
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddSkillModalOpen(true)}
                className="flex items-center gap-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                <span className="material-symbols-outlined text-base">edit_note</span>
                Viết Kỹ Năng Thủ Công
              </button>

              <button
                onClick={() => {
                  if (documents.length > 0) {
                    setActiveTab('PARSED');
                    showToast('Vui lòng chọn tài liệu đã bóc tách rồi bấm "Tạo Kỹ Năng Cho AI"', 'info');
                  } else {
                    showToast('Chưa có tài liệu gốc nào, hãy thêm tài liệu ở Phần 1', 'warning');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-emerald-500/20"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                AI Tự Động Viết Từ Dữ Liệu Tách
              </button>
            </div>
          </div>

          {/* Skills Grid */}
          {isLoadingSkills ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-500 animate-spin">
                progress_activity
              </span>
              <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách kỹ năng...</p>
            </div>
          ) : skills.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có kỹ năng AI nào</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                Sử dụng các đề thi hoặc bài học đã bóc tách ở Phần 2 để AI tự động tổng hợp thành kỹ năng ra đề, hoặc tự viết kỹ năng mới.
              </p>
              <button
                onClick={() => setActiveTab('RAW')}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition"
              >
                Đi Đến Phần 1 Để Nạp Dữ Liệu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => {
                let fewShotCount = 0;
                try {
                  if (skill.fewShotExamples) {
                    const parsed = JSON.parse(skill.fewShotExamples);
                    if (Array.isArray(parsed)) fewShotCount = parsed.length;
                  }
                } catch {
                  fewShotCount = 0;
                }

                return (
                  <div
                    key={skill.id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${
                      skill.isActive
                        ? 'border-emerald-300/80 shadow-emerald-500/5'
                        : 'border-slate-200 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                            {skill.subject}
                          </span>
                          <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {skill.grade}
                          </span>
                        </div>

                        {/* Toggle active switch */}
                        <button
                          onClick={() => handleToggleSkill(skill)}
                          className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-colors ${
                            skill.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              skill.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {skill.isActive ? 'Kích hoạt' : 'Tắt'}
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="font-extrabold text-sm text-slate-800 line-clamp-2 mb-1.5">
                        {skill.title}
                      </h3>

                      {/* Description */}
                      {skill.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {skill.description}
                        </p>
                      )}

                      {/* Instructions Snippet */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono line-clamp-3 mb-3">
                        {skill.skillInstructions}
                      </div>

                      {/* Few-shot sample count */}
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <span className="material-symbols-outlined text-sm">sample_rates</span>
                        <span>{fewShotCount} câu hỏi mẫu tham khảo</span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={(e) => handleDeleteSkill(skill.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa kỹ năng"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveViewingSkill(skill);
                          setIsViewSkillModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Chi Tiết Kỹ Năng
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM TÀI LIỆU HỌC THUẬT */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isAddDocModalOpen}
        onClose={() => {
          setIsAddDocModalOpen(false);
          setPreviewImage(null);
          setUploadedFileName('');
        }}
        maxWidth="max-w-3xl"
        icon="upload_file"
        iconBg="bg-blue-600 text-white shadow-md shadow-blue-500/20"
        title="Nạp Dữ Liệu Học Thuật"
        subtitle="Tải lên tệp đề thi, giáo án (PDF, Word, Ảnh) hoặc nhập nội dung văn bản trực tiếp"
      >
        <form onSubmit={handleCreateDocument} className="flex flex-col gap-5">
          {/* 1. KHU VỰC TẢI LÊN TỆP & OCR (TÙY CHỌN) */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">document_scanner</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tải tệp & Nhận diện tự động bằng AI (OCR)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Không bắt buộc</span>
            </div>

            {/* Input File Ẩn */}
            <input
              type="file"
              id="academic-file-input"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processUploadedFile(e.target.files[0]);
                }
              }}
            />

            {/* State A: Đang quét OCR */}
            {isOcrProcessing && (
              <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                </div>
                <p className="text-xs font-extrabold text-blue-900">
                  AI đang quét tài liệu và chuyển đổi công thức LaTeX...
                </p>
                <p className="text-[11px] text-blue-600">
                  Quá trình có thể mất vài giây tùy dung lượng và số trang tài liệu.
                </p>
              </div>
            )}

            {/* State B: Đã tải tệp xong */}
            {uploadedFileName && !isOcrProcessing && (
              <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                    <span className="material-symbols-outlined text-xl">task</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-emerald-950 truncate">
                      {uploadedFileName}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Đã trích xuất nội dung vào biểu mẫu bên dưới
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedUploadFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddDocModalOpen(false);
                        runAcademicAgent({
                          file: selectedUploadFile,
                          title: newDocTitle || uploadedFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                          subject: newDocSubject,
                          grade: newDocGrade,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">smart_toy</span>
                      Chạy Agent
                    </button>
                  )}
                  <label
                    htmlFor="academic-file-input"
                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Đổi tệp khác
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName('');
                      setSelectedUploadFile(null);
                      setPreviewImage(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Xóa tệp"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* State C: Chưa tải tệp - Dropzone sạch sẽ, hiện đại */}
            {!uploadedFileName && !isOcrProcessing && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onPaste={handlePasteEvent}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100/40 scale-[0.99]'
                    : 'border-slate-300/80 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Kéo thả tài liệu vào đây hoặc{' '}
                      <label
                        htmlFor="academic-file-input"
                        className="text-blue-600 hover:text-blue-700 cursor-pointer font-extrabold underline underline-offset-2"
                      >
                        chọn từ máy tính
                      </label>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Hỗ trợ tệp <b>PDF (đến 1GB)</b>, <b>Word (.docx)</b>, <b>Ảnh</b> hoặc nhấn <b>Ctrl + V</b> để dán ảnh chụp màn hình
                    </p>
                  </div>
                </div>
              </div>
            )}

            {previewImage && (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden max-h-32 max-w-xs shadow-xs bg-white mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImage} alt="Ảnh tải lên" className="object-contain w-full h-full" />
              </div>
            )}
          </div>

          {/* 2. THÔNG TIN ĐỊNH DANH TÀI LIỆU */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tiêu đề tài liệu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Đề khảo sát chất lượng môn Toán 12 - Sở GD&ĐT Hà Nội (HK1)"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại tài liệu</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="EXAM">Đề kiểm tra</option>
                  <option value="LESSON">Bài học / Chuyên đề</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
                <select
                  value={newDocSubject}
                  onChange={(e) => setNewDocSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {subjectsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                <select
                  value={newDocGrade}
                  onChange={(e) => setNewDocGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {gradesList.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nguồn / Đơn vị</label>
                <input
                  type="text"
                  placeholder="VD: Sở GD, THPT..."
                  value={newDocSource}
                  onChange={(e) => setNewDocSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* 3. NỘI DUNG VĂN BẢN TRÍCH XUẤT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Nội dung văn bản chi tiết</span>
                <span className="text-rose-500">*</span>
                {newDocContent.trim() && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {newDocContent.trim().length} ký tự
                  </span>
                )}
              </label>

              {newDocContent.trim() && (
                <button
                  type="button"
                  onClick={() => setNewDocContent('')}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition"
                >
                  Xóa nội dung
                </button>
              )}
            </div>

            <textarea
              required
              rows={9}
              onPaste={handlePasteEvent}
              placeholder="Nội dung câu hỏi, bài tập hoặc lý thuyết sẽ tự động xuất hiện ở đây sau khi quét tệp OCR. Bạn cũng có thể tự do chỉnh sửa hoặc gõ / dán nội dung trực tiếp tại đây..."
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* 4. FOOTER HÀNH ĐỘNG */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddDocModalOpen(false);
                setPreviewImage(null);
                setUploadedFileName('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingDoc || isOcrProcessing}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isSubmittingDoc ? 'progress_activity' : 'check'}
              </span>
              <span>{isSubmittingDoc ? 'Đang lưu tài liệu...' : 'Lưu Tài Liệu Học Thuật'}</span>
            </button>
          </div>
        </form>
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL 2: XEM NỘI DUNG GỐC */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isViewRawModalOpen}
        onClose={() => setIsViewRawModalOpen(false)}
        maxWidth="max-w-3xl"
        icon="article"
        iconBg="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        title={activeViewingDoc ? activeViewingDoc.title : 'Chi Tiết Tài Liệu Gốc'}
        subtitle={
          activeViewingDoc
            ? `${activeViewingDoc.subject} • ${activeViewingDoc.grade} • ${
                activeViewingDoc.docType === 'EXAM' ? 'Đề kiểm tra' : 'Bài học'
              }`
            : undefined
        }
      >
        {activeViewingDoc && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                  {activeViewingDoc.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                  {activeViewingDoc.grade}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">
                  {activeViewingDoc.docType === 'EXAM' ? 'Đề kiểm tra' : 'Bài học / Chuyên đề'}
                </span>
                {activeViewingDoc.source && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                    {activeViewingDoc.source}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeViewingDoc.rawContent);
                  showToast('Đã sao chép nội dung vào clipboard!', 'success');
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Sao chép</span>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800 select-text">
              {activeViewingDoc.rawContent}
            </div>
          </div>
        )}
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL 3: VIẾT KỸ NĂNG THỦ CÔNG */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isAddSkillModalOpen}
        onClose={() => setIsAddSkillModalOpen(false)}
        maxWidth="max-w-3xl"
        icon="psychology"
        iconBg="bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
        title="Viết Kỹ Năng Sư Phạm Cho AI"
        subtitle="Thiết lập bộ tiêu chuẩn ra đề, bẫy tư duy và ma trận kiến thức cho AI"
      >
        <form onSubmit={handleCreateSkillManual} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên kỹ năng sư phạm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Kỹ năng ra đề Phương trình lượng giác phân hóa 4 mức độ tư duy"
              value={newSkillTitle}
              onChange={(e) => setNewSkillTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Môn học áp dụng</label>
              <select
                value={newSkillSubject}
                onChange={(e) => setNewSkillSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp áp dụng</label>
              <select
                value={newSkillGrade}
                onChange={(e) => setNewSkillGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                {gradesList.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả tóm tắt kỹ năng</label>
            <input
              type="text"
              placeholder="VD: Định hướng ra câu hỏi phân hóa cao, cài cắm điều kiện xác định và nghiệm ngoại lai..."
              value={newSkillDesc}
              onChange={(e) => setNewSkillDesc(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bộ quy chuẩn sư phạm chi tiết cho AI (skillInstructions) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              placeholder="1. Ma trận phân hóa: Nhận biết 40%, Thông hiểu 30%, Vận dụng 20%, Vận dụng cao 10%...&#10;2. Bẫy tư duy: Luôn cài cắm sai lầm phổ biến của học sinh vào phương án B hoặc C...&#10;3. Lời giải: Diễn giải chi tiết từng bước, nêu rõ công thức áp dụng..."
              value={newSkillInstructions}
              onChange={(e) => setNewSkillInstructions(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Câu hỏi mẫu tham khảo (Few-shot Examples JSON - Tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder='[ { "content": "Tìm nghiệm của phương trình sin(x) = 1/2...", "correctAnswer": "A", "explanation": "..." } ]'
              value={newSkillFewShot}
              onChange={(e) => setNewSkillFewShot(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddSkillModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingSkill}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isSubmittingSkill ? 'progress_activity' : 'check'}
              </span>
              <span>{isSubmittingSkill ? 'Đang lưu...' : 'Lưu Kỹ Năng Sư Phạm'}</span>
            </button>
          </div>
        </form>
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL 4: XEM CHI TIẾT KỸ NĂNG */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isViewSkillModalOpen}
        onClose={() => setIsViewSkillModalOpen(false)}
        maxWidth="max-w-3xl"
        icon="psychology"
        iconBg="bg-emerald-100 text-emerald-800"
        title={activeViewingSkill ? activeViewingSkill.title : 'Chi Tiết Kỹ Năng'}
        subtitle={activeViewingSkill ? `${activeViewingSkill.subject} • ${activeViewingSkill.grade}` : undefined}
      >
        {activeViewingSkill && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {activeViewingSkill.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {activeViewingSkill.grade}
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  activeViewingSkill.isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {activeViewingSkill.isActive ? 'Đang kích hoạt' : 'Đã tắt'}
              </span>
            </div>

            {activeViewingSkill.description && (
              <p className="text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                {activeViewingSkill.description}
              </p>
            )}

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1.5">
                Hướng dẫn quy chuẩn sư phạm cho AI:
              </span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800 max-h-56 overflow-y-auto leading-relaxed">
                {activeViewingSkill.skillInstructions}
              </div>
            </div>

            {activeViewingSkill.fewShotExamples && (
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Câu hỏi mẫu (Few-shot):
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-700 max-h-48 overflow-y-auto leading-relaxed">
                  {activeViewingSkill.fewShotExamples}
                </div>
              </div>
            )}
          </div>
        )}
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL 5: AUTONOMOUS ACADEMIC AGENT PIPELINE */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isAgentModalOpen}
        onClose={() => {
          if (!isAgentRunning || confirm('Agent đang chạy. Bạn có chắc chắn muốn đóng giao diện theo dõi không?')) {
            setIsAgentModalOpen(false);
          }
        }}
        maxWidth="max-w-4xl"
        icon="smart_toy"
        iconBg="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
        title="Autonomous Academic Agent"
        subtitle="Hệ thống Agent tự động 3 pha: Trinh sát Mục lục ➔ Bóc tách Chuyên đề ➔ Tổng hợp Kỹ năng Sư phạm AI"
      >
        <div className="flex flex-col gap-5">
          {/* 1. Nếu Agent chưa chạy và chưa có kết quả -> Màn hình Cấu hình & Bắt đầu */}
          {!isAgentRunning && !agentResultDoc && (
            <div className="flex flex-col gap-4">
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">auto_fix_high</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">
                    Giải pháp tối ưu cho Sách Giáo Khoa &amp; Tài liệu nặng (&gt; 20 trang / đến 1GB)
                  </h4>
                  <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                    Thay vì gửi 1 lần dễ gây quá tải token hoặc timeout, <b>Autonomous Agent</b> sẽ tự động chia nhỏ công việc thành 3 pha độc lập: đọc cấu trúc mục lục, bóc tách sâu từng chuyên đề và tự động tổng hợp ngân hàng câu hỏi kèm Kỹ năng AI.
                  </p>
                </div>
              </div>

              {/* Tùy chọn nguồn tài liệu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={newDocSubject}
                    onChange={(e) => setNewDocSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {subjectsList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={newDocGrade}
                    onChange={(e) => setNewDocGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {gradesList.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài liệu / Sách (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Để trống AI sẽ tự nhận diện..."
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Tải tệp lên Agent */}
              <div className="border-2 border-dashed border-purple-200 bg-purple-50/30 rounded-2xl p-6 text-center">
                <input
                  type="file"
                  id="agent-file-input"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const f = e.target.files[0];
                      setSelectedUploadFile(f);
                      setUploadedFileName(f.name);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                  </div>
                  <div>
                    {selectedUploadFile ? (
                      <div>
                        <p className="text-sm font-extrabold text-purple-900 flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                          {selectedUploadFile.name} ({(selectedUploadFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </p>
                        <label
                          htmlFor="agent-file-input"
                          className="text-xs text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer mt-1 inline-block"
                        >
                          Chọn tệp khác
                        </label>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Chọn Sách Giáo Khoa (PDF đến 1GB) hoặc tài liệu nặng để Agent xử lý
                        </p>
                        <label
                          htmlFor="agent-file-input"
                          className="mt-2 inline-block px-4 py-2 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Chọn tệp từ thiết bị
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút Kích hoạt Agent */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAgentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!selectedUploadFile}
                  onClick={() => {
                    if (selectedUploadFile) {
                      runAcademicAgent({
                        file: selectedUploadFile,
                        title: newDocTitle || undefined,
                        subject: newDocSubject,
                        grade: newDocGrade,
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-purple-500/25 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                  <span>Khởi Động Academic Agent</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Khi Agent đang chạy hoặc đã hoàn tất */}
          {(isAgentRunning || agentResultDoc || agentStep === 'ERROR') && (
            <div className="flex flex-col gap-5">
              {/* Progress Stepper Visual */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'INIT', label: '1. Khởi tạo', icon: 'cloud_upload' },
                  { id: 'PLANNING', label: '2. Trinh sát mục lục', icon: 'account_tree' },
                  { id: 'DIGITIZING', label: '3. Bóc tách chuyên đề', icon: 'dataset' },
                  { id: 'SYNTHESIZING', label: '4. Đúc kết Kỹ năng', icon: 'psychology' },
                ].map((s) => {
                  const stepsOrder = ['INIT', 'PLANNING', 'DIGITIZING', 'SYNTHESIZING', 'COMPLETED'];
                  const currentIndex = stepsOrder.indexOf(agentStep);
                  const stepIndex = stepsOrder.indexOf(s.id);
                  const isCurrent = agentStep === s.id;
                  const isDone = currentIndex > stepIndex || agentStep === 'COMPLETED';

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : isCurrent
                          ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm ring-2 ring-purple-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl mb-1">
                        {isDone ? 'check_circle' : s.icon}
                      </span>
                      <span className="text-[11px] font-extrabold">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar & Status Message */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    {isAgentRunning && (
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                    )}
                    {agentMessage || 'Đang thực thi...'}
                  </span>
                  <span className="text-purple-700 font-mono text-sm">{agentProgress}%</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      agentStep === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : agentStep === 'ERROR'
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                    }`}
                    style={{ width: `${agentProgress}%` }}
                  />
                </div>
              </div>

              {/* Terminal Activity Logs Box */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-slate-500">terminal</span>
                  Nhật ký hoạt động của Agent (Live Logs)
                </span>
                <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 font-mono text-xs max-h-52 overflow-y-auto space-y-1.5 shadow-inner">
                  {agentLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0">❯</span>
                      <span className={log.includes('ERROR') ? 'text-rose-400' : 'text-slate-300'}>
                        {log}
                      </span>
                    </div>
                  ))}
                  {isAgentRunning && (
                    <div className="flex items-center gap-2 text-purple-400 animate-pulse text-[11px]">
                      <span>●</span>
                      <span>Agent đang xử lý tác vụ...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Kết quả Hoàn tất (COMPLETED) */}
              {agentStep === 'COMPLETED' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">task_alt</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                        Số Hóa Tài Liệu Hoàn Tất!
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Dữ liệu bóc tách đã được lưu vào hệ thống và Kỹ năng AI tương ứng đã sẵn sàng sử dụng.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAgentModalOpen(false);
                        setActiveTab('PARSED');
                        if (agentResultDoc) setSelectedDocId(agentResultDoc.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                    >
                      Xem Dữ Liệu Tách
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAgentModalOpen(false);
                        setActiveTab('SKILLS');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                    >
                      Xem Kỹ Năng AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PortalModal>
    </div>
  );
}
