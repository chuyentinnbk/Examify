import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { AcademicDocType, ParseStatus } from '@prisma/client';

export interface ExtractedQuestion {
  questionNumber: number;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  cognitiveLevel: 'KNOWLEDGE' | 'COMPREHENSION' | 'APPLICATION' | 'HIGH_APPLICATION';
  content: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points?: number;
}

export interface ExtractedTopic {
  title: string;
  summary?: string;
  keyConcepts?: string[];
}

export interface ExtractedConcept {
  concept: string;
  details: string;
  notes?: string;
}

export interface ExtractedLessonData {
  lessonTitle?: string;
  mainTopics: ExtractedTopic[];
  coreKnowledgePoints: ExtractedConcept[];
  extractedQuestions: ExtractedQuestion[];
}

export interface ExtractedExamData {
  examTitle?: string;
  totalExtractedQuestions: number;
  questions: ExtractedQuestion[];
}

export type ParsedDocumentPayload = ExtractedExamData | ExtractedLessonData;

export interface AcademicDocumentRecord {
  id: string;
  title: string;
  docType: AcademicDocType;
  subject: string;
  grade: string;
  semester?: string | null;
  source?: string | null;
  rawContent: string;
  fileUrl?: string | null;
  teacherId: string;
  parseStatus: ParseStatus;
  parsedData?: string | null;
  parsedAt?: Date | string | null;
  errorMessage?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AiSkillRecord {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  grade: string;
  skillInstructions: string;
  fewShotExamples?: string | null;
  isActive: boolean;
  teacherId: string;
  documentId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'academic-data');
const DOCS_FILE = path.join(STORAGE_DIR, 'documents.json');
const SKILLS_FILE = path.join(STORAGE_DIR, 'skills.json');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readLocalDocs(): AcademicDocumentRecord[] {
  ensureStorageDir();
  if (!fs.existsSync(DOCS_FILE)) return [];
  try {
    const raw = fs.readFileSync(DOCS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalDocs(docs: AcademicDocumentRecord[]) {
  ensureStorageDir();
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2), 'utf8');
}

function readLocalSkills(): AiSkillRecord[] {
  ensureStorageDir();
  if (!fs.existsSync(SKILLS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SKILLS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalSkills(skills: AiSkillRecord[]) {
  ensureStorageDir();
  fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2), 'utf8');
}

export class AcademicStorage {
  // ----------------------------------------------------------------------------
  // DOCUMENTS
  // ----------------------------------------------------------------------------

  public static async getDocuments(filter?: {
    teacherId?: string;
    docType?: AcademicDocType;
    subject?: string;
    grade?: string;
    search?: string;
  }): Promise<AcademicDocumentRecord[]> {
    try {
      const where: any = {};
      if (filter?.teacherId) where.teacherId = filter.teacherId;
      if (filter?.docType) where.docType = filter.docType;
      if (filter?.subject) where.subject = filter.subject;
      if (filter?.grade) where.grade = filter.grade;
      if (filter?.search) {
        where.OR = [
          { title: { contains: filter.search } },
          { subject: { contains: filter.search } },
        ];
      }

      const dbDocs = await prisma.academicDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return dbDocs as unknown as AcademicDocumentRecord[];
    } catch {
      // Fallback to local file storage
      let list = readLocalDocs();
      if (filter?.teacherId) list = list.filter((d) => d.teacherId === filter.teacherId);
      if (filter?.docType) list = list.filter((d) => d.docType === filter.docType);
      if (filter?.subject) list = list.filter((d) => d.subject === filter.subject);
      if (filter?.grade) list = list.filter((d) => d.grade === filter.grade);
      if (filter?.search) {
        const s = filter.search.toLowerCase();
        list = list.filter((d) => d.title.toLowerCase().includes(s) || d.subject.toLowerCase().includes(s));
      }
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  }

  public static async getDocumentById(id: string): Promise<AcademicDocumentRecord | null> {
    try {
      const doc = await prisma.academicDocument.findUnique({ where: { id } });
      if (doc) return doc as unknown as AcademicDocumentRecord;
    } catch {
      // ignore
    }
    const local = readLocalDocs();
    return local.find((d) => d.id === id) || null;
  }

  public static async saveDocument(data: {
    id?: string;
    title: string;
    docType: AcademicDocType;
    subject: string;
    grade: string;
    semester?: string | null;
    source?: string | null;
    rawContent: string;
    teacherId: string;
    parseStatus?: ParseStatus;
    parsedData?: string | null;
  }): Promise<AcademicDocumentRecord> {
    const id = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const record: AcademicDocumentRecord = {
      id,
      title: data.title,
      docType: data.docType,
      subject: data.subject,
      grade: data.grade,
      semester: data.semester || null,
      source: data.source || null,
      rawContent: data.rawContent,
      fileUrl: null,
      teacherId: data.teacherId,
      parseStatus: data.parseStatus || ParseStatus.PENDING,
      parsedData: data.parsedData || null,
      parsedAt: data.parsedData ? now : null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    // Save locally first
    const list = readLocalDocs();
    const idx = list.findIndex((d) => d.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record, updatedAt: now };
    } else {
      list.unshift(record);
    }
    writeLocalDocs(list);

    // Attempt DB save
    try {
      await prisma.academicDocument.upsert({
        where: { id },
        create: record as any,
        update: record as any,
      });
    } catch {
      // Local copy is safe
    }

    return record;
  }

  public static async updateParsedData(
    id: string,
    parsedData: ParsedDocumentPayload,
    status: ParseStatus = ParseStatus.PARSED,
    errorMessage?: string
  ): Promise<AcademicDocumentRecord | null> {
    const now = new Date();
    const parsedDataStr = JSON.stringify(parsedData);

    const list = readLocalDocs();
    const idx = list.findIndex((d) => d.id === id);
    if (idx >= 0) {
      list[idx].parseStatus = status;
      list[idx].parsedData = parsedDataStr;
      list[idx].parsedAt = now;
      list[idx].errorMessage = errorMessage || null;
      list[idx].updatedAt = now;
      writeLocalDocs(list);
    }

    try {
      const updated = await prisma.academicDocument.update({
        where: { id },
        data: {
          parseStatus: status,
          parsedData: parsedDataStr,
          parsedAt: now,
          errorMessage: errorMessage || null,
        },
      });
      return updated as unknown as AcademicDocumentRecord;
    } catch {
      return idx >= 0 ? list[idx] : null;
    }
  }

  public static async deleteDocument(id: string): Promise<boolean> {
    const list = readLocalDocs().filter((d) => d.id !== id);
    writeLocalDocs(list);

    try {
      await prisma.academicDocument.delete({ where: { id } });
    } catch {
      // ignore
    }
    return true;
  }

  // ----------------------------------------------------------------------------
  // SKILLS
  // ----------------------------------------------------------------------------

  public static async getSkills(filter?: {
    teacherId?: string;
    subject?: string;
    grade?: string;
    isActive?: boolean;
  }): Promise<AiSkillRecord[]> {
    try {
      const where: any = {};
      if (filter?.teacherId) where.teacherId = filter.teacherId;
      if (filter?.subject) where.subject = filter.subject;
      if (filter?.grade) where.grade = filter.grade;
      if (typeof filter?.isActive === 'boolean') where.isActive = filter.isActive;

      const dbSkills = await prisma.aiSkill.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return dbSkills as unknown as AiSkillRecord[];
    } catch {
      let list = readLocalSkills();
      if (filter?.teacherId) list = list.filter((s) => s.teacherId === filter.teacherId);
      if (filter?.subject) list = list.filter((s) => s.subject === filter.subject);
      if (filter?.grade) list = list.filter((s) => s.grade === filter.grade);
      if (typeof filter?.isActive === 'boolean') list = list.filter((s) => s.isActive === filter.isActive);
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  }

  public static async getSkillById(id: string): Promise<AiSkillRecord | null> {
    try {
      const s = await prisma.aiSkill.findUnique({ where: { id } });
      if (s) return s as unknown as AiSkillRecord;
    } catch {
      // ignore
    }
    const local = readLocalSkills();
    return local.find((s) => s.id === id) || null;
  }

  public static async saveSkill(data: {
    id?: string;
    title: string;
    description?: string | null;
    subject: string;
    grade: string;
    skillInstructions: string;
    fewShotExamples?: string | null;
    isActive?: boolean;
    teacherId: string;
    documentId?: string | null;
  }): Promise<AiSkillRecord> {
    const id = data.id || `skill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const record: AiSkillRecord = {
      id,
      title: data.title,
      description: data.description || null,
      subject: data.subject,
      grade: data.grade,
      skillInstructions: data.skillInstructions,
      fewShotExamples: data.fewShotExamples || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      teacherId: data.teacherId,
      documentId: data.documentId || null,
      createdAt: now,
      updatedAt: now,
    };

    const list = readLocalSkills();
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record, updatedAt: now };
    } else {
      list.unshift(record);
    }
    writeLocalSkills(list);

    try {
      await prisma.aiSkill.upsert({
        where: { id },
        create: record as any,
        update: record as any,
      });
    } catch {
      // Local copy is safe
    }

    return record;
  }

  public static async toggleSkillActive(id: string, isActive: boolean): Promise<AiSkillRecord | null> {
    const now = new Date();
    const list = readLocalSkills();
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      list[idx].isActive = isActive;
      list[idx].updatedAt = now;
      writeLocalSkills(list);
    }

    try {
      const updated = await prisma.aiSkill.update({
        where: { id },
        data: { isActive },
      });
      return updated as unknown as AiSkillRecord;
    } catch {
      return idx >= 0 ? list[idx] : null;
    }
  }

  public static async deleteSkill(id: string): Promise<boolean> {
    const list = readLocalSkills().filter((s) => s.id !== id);
    writeLocalSkills(list);

    try {
      await prisma.aiSkill.delete({ where: { id } });
    } catch {
      // ignore
    }
    return true;
  }
}
