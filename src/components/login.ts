/**
 * Login component for S3 authentication
 */

import { AuthService } from "../services/auth.js";

export class LoginComponent {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    return `
      <div class="login-container">
        <div class="login-header">
          <h1>📚 MangaDB</h1>
          <p>Enter your S3 credentials to access your manga database</p>
        </div>
        
        <div id="error-alert" class="alert-error hidden">
          <span id="error-message"></span>
        </div>
        
        <form id="login-form">
          <div class="form-group">
            <label for="access_key">Access Key ID</label>
            <input type="text" id="access_key" required>
          </div>
          
          <div class="form-group">
            <label for="secret_key">Secret Access Key</label>
            <input type="password" id="secret_key" required>
          </div>
          
          <div class="form-group">
            <label for="endpoint">S3 Endpoint</label>
            <input type="text" id="endpoint" value="s3.cubbit.eu" required>
          </div>
          
          <div class="form-group">
            <label for="region">Region</label>
            <select id="region">
              <option value="eu-central-1" selected>EU Central (Frankfurt)</option>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="db_filename">Database Filename</label>
            <input type="text" id="db_filename" value="mangatest.parquet" required>
            <small>The name of the database file in your S3 bucket</small>
          </div>
          
          <button type="submit" class="btn btn-primary login-btn">
            <span class="login-text">Login to MangaDB</span>
            <span class="loading-text hidden">Connecting...</span>
          </button>
        </form>
        
        <div class="login-footer">
          <small>Your credentials are stored locally and used only to access your S3 data</small>
        </div>
      </div>
    `;
  }

  bindEvents(): void {
    const form = document.getElementById("login-form") as HTMLFormElement;
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });
  }

  private async handleLogin(): Promise<void> {
    const accessKey = (
      document.getElementById("access_key") as HTMLInputElement
    ).value;
    const secretKey = (
      document.getElementById("secret_key") as HTMLInputElement
    ).value;
    const region = (document.getElementById("region") as HTMLSelectElement)
      .value;
    const endpoint = (document.getElementById("endpoint") as HTMLInputElement)
      .value;
    const dbFilename =
      (
        document.getElementById("db_filename") as HTMLInputElement
      ).value.trim() || "mangatest.parquet";

    const errorAlert = document.getElementById("error-alert");
    const errorMessage = document.getElementById("error-message");
    const submitBtn = document.querySelector(".login-btn") as HTMLButtonElement;
    const loginText = submitBtn.querySelector(".login-text") as HTMLElement;
    const loadingText = submitBtn.querySelector(".loading-text") as HTMLElement;

    try {
      // Show loading state
      loginText.classList.add("hidden");
      loadingText.classList.remove("hidden");
      submitBtn.disabled = true;
      errorAlert?.classList.add("hidden");

      // Save credentials
      this.authService.saveCredentials(
        accessKey,
        secretKey,
        region,
        endpoint,
        dbFilename
      );

      // Success - trigger app reload
      window.location.reload();
    } catch (error: any) {
      console.error("Login failed:", error);
      if (errorMessage) {
        errorMessage.textContent = error.message || "Failed to connect to S3";
      }
      errorAlert?.classList.remove("hidden");
    } finally {
      // Hide loading state
      loginText.classList.remove("hidden");
      loadingText.classList.add("hidden");
      submitBtn.disabled = false;
    }
  }
}
