import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatLabel',
  standalone: true
})
export class FormatLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return 'Conteúdo';
    }
    const normalized = value.toUpperCase();
    switch (normalized) {
      case 'EBOOK':
        return 'E-Book';
      case 'RECORDED_COURSE':
        return 'Curso';
      case 'LIVE_TRAINING':
        return 'Ao vivo';
      case 'PACKAGE':
        return 'Pacote';
      default:
        return value;
    }
  }
}
