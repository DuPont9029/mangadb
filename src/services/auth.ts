/**
 * Authentication service for S3 credentials management
 */

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
  dbFilename: string;
}

export class AuthService {
  private static readonly STORAGE_KEY = "aws_credentials";
  private credentials: S3Credentials | null = null;

  constructor() {
    this.loadCredentials();
  }

  /**
   * Save credentials to localStorage
   */
  saveCredentials(
    accessKey: string,
    secretKey: string,
    region: string,
    endpoint: string,
    dbFilename: string
  ): void {
    const credentials: S3Credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
      endpoint: endpoint,
      dbFilename: dbFilename || "mangadb.parquet",
    };

    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(credentials));
    this.credentials = credentials;
  }

  /**
   * Load credentials from localStorage
   */
  loadCredentials(): S3Credentials | null {
    const creds = localStorage.getItem(AuthService.STORAGE_KEY);
    if (creds) {
      this.credentials = JSON.parse(creds);
      return this.credentials;
    }
    return null;
  }

  /**
   * Get current credentials
   */
  getCredentials(): S3Credentials | null {
    return this.credentials;
  }

  /**
   * Get database filename
   */
  getDbFilename(): string {
    return this.credentials ? this.credentials.dbFilename : "mangadb.parquet";
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const credentials = this.loadCredentials();
    return (
      credentials !== null &&
      credentials.accessKeyId !== "" &&
      credentials.secretAccessKey !== ""
    );
  }

  /**
   * Clear stored credentials (logout)
   */
  logout(): void {
    localStorage.removeItem(AuthService.STORAGE_KEY);
    this.credentials = null;
  }
}
