/**
 * Database service using DuckDB for manga management
 * Enhanced with proper S3 Cubbit endpoint configuration
 */

import { AuthService } from "./auth.js";

declare global {
  interface Window {
    duckdb: any;
  }
}

export class DatabaseService {
  private db: any = null;
  private conn: any = null;
  private isInitialized = false;
  private bucketName = "s3db";
  private fileName = "mangatest.parquet";
  private authService: AuthService;
  private s3Credentials: any = null;

  constructor() {
    this.authService = new AuthService();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("Initializing DuckDB database...");

      // Check if user is authenticated
      if (!this.authService.isAuthenticated()) {
        throw new Error("User not authenticated. Please login first.");
      }

      // Get credentials from auth service
      const credentials = this.authService.getCredentials();
      if (!credentials) {
        throw new Error("No credentials available");
      }

      // Update database filename from credentials
      this.fileName = credentials.dbFilename;

      // Wait for DuckDB to be available
      while (!window.duckdb) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Initialize DuckDB with the new API
      const JSDELIVR_BUNDLES = window.duckdb.getJsDelivrBundles();
      const bundle = await window.duckdb.selectBundle(JSDELIVR_BUNDLES);

      const worker = await window.duckdb.createWorker(bundle.mainWorker);
      const logger = new window.duckdb.ConsoleLogger();
      this.db = new window.duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      console.log("DuckDB initialized successfully");

      // Create database connection
      this.conn = await this.db.connect();

      // Set up S3 configuration for DuckDB with proper Cubbit endpoint
      await this.setupS3Configuration(credentials);

      // Create tables
      await this.createTables();

      // Load existing data from S3
      await this.loadFromS3();

      this.isInitialized = true;
      console.log("Database service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async setupS3Configuration(credentials: any): Promise<void> {
    try {
      if (!this.conn) return;

      console.log("Setting up S3 configuration for Cubbit...");
      console.log("Endpoint:", credentials.endpoint);
      console.log("Region:", credentials.region);
      console.log("Bucket:", this.bucketName);

      // Store credentials for later use
      this.s3Credentials = credentials;

      console.log(
        "S3 configuration stored successfully for fetch-based access"
      );
    } catch (error) {
      console.error("Failed to setup S3 configuration:", error);
      throw new Error(
        `S3 configuration failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async downloadAndRegisterS3File(fileName: string): Promise<void> {
    if (!this.s3Credentials) {
      console.log("No S3 credentials available");
      return;
    }

    try {
      console.log(`Downloading file from S3: ${fileName}`);

      const s3Url = `https://${this.bucketName}.${this.s3Credentials.endpoint}/${fileName}`;
      console.log("Fetching from URL:", s3Url);

      // Create authentication headers
      const authHeaders = await this.createS3AuthHeaders(
        "GET",
        `/${fileName}`,
        fileName
      );

      const response = await fetch(s3Url, {
        method: "GET",
        headers: authHeaders,
      });

      console.log("Response status:", response.status);
      console.log("Response status text:", response.statusText);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error response body:", errorText);
        if (response.status === 404) {
          console.log(
            "File does not exist or access denied (this is normal for new setups)"
          );
          return; // Return without error for missing files
        }
        if (response.status === 403) {
          console.log("Access denied - please check your S3 credentials");
          return; // Return without error for auth issues during setup
        }
        throw new Error(
          `Failed to download file: ${response.status} ${response.statusText}`
        );
      }

      // Convert to ArrayBuffer
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Register the file with DuckDB
      await this.db.registerFileBuffer(fileName, uint8Array);
      console.log(`Successfully registered file: ${fileName}`);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.log(
          "Network error accessing S3 (this is normal for new setups)"
        );
        return; // Return without error for network issues
      }
      console.error(`Failed to download and register file ${fileName}:`, error);
      throw error;
    }
  }

  private async createS3AuthHeaders(
    method: string,
    path: string,
    fileName: string
  ): Promise<Record<string, string>> {
    if (!this.s3Credentials) {
      throw new Error("S3 credentials not available");
    }

    const { accessKeyId, secretAccessKey, region } = this.s3Credentials;
    const host = `${this.bucketName}.s3.cubbit.eu`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substr(0, 8);

    // Use actual region from credentials instead of hardcoded us-east-1
    const actualRegion = region || "eu-central-1";

    // Create canonical request
    const canonicalUri = `/${fileName}`;
    const canonicalQueryString = "";
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-content-sha256:UNSIGNED-PAYLOAD`,
      `x-amz-date:${amzDate}`,
    ].join("\n");
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      "",
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    console.log("Canonical request:", canonicalRequest);

    // Create string to sign
    const credentialScope = `${dateStamp}/${actualRegion}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join("\n");

    console.log("String to sign:", stringToSign);

    // Calculate signature
    const signature = await this.calculateSignature(
      secretAccessKey,
      dateStamp,
      actualRegion,
      stringToSign
    );

    // Create authorization header with proper comma separators
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    console.log("Authorization header:", authorizationHeader);

    return {
      Authorization: authorizationHeader,
      "X-Amz-Date": amzDate,
      "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      Host: host,
    };
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async calculateSignature(
    secretKey: string,
    dateString: string,
    region: string,
    stringToSign: string
  ): Promise<string> {
    const encoder = new TextEncoder();

    const getSignatureKey = async (
      key: string,
      dateStamp: string,
      regionName: string,
      serviceName: string
    ) => {
      const kDate = await this.hmacSha256(
        encoder.encode("AWS4" + key),
        dateStamp
      );
      const kRegion = await this.hmacSha256(kDate, regionName);
      const kService = await this.hmacSha256(kRegion, serviceName);
      const kSigning = await this.hmacSha256(kService, "aws4_request");
      return kSigning;
    };

    const signingKey = await getSignatureKey(
      secretKey,
      dateString,
      region,
      "s3"
    );
    const signature = await this.hmacSha256(signingKey, stringToSign);

    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async hmacSha256(
    key: ArrayBuffer | Uint8Array,
    message: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();

    // Convert key to a clean ArrayBuffer
    let keyBytes: Uint8Array;
    if (key instanceof ArrayBuffer) {
      keyBytes = new Uint8Array(key);
    } else {
      keyBytes = key;
    }

    // Create a new ArrayBuffer from the bytes to avoid SharedArrayBuffer issues
    const cleanKeyBuffer = new ArrayBuffer(keyBytes.length);
    const cleanKeyView = new Uint8Array(cleanKeyBuffer);
    cleanKeyView.set(keyBytes);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      cleanKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  }

  private async createTables(): Promise<void> {
    try {
      if (!this.conn) return;

      // Create sequence for auto-incrementing IDs
      await this.conn.query(`
        CREATE SEQUENCE IF NOT EXISTS manga_id_seq START 1;
      `);

      // Create manga table
      await this.conn.query(`
        CREATE TABLE IF NOT EXISTS manga (
          id INTEGER PRIMARY KEY DEFAULT nextval('manga_id_seq'),
          nome VARCHAR NOT NULL,
          link VARCHAR NOT NULL UNIQUE,
          started BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log("Database tables created successfully");
    } catch (error) {
      console.error("Failed to create tables:", error);
      throw error;
    }
  }

  private async loadFromS3(): Promise<void> {
    try {
      console.log("Attempting to download and load from S3...");

      // Download and register the S3 file (this may not exist for new setups)
      await this.downloadAndRegisterS3File(this.fileName);

      // Try to load existing data from the registered file if it exists
      try {
        await this.conn.query(`
          INSERT INTO manga 
          SELECT * FROM read_parquet('${this.fileName}')
          ON CONFLICT (link) DO NOTHING;
        `);
        console.log("Data loaded from S3 successfully");
      } catch (readError: any) {
        // If we can't read the file, it probably doesn't exist or wasn't registered
        console.log("No existing data file found in S3, starting fresh");
      }
    } catch (error: any) {
      console.log("No existing data file found in S3, starting fresh");
    }
  }

  async saveToS3(): Promise<void> {
    try {
      if (!this.conn) {
        throw new Error("Database not initialized");
      }

      console.log(
        "S3 save functionality temporarily disabled in browser environment"
      );
      console.log("Data is persisted locally in DuckDB");

      // TODO: Implement S3 upload using fetch API with proper authentication
      // For now, data persists in the local DuckDB instance
    } catch (error) {
      console.error("Failed to save to S3:", error);
      throw error;
    }
  }

  // Manga operations
  async addManga(
    nome: string,
    link: string,
    started: boolean = false
  ): Promise<string> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      await this.conn.query(`
        INSERT INTO manga (nome, link, started, last_updated)
        VALUES ('${nome}', '${link}', ${started}, CURRENT_TIMESTAMP)
      `);

      await this.saveToS3();
      console.log("Manga added successfully:", nome);
      return "success";
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("Manga with this link already exists");
      }
      console.error("Failed to add manga:", error);
      throw error;
    }
  }

  async getAllManga(): Promise<any[]> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.conn.query(
        "SELECT * FROM manga ORDER BY last_updated DESC"
      );
      return result.toArray();
    } catch (error) {
      console.error("Failed to get all manga:", error);
      return [];
    }
  }

  async deleteManga(link: string): Promise<boolean> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      await this.conn.query(`DELETE FROM manga WHERE link = '${link}'`);
      await this.saveToS3();
      console.log("Manga deleted successfully:", link);
      return true;
    } catch (error) {
      console.error("Failed to delete manga:", error);
      return false;
    }
  }

  async updateMangaStarted(link: string): Promise<boolean> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      await this.conn.query(`
        UPDATE manga 
        SET started = NOT started, last_updated = CURRENT_TIMESTAMP 
        WHERE link = '${link}'
      `);

      await this.saveToS3();
      console.log("Manga status updated:", link);
      return true;
    } catch (error) {
      console.error("Failed to update manga status:", error);
      return false;
    }
  }

  async updateManga(
    id: number,
    nome: string,
    link: string,
    started: boolean
  ): Promise<boolean> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      await this.conn.query(`
        UPDATE manga 
        SET nome = '${nome}', link = '${link}', started = ${started}, last_updated = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `);

      await this.saveToS3();
      console.log("Manga updated successfully:", id);
      return true;
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("Another manga with this link already exists");
      }
      console.error("Failed to update manga:", error);
      return false;
    }
  }

  async searchManga(searchTerm: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.conn.query(`
        SELECT * FROM manga 
        WHERE LOWER(nome) LIKE '%${searchTerm.toLowerCase()}%'
        ORDER BY last_updated DESC
      `);
      return result.toArray();
    } catch (error) {
      console.error("Failed to search manga:", error);
      return [];
    }
  }

  async getStats(): Promise<{ total: number; read: number; unread: number }> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      const totalResult = await this.conn.query(
        "SELECT COUNT(*) as count FROM manga"
      );
      const readResult = await this.conn.query(
        "SELECT COUNT(*) as count FROM manga WHERE started = true"
      );

      const total = totalResult.toArray()[0]?.count || 0;
      const read = readResult.toArray()[0]?.count || 0;
      const unread = total - read;

      return { total, read, unread };
    } catch (error) {
      console.error("Failed to get stats:", error);
      return { total: 0, read: 0, unread: 0 };
    }
  }

  async recompactIds(): Promise<boolean> {
    if (!this.conn) {
      throw new Error("Database not initialized");
    }

    try {
      // Create a temporary table with recompacted IDs
      await this.conn.query(`
        CREATE TEMPORARY TABLE manga_temp AS
        SELECT ROW_NUMBER() OVER (ORDER BY last_updated) as new_id, nome, link, started, last_updated
        FROM manga;
      `);

      // Drop and recreate the sequence
      await this.conn.query("DROP SEQUENCE IF EXISTS manga_id_seq CASCADE;");
      await this.conn.query("CREATE SEQUENCE manga_id_seq START 1;");

      // Recreate manga table
      await this.conn.query("DROP TABLE manga;");
      await this.conn.query(`
        CREATE TABLE manga (
          id INTEGER PRIMARY KEY DEFAULT nextval('manga_id_seq'),
          nome VARCHAR NOT NULL,
          link VARCHAR NOT NULL UNIQUE,
          started BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert data with new IDs
      await this.conn.query(`
        INSERT INTO manga (nome, link, started, last_updated)
        SELECT nome, link, started, last_updated FROM manga_temp ORDER BY new_id;
      `);

      // Drop temporary table
      await this.conn.query("DROP TABLE manga_temp;");

      await this.saveToS3();
      console.log("IDs recompacted successfully");
      return true;
    } catch (error) {
      console.error("Failed to recompact IDs:", error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.conn) {
        await this.conn.close();
        this.conn = null;
      }
      if (this.db) {
        await this.db.terminate();
        this.db = null;
      }
      this.isInitialized = false;
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}
