import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterColumn, FooterLink } from '../../../../core/models/footer';

@Component({
  selector: 'pros-layout-footer',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  @Input({ required: true }) columns: FooterColumn[] = [];
  @Input() socialLinks: FooterLink[] = [];
  @Input() description = '';
  @Input() brand = 'Prospera';
  @Input() copyright = '';

  constructor(private readonly sanitizer: DomSanitizer) {}

  get safeSocialLinks(): Array<FooterLink & { svgSafe?: SafeHtml }> {
    return this.socialLinks.map(l => {
      let svg = l.svg;
      if (svg) {
        // Garante que paths sem atributo fill recebam fill branco
        svg = svg.replace(/<path\b([^>]*?)>/g, (full, attrs) => {
          if (/fill=/i.test(attrs)) return full; // já tem fill
          return `<path${attrs} fill="#ffffff">`;
        });
        // Garante que elemento raiz svg não defina fill preto padrão
        svg = svg.replace(/<svg(?![^>]*fill=)/, '<svg fill="white"');
      }
      return {
        ...l,
        svgSafe: svg ? this.sanitizer.bypassSecurityTrustHtml(svg) : undefined
      };
    });
  }

  trackColumn(_: number, column: FooterColumn): string {
    return column.title;
  }

  trackLink(_: number, link: FooterLink): string {
    return `${link.label}-${link.route ?? link.externalUrl ?? ''}`;
  }
}
