/**
 * Main application service that coordinates all other services
 * Enhanced with working DuckDB + S3 integration patterns
 */

import { DatabaseService } from "./database.js";

export class MangaService {
  private db: DatabaseService;
  private initialized = false;

  constructor() {
    this.db = new DatabaseService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log("Initializing Manga Service...");
      await this.db.initialize();
      // S3 service will be initialized when needed
      this.initialized = true;
      console.log("Manga Service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Manga Service:", error);
      throw error;
    }
  }

  // Simple manga management methods matching the working implementation
  async addManga(mangaData: {
    nome: string;
    link: string;
    started?: boolean;
  }): Promise<string> {
    this.ensureInitialized();

    try {
      return await this.db.addManga(
        mangaData.nome,
        mangaData.link,
        mangaData.started || false
      );
    } catch (error) {
      console.error("Failed to add manga:", error);
      throw error;
    }
  }

  async getAllManga(): Promise<any[]> {
    this.ensureInitialized();
    return await this.db.getAllManga();
  }

  async deleteManga(link: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.db.deleteManga(link);
  }

  async updateMangaStatus(link: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.db.updateMangaStarted(link);
  }

  async updateManga(
    id: number,
    nome: string,
    link: string,
    started: boolean
  ): Promise<boolean> {
    this.ensureInitialized();
    return await this.db.updateManga(id, nome, link, started);
  }

  async searchManga(query: string): Promise<any[]> {
    this.ensureInitialized();

    if (!query.trim()) {
      return await this.getAllManga();
    }

    return await this.db.searchManga(query);
  }

  async getStats(): Promise<{
    total: number;
    read: number;
    unread: number;
  }> {
    this.ensureInitialized();
    return await this.db.getStats();
  }

  async recompactIds(): Promise<boolean> {
    this.ensureInitialized();
    return await this.db.recompactIds();
  }

  async saveToS3(): Promise<void> {
    this.ensureInitialized();
    return await this.db.saveToS3();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("MangaService not initialized. Call initialize() first.");
    }
  }

  async close(): Promise<void> {
    await this.db.close();
    this.initialized = false;
  }
}
