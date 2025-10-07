import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
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
    { id: 'manageCompanies', label: 'Gerenciar Empresas', icon: 'fas fa-building', requiresCompanyAdmin: true },
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
  companyTab: 'users' | 'import' | 'reports' = 'users';

  user: UserProfile | null = null;
  isLoading = true;
  isSaving = false;
  isEditingProfile = false;

  successMessage = '';
  errorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';
  inviteSuccessMessage = '';
  inviteErrorMessage = '';
  importErrorMessage = '';
  reportMessage = '';

  importPreview: string[] = [];
  importFileName = '';
  companySubusers: CompanySubuser[] = [];

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
      this.companyTab = 'users';
    }
    if (section === 'manageCompanies') {
      this.activeProfileTab = 'company';
      this.companyTab = 'users';
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
      this.inviteErrorMessage = 'Informe um e-mail válido para enviar o convite.';
      return;
    }
    const email = this.inviteForm.value.email ?? '';
    this.companySubusers = [
      ...this.companySubusers,
      { name: 'Convite pendente', email, fromInvite: true }
    ];
    this.inviteSuccessMessage = `Convite enviado para ${email} (mock).`;
    this.inviteForm.reset();
  }

  onImportCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importErrorMessage = '';
    this.reportMessage = '';
    this.importPreview = [];
    this.importFileName = '';

    if (!input?.files?.length) {
      this.importErrorMessage = 'Selecione um arquivo CSV para importar.';
      return;
    }

    const [file] = Array.from(input.files);
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result ?? '') as string;
      if (!text) {
        this.importErrorMessage = 'Arquivo vazio ou inválido.';
        return;
      }
      const rows = text.split(/\r?\n/).filter(Boolean).slice(0, 50);
      this.importPreview = rows.map(row => row.split(',').map(cell => cell.trim()).join(' | '));
      this.importFileName = file.name;
      this.reportMessage = 'CSV processado (mock). Em produção, os dados seriam enviados para a API.';
    };
    reader.onerror = () => {
      this.importErrorMessage = 'Não foi possível ler o arquivo selecionado.';
    };
    reader.readAsText(file);
  }

  exportReport(type: 'progress' | 'employees'): void {
    const csv =
      type === 'progress'
        ? 'email,name,course,progress\nana@empresa.com,Ana Souza,Segurança no Trabalho,100\ncarlos@empresa.com,Carlos Lima,Segurança no Trabalho,57'
        : 'email,name,cpf\nana@empresa.com,Ana Souza,00000000000\ncarlos@empresa.com,Carlos Lima,11111111111';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.reportMessage = 'Relatório exportado (mock).';
  }

  selectCompanyTab(tab: 'users' | 'import' | 'reports'): void {
    this.companyTab = tab;
    this.reportMessage = '';
    this.importErrorMessage = '';
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
