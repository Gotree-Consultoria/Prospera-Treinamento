import { CommonModule, AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SupportService } from '../../core/services/support.service';

@Component({
  selector: 'pros-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsyncPipe, RouterLink],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supportService = inject(SupportService);

  readonly topics$ = this.supportService.getSupportTopics();

  readonly supportForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    topic: ['access', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  submit(): void {
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.supportService.openSupportTicket(this.supportForm.getRawValue()).subscribe({
      next: response => {
        this.isSubmitting = false;
        this.successMessage = response.message;
        this.supportForm.reset({ topic: 'access' });
      },
      error: error => {
        this.isSubmitting = false;
        this.errorMessage = error?.message ?? 'Não foi possível registrar o chamado.';
      }
    });
  }
}
