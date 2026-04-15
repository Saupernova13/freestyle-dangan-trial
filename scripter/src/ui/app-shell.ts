import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { TrialStore, type ViewName } from '../store/trial-store.js';
import { BrowserFileSystemAdapter } from '../services/filesystem.js';
import { PersistenceService } from '../services/persistence.js';
import { AutoSave } from '../store/autosave.js';
import { ExportService, downloadBlob } from '../services/export.js';

import './layout/app-header.js';
import './layout/app-nav.js';
import './layout/trial-bar.js';
import './views/cast-view.js';
import './views/script-view.js';
import './views/truth-bullets-view.js';
import './views/minigames-view.js';
import './shared/toast-notification.js';
import './modals/settings-modal.js';

@customElement('dr-app')
export class DrApp extends LitElement {
  @state() private store = new TrialStore();
  @state() private loading = false;
  @state() private toastMessage = '';
  @state() private toastType: 'success' | 'error' | 'info' = 'info';
  @state() private settingsOpen = false;

  private fs = new BrowserFileSystemAdapter();
  private persistence = new PersistenceService(this.fs);
  private autoSave: AutoSave | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.autoSave?.destroy();
    this.store.destroy();
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .main-layout {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .content-area {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 1rem;
    }

    @media (max-width: 768px) {
      .main-layout { flex-direction: column; }
      .content-area { padding: 0.75rem; }
    }

    .loader-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-secondary, #d1d5db);
      border-top-color: var(--primary, #6366f1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  render() {
    return html`
      <dr-header
        .trialName=${this.store.api.getTrialName()}
        @trial-name-changed=${this.onTrialNameChanged}
        @theme-toggle=${this.onThemeToggle}
        @settings-open=${() => (this.settingsOpen = true)}
      ></dr-header>

      <dr-trial-bar
        .hasDirectory=${this.fs.hasDirectory()}
        @choose-folder=${this.onChooseFolder}
        @export-trial=${this.onExportTrial}
      ></dr-trial-bar>

      <div class="main-layout">
        <dr-nav
          .activeView=${this.store.activeView}
          @view-changed=${this.onViewChanged}
        ></dr-nav>

        <div class="content-area">
          ${this.renderActiveView()}
        </div>
      </div>

      ${this.loading ? html`
        <div class="loader-overlay">
          <div class="spinner"></div>
        </div>
      ` : ''}

      <dr-settings-modal
        .open=${this.settingsOpen}
        @modal-closed=${() => (this.settingsOpen = false)}
      ></dr-settings-modal>

      <dr-toast
        .message=${this.toastMessage}
        .type=${this.toastType}
        @toast-closed=${() => { this.toastMessage = ''; }}
      ></dr-toast>
    `;
  }

  private renderActiveView() {
    switch (this.store.activeView) {
      case 'cast':
        return html`<dr-cast-view .store=${this.store}></dr-cast-view>`;
      case 'script':
        return html`<dr-script-view .store=${this.store}></dr-script-view>`;
      case 'truthBullets':
        return html`<dr-truth-bullets-view .store=${this.store}></dr-truth-bullets-view>`;
      case 'minigames':
        return html`<dr-minigames-view .store=${this.store}></dr-minigames-view>`;
    }
  }

  private onTrialNameChanged(e: CustomEvent<string>) {
    this.store.api.setTrialName(e.detail);
  }

  private onThemeToggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  }

  private async onChooseFolder() {
    try {
      this.loading = true;
      await this.fs.chooseDirectory();

      if (await this.persistence.hasExistingTrial()) {
        const api = await this.persistence.loadTrial();
        this.store = new TrialStore(api);
        this.store.subscribe(() => this.requestUpdate());
      }

      // Start autosave
      this.autoSave?.destroy();
      this.autoSave = new AutoSave(this.store, this.persistence);
      this.autoSave.start();

      this.showToast('Folder loaded successfully', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.showToast(`Failed to load folder: ${(err as Error).message}`, 'error');
      }
    } finally {
      this.loading = false;
    }
  }

  private async onExportTrial() {
    if (!this.fs.hasDirectory()) {
      this.showToast('Please choose a trial folder first', 'error');
      return;
    }
    if (!this.store.api.getTrialName()) {
      this.showToast('Please enter a trial name before exporting', 'error');
      return;
    }

    try {
      this.loading = true;
      // Save current state first
      await this.autoSave?.saveNow();

      const exportService = new ExportService(this.fs, this.store.api);
      const blob = await exportService.exportTrial();
      const filename = exportService.getExportFilename();
      downloadBlob(blob, filename);

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      this.showToast(`Exported ${filename} (${sizeMB} MB)`, 'success');
    } catch (err) {
      this.showToast(`Export failed: ${(err as Error).message}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  private onViewChanged(e: CustomEvent<ViewName>) {
    this.store.switchView(e.detail);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toastMessage = message;
    this.toastType = type;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-app': DrApp;
  }
}
