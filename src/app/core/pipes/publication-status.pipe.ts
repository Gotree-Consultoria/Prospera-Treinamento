import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'publicationStatus',
  standalone: true
})
export class PublicationStatusPipe implements PipeTransform {
  transform(value: unknown): string {
    if (value === undefined || value === null) return '—';
    const v = String(value).trim();
    if (!v) return '—';
    const u = v.toUpperCase();
    switch (u) {
      case 'DRAFT':
      case 'RAScunho': // defensivo caso o backend já traga um label misto
        return 'Rascunho';
      case 'PUBLISHED':
      case 'PUBLICADO':
        return 'Publicado';
      default:
        // Apresenta uma forma mais legível por padrão: primeira letra maiúscula
        const lowered = u.toLowerCase();
        return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    }
  }
}
