import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { AdminTraining, AdminSector } from '../../core/models/admin';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface AdminUserSummary {
  id: string;
  email: string;
  role?: string | null;
  enabled?: boolean;
  [key: string]: unknown;
}

interface AdminOrganizationSummary {
  id: string;
  name: string;
  cnpj?: string | null;
  memberCount?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);

  // signals
  trainings = signal<AdminTraining[]>([]);
  trainingSearch = signal<string>('');
  trainingStatusFilter = signal<'all'|'published'|'draft'>('all');
  filteredTrainings = computed(() => {
    const term = this.trainingSearch().trim().toLowerCase();
    const status = this.trainingStatusFilter();
    return this.trainings().filter(t => {
      if (term) {
        const comp = `${t.title || ''} ${t.author || ''} ${t.id}`.toLowerCase();
        if (!comp.includes(term)) return false;
      }
      if (status === 'published' && (t.publicationStatus || '').toLowerCase() !== 'published') return false;
      if (status === 'draft' && (t.publicationStatus || '').toLowerCase() === 'published') return false;
      return true;
    });
  });
  selectedTrainingId = signal<string | null>(null);
  selectedTrainingDetails = signal<any | null>(null);
  uploadProgress = signal<number | null>(null);
  showCreateTraining = signal<boolean>(false);
  createTrainingLoading = signal<boolean>(false);
  createTrainingError = signal<string | null>(null);
  createTrainingForm = signal<{title:string; description:string; author:string; entityType:string; organizationId:string | null}>({ title:'', description:'', author:'', entityType:'EBOOK', organizationId: null });
  openActionMenuId = signal<string | null>(null);
  sectors = signal<AdminSector[]>([]);
  newSectorName = signal<string>('');
  creatingSector = signal<boolean>(false);
  sectorError = signal<string | null>(null);
  deletingSectorId = signal<string | null>(null);
  removingTrainingSectorId = signal<string | null>(null);
  users = signal<AdminUserSummary[]>([]);
  selectedUserId = signal<string | null>(null);
  selectedUserDetails = signal<any | null>(null);
  filteredUsers = computed(() => {
    const list = this.users();
    const term = this.userSearch().trim().toLowerCase();
    const status = this.userStatusFilter();
    const role = this.userRoleFilter();
    return list.filter(u => {
      if (term && !u.email.toLowerCase().includes(term)) return false;
      if (status === 'active' && u.enabled === false) return false;
      if (status === 'inactive' && u.enabled !== false) return false;
      if (role !== 'all' && role && (u.role || '').toUpperCase() !== role.toUpperCase()) return false;
      return true;
    });
  });

  // filtros (signals simples)
  userSearch = signal<string>('');
  userStatusFilter = signal<'all'|'active'|'inactive'>('all');
  userRoleFilter = signal<string>('all');
  organizations = signal<AdminOrganizationSummary[]>([]);
  orgSearch = signal<string>('');
  orgStatusFilter = signal<'all'|'active'|'inactive'>('all');
  filteredOrganizations = computed(() => {
    const term = this.orgSearch().trim().toLowerCase();
    const status = this.orgStatusFilter();
    return this.organizations().filter(o => {
      if (status === 'active' && o.enabled === false) return false;
      if (status === 'inactive' && o.enabled !== false) return false;
      if (term) {
        const composite = `${o.name || ''} ${o.cnpj || ''} ${o.id}`.toLowerCase();
        if (!composite.includes(term)) return false;
      }
      return true;
    });
  });
  selectedOrgId = signal<string | null>(null);
  selectedOrgDetails = signal<any | null>(null);
  loading = signal<{[key:string]: boolean}>({});
  error = signal<{[key:string]: string | null}>({});
  activeCard = signal<string | null>(null);
  // --- Monetização (Planos & Assinaturas) ---
  monetizationPlanForm = signal<{name:string; description:string; originalPrice:string; currentPrice:string; durationInDays:number}>({ name:'', description:'', originalPrice:'', currentPrice:'', durationInDays:30 });
  monetizationSubscriptionForm = signal<{userId:string; planId:string}>({ userId:'', planId:'' });
  creatingPlan = signal<boolean>(false);
  creatingSubscription = signal<boolean>(false);
  monetizationMessage = signal<string | null>(null);
  monetizationError = signal<string | null>(null);
  // simples memória local de planos criados nesta sessão (até termos GET /admin/plans)
  createdPlans = signal<any[]>([]);

  updatePlanField<K extends keyof ReturnType<typeof this.monetizationPlanForm>>(key: K, value: any) {
    this.monetizationPlanForm.update(f => ({ ...f, [key]: key==='durationInDays' ? Number(value)||0 : value }));
  }
  updateSubscriptionField<K extends keyof ReturnType<typeof this.monetizationSubscriptionForm>>(key: K, value: any) {
    this.monetizationSubscriptionForm.update(f => ({ ...f, [key]: value }));
  }
  submitCreatePlan() {
    const form = this.monetizationPlanForm();
    if (!form.name.trim()) { this.monetizationError.set('Nome do plano é obrigatório.'); return; }
    if (!form.originalPrice.trim() || !form.currentPrice.trim()) { this.monetizationError.set('Preços original e atual são obrigatórios.'); return; }
    this.creatingPlan.set(true); this.monetizationError.set(null); this.monetizationMessage.set(null);
    this.admin.createPlan({
      name: form.name.trim(),
      description: form.description.trim(),
      originalPrice: form.originalPrice.trim(),
      currentPrice: form.currentPrice.trim(),
      durationInDays: form.durationInDays||0
    }).subscribe({
      next: created => {
        this.monetizationMessage.set('Plano criado com sucesso.');
        this.createdPlans.update(list => [created, ...list]);
        // mantém valores de preço para facilitar criação em série, limpa nome/desc
        this.monetizationPlanForm.update(f => ({ ...f, name:'', description:'' }));
      },
      error: err => this.monetizationError.set(err?.message || 'Falha ao criar plano'),
      complete: () => this.creatingPlan.set(false)
    });
  }
  submitCreateSubscription() {
    const form = this.monetizationSubscriptionForm();
    if (!form.userId.trim() || !form.planId.trim()) { this.monetizationError.set('User ID e Plan ID são obrigatórios para criar assinatura.'); return; }
    this.creatingSubscription.set(true); this.monetizationError.set(null); this.monetizationMessage.set(null);
    this.admin.createSubscription({ userId: form.userId.trim(), planId: form.planId.trim() }).subscribe({
      next: created => {
        this.monetizationMessage.set('Assinatura criada manualmente.');
        this.monetizationSubscriptionForm.set({ userId:'', planId:'' });
      },
      error: err => this.monetizationError.set(err?.message || 'Falha ao criar assinatura'),
      complete: () => this.creatingSubscription.set(false)
    });
  }
  discountPercent(plan: any): number | null {
    const op = parseFloat(plan?.originalPrice);
    const cp = parseFloat(plan?.currentPrice);
    if (isFinite(op) && isFinite(cp) && op > 0 && cp < op) {
      return Math.round(((op - cp) / op) * 100);
    }
    return null;
  }

  isSystemAdmin = computed(() => this.auth.hasRole('SYSTEM_ADMIN'));

  constructor() {
    // load initial lightweight data (setores e treinamentos) eagerly
    effect(() => {
      if (this.isSystemAdmin()) {
        this.loadSectors();
        this.loadTrainings();
      }
    });
  }

  // Wrappers para funções de PDF do serviço (mantém template simples)
  trainingHasPdf(t: any) { return this.admin.trainingHasPdf(t); }
  extractPdfFileName(t: any) { return this.admin.extractPdfFileName(t); }
  buildEbookFileUrl(fileName: string) { return this.admin.buildEbookFileUrl(fileName); }
  // Debug simplificado: retorna string explicando a detecção de PDF (ou ausência)
  pdfDebugInfo(t: any): string {
    const dbg = this.admin.trainingPdfDebug(t);
    if (!dbg.has) return 'Nenhum PDF enviado';
    // Nome do arquivo
    let fileName = this.extractPdfFileName(t);
    if (!fileName && t?.ebookDetails?.filePath) {
      try { fileName = decodeURIComponent(String(t.ebookDetails.filePath).split('/').pop()!); } catch { fileName = String(t.ebookDetails.filePath); }
    }
    const pages = t?.ebookDetails?.totalPages;
    const uploadedRaw = t?.ebookDetails?.fileUploadedAt || t?.ebookDetails?.uploadedAt || t?.ebookDetails?.createdAt;
    let uploadedPart = '';
    if (uploadedRaw) {
      const d = new Date(uploadedRaw);
      if (!isNaN(d.getTime())) {
        uploadedPart = 'enviado em ' + d.toLocaleDateString('pt-BR');
      }
    }
    const parts: string[] = [];
    parts.push(fileName ? `PDF disponível: ${fileName}` : 'PDF disponível');
    if (pages) parts.push(`${pages} pág${pages > 1 ? 's' : ''}`);
    if (uploadedPart) parts.push(uploadedPart);
    return parts.join(' • ');
  }
  // Atalho para logar no console (chamado pelo botão debug)
  logPdfDebug(t: any) { console.log('PDF DEBUG', t.id, this.admin.trainingPdfDebug(t)); }

  toggleCard(key: string) {
    this.activeCard.update(curr => curr === key ? null : key);
    // Lazy fetch by card
    if (this.activeCard() === key) {
  if (key === 'users' && this.users().length === 0) this.loadUsers();
      if (key === 'organizations' && this.organizations().length === 0) this.loadOrganizations();
      if (key === 'content' && this.trainings().length === 0) this.loadTrainings();
  if (key === 'platform' && this.sectors().length === 0) this.loadSectors();
      // (monetization) no fetch inicial porque depende apenas de POSTs por enquanto
    }
  }

  private setLoading(scope: string, value: boolean) {
    this.loading.update(l => ({ ...l, [scope]: value }));
  }
  private setError(scope: string, value: string | null) {
    this.error.update(e => ({ ...e, [scope]: value }));
  }

  loadTrainings() {
    if (!this.isSystemAdmin()) return;
    this.setLoading('trainings', true); this.setError('trainings', null);
    this.admin.getTrainings().subscribe({
      next: list => {
        this.trainings.set(list);
        // Prefetch detalhes para EBOOKs que não detectaram PDF (lista resumida sem ebookDetails)
        this.prefetchPdfInfo(list);
      },
      error: err => this.setError('trainings', err?.message || 'Falha ao carregar treinamentos'),
      complete: () => this.setLoading('trainings', false)
    });
  }

  viewTrainingDetails(t: AdminTraining) {
    if (!t?.id) return; this.selectedTrainingId.set(t.id); this.selectedTrainingDetails.set(null);
    this.setLoading('trainingDetails', true); this.setError('trainingDetails', null);
    this.admin.getTrainingById(t.id).subscribe({
      next: detail => this.selectedTrainingDetails.set(detail),
      error: err => this.setError('trainingDetails', err?.message || 'Falha ao carregar detalhe'),
      complete: () => this.setLoading('trainingDetails', false)
    });
  }

  closeTrainingDetails() { this.selectedTrainingId.set(null); this.selectedTrainingDetails.set(null); }

  publishTraining(t: AdminTraining) {
    if (!t?.id) return; if (!confirm(`Publicar treinamento '${t.title}'?`)) return;
    this.setLoading('publishTraining', true); this.setError('publishTraining', null);
    this.admin.publishTraining(t.id).subscribe({
      next: () => {
        this.trainings.update(list => list.map(x => x.id === t.id ? { ...x, publicationStatus: 'PUBLISHED' } : x));
        if (this.selectedTrainingId() === t.id && this.selectedTrainingDetails()) {
          this.selectedTrainingDetails.update(d => d ? { ...d, publicationStatus: 'PUBLISHED' } : d);
        }
        if (this.openActionMenuId() === t.id) this.openActionMenuId.set(null);
      },
      error: err => this.setError('publishTraining', err?.message || 'Falha ao publicar'),
      complete: () => this.setLoading('publishTraining', false)
    });
  }

  uploadEbook(t: AdminTraining, file: File) {
    if (!t?.id || !file) return;
    this.uploadProgress.set(0); this.setLoading('ebookUpload', true); this.setError('ebookUpload', null);
    this.admin.uploadEbookFileWithProgress(t.id, file).subscribe({
      next: ev => {
        if (ev.type === 'progress') this.uploadProgress.set(ev.progress ?? 0);
        if (ev.type === 'response') {
          this.uploadProgress.set(100);
          // marca localmente que tem PDF
          this.trainings.update(list => list.map(x => x.id === t.id ? { ...x, ebookFileUploaded: true } : x));
        }
      },
      error: err => { this.setError('ebookUpload', err?.message || 'Falha no upload'); this.setLoading('ebookUpload', false); this.uploadProgress.set(null); },
      complete: () => { this.setLoading('ebookUpload', false); setTimeout(() => this.uploadProgress.set(null), 1200); }
    });
  }

  uploadCover(t: AdminTraining, file: File) {
    if (!t?.id || !file) return;
    this.setLoading('coverUpload', true); this.setError('coverUpload', null); this.uploadProgress.set(0);
    this.admin.uploadTrainingCoverImage(t.id, file).subscribe({
      next: ev => { if (ev.type === 'progress') this.uploadProgress.set(ev.progress ?? 0); },
      error: err => { this.setError('coverUpload', err?.message || 'Falha no upload da capa'); this.setLoading('coverUpload', false); this.uploadProgress.set(null); },
      complete: () => { this.setLoading('coverUpload', false); setTimeout(() => this.uploadProgress.set(null), 1000); }
    });
  }

  clearTrainingFilters() { this.trainingSearch.set(''); this.trainingStatusFilter.set('all'); }

  openCreateTraining() {
    this.createTrainingForm.set({ title:'', description:'', author:'', entityType:'EBOOK', organizationId: null });
    this.createTrainingError.set(null);
    this.showCreateTraining.set(true);
  }
  closeCreateTraining() { this.showCreateTraining.set(false); }
  updateCreateField<K extends keyof ReturnType<typeof this.createTrainingForm>> (key: K, value: any) {
    this.createTrainingForm.update(f => ({ ...f, [key]: value }));
  }
  submitCreateTraining() {
    const form = this.createTrainingForm();
    if (!form.title.trim() || !form.entityType) { this.createTrainingError.set('Título e tipo são obrigatórios.'); return; }
    this.createTrainingLoading.set(true); this.createTrainingError.set(null);
    const payload: any = {
      title: form.title.trim(),
      entityType: form.entityType,
      description: form.description?.trim() || null,
      author: form.author?.trim() || null,
      organizationId: form.organizationId || null
    };
    this.admin.createTraining(payload).subscribe({
      next: created => {
        this.showCreateTraining.set(false);
        // otimista: insere na lista
        this.trainings.update(list => [created, ...list]);
      },
      error: err => this.createTrainingError.set(err?.message || 'Falha ao criar treinamento'),
      complete: () => this.createTrainingLoading.set(false)
    });
  }

  // --- Ações menu popover ---
  toggleTrainingActionsMenu(id: string, ev?: Event) {
    ev?.stopPropagation();
    this.openActionMenuId.update(curr => curr === id ? null : id);
  }
  closeTrainingActionsMenu() { this.openActionMenuId.set(null); }

  loadSectors() {
    if (!this.isSystemAdmin()) return;
    this.setLoading('sectors', true); this.setError('sectors', null);
    this.admin.getSectors().subscribe({
      next: list => this.sectors.set(list),
      error: err => this.setError('sectors', err?.message || 'Falha ao carregar setores'),
      complete: () => this.setLoading('sectors', false)
    });
  }

  createSector() {
    const name = this.newSectorName().trim();
    if (!name) { this.sectorError.set('Nome é obrigatório.'); return; }
    this.creatingSector.set(true); this.sectorError.set(null);
    this.admin.createSector(name).subscribe({
      next: created => {
        this.sectors.update(list => [...list, created]);
        this.newSectorName.set('');
      },
      error: err => this.sectorError.set(err?.message || 'Falha ao criar setor'),
      complete: () => this.creatingSector.set(false)
    });
  }

  deleteSector(sector: AdminSector) {
    if (!sector?.id) return;
    if (!confirm(`Excluir setor '${sector.name}'? Esta ação não poderá ser desfeita.`)) return;
    this.deletingSectorId.set(sector.id);
    this.admin.deleteSector(sector.id).subscribe({
      next: () => this.sectors.update(list => list.filter(s => s.id !== sector.id)),
      error: err => alert(err?.message || 'Falha ao excluir setor'),
      complete: () => this.deletingSectorId.set(null)
    });
  }

  loadUsers() {
    if (!this.isSystemAdmin()) return;
    this.setLoading('users', true); this.setError('users', null);
    this.admin.getUsers().subscribe({
      next: list => this.users.set(list as any),
      error: err => this.setError('users', err?.message || 'Falha ao carregar usuários'),
      complete: () => this.setLoading('users', false)
    });
  }

  toggleUserEnabled(user: AdminUserSummary) {
    const target = !user.enabled;
    this.loading.update(l => ({ ...l, userToggle: true }));
    this.admin.updateUserEnabled(user.id, target).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, enabled: target } : u));
      },
      error: err => {
        this.setError('users', err?.message || 'Falha ao atualizar usuário');
      },
      complete: () => this.loading.update(l => ({ ...l, userToggle: false }))
    });
  }

  viewUserDetails(user: AdminUserSummary) {
    if (!user?.id) return;
    this.selectedUserId.set(user.id);
    this.selectedUserDetails.set(null);
    this.setLoading('userDetails', true); this.setError('userDetails', null);
    this.admin.getUserById(user.id).subscribe({
      next: detail => this.selectedUserDetails.set(detail),
      error: err => this.setError('userDetails', err?.message || 'Falha ao carregar detalhes'),
      complete: () => this.setLoading('userDetails', false)
    });
  }

  closeUserDetails() {
    this.selectedUserId.set(null);
    this.selectedUserDetails.set(null);
  }

  clearUserFilters() {
    this.userSearch.set('');
    this.userStatusFilter.set('all');
    this.userRoleFilter.set('all');
  }

  loadOrganizations() {
    if (!this.isSystemAdmin()) return;
    this.setLoading('organizations', true); this.setError('organizations', null);
    this.admin.getOrganizations().subscribe({
      next: list => this.organizations.set(list as any),
      error: err => this.setError('organizations', err?.message || 'Falha ao carregar organizações'),
      complete: () => this.setLoading('organizations', false)
    });
  }

  toggleOrganizationEnabled(org: AdminOrganizationSummary) {
    const target = !org.enabled;
    // Confirmação similar ao legacy (mensagem contextual)
    const orgName = org.name || org.id;
    const confirmMsg = target
      ? `Ativar organização '${orgName}'?`
      : `Você tem certeza que deseja INATIVAR a organização '${orgName}'? Todos os membros perderão acesso.`;
    if (!(window as any).showConfirmModal) {
      if (!confirm(confirmMsg)) return;
    } else {
      // se existir showConfirmModal assíncrono
      const proceed = (window as any).showConfirmModal(confirmMsg);
      if (proceed && typeof (proceed as Promise<boolean>).then === 'function') {
        (proceed as Promise<boolean>).then(ok => { if (ok) this.toggleOrganizationEnabled(org); });
        return;
      }
    }
    this.loading.update(l => ({ ...l, orgToggle: true }));
    this.admin.updateOrganizationEnabled(org.id, target).subscribe({
      next: () => {
        this.organizations.update(list => list.map(o => o.id === org.id ? { ...o, enabled: target } : o));
        if (this.selectedOrgId() === org.id && this.selectedOrgDetails()) {
          this.selectedOrgDetails.update(d => d ? { ...d, enabled: target } : d);
        }
      },
      error: err => this.setError('organizations', err?.message || 'Falha ao atualizar organização'),
      complete: () => this.loading.update(l => ({ ...l, orgToggle: false }))
    });
  }

  viewOrganizationDetails(org: AdminOrganizationSummary) {
    if (!org?.id) return; this.selectedOrgId.set(org.id); this.selectedOrgDetails.set(null);
    this.setLoading('orgDetails', true); this.setError('orgDetails', null);
    this.admin.getOrganizationById(org.id).subscribe({
      next: detail => this.selectedOrgDetails.set(detail),
      error: err => this.setError('orgDetails', err?.message || 'Falha ao carregar detalhe'),
      complete: () => this.setLoading('orgDetails', false)
    });
  }

  closeOrganizationDetails() { this.selectedOrgId.set(null); this.selectedOrgDetails.set(null); }

  clearOrgFilters() { this.orgSearch.set(''); this.orgStatusFilter.set('all'); }

  // --- Normalizers (replicam heurísticas do legacy) ---
  private unwrapList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object') {
      const c = response.items ?? response.data ?? response.content ?? response.users ?? response.results;
      if (Array.isArray(c)) return c;
      if (response.data && Array.isArray(response.data.items)) return response.data.items;
    }
    return [];
  }

  private normalizeUser(raw: any): AdminUserSummary {
    const id = String(raw.id ?? raw.userId ?? raw._id ?? '');
    const email = String(raw.email ?? raw.userEmail ?? '');
    const role = raw.role ?? raw.systemRole ?? null;
    const enabled = raw.enabled === false ? false : true;
    return { id, email, role, enabled, ...raw };
  }

  private normalizeOrganization(raw: any): AdminOrganizationSummary {
    const id = String(raw.id ?? raw.orgId ?? raw._id ?? '');
    const name = String(raw.razaoSocial ?? raw.companyName ?? raw.name ?? raw.title ?? '');
    const cnpj = raw.cnpj ?? raw.CNPJ ?? null;
    const memberCount = typeof raw.memberCount === 'number' ? raw.memberCount : (Array.isArray(raw.members) ? raw.members.length : undefined);
    const enabled = raw.enabled === false ? false : true;
    return { id, name, cnpj, memberCount, enabled, ...raw };
  }

  // --- Lazy PDF enrichment ---
  private pdfLookupInProgress = new Set<string>();
  private prefetchPdfInfo(list: AdminTraining[]) {
    for (const t of list) {
      if (!t?.id) continue;
      if ((t.entityType || '').toUpperCase() !== 'EBOOK') continue;
      // Se já detecta PDF, não precisa detalhar
      if (this.trainingHasPdf(t)) continue;
      if (this.pdfLookupInProgress.has(t.id)) continue;
      this.pdfLookupInProgress.add(t.id);
      this.admin.getTrainingById(t.id).subscribe({
        next: detail => {
          // Mescla detalhes (inclui ebookDetails) e força atualização na lista
          this.trainings.update(curr => curr.map(x => x.id === t.id ? { ...x, ...detail } : x));
        },
        error: () => {
          // silencia; poderia logar se necessário
        },
        complete: () => this.pdfLookupInProgress.delete(t.id)
      });
    }
  }

  // --- Setores vinculados ao treinamento ---
  getTrainingSectorAssignments(detail: any): Array<any> {
    if (!detail || typeof detail !== 'object') return [];
    const candidates = [detail.sectorAssignments, detail.trainingSectors, detail.assignedSectors, detail.sectors];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        // normaliza objetos que contenham sectorId / id
        return c.filter(a => a && (a.sectorId || a.id)).map(a => ({
          sectorId: String(a.sectorId || a.id),
            trainingType: a.trainingType || a.type || a.category || null,
            legalBasis: a.legalBasis || a.baseLegal || a.legalBase || null,
            _raw: a
          }));
      }
    }
    return [];
  }

  sectorName(id: string | null | undefined): string {
    if (!id) return '';
    const found = this.sectors().find(s => s.id === id);
    return found ? found.name : '';
  }

  removeTrainingSector(trainingId: string, sectorId: string) {
    if (!trainingId || !sectorId) return;
    if (!confirm('Remover vínculo com o setor?')) return;
    this.removingTrainingSectorId.set(sectorId);
    this.admin.unlinkTrainingSector(trainingId, sectorId).subscribe({
      next: () => {
        // Atualiza detalhes selecionados
        this.selectedTrainingDetails.update(d => {
          if (!d) return d;
          const arrays = ['sectorAssignments','trainingSectors','assignedSectors','sectors'];
          for (const key of arrays) {
            if (Array.isArray((d as any)[key])) {
              (d as any)[key] = (d as any)[key].filter((a: any) => (a.sectorId || a.id) !== sectorId);
            }
          }
          return { ...d }; // força mudança
        });
      },
      error: err => alert(err?.message || 'Falha ao remover vínculo'),
      complete: () => this.removingTrainingSectorId.set(null)
    });
  }
}
