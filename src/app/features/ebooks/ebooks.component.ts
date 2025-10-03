import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogItem, CatalogService } from '../../core/services/catalog.service';

@Component({
  selector: 'pros-ebooks',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ebooks.component.html',
  styleUrls: ['./ebooks.component.scss']
})
export class EbooksComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);

  ebooks: CatalogItem[] = [];
  isLoading = true;
  errorMessage = '';
  selectedEbook: CatalogItem | null = null;

  ngOnInit(): void {
    this.catalogService.loadCatalog().subscribe({
      next: items => {
        this.errorMessage = '';
        this.ebooks = items.filter(item => item.format === 'EBOOK');
        this.isLoading = false;
        if (!this.ebooks.length) {
          this.errorMessage = 'Nenhum e-book disponível no momento.';
        }
      },
      error: error => {
        this.errorMessage = error?.message ?? 'Não foi possível carregar os e-books.';
        this.isLoading = false;
      }
    });
  }

  trackById(_: number, item: CatalogItem) {
    return item.id;
  }

  showDetails(ebook: CatalogItem) {
    this.selectedEbook = ebook;
  }

  closeDetails() {
    this.selectedEbook = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedEbook) {
      this.closeDetails();
    }
  }
}
