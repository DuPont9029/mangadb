/**
 * Manga Database Application
 * A local manga management app with modern bundling and clean architecture
 * Enhanced with working DuckDB + S3 integration and authentication
 */

import "./style.css";
import { MangaService } from "./services/index.js";
import { AuthService } from "./services/auth.js";
import { LoginComponent } from "./components/login.js";

class MangaApp {
  private mangaService: MangaService;
  private authService: AuthService;
  private loginComponent: LoginComponent;
  private allManga: any[] = [];
  private currentFilter = "all";

  constructor() {
    this.mangaService = new MangaService();
    this.authService = new AuthService();
    this.loginComponent = new LoginComponent();
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Check if user is authenticated
      if (!this.authService.isAuthenticated()) {
        this.showLoginScreen();
        return;
      }

      await this.mangaService.initialize();
      this.setupUI();
      this.bindEvents();
      await this.loadMangaList();
      await this.updateStats();
      console.log("Manga app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      // If there's an error, show login screen in case credentials are invalid
      this.showLoginScreen();
    }
  }

  private showLoginScreen(): void {
    document.querySelector<HTMLDivElement>("#app")!.innerHTML =
      this.loginComponent.render();
    this.loginComponent.bindEvents();
  }

  private setupUI(): void {
    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
      <div class="manga-app">
        <header class="app-header">
          <h1>📚 Manga Database</h1>
          <div class="header-actions">
            <input type="text" id="search-input" placeholder="Search manga..." class="search-input">
            <button id="add-manga-btn" class="btn btn-primary">Add Manga</button>
            <button id="save-s3-btn" class="btn btn-secondary">Save to S3</button>
            <button id="logout-btn" class="btn btn-outline">Logout</button>
          </div>
        </header>

        <main class="app-main">
          <aside class="sidebar">
            <div class="stats-panel">
              <h3>Library Stats</h3>
              <div id="stats-content">Loading...</div>
            </div>
            
            <div class="filter-section">
              <h4>Filters</h4>
              <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="read">Read</button>
                <button class="filter-btn" data-filter="unread">Unread</button>
              </div>
            </div>
            
            <div class="manga-list">
              <h3>Your Library (<span id="manga-count">0</span>)</h3>
              <div id="manga-list-content">Loading...</div>
            </div>
          </aside>

          <section class="content">
            <div id="content-area">
              <div class="welcome-message">
                <h2>Welcome to your Manga Library!</h2>
                <p>Add manga to build your collection and track your reading progress.</p>
              </div>
            </div>
          </section>
        </main>

        <!-- Add Manga Modal -->
        <div id="add-manga-modal" class="modal hidden">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title">Add New Manga</h3>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <form id="manga-form">
                <input type="hidden" id="manga-id">
                <div class="form-group">
                  <label for="manga-name">Manga Name *</label>
                  <input type="text" id="manga-name" required>
                </div>
                <div class="form-group">
                  <label for="manga-link">Link/URL *</label>
                  <input type="url" id="manga-link" required>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="manga-started"> Mark as Read
                  </label>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" id="cancel-manga">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Manga</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private showError(message: string): void {
    console.error(message);
    alert(`Error: ${message}`);
  }

  private async loadMangaList(): Promise<void> {
    try {
      this.allManga = await this.mangaService.getAllManga();
      this.displayManga(this.allManga);
      this.updateMangaCount();
    } catch (error) {
      console.error("Failed to load manga list:", error);
      this.showError("Failed to load manga library");
    }
  }

  private displayManga(mangaList: any[]): void {
    const container = document.getElementById("manga-list-content");
    if (!container) return;

    if (mangaList.length === 0) {
      container.innerHTML = '<div class="empty-state">No manga found</div>';
      return;
    }

    container.innerHTML = mangaList
      .map(
        (manga) => `
      <div class="manga-item" data-id="${manga.id}">
        <div class="manga-cover">
          <div class="cover-placeholder">📚</div>
        </div>
        <div class="manga-info">
          <h4>${this.escapeHtml(manga.nome)}</h4>
          <div class="manga-link">
            <a href="${
              manga.link
            }" target="_blank" rel="noopener">${this.escapeHtml(manga.link)}</a>
          </div>
          <div class="manga-status">
            <span class="status ${
              manga.started ? "status-ongoing" : "status-completed"
            }">
              ${manga.started ? "Read" : "Unread"}
            </span>
          </div>
          <div class="manga-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.mangaApp.editManga(${
              manga.id
            })">Edit</button>
            <button class="btn btn-sm btn-primary" onclick="window.mangaApp.toggleStatus('${
              manga.link
            }')">
              ${manga.started ? "Mark Unread" : "Mark Read"}
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.mangaApp.deleteManga('${
              manga.link
            }', '${this.escapeHtml(manga.nome)}')">Delete</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  private async updateStats(): Promise<void> {
    try {
      const stats = await this.mangaService.getStats();
      const statsContainer = document.getElementById("stats-content");
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-item">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.read}</div>
            <div class="stat-label">Read</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${stats.unread}</div>
            <div class="stat-label">Unread</div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Failed to update stats:", error);
    }
  }

  private updateMangaCount(): void {
    const countElement = document.getElementById("manga-count");
    if (countElement) {
      countElement.textContent = this.allManga.length.toString();
    }
  }

  private filterManga(): void {
    let filteredManga = [...this.allManga];

    // Apply filter
    if (this.currentFilter === "read") {
      filteredManga = filteredManga.filter((m) => m.started);
    } else if (this.currentFilter === "unread") {
      filteredManga = filteredManga.filter((m) => !m.started);
    }

    // Apply search
    const searchTerm = (
      document.getElementById("search-input") as HTMLInputElement
    )?.value?.toLowerCase();
    if (searchTerm) {
      filteredManga = filteredManga.filter((m) =>
        m.nome.toLowerCase().includes(searchTerm)
      );
    }

    this.displayManga(filteredManga);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Public methods for global access
  async editManga(id: number): Promise<void> {
    const manga = this.allManga.find((m) => m.id === id);
    if (!manga) return;

    const modal = document.getElementById("add-manga-modal");
    const title = document.getElementById("modal-title");
    const form = document.getElementById("manga-form") as HTMLFormElement;

    if (title) title.textContent = "Edit Manga";
    if (form) {
      (document.getElementById("manga-id") as HTMLInputElement).value =
        id.toString();
      (document.getElementById("manga-name") as HTMLInputElement).value =
        manga.nome;
      (document.getElementById("manga-link") as HTMLInputElement).value =
        manga.link;
      (document.getElementById("manga-started") as HTMLInputElement).checked =
        manga.started;
    }

    modal?.classList.remove("hidden");
  }

  async toggleStatus(link: string): Promise<void> {
    try {
      await this.mangaService.updateMangaStatus(link);
      await this.loadMangaList();
      await this.updateStats();
    } catch (error) {
      console.error("Failed to toggle manga status:", error);
      this.showError("Failed to update manga status");
    }
  }

  async deleteManga(link: string, name: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await this.mangaService.deleteManga(link);
      await this.loadMangaList();
      await this.updateStats();
    } catch (error) {
      console.error("Failed to delete manga:", error);
      this.showError("Failed to delete manga");
    }
  }

  private bindEvents(): void {
    // Add manga button
    document.getElementById("add-manga-btn")?.addEventListener("click", () => {
      this.showAddMangaModal();
    });

    // Logout button
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      this.authService.logout();
      window.location.reload();
    });

    // Search input
    const searchInput = document.getElementById(
      "search-input"
    ) as HTMLInputElement;
    searchInput?.addEventListener("input", () => {
      this.filterManga();
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const filter = target.getAttribute("data-filter") || "all";

        // Update active state
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        target.classList.add("active");

        this.currentFilter = filter;
        this.filterManga();
      });
    });

    // Save to S3 button
    document
      .getElementById("save-s3-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.mangaService.saveToS3();
          alert("Data saved to S3 successfully!");
        } catch (error) {
          console.error("Failed to save to S3:", error);
          this.showError("Failed to save to S3");
        }
      });

    // Modal close buttons
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal").forEach((modal) => {
          modal.classList.add("hidden");
        });
      });
    });

    // Cancel buttons
    document.getElementById("cancel-manga")?.addEventListener("click", () => {
      document.getElementById("add-manga-modal")?.classList.add("hidden");
    });

    // Manga form submit
    document
      .getElementById("manga-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.saveManga();
      });

    // Close modal when clicking outside
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("modal")) {
        target.classList.add("hidden");
      }
    });
  }

  private showAddMangaModal(): void {
    const modal = document.getElementById("add-manga-modal");
    const title = document.getElementById("modal-title");
    const form = document.getElementById("manga-form") as HTMLFormElement;

    if (title) title.textContent = "Add New Manga";
    if (form) {
      form.reset();
      (document.getElementById("manga-id") as HTMLInputElement).value = "";
    }

    modal?.classList.remove("hidden");
  }

  private async saveManga(): Promise<void> {
    const form = document.getElementById("manga-form") as HTMLFormElement;
    const formData = new FormData(form);

    const id = (document.getElementById("manga-id") as HTMLInputElement).value;
    const nome = (
      document.getElementById("manga-name") as HTMLInputElement
    ).value.trim();
    const link = (
      document.getElementById("manga-link") as HTMLInputElement
    ).value.trim();
    const started = (
      document.getElementById("manga-started") as HTMLInputElement
    ).checked;

    if (!nome || !link) {
      this.showError("Please fill in all required fields");
      return;
    }

    try {
      if (id) {
        // Update existing manga
        await this.mangaService.updateManga(parseInt(id), nome, link, started);
      } else {
        // Add new manga
        await this.mangaService.addManga({ nome, link, started });
      }

      document.getElementById("add-manga-modal")?.classList.add("hidden");
      await this.loadMangaList();
      await this.updateStats();
    } catch (error) {
      console.error("Failed to save manga:", error);
      this.showError("Failed to save manga");
    }
  }
}

// Initialize the app and make it globally accessible
const mangaApp = new MangaApp();
(window as any).mangaApp = mangaApp;
