import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CatalogItem, CatalogService, CatalogSector } from '../../core/services/catalog.service';
import { FormatLabelPipe } from '../../shared/pipes/format-label.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pros-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatLabelPipe, RouterLink],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit {
  items: CatalogItem[] = [];
  sectors: CatalogSector[] = [];

  isLoading = true;
  hasError = false;

  searchTerm = '';
  selectedFormat = '';
  selectedSector = '';
  selectedItem: CatalogItem | null = null;

  constructor(private readonly catalogService: CatalogService) {}

  ngOnInit(): void {
    this.loadData();
  }

  get filteredItems(): CatalogItem[] {
    return this.items.filter(item => {
      if (this.selectedFormat && item.format !== this.selectedFormat) {
        return false;
      }
      if (this.selectedSector) {
        const normalizedSectors = (item.sectors || []).map(sector => sector.toString().toLowerCase());
        const match = normalizedSectors.includes(this.selectedSector.toLowerCase()) ||
          (this.selectedSector === 'global' && !normalizedSectors.length);
        if (!match) {
          return false;
        }
      }
      if (this.searchTerm) {
        const haystack = `${item.title} ${item.description}`.toLowerCase();
        if (!haystack.includes(this.searchTerm.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  selectFormat(format: string): void {
    this.selectedFormat = format;
  }

  selectSector(sector: string): void {
    this.selectedSector = sector;
  }

  clearSector(): void {
    this.selectedSector = '';
  }

  private loadData(): void {
    this.isLoading = true;
    this.hasError = false;

    this.catalogService.loadCatalog().subscribe({
      next: items => {
        this.items = items;
        this.isLoading = false;
      },
      error: error => {
        console.error('[Catalog] Falha ao carregar itens', error);
        this.hasError = true;
        this.isLoading = false;
      }
    });

    this.catalogService.loadSectors().subscribe({
      next: sectors => {
        const unique = this.ensureGlobalSector(sectors || []);
        this.sectors = unique;
      },
      error: () => {
        this.sectors = this.ensureGlobalSector([]);
      }
    });
  }

  private ensureGlobalSector(sectors: CatalogSector[]): CatalogSector[] {
    const list = [...sectors];
    if (!list.some(sector => sector.id === 'global')) {
      list.unshift({ id: 'global', name: 'Global' });
    }
    return list;
  }

  trackById(_: number, item: CatalogItem) {
    return item.id;
  }

  showDetails(item: CatalogItem) {
    this.selectedItem = item;
  }

  closeDetails() {
    this.selectedItem = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedItem) {
      this.closeDetails();
    }
  }
}
