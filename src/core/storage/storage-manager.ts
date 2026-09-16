import fs from 'fs/promises';
import path from 'path';

export interface StorageExamPayload {
  examId: string;
  title: string;
  metadata: Record<string, unknown>;
  content: Record<string, unknown>;
  rawOutput?: string;
  generatedAt: string;
}

export class StorageManager {
  private static getBaseExamsPath(): string {
    return (
      process.env.STORAGE_EXAMS_PATH ||
      path.join(process.cwd(), 'storage', 'exams')
    );
  }

  /**
   * Ensures target directory exists recursively.
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Computes standardized partition path: storage/exams/YYYY/MM/{examId}.json
   */
  public static getExamFilePath(examId: string, date = new Date()): {
    relativeDir: string;
    absolutePath: string;
    relativePath: string;
  } {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const filename = `${examId}.json`;

    const relativeDir = path.join(year, month);
    const absoluteDir = path.join(this.getBaseExamsPath(), relativeDir);
    const absolutePath = path.join(absoluteDir, filename);
    const relativePath = path.join('storage', 'exams', relativeDir, filename);

    return { relativeDir, absolutePath, relativePath };
  }

  /**
   * Saves exam output artifact as a structured JSON file atomically.
   */
  public static async saveExamArtifact(payload: StorageExamPayload): Promise<string> {
    const { absolutePath, relativePath } = this.getExamFilePath(payload.examId);
    const directory = path.dirname(absolutePath);

    await this.ensureDirectory(directory);

    const serializedData = JSON.stringify(payload, null, 2);
    const tempPath = `${absolutePath}.tmp_${Date.now()}`;

    // Write to temporary file then rename for atomic file operation
    await fs.writeFile(tempPath, serializedData, 'utf-8');
    await fs.rename(tempPath, absolutePath);

    return relativePath;
  }

  /**
   * Reads an exam JSON artifact from storage.
   */
  public static async getExamArtifact(filePath: string): Promise<StorageExamPayload | null> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data) as StorageExamPayload;
    } catch (error) {
      console.error(`❌ [StorageManager] Failed to read exam artifact ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Deletes an exam artifact from storage if present.
   */
  public static async deleteExamArtifact(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
