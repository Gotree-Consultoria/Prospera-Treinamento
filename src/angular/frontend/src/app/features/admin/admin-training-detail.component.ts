import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-training-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="training-detail-page" *ngIf="isSystemAdmin(); else noAccess" (click)="closeFilePickers()">
    <div class="header-row" *ngIf="training() as t">
      <div class="title-block">
        <a class="back-link" routerLink="/admin">← Voltar</a>
        <h1 class="title">{{t.title}}</h1>
        <span class="status-badge" [class.published]="(t.publicationStatus||'').toLowerCase()==='published'">{{t.publicationStatus || '—'}}</span>
      </div>
      <div class="action-bar">
        <button type="button" class="btn btn--primary" (click)="publish()" [disabled]="publishing() || (t.publicationStatus||'').toLowerCase()==='published'">{{ (t.publicationStatus||'').toLowerCase()==='published' ? 'Publicado' : 'Publicar' }}</button>
        <label class="btn btn--outline file-btn">
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" (change)="onPdfSelected($any($event.target).files[0]); $event.target.value=''; $event.stopPropagation();" hidden />
        </label>
        <label class="btn btn--outline file-btn">
          <span>Upload Capa</span>
          <input type="file" accept="image/*" (change)="onCoverSelected($any($event.target).files[0]); $event.target.value=''; $event.stopPropagation();" hidden />
        </label>
      </div>
    </div>
    <div *ngIf="loading()" class="loading skeleton">Carregando...</div>
    <div *ngIf="error()" class="error">{{error()}}</div>
    <div class="progress-bar top" *ngIf="uploadProgress() !== null">
      <div class="bar" [style.width.%]="uploadProgress()||0"></div>
    </div>
    <div class="cards" *ngIf="!loading() && training() as t">
      <section class="card meta-card">
        <div class="cover-meta">
          <figure class="cover" *ngIf="t.coverImageUrl as cover">
            <img [src]="cover" alt="Capa" (error)="coverBroken.set(true)" *ngIf="!coverBroken()" />
            <div class="cover-fallback" *ngIf="coverBroken()">Sem capa</div>
            <figcaption *ngIf="trainingHasPdf(t)" class="pdf-flag">PDF</figcaption>
          </figure>
          <div class="meta-grid">
            <div class="field"><label>ID</label><div class="value mono">{{t.id}}</div></div>
            <div class="field"><label>Autor</label><div class="value">{{t.author || '—'}}</div></div>
            <div class="field"><label>Tipo</label><div class="value">{{t.entityType || '—'}}</div></div>
            <div class="field"><label>Status</label><div class="value"><span class="badge" [class.badge-active]="(t.publicationStatus||'').toLowerCase()==='published'" [class.badge-inactive]="(t.publicationStatus||'').toLowerCase()!=='published'">{{t.publicationStatus || '—'}}</span></div></div>
            <div class="field"><label>Criado</label><div class="value">{{t.createdAt | date:'short'}}</div></div>
            <div class="field"><label>Atualizado</label><div class="value">{{t.updatedAt | date:'short'}}</div></div>
          </div>
        </div>
      </section>
      <section class="card">
        <h2 class="card-title">Descrição</h2>
        <p class="description">{{t.description || '—'}}</p>
      </section>
      <section class="card" *ngIf="t.entityType==='EBOOK' && t.ebookDetails as ed">
        <h2 class="card-title">E-book</h2>
        <div class="kv-grid">
          <div class="kv-item"><span class="k">Arquivo</span><span class="v mono">{{ed.filePath || extractPdfFileName(t) || '—'}}</span></div>
          <div class="kv-item"><span class="k">Páginas</span><span class="v">{{ed.totalPages || '—'}}</span></div>
          <div class="kv-item"><span class="k">Upload</span><span class="v">{{ed.fileUploadedAt | date:'short'}}</span></div>
        </div>
        <div class="ebook-actions" *ngIf="trainingHasPdf(t)">
          <a *ngIf="buildEbookFileUrl(extractPdfFileName(t)) as pdfUrl" class="btn btn--ghost" [href]="pdfUrl" target="_blank" rel="noopener">Abrir PDF</a>
        </div>
      </section>
      <section class="card" *ngIf="t.sectorAssignments?.length">
        <h2 class="card-title">Setores Vinculados</h2>
        <table class="table mini" aria-label="Setores vinculados">
          <thead><tr><th>ID</th><th>Nome do Setor</th><th>Tipo</th><th>Base Legal</th><th>Ações</th></tr></thead>
          <tbody>
            <tr *ngFor="let sa of t.sectorAssignments">
              <td data-label="ID" class="mono">{{sa.sectorId}}</td>
              <td data-label="Nome do Setor">{{sectorName(sa.sectorId)}}</td>
              <td data-label="Tipo">{{sa.trainingType || '—'}}</td>
              <td data-label="Base Legal">{{sa.legalBasis || '—'}}</td>
              <td data-label="Ações" class="actions-col"><button type="button" class="btn btn--ghost btn-xs" (click)="unlinkSector(sa.sectorId, t.id)">Remover</button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
  <ng-template #noAccess><p class="error">Acesso negado.</p></ng-template>
  `,
  styles: [`
    :host { display:block; padding:1.5rem clamp(0.75rem,2vw,1.5rem) 3rem; }
    .training-detail-page { display:flex; flex-direction:column; gap:1.25rem; }
    .header-row { display:flex; justify-content:space-between; gap:1.25rem; flex-wrap:wrap; align-items:flex-start; }
    .title-block { display:flex; flex-direction:column; gap:.4rem; min-width:260px; }
    .back-link { text-decoration:none; font-size:.7rem; color:#4f46e5; font-weight:600; }
    .back-link:hover { text-decoration:underline; }
    .title { margin:0; font-size:1.4rem; line-height:1.1; font-weight:600; letter-spacing:-.5px; color:#1e293b; }
    .status-badge { display:inline-block; width:fit-content; font-size:.6rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; padding:.3rem .55rem; border-radius:6px; background:#e2e8f0; color:#334155; }
    .status-badge.published { background:linear-gradient(90deg,#22c55e,#16a34a); color:#fff; }
    .action-bar { display:flex; gap:.6rem; flex-wrap:wrap; align-items:center; }
    .loading.skeleton { opacity:.75; }
    .error { font-size:.8rem; color:#b91c1c; }
    .cards { display:grid; gap:1rem; grid-template-columns:1fr; }
    .card { background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:1rem 1.1rem 1.1rem; position:relative; box-shadow:0 4px 14px -6px rgba(0,0,0,.08); display:flex; flex-direction:column; gap:.85rem; animation:fadeIn .25s ease; }
    .card-title { margin:0; font-size:.85rem; letter-spacing:.05em; font-weight:700; text-transform:uppercase; color:#334155; }
    .meta-card { padding-bottom:.9rem; }
    .cover-meta { display:flex; gap:1.25rem; flex-wrap:wrap; align-items:stretch; }
    .cover { margin:0; width:140px; }
    .cover img { width:140px; height:180px; object-fit:cover; border:1px solid #e2e8f0; border-radius:10px; box-shadow:0 2px 6px -2px rgba(0,0,0,.15); background:#fff; }
    .cover-fallback { width:140px; height:180px; border:1px dashed #cbd5e1; display:flex; align-items:center; justify-content:center; font-size:.65rem; border-radius:10px; color:#64748b; background:#f8fafc; }
    .pdf-flag { margin-top:.5rem; text-align:center; font-size:.55rem; letter-spacing:.05em; background:#eef2ff; border:1px solid #c7d2fe; color:#3730a3; padding:.18rem .45rem; border-radius:6px; font-weight:600; }
    .meta-grid { display:grid; flex:1; gap:.75rem; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); align-content:start; }
    .meta-grid .field { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:.55rem .65rem .65rem; display:flex; flex-direction:column; gap:.35rem; position:relative; box-shadow:0 1px 2px rgba(0,0,0,.05); }
    .meta-grid label { font-size:.55rem; letter-spacing:.05em; text-transform:uppercase; color:#64748b; font-weight:700; }
    .value { font-size:.72rem; font-weight:500; color:#1e293b; word-break:break-word; }
    .mono { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:.62rem; }
    .description { font-size:.7rem; color:#334155; line-height:1.4; margin:0; white-space:pre-line; }
    .kv-grid { display:grid; gap:.6rem; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); }
    .kv-item { background:#f8fafc; border:1px solid #e2e8f0; padding:.5rem .6rem; border-radius:8px; font-size:.6rem; display:flex; flex-direction:column; gap:.3rem; }
    .kv-item .k { font-size:.55rem; letter-spacing:.05em; text-transform:uppercase; color:#64748b; font-weight:600; }
    .kv-item .v { font-size:.7rem; font-weight:500; color:#1e293b; }
    .ebook-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    .table { width:100%; border-collapse:collapse; font-size:.65rem; }
    .table thead th { text-align:left; font-size:.55rem; letter-spacing:.05em; text-transform:uppercase; font-weight:600; padding:.45rem .5rem; background:#f1f5f9; color:#334155; }
    .table tbody td { padding:.45rem .5rem; border-top:1px solid #e2e8f0; }
    .actions-col { text-align:right; }
    /* Buttons */
    .btn { --btn-bg:#f1f5f9; --btn-border:#cbd5e1; --btn-color:#0f172a; --btn-bg-hover:#e2e8f0; --btn-shadow:0 1px 2px rgba(0,0,0,.05); font-size:.66rem; font-weight:600; letter-spacing:.4px; padding:.55rem .9rem; border-radius:9px; border:1px solid var(--btn-border); background:var(--btn-bg); color:var(--btn-color); cursor:pointer; transition:.18s cubic-bezier(.4,0,.2,1); display:inline-flex; align-items:center; gap:.45rem; position:relative; box-shadow:var(--btn-shadow); }
    .btn-xs { padding:.35rem .55rem; font-size:.55rem; border-radius:7px; }
    .btn:disabled { opacity:.6; cursor:not-allowed; }
    .btn:not(:disabled):hover { background:var(--btn-bg-hover); transform:translateY(-1px); box-shadow:0 4px 14px -4px rgba(0,0,0,.15); }
    .btn:not(:disabled):active { transform:translateY(0); box-shadow:0 2px 8px -4px rgba(0,0,0,.2); }
    .btn--primary { --btn-bg:#6366f1; --btn-bg-hover:#4f46e5; --btn-border:#6366f1; --btn-color:#fff; }
    .btn--outline { --btn-bg:#ffffff; --btn-bg-hover:#f8fafc; --btn-border:#94a3b8; }
    .btn--ghost { background:transparent; border:1px solid transparent; box-shadow:none; padding:.45rem .65rem; }
    .btn--ghost:hover { background:#f1f5f9; }
    .file-btn { cursor:pointer; overflow:hidden; }
    .badge { padding:.25rem .55rem; font-size:.55rem; border-radius:14px; font-weight:600; letter-spacing:.5px; background:#e2e8f0; color:#334155; position:relative; overflow:hidden; }
    .badge-active { background:linear-gradient(90deg,#22c55e,#16a34a); color:#fff; }
    .badge-inactive { background:linear-gradient(90deg,#f87171,#dc2626); color:#fff; }
    .progress-bar.top { position:relative; height:5px; background:#e2e8f0; border-radius:4px; overflow:hidden; margin-top:-.5rem; }
    .progress-bar .bar { position:absolute; inset:0; background:linear-gradient(90deg,#6366f1,#818cf8); transition:width .25s; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
    @media (min-width:900px) { .cards { grid-template-columns:repeat(2,minmax(0,1fr)); } .meta-card { grid-column:1 / -1; } }
  `]
})
export class AdminTrainingDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);

  training = signal<any | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  publishing = signal<boolean>(false);
  uploadProgress = signal<number | null>(null);
  coverBroken = signal<boolean>(false);
  sectors = signal<any[]>([]);

  isSystemAdmin = () => this.auth.hasRole('SYSTEM_ADMIN');

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.fetch(id);
    });
    // Carrega lista de setores para permitir resolver o nome exibido na tabela
    this.loadSectors();
  }

  fetch(id: string) {
    this.loading.set(true); this.error.set(null);
    this.admin.getTrainingById(id).subscribe({
      next: (t: any) => {
        if (t && !t.publicationStatus && t['status']) {
          t = { ...t, publicationStatus: t['status'] };
        }
        this.training.set(t as any);
      },
      error: err => this.error.set(err?.message || 'Erro ao carregar treinamento'),
      complete: () => this.loading.set(false)
    });
  }

  publish() {
    const t = this.training(); if (!t || (t.publicationStatus||'').toLowerCase()==='published') return;
    if (!confirm(`Publicar '${t.title}'?`)) return;
    this.publishing.set(true);
    this.admin.publishTraining(t.id).subscribe({
      next: () => this.training.update(curr => curr ? { ...curr, publicationStatus: 'PUBLISHED' } : curr),
      error: err => this.error.set(err?.message || 'Falha ao publicar'),
      complete: () => this.publishing.set(false)
    });
  }

  onPdfSelected(file: File) {
    const t = this.training(); if (!t || !file) return;
    this.uploadProgress.set(0); this.admin.uploadEbookFileWithProgress(t.id, file).subscribe({
      next: ev => { if (ev.type==='progress') this.uploadProgress.set(ev.progress ?? 0); },
      error: err => { this.error.set(err?.message || 'Falha upload PDF'); this.uploadProgress.set(null); },
      complete: () => { this.uploadProgress.set(100); setTimeout(()=> this.uploadProgress.set(null), 1200); }
    });
  }

  onCoverSelected(file: File) {
    const t = this.training(); if (!t || !file) return;
    this.uploadProgress.set(0); this.admin.uploadTrainingCoverImage(t.id, file).subscribe({
      next: ev => { if (ev.type==='progress') this.uploadProgress.set(ev.progress ?? 0); },
      error: err => { this.error.set(err?.message || 'Falha upload capa'); this.uploadProgress.set(null); },
      complete: () => { this.uploadProgress.set(100); setTimeout(()=> this.uploadProgress.set(null), 1000); }
    });
  }

  trainingHasPdf(t: any) { return this.admin.trainingHasPdf(t); }
  extractPdfFileName(t: any) { return this.admin.extractPdfFileName(t); }
  buildEbookFileUrl(fileName: string) { return this.admin.buildEbookFileUrl(fileName); }

  unlinkSector(sectorId: string, trainingId: string) {
    if (!sectorId || !trainingId) return;
    if (!confirm('Remover vínculo com setor?')) return;
    this.admin.unlinkTrainingSector(trainingId, sectorId).subscribe({
      next: () => this.training.update(t => t ? { ...t, sectorAssignments: (t.sectorAssignments||[]).filter((s:any)=> s.sectorId !== sectorId) } : t),
      error: err => this.error.set(err?.message || 'Falha ao desvincular setor')
    });
  }

  private loadSectors() {
    this.admin.getSectors().subscribe({
      next: list => this.sectors.set(list || []),
      error: () => {/* silencioso para não poluir UI principal */}
    });
  }

  sectorName(sectorId: string | null | undefined): string {
    if (!sectorId) return '—';
    const found = this.sectors().find(s => s.id === sectorId);
    return found?.name || sectorId;
  }

  // Placeholder para futuras interações (ex: fechar menus/file pickers externos se necessário)
  closeFilePickers() { /* no-op por enquanto */ }
}
