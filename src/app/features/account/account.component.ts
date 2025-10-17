import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take, debounceTime, distinctUntilChanged, filter, switchMap, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { of, Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService, UserSubscription } from '../../core/services/subscription.service';
import { AdminService } from '../../core/services/admin.service';
import { UserProfile } from '../../core/models/user';

interface AccountMenuItem {
  id: 'profile' | 'plans' | 'manageCompanies' | 'learning';
  label: string;
  icon: string;
  requiresCompanyAdmin?: boolean;
}

interface ProfileSectionItem {
  id: 'dados' | 'payments' | 'password' | 'company';
  label: string;
  action?: string;
  requiresCompanyAdmin?: boolean;
}

interface CompanySubuser {
  name: string;
  email: string;
  cpf?: string;
  fromInvite?: boolean;
}

@Component({
  selector: 'pros-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  private readonly baseMenuItems: AccountMenuItem[] = [
    { id: 'profile', label: 'Perfil', icon: 'fas fa-user' },
    { id: 'manageCompanies', label: 'Gerenciar Empresas', icon: 'fas fa-building' },
    { id: 'plans', label: 'Planos & Assinatura', icon: 'fas fa-layer-group' },
    { id: 'learning', label: 'Cursos & Treinamentos', icon: 'fas fa-graduation-cap' }
  ];

  get menuItems(): AccountMenuItem[] {
    return this.baseMenuItems.filter(item => !item.requiresCompanyAdmin || this.isCompanyAdmin);
  }

  readonly profileSections: ProfileSectionItem[] = [
    { id: 'dados', label: 'Dados cadastrais' },
    { id: 'payments', label: 'Pagamentos' },
    { id: 'password', label: 'Trocar senha' },
    // 'company' tab removed from profile per request; company management remains available via the sidebar menu
  ];

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$|^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)]],
    phone: [''],
    birth: ['']
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  activeSection: AccountMenuItem['id'] = 'profile';
  activeProfileTab: ProfileSectionItem['id'] = 'dados';
  // companyTab removed — apenas a view de usuários é mantida

  user: UserProfile | null = null;
  isLoading = true;
  isSaving = false;
  isEditingProfile = false;

  // Minha assinatura (Planos & Assinatura)
  subscription: UserSubscription | null | undefined = undefined; // undefined=loading, null=sem assinatura
  subscriptionLoading = false;
  subscriptionError = '';

  successMessage = '';
  errorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';
  inviteSuccessMessage = '';
  inviteErrorMessage = '';
  // import/report variables removed — feature deprecated in this UI
  companySubusers: CompanySubuser[] = [];
  // Organization members (from backend)
  orgMembers: Array<{ membershipId: string; userId: string; userEmail: string; fullName: string; role: string }> = [];
  orgMembersLoading = false;
  orgMembersError = '';
  // UI: action menu state per member
  openMemberMenuId: string | null = null;
  changingRoleId: string | null = null;
  memberRoleSelection: Record<string, string> = {};
  // member progress modal state
  viewingProgressFor: string | null = null; // membershipId
  memberProgressList: any[] = [];
  memberProgressLoading = false;
  memberProgressError = '';
  // Organizations
  organizations: Array<{ id: string; name: string; cnpj?: string }> = [];
  orgsLoading = false;
  selectedOrgId: string | null = null;
  orgCreateForm = this.fb.nonNullable.group({ razaoSocial: ['', Validators.required], cnpj: [''] });
  showOrgModal = false;
  lookupInProgress = false;
  lookupError = '';
  isCreatingOrg = false;
  private cnpjSub: Subscription | null = null;

  private readonly subscriptionService = inject(SubscriptionService);
  private readonly adminService = inject(AdminService);
  private readonly http = inject(HttpClient);

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.patchUser(user);
      } else {
        this.authService.fetchProfile({ suppressNavigation: true }).subscribe({
          next: profile => this.patchUser(profile),
          error: () => {
            this.isLoading = false;
          }
        });
      }
    });

    // inscrever mudanças do CNPJ para buscar razão social automaticamente
    const cnpjControl = this.orgCreateForm.get('cnpj');
    if (cnpjControl) {
      this.cnpjSub = cnpjControl.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          tap(() => {
            this.lookupError = '';
          }),
          // transformar para apenas dígitos
          switchMap(raw => {
            const digits = (String(raw || '') || '').replace(/\D/g, '');
            if (digits.length < 14) {
              return of(null);
            }
            this.lookupInProgress = true;
            const url = `http://localhost:8080/api/lookup/cnpj/${digits}`;
            return this.http.get(url).pipe(
              catchError(err => {
                console.warn('[Account] lookup cnpj falhou', err);
                this.lookupError = 'Não foi possível buscar a razão social para este CNPJ.';
                return of(null);
              })
            );
          })
        )
        .subscribe((res: any) => {
          this.lookupInProgress = false;
          if (res && typeof res === 'object') {
            const name = String(res.razaoSocial ?? res.nome ?? res.companyName ?? res.corporateName ?? '');
            if (name) {
              this.orgCreateForm.patchValue({ razaoSocial: name });
            }
          }
        });
    }
  }

  private loadMyOrganizations() {
    this.organizations = [];
    this.orgsLoading = true;
    this.adminService.getMyOrganizations().subscribe({
      next: list => {
        this.orgsLoading = false;
        if (Array.isArray(list) && list.length) {
          this.organizations = list.map((o: any) => ({ id: String(o.id ?? o.orgId ?? o.organizationId ?? ''), name: String(o.razaoSocial ?? o.name ?? o.companyName ?? o.title ?? ''), cnpj: String(o.cnpj ?? o.CNPJ ?? '') }));
        } else {
          this.organizations = [];
        }
      },
      error: err => {
        this.orgsLoading = false;
        console.warn('[Account] falha ao carregar organizações do usuário', err);
      }
    });
  }

  // createOrganization() removed — modal-only creation is used via createOrganizationFromModal()

  openCreateOrgModal(): void {
    this.orgCreateForm.reset();
    this.lookupError = '';
    this.showOrgModal = true;
  }

  closeCreateOrgModal(): void {
    this.showOrgModal = false;
    this.lookupInProgress = false;
    this.lookupError = '';
  }

  createOrganizationFromModal(): void {
    if (this.orgCreateForm.invalid) {
      this.orgCreateForm.markAllAsTouched();
      return;
    }
    this.isCreatingOrg = true;
    const payload = { razaoSocial: String(this.orgCreateForm.value.razaoSocial || ''), cnpj: String(this.orgCreateForm.value.cnpj || '') };
    this.adminService.createOrganization(payload).subscribe({
      next: org => {
        this.isCreatingOrg = false;
        this.showOrgModal = false;
        this.loadMyOrganizations();
        // selecionar a organização recém-criada se vier id
        const id = String(org?.id ?? org?.organizationId ?? org?.orgId ?? '');
        if (id) {
          // aguardar um tick para garantir que a lista foi recarregada
          setTimeout(() => this.selectOrganization(id), 300);
        }
      },
      error: err => {
        this.isCreatingOrg = false;
        console.warn('Falha ao criar organização', err);
        this.lookupError = err?.message ?? 'Falha ao criar organização.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.cnpjSub) {
      this.cnpjSub.unsubscribe();
      this.cnpjSub = null;
    }
  }

  selectOrganization(orgId: string | null) {
    // Toggle: se clicar na mesma organização novamente, desmarca a seleção
    if (orgId && this.selectedOrgId === orgId) {
      this.selectedOrgId = null;
      this.orgMembers = [];
      this.orgMembersLoading = false;
      return;
    }

    this.selectedOrgId = orgId;
    if (orgId) {
      // carregar membros da organização selecionada
      this.orgMembers = [];
      this.orgMembersLoading = true;
      this.adminService.getOrganizationMembers(orgId).subscribe({
        next: list => {
          this.orgMembersLoading = false;
          if (Array.isArray(list) && list.length) {
            // normalize member payload and roles (accept backend variants)
            this.orgMembers = list.map((m: any) => {
              // debug raw member for investigation
              console.debug('[Account] raw member', m);
              const membershipId = String(m.membershipId ?? m.id ?? '');
              const userId = String(m.userId ?? m.userId ?? '');
              const userEmail = String(m.userEmail ?? m.email ?? '');
              const fullName = String(m.fullName ?? m.name ?? '');
              // possible role fields: role, systemRole, roleName, userRole
              const rawRole = String((m.role ?? m.systemRole ?? m.roleName ?? m.userRole ?? '') || '').toUpperCase();
              let normalizedRole = 'ORG_MEMBER';
              if (rawRole.includes('ADMIN')) normalizedRole = 'ORG_ADMIN';
              else if (rawRole === 'ORG_ADMIN' || rawRole === 'ORG_MEMBER') normalizedRole = rawRole;
              else if (rawRole === 'MEMBER') normalizedRole = 'ORG_MEMBER';
              return { membershipId, userId, userEmail, fullName, role: normalizedRole };
            });
          } else {
            this.orgMembers = [];
          }
        },
        error: err => {
          this.orgMembersLoading = false;
          console.warn('Falha ao carregar membros da org selecionada', err);
        }
      });
    } else {
      this.orgMembers = [];
    }
  }

  get selectedOrgName(): string {
    return (this.organizations.find(o => o.id === this.selectedOrgId) || { name: '' }).name || '';
  }

  get availableProfileSections(): ProfileSectionItem[] {
    return this.profileSections.filter(section => !section.requiresCompanyAdmin || this.isCompanyAdmin);
  }

  get displayName(): string {
    const fromProfile = this.extractPersonalField('fullName', 'name');
    const fallback = this.safeString(this.user?.name ?? this.user?.fullName ?? this.user?.email ?? '');
    return fromProfile || fallback;
  }

  get displayEmail(): string {
    const email = this.extractPersonalField('email') || this.safeString(this.user?.email ?? this.authService.getStoredEmail() ?? '');
    return this.maskEmail(email);
  }

  get displayCPF(): string {
    const cpf =
      this.extractPersonalField('cpf', 'cpfNumber', 'document', 'documentNumber') ||
      this.safeString(this.user?.cpf ?? this.user?.document ?? this.user?.documentNumber ?? '');
    return cpf ? this.maskCpf(cpf) : '—';
  }

  get displayBirth(): string {
    const birth = this.extractPersonalField('birthDate', 'birth') || this.safeString(this.user?.birthDate ?? this.user?.birth ?? '');
    return birth ? this.maskDate(birth) : '—';
  }

  get displayPhone(): string {
    const phone = this.extractPersonalField('phone') || this.safeString(this.user?.phone ?? '');
    return phone ? this.maskPhone(phone) : '—';
  }

  get personalData(): Record<string, unknown> | undefined {
    return (
      (this.user?.personalProfile as Record<string, unknown> | undefined) ??
      (this.user?.profile as Record<string, unknown> | undefined) ??
      (this.user as Record<string, unknown> | undefined)
    );
  }

  get isProfileComplete(): boolean {
    return Boolean(this.displayName && this.displayCPF !== '—');
  }

  get isCompanyAdmin(): boolean {
    return this.authService.isSystemAdmin() || this.authService.isOrgAdmin();
  }

  get companyName(): string {
  const source = this.user?.company as Record<string, unknown> | undefined;
    const organizations = Array.isArray(this.user?.organizations) ? this.user?.organizations : [];
    const candidate = (source?.['name'] as string) ?? (source?.['companyName'] as string) ?? (organizations?.[0]?.['organizationName'] as string) ?? '';
    return candidate || '—';
  }

  get companyCnpj(): string {
  const source = this.user?.company as Record<string, unknown> | undefined;
    const raw = (source?.['cnpj'] as string) ?? (source?.['CNPJ'] as string) ?? '';
    return raw ? this.formatCnpj(raw) : '—';
  }

  get companyPlan(): string {
    const source = this.user?.company as Record<string, unknown> | undefined;
    return (source?.['plan'] as string) ?? 'Gratuito (Acesso Admin)';
  }

  selectSection(section: AccountMenuItem['id']): void {
    if (section === 'manageCompanies' && !this.isCompanyAdmin) {
      return;
    }
    this.activeSection = section;
    if (section === 'profile' && !this.availableProfileSections.some(item => item.id === this.activeProfileTab)) {
      this.activeProfileTab = this.availableProfileSections[0]?.id ?? 'dados';
    }
    if (section === 'learning') {
      // no-op: companyTab feature removed
    }
    if (section === 'manageCompanies') {
      this.activeProfileTab = 'company';
    }
  }

  selectProfileTab(tab: ProfileSectionItem['id']): void {
    if (tab === 'company' && !this.isCompanyAdmin) {
      return;
    }
    this.activeProfileTab = tab;
  }

  toggleProfileEdit(): void {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile && this.user) {
      this.patchUser(this.user);
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const { cpf, name, birth, ...rest } = this.profileForm.getRawValue();
    const payload = {
      ...rest,
      fullName: (name ?? '').trim(),
      cpf: this.stripNonDigits(cpf),
      birthDate: this.normalizeBirthDate(birth)
    };
    this.authService.updateProfile(payload).subscribe({
      next: profile => {
        this.isSaving = false;
        this.successMessage = 'Dados atualizados com sucesso!';
        this.patchUser(profile);
        this.isEditingProfile = false;
      },
      error: error => {
        this.isSaving = false;
        this.errorMessage = error?.message || 'Não foi possível atualizar o perfil agora.';
      }
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
    this.authService.updatePassword(newPassword, currentPassword || undefined).subscribe({
      next: () => {
        this.passwordSuccessMessage = 'Senha atualizada com sucesso!';
        this.passwordForm.reset();
      },
      error: error => {
        this.passwordErrorMessage = error?.message || 'Não foi possível atualizar a senha agora.';
      }
    });
  }

  inviteSubuser(): void {
    this.inviteSuccessMessage = '';
    this.inviteErrorMessage = '';
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      this.inviteErrorMessage = 'Informe um e-mail válido para adicionar um membro.';
      return;
    }
    const email = (this.inviteForm.value.email ?? '').trim();
  const orgId = String(((this.user?.company as any)?.['id']) ?? ((this.user?.organizations as any)?.[0]?.['id']) ?? '');
    if (!orgId) {
      this.inviteErrorMessage = 'Organização não encontrada.';
      return;
    }
    const payload = { email };
    this.adminService.addOrganizationMember(orgId, payload).subscribe({
      next: resp => {
        this.inviteSuccessMessage = `Membro ${email} adicionado.`;
        this.inviteForm.reset();
        this.loadOrganizationMembers();
      },
      error: err => {
        this.inviteErrorMessage = err?.message ?? 'Falha ao adicionar membro.';
      }
    });
  }

  private loadOrganizationMembers() {
    this.orgMembers = [];
    this.orgMembersError = '';
  const orgId = String(((this.user?.company as any)?.['id']) ?? ((this.user?.organizations as any)?.[0]?.['id']) ?? '');
    if (!orgId) {
      // fallback: mantemos os mocks já presentes
      this.populateCompanySubusers(this.user!);
      return;
    }
    this.orgMembersLoading = true;
    this.adminService.getOrganizationMembers(orgId).subscribe({
      next: list => {
        this.orgMembersLoading = false;
        if (Array.isArray(list) && list.length) {
          this.orgMembers = list.map((m: any) => ({
            membershipId: String(m.membershipId ?? m.id ?? m.membershipId ?? ''),
            userId: String(m.userId ?? m.userId ?? ''),
            userEmail: String(m.userEmail ?? m.email ?? ''),
            fullName: String(m.fullName ?? m.name ?? ''),
            // backend roles expected: ORG_MEMBER or ORG_ADMIN
            role: String(m.role ?? 'ORG_MEMBER')
          }));
        } else {
          this.orgMembers = [];
        }
      },
      error: err => {
        console.warn('[Account] falha ao carregar membros da org', err);
        this.orgMembersLoading = false;
        this.orgMembersError = 'Não foi possível carregar os membros da organização.';
        this.populateCompanySubusers(this.user!);
      }
    });
  }

  removeOrgMember(membershipId: string) {
  const orgId = String(((this.user?.company as any)?.['id']) ?? ((this.user?.organizations as any)?.[0]?.['id']) ?? '');
    if (!orgId || !membershipId) return;
    this.removeMemberLoading = true;
    this.removeMemberError = '';
    this.adminService.deleteOrganizationMember(orgId, membershipId).subscribe({
      next: () => {
        this.removeMemberLoading = false;
        this.removingMemberId = null;
        this.removeMemberSuccessMessage = 'Membro removido com sucesso.';
        this.loadOrganizationMembers();
      },
      error: err => {
        console.warn('Falha ao remover membro', err);
        this.removeMemberLoading = false;
        this.removeMemberError = err?.message || 'Falha ao remover membro.';
      }
    });
  }

  changeMemberRole(membershipId: string, newRole: string) {
  const orgId = String(((this.user?.company as any)?.['id']) ?? ((this.user?.organizations as any)?.[0]?.['id']) ?? '');
    if (!orgId || !membershipId) return;
    const payload = { role: newRole };
    this.adminService.updateOrganizationMemberRole(orgId, membershipId, payload).subscribe({
      next: () => this.loadOrganizationMembers(),
      error: err => console.warn('Falha ao atualizar role', err)
    });
  }

  // UI helpers for action menu and role change flow
  toggleMemberMenu(membershipId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.openMemberMenuId = this.openMemberMenuId === membershipId ? null : membershipId;
    // reset any role chooser when toggling
    this.changingRoleId = null;
  }

  openRoleChooser(membershipId: string, currentRole: string) {
    this.changingRoleId = membershipId;
    // normalize to backend roles
    this.memberRoleSelection[membershipId] = currentRole === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'ORG_MEMBER';
  }

  cancelRoleChange(membershipId?: string) {
    if (membershipId) delete this.memberRoleSelection[membershipId];
    this.changingRoleId = null;
  }

  applyMemberRoleChange(membershipId: string) {
    const role = this.memberRoleSelection[membershipId];
    if (!role) return;
    // only allow ORG_ADMIN or ORG_MEMBER
    const normalized = role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'ORG_MEMBER';
    this.changeMemberRole(membershipId, role);
    this.changingRoleId = null;
    this.openMemberMenuId = null;
  }

  // --- Modal-driven removal flow ---
  // id do membro que estamos confirmando remoção
  removingMemberId: string | null = null;
  // loading / error / success feedback
  removeMemberLoading = false;
  removeMemberError = '';
  removeMemberSuccessMessage = '';

  confirmRemoveMember(membershipId: string) {
    // abre o modal de confirmação
    this.removingMemberId = membershipId;
    this.removeMemberError = '';
    this.removeMemberSuccessMessage = '';
    this.openMemberMenuId = null;
  }

  cancelRemoveMember() {
    this.removingMemberId = null;
    this.removeMemberError = '';
  }

  proceedRemoveMember() {
    if (!this.removingMemberId) return;
    this.removeOrgMember(this.removingMemberId);
  }

  toggleMemberRole(membershipId: string, currentRole: string) {
    // Decide target role based on current
    const target = currentRole === 'ORG_ADMIN' ? 'ORG_MEMBER' : 'ORG_ADMIN';
    const label = target === 'ORG_ADMIN' ? 'Administrador' : 'Membro';
    const ok = window.confirm(`Tem certeza que deseja alterar a role deste usuário para ${label}?`);
    if (!ok) return;
    this.changeMemberRole(membershipId, target);
    this.openMemberMenuId = null;
  }

  viewMemberProgress(membershipId: string) {
    // prefer selected organization when available
    const orgIdCandidate = this.selectedOrgId || String(((this.user?.company as any)?.['id']) ?? ((this.user?.organizations as any)?.[0]?.['id']) ?? '');
    const orgId = String(orgIdCandidate || '');
    console.debug('[Account] viewMemberProgress called', { orgId, membershipId });
    if (!orgId || !membershipId) {
      console.warn('[Account] missing orgId or membershipId for viewMemberProgress', { orgId, membershipId });
      return;
    }
    this.viewingProgressFor = membershipId;
    this.memberProgressList = [];
    this.memberProgressLoading = true;
    this.memberProgressError = '';
    this.adminService.getMemberProgress(orgId, membershipId).subscribe({
      next: data => {
        console.debug('[Account] getMemberProgress response', data);
        this.memberProgressLoading = false;
        if (!data) {
          this.memberProgressList = [];
          return;
        }
        // backend may return a single object or an array
        this.memberProgressList = Array.isArray(data) ? data : [data];
      },
      error: err => {
        console.error('[Account] getMemberProgress error', err);
        this.memberProgressLoading = false;
        this.memberProgressError = err?.message ?? 'Falha ao buscar progresso do membro.';
      }
    });
  }

  closeMemberProgress() {
    this.viewingProgressFor = null;
    this.memberProgressList = [];
    this.memberProgressError = '';
  }

  displayStatus(raw?: string): string {
    if (!raw) return '—';
    const r = String(raw).toUpperCase();
    if (r === 'ACTIVE') return 'Ativo';
    if (r === 'COMPLETED' || r === 'CONCLUDED') return 'Concluído';
    if (r === 'INACTIVE') return 'Inativo';
    return raw;
  }

  // onImportCsv and exportReport removed — import/report functionality removed from UI

  selectCompanyTab(tab: 'users' | 'import' | 'reports'): void {
    // companyTab feature deprecated — sempre carregamos a view de usuários
    this.loadOrganizationMembers();
  }

  openLearningCatalog(): void {
    this.router.navigate(['/catalog']);
  }

  logout(): void {
    this.authService.logout();
  }

  private patchUser(user: UserProfile): void {
    this.user = user;
    this.isLoading = false;
    this.profileForm.patchValue({
      name: this.safeString(user.name ?? user.fullName ?? this.personalData?.['fullName'] ?? ''),
      cpf: this.extractCpf(user),
      phone: this.safeString(this.personalData?.['phone'] ?? user.phone ?? ''),
      birth: this.normalizeBirthDate(
        this.safeString(this.personalData?.['birthDate'] ?? this.personalData?.['birth'] ?? user.birth ?? user.birthDate ?? '')
      ) ?? ''
    });
    this.populateCompanySubusers(user);
    if (!this.isCompanyAdmin && this.activeSection === 'manageCompanies') {
      this.activeSection = 'profile';
    }
    // carregar assinatura do usuário quando os dados do perfil estiverem prontos
    this.loadMySubscription();
    // carregar organizações do usuário
    this.loadMyOrganizations();
  }

  loadMySubscription(reset = false) {
    if (reset) {
      this.subscription = undefined;
      this.subscriptionError = '';
    }
    this.subscriptionLoading = true;
    this.subscriptionService.getMySubscription().subscribe({
      next: sub => {
        this.subscription = sub; // null === sem assinatura
        this.subscriptionLoading = false;
      },
      error: err => {
        console.warn('[Account] erro ao carregar assinatura', err);
        this.subscriptionError = 'Não foi possível carregar sua assinatura agora.';
        this.subscription = null;
        this.subscriptionLoading = false;
      }
    });
  }

  humanStatus(status?: string) {
    if (!status) return '—';
    const s = status.toUpperCase();
    switch (s) {
      case 'ACTIVE':
      case 'ATIVA':
        return 'Ativa';
      case 'CANCELED':
      case 'CANCELADA':
        return 'Cancelada';
      case 'EXPIRED':
      case 'EXPIRADA':
        return 'Expirada';
      case 'PENDING':
      case 'PENDENTE':
        return 'Pendente';
      default:
        return s.charAt(0) + s.slice(1).toLowerCase();
    }
  }

  originLabel(origin?: string) {
    if (!origin) return '—';
    switch ((origin || '').toUpperCase()) {
      case 'MANUAL':
        return 'Manual';
      case 'PAYMENT_GATEWAY':
        return 'Pagamento';
      case 'PROMO':
        return 'Promoção';
      default:
        return origin.charAt(0) + origin.slice(1).toLowerCase();
    }
  }

  formatPrice(value?: number | null) {
    if (value == null) return null;
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    } catch {
      return String(value);
    }
  }

  durationLabel(days?: number | null) {
    if (!days) return '—';
    if (days >= 360 && days <= 370) return 'Anual';
    if (days >= 170 && days <= 190) return 'Semestral';
    if (days >= 85 && days <= 95) return 'Trimestral';
    if (days >= 28 && days <= 31) return 'Mensal';
    if (days === 7) return 'Semanal';
    return `${days} dias`;
  }

  private extractCpf(user: UserProfile): string {
    const raw =
      this.extractPersonalField('cpf', 'cpfNumber', 'document', 'documentNumber') ||
      this.safeString(user?.cpf ?? user?.document ?? user?.documentNumber ?? '');
    return raw.replace(/\D/g, '').slice(0, 11);
  }

  private stripNonDigits(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace(/\D/g, '');
  }

  private normalizeBirthDate(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const isoWithTime = value.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
    if (isoWithTime?.[1]) {
      return isoWithTime[1];
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  }

  private populateCompanySubusers(user: UserProfile): void {
    const company = (user.company ?? {}) as Record<string, unknown>;
    const embedded = Array.isArray(company?.['subusers']) ? (company['subusers'] as Array<Record<string, unknown>>) : [];
    const fallback: Array<Record<string, unknown>> = [
      { name: 'Ana Souza', email: 'ana@empresa.com', cpf: '00000000000' },
      { name: 'Carlos Lima', email: 'carlos@empresa.com', cpf: '11111111111' }
    ];
    const list = embedded.length ? embedded : fallback;
    this.companySubusers = list.map(raw => {
      const item = raw as Record<string, unknown>;
      return {
        name: this.safeString(item['name'] ?? item['fullName'] ?? 'Colaborador'),
        email: this.safeString(item['email'] ?? '—'),
        cpf: item['cpf'] ? this.maskCpf(String(item['cpf'])) : undefined
      };
    });
  }

  private extractPersonalField(...keys: string[]): string {
    const data = this.personalData;
    if (!data) {
      return '';
    }
    for (const key of keys) {
      if (key in data && data[key] != null && data[key] !== '') {
        return this.safeString(data[key]);
      }
    }
    return '';
  }

  private safeString(value: unknown): string {
    return typeof value === 'string' ? value : value != null ? String(value) : '';
  }

  private maskEmail(email: string): string {
    if (!email) {
      return '—';
    }
    if (email.includes('*')) {
      return email;
    }
    const [name, domain] = email.split('@');
    if (!domain) {
      return email;
    }
    const visible = Math.max(1, Math.floor(name.length / 3));
    const masked = name.slice(0, visible) + '*'.repeat(Math.max(0, name.length - visible));
    return `${masked}@${domain}`;
  }

  private maskPhone(phone: string): string {
    if (!phone) {
      return '—';
    }
    if (phone.includes('*')) {
      return phone;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) {
      return '*'.repeat(digits.length);
    }
    const visible = digits.slice(-4);
    return `*** **** ${visible}`;
  }

  private maskCpf(cpf: string): string {
    if (!cpf) {
      return '—';
    }
    if (cpf.includes('*')) {
      return cpf;
    }
    const digits = cpf.replace(/\D/g, '');
    if (digits.length < 6) {
      return '*'.repeat(digits.length);
    }
    const start = digits.slice(0, 3);
    const end = digits.slice(-2);
    return `${start}.***.***-${end}`;
  }

  private maskDate(value: string): string {
    if (!value) {
      return '—';
    }
    if (value.includes('*')) {
      return value;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year] = value.split('-');
      return `**/**/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [, , year] = value.split('/');
      return `**/**/${year}`;
    }
    return value;
  }

  private formatCnpj(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return digits.replace(/^(\d{2})(\d+)/, '$1.$2');
    if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  }
}
