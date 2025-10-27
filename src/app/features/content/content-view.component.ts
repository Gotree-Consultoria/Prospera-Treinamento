import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { HttpClient } from '@angular/common/http';
import { AdminService } from '../../core/services/admin.service';
import { PdfSecureViewerComponent } from './pdf-secure-viewer.component';

@Component({
  selector: 'app-content-view',
  standalone: true,
  imports: [CommonModule, RouterModule, PdfSecureViewerComponent],
  template: `
  <div class="content-view" *ngIf="loading() && !error(); else loaded">
    <p>Carregando conteúdo…</p>
  </div>
  <ng-template #loaded>
    <div *ngIf="error()" class="error">{{ error() }}</div>
    <div *ngIf="training() as t" [class.fullscreen-mode]="isFullscreen()">
      <header *ngIf="!isFullscreen()" style="display:flex;justify-content:center;align-items:center;gap:.75rem;margin-bottom:.75rem;flex-direction:column;text-align:center">
        <div style="flex:1">
          <h1 style="margin:0;font-size:1.1rem">{{ t.title }}</h1>
          <div class="muted small">{{ t.author || '—' }} • {{ t.entityType }}</div>
        </div>
        <button class="btn btn-fullscreen" (click)="toggleFullscreen()" title="Tela cheia" *ngIf="t.entityType === 'EBOOK'">
          ⛶ Tela cheia
        </button>
      </header>

      <!-- Botão de sair em fullscreen -->
      <div *ngIf="isFullscreen() && t.entityType === 'EBOOK'" class="fullscreen-exit-bar">
        <button class="btn btn-exit-fullscreen" (click)="toggleFullscreen()" title="Sair da tela cheia">
          ⛔ Sair da Tela Cheia
        </button>
      </div>

      <section *ngIf="t.entityType === 'EBOOK'">
        <div *ngIf="rawPdfUrl; else noPdf">
          <app-pdf-secure-viewer [pdfUrl]="rawPdfUrl" [style.height]="isFullscreen() ? '100%' : '600px'" style="display: block;"></app-pdf-secure-viewer>
        </div>
        <ng-template #noPdf>
          <div class="empty">PDF não disponível para este conteúdo.</div>
        </ng-template>
      </section>

      <section *ngIf="(training()?.modules || []).length">
        <h2 class="card-title">Aulas</h2>
        <ul>
          <li *ngFor="let m of training()?.modules">
            <div style="font-weight:700">{{ m.title }}</div>
            <ol>
              <li *ngFor="let l of m.lessons" style="margin-bottom:.5rem;display:flex;gap:.5rem;align-items:center;justify-content:space-between;">
                <div>
                  <div>{{ l.title }}</div>
                  <div class="muted small">{{ l.content ? 'Conteúdo disponível' : 'Sem conteúdo' }}</div>
                </div>
                <div style="display:flex;gap:.4rem">
                  <button class="btn btn--ghost" (click)="openLessonAsStudent(l)">Abrir</button>
                  <button class="btn btn--ghost" (click)="previousLesson(l)">← Anterior</button>
                  <button class="btn btn--subtle" (click)="completeLesson(l)">Marcar como Concluída</button>
                </div>
              </li>
            </ol>
          </li>
        </ul>
      </section>
    </div>
  </ng-template>
  `,
  styles: [`
    .error { color:#b91c1c }
    .muted { color:#64748b; font-size:.85rem }
    .small { font-size:.8rem }
    
    .btn-fullscreen {
      padding: 0.4rem 0.8rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .btn-fullscreen:hover {
      background: #0056b3;
    }
    
    .fullscreen-mode {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      background: white;
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
    }
    
    .fullscreen-mode section {
      flex: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }
    
    .fullscreen-mode app-pdf-secure-viewer {
      height: 100% !important;
    }
    
    .fullscreen-exit-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      background: #1a1a1a;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    .btn-exit-fullscreen {
      padding: 0.5rem 1.2rem;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .btn-exit-fullscreen:hover {
      background: #c82333;
    }
    
    .fullscreen-mode section {
      margin-top: 3.5rem;
    }
  `]
})
export class ContentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly admin = inject(AdminService);

  training = signal<any | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  isFullscreen = signal<boolean>(false);
  rawPdfUrl: string | null = null;
  private blobUrl: string | null = null;

  ngOnDestroy(): void {
    if (this.blobUrl) {
      try { URL.revokeObjectURL(this.blobUrl); } catch {}
      this.blobUrl = null;
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    try { console.debug('[ContentView] init, route id=', id); } catch {}
    if (!id) {
      this.error.set('ID do conteúdo ausente.');
      this.loading.set(false);
      return;
    }
    this.loadTraining(id);
  }

  private loadTraining(id: string) {
    try { console.debug('[ContentView] loadTraining start', { id }); } catch {}
    this.loading.set(true); this.error.set(null);
    this.admin.getTrainingById(id).subscribe({
      next: t => {
        this.training.set(t as any);
        // tentar endpoint público de streaming de ebook como estudante
        // Detectar EBOOK de forma tolerante: entityType (case-insensitive), ebookDetails presente ou heurística
        try {
          console.debug('[ContentView] training loaded', t);
        } catch {}
        const et = (t as any)?.entityType;
        const hasEbookDetails = !!(t as any)?.ebookDetails;
        const isEbookType = typeof et === 'string' && String(et).toUpperCase().includes('EBOOK');
        if (isEbookType || hasEbookDetails || this.admin.trainingHasPdf(t)) {
          this.fetchStudentEbookUrl(id, t as any);
        } else {
          this.loading.set(false);
        }
      },
      error: err => {
        try { console.error('[ContentView] getTrainingById error', err); } catch {}
        this.error.set(err?.message || 'Falha ao carregar o conteúdo');
        this.loading.set(false);
      }
    });
  }

  private fetchStudentEbookUrl(id: string, training: any) {
    // primeiro tenta endpoint de streaming do estudante
    try { console.debug('[ContentView] fetchStudentEbookUrl calling student stream endpoint (blob)', { id }); } catch {}
    const url = this.api.createUrl(`/stream/ebooks/${encodeURIComponent(id)}`);
    // Use HttpClient to request blob so we can pass auth headers the app already manages
    this.http
      .get(url, { responseType: 'blob' })
      .subscribe({
        next: blob => {
          try { console.debug('[ContentView] fetchStudentEbookUrl got blob', blob); } catch {}
          if (!blob || !blob.size) {
            this.useAdminEbookUrl(training);
            this.loading.set(false);
            return;
          }

          // Check the first bytes to detect PDF signature rather than relying on blob.type
          try {
            const headerSlice = blob.slice(0, 5);
            // Blob.text() returns a Promise<string>
            headerSlice.text().then(header => {
              try { console.debug('[ContentView] fetchStudentEbookUrl header', header); } catch {}
              if (header && header.startsWith('%PDF')) {
                // It's a PDF stream — create object URL for the viewer
                if (this.blobUrl) { try { URL.revokeObjectURL(this.blobUrl); } catch {} }
                this.blobUrl = URL.createObjectURL(blob);
                this.rawPdfUrl = this.blobUrl;
                try { console.debug('[ContentView] object URL created', { blobUrl: this.blobUrl, rawPdfUrl: this.rawPdfUrl }); } catch {}
                this.loading.set(false);
                return;
              }

              // Not a PDF header — maybe the blob contains a textual URL or JSON. Try to read text.
              blob.text().then(text => {
                try { console.debug('[ContentView] fetchStudentEbookUrl blob->text', (text || '').slice(0,200)); } catch {}
                const parsedUrl = (text || '').trim();
                if (parsedUrl && (parsedUrl.startsWith('http') || parsedUrl.startsWith('file:') || parsedUrl.startsWith('/'))) {
                  this.rawPdfUrl = parsedUrl;
                  try { console.debug('[ContentView] using parsed URL from blob text', { parsedUrl: this.rawPdfUrl }); } catch {}
                } else {
                  this.useAdminEbookUrl(training);
                }
                this.loading.set(false);
              }).catch(() => {
                // reading as text failed — fallback to admin url
                this.useAdminEbookUrl(training);
                this.loading.set(false);
              });
            }).catch(() => {
              // If header reading fails, still try to create an object URL (best-effort)
              if (this.blobUrl) { try { URL.revokeObjectURL(this.blobUrl); } catch {} }
              this.blobUrl = URL.createObjectURL(blob);
              this.rawPdfUrl = this.blobUrl;
              try { console.debug('[ContentView] object URL created (fallback)', { blobUrl: this.blobUrl, rawPdfUrl: this.rawPdfUrl }); } catch {}
              this.loading.set(false);
            });
          } catch (e) {
            // Any unexpected error — fallback to admin url
            try { console.warn('[ContentView] fetchStudentEbookUrl header check failed', e); } catch {}
            this.useAdminEbookUrl(training);
            this.loading.set(false);
          }
        },
        error: err => {
          try { console.warn('[ContentView] fetchStudentEbookUrl error (will fallback to admin URL)', err); } catch {}
          this.useAdminEbookUrl(training);
          this.loading.set(false);
        }
      });
  }

  private useAdminEbookUrl(training: any) {
    const fileName = this.admin.extractPdfFileName(training);
    const url = this.admin.buildEbookFileUrl(fileName) || null;
    if (url) {
      this.rawPdfUrl = url;
    } else {
      this.rawPdfUrl = null;
    }
  }

  openLessonAsStudent(lesson: any) {
    if (!lesson || !lesson.id) return;
    // tentar obter recurso da lição (próximo/preview) via endpoint público
    this.api.get<any>(`/api/lessons/${encodeURIComponent(lesson.id)}/next`).subscribe({
      next: res => {
        // abrir conteúdo se houver URL
        const url = res?.url || res?.file || res?.content;
        if (url) window.open(url, '_blank');
        else alert('Conteúdo da aula não disponível para visualização.');
      },
      error: err => {
        console.warn('Falha ao carregar lição', err);
        alert('Falha ao carregar o conteúdo da lição.');
      }
    });
  }

  previousLesson(lesson: any) {
    if (!lesson || !lesson.id) return;
    // navegar para a aula anterior via endpoint público
    this.api.get<any>(`/api/lessons/${encodeURIComponent(lesson.id)}/previous`).subscribe({
      next: res => {
        // abrir conteúdo da aula anterior se houver URL
        const url = res?.url || res?.file || res?.content;
        if (url) window.open(url, '_blank');
        else alert('Aula anterior não disponível.');
      },
      error: err => {
        console.warn('Falha ao carregar aula anterior', err);
        alert('Falha ao navegar para a aula anterior.');
      }
    });
  }

  completeLesson(lesson: any) {
    if (!lesson || !lesson.id) return;
    this.api.post<any>(`/lessons/${encodeURIComponent(lesson.id)}/complete`, {}).subscribe({
      next: () => alert('Aula marcada como concluída.'),
      error: err => alert(err?.message || 'Falha ao marcar aula como concluída.')
    });
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(current => !current);
    
    // Aplicar fullscreen do navegador se disponível
    if (!this.isFullscreen()) {
      // Sair do fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }
}
