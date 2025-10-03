import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SupportService } from '../../core/services/support.service';

@Component({
  selector: 'pros-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supportService = inject(SupportService);

  readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  submit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.supportService.sendContactMessage(this.contactForm.getRawValue()).subscribe({
      next: response => {
        this.isSubmitting = false;
        this.successMessage = response.message;
        this.contactForm.reset();
      },
      error: error => {
        this.isSubmitting = false;
        this.errorMessage = error?.message ?? 'Não foi possível enviar a mensagem agora.';
      }
    });
  }
}
