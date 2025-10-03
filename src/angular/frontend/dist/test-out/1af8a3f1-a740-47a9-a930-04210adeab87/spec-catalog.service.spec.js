import {
  ApiService,
  init_api_service
} from "./chunk-45ZO4KFT.js";
import {
  Injectable,
  TestBed,
  __decorate,
  catchError,
  defaultIfEmpty,
  filter,
  from,
  init_core,
  init_esm,
  init_testing,
  init_tslib_es6,
  map,
  of,
  switchMap,
  take,
  throwError
} from "./chunk-6BWBHJC6.js";
import "./chunk-TTULUY32.js";

// src/app/core/services/catalog.service.spec.ts
init_testing();
init_esm();
init_api_service();

// src/app/core/services/catalog.service.ts
init_tslib_es6();
init_core();
init_esm();
init_api_service();
var CatalogService = class CatalogService2 {
  api;
  constructor(api) {
    this.api = api;
  }
  /**
   * Lista todo o catálogo público usando o endpoint único /public/catalog (resumido).
   * Fallback: se falhar, recorre ao modelo antigo (products + packages + ebooks).
   */
  loadCatalog() {
    const fallback$ = of([]);
    return this.fetchPublicCatalogAll().pipe(map((items) => this.mergeDistinct(items)), catchError((err) => {
      console.warn("[CatalogService] falha em /public/catalog, aplicando fallback composto.", err);
      return fallback$;
    }));
  }
  // Métodos legados de pacotes/planos foram removidos após adoção de /public/catalog.
  // loadEbooks() removido (catálogo consolidado). Manter fallback se necessário em outro serviço especializado.
  loadSectors() {
    const endpoints = ["/api/public/catalog/sectors", "/public/catalog/sectors"];
    return from(endpoints).pipe(switchMap((endpoint) => this.api.get(endpoint).pipe(map((response) => {
      const list = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : Array.isArray(response?.data) ? response.data : [];
      return list.filter(Boolean).map((item) => this.normalizeSector(item));
    }), catchError(() => of([])))), filter((sectors) => sectors.length > 0), take(1), defaultIfEmpty([]));
  }
  // fetchProducts / fetchPackages removidos (consolidados em catálogo público).
  /**
   * Tenta buscar planos em endpoints públicos, retornando assim que um deles responder com dados.
   */
  // fetchPlans removido – planos agora fazem parte do catálogo público.
  // fetchPublicCatalog por tipo removido – endpoint único cobre todos os formatos.
  /**
   * Busca catálogo completo resumido (todos os formatos) sem filtro de tipo.
   */
  fetchPublicCatalogAll() {
    return this.api.get("/public/catalog").pipe(map((data) => {
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
      return list.map((item) => this.toCatalogItem(item, this.normalizeFormat(item?.format ?? item?.type ?? item?.trainingType) ?? "EBOOK", item.coverImageUrl ?? item.imageUrl ?? null));
    }));
  }
  /**
   * Faz merge garantindo unicidade por (format::id) e mantém descrição mais longa.
   */
  mergeDistinct(items) {
    const mapById = /* @__PURE__ */ new Map();
    for (const item of items) {
      const key = `${item.format}::${item.id}`;
      if (!mapById.has(key)) {
        mapById.set(key, item);
      } else {
        const existing = mapById.get(key);
        if ((item.description?.length ?? 0) > (existing.description?.length ?? 0)) {
          mapById.set(key, item);
        }
      }
    }
    return Array.from(mapById.values());
  }
  toCatalogItem(raw, fallbackFormat, cover) {
    const sectors = Array.isArray(raw?.sectors) ? raw.sectors : Array.isArray(raw?.assignedSectors) ? raw.assignedSectors : ["global"];
    return {
      id: String(raw?.id ?? raw?.uuid ?? raw?.code ?? `item-${Math.random().toString(36).slice(2, 9)}`),
      title: raw?.title ?? raw?.name ?? "Item",
      description: raw?.description ?? raw?.shortDescription ?? "",
      format: this.normalizeFormat(raw?.format ?? raw?.type ?? raw?.trainingType) ?? fallbackFormat,
      sectors: sectors.map((sector) => typeof sector === "string" ? sector : sector?.id ?? sector?.code ?? "global"),
      coverImageUrl: cover || void 0,
      data: raw
    };
  }
  normalizeFormat(value) {
    if (!value) {
      return null;
    }
    const normalized = value.toUpperCase();
    if (normalized.includes("EBOOK")) {
      return "EBOOK";
    }
    if (normalized.includes("RECORDED") || normalized.includes("GRAV")) {
      return "RECORDED_COURSE";
    }
    if (normalized.includes("LIVE") || normalized.includes("AO_VIVO")) {
      return "LIVE_TRAINING";
    }
    if (normalized.includes("PACKAGE")) {
      return "PACKAGE";
    }
    return null;
  }
  normalizeSector(sector) {
    return {
      id: String(sector?.id ?? sector?.uuid ?? sector?.code ?? sector?.slug ?? "global"),
      name: sector?.name ?? sector?.title ?? sector?.label ?? "Setor"
    };
  }
  static ctorParameters = () => [
    { type: ApiService }
  ];
};
CatalogService = __decorate([
  Injectable({ providedIn: "root" })
], CatalogService);

// src/app/core/services/catalog.service.spec.ts
describe("CatalogService", () => {
  let service;
  let apiService;
  beforeEach(() => {
    apiService = jasmine.createSpyObj("ApiService", ["get"]);
    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        { provide: ApiService, useValue: apiService }
      ]
    });
    service = TestBed.inject(CatalogService);
  });
  it("combina produtos, pacotes e cat\xE1logo p\xFAblico sem duplicar itens", (done) => {
    const payload = [
      { id: 1, title: "E-book", description: "curta", format: "EBOOK" },
      { id: 1, title: "E-book", description: "descri\xE7\xE3o mais longa que deve prevalecer", format: "EBOOK" },
      { id: 2, title: "Combo SST", description: "Combo", type: "PACKAGE" }
    ];
    apiService.get.and.callFake((path) => {
      if (path === "/public/catalog")
        return of(payload);
      return of([]);
    });
    service.loadCatalog().subscribe((items) => {
      expect(items.length).toBe(2);
      expect(items.some((item) => item.format === "PACKAGE")).toBeTrue();
      expect(items.some((item) => item.format === "EBOOK" && item.id === "1")).toBeTrue();
      const ebook = items.find((i) => i.format === "EBOOK" && i.id === "1");
      expect(ebook.description).toContain("mais longa");
      done();
    });
  });
  it("retorna fallback (vazio) quando /public/catalog falha", (done) => {
    apiService.get.and.returnValue(throwError(() => new Error("fail")));
    service.loadCatalog().subscribe((items) => {
      expect(Array.isArray(items)).toBeTrue();
      expect(items.length).toBe(0);
      done();
    });
  });
  it("carrega setores usando o primeiro endpoint bem-sucedido", (done) => {
    apiService.get.and.callFake((path) => {
      if (path === "/api/public/catalog/sectors") {
        return throwError(() => new Error("offline"));
      }
      if (path === "/public/catalog/sectors") {
        return of({ items: [{ id: "ind", name: "Ind\xFAstria" }] });
      }
      return of([]);
    });
    service.loadSectors().subscribe((sectors) => {
      expect(sectors.length).toBe(1);
      const [sector] = sectors;
      expect(sector.id).toBe("ind");
      expect(sector.name).toBe("Ind\xFAstria");
      done();
    });
  });
});
//# sourceMappingURL=spec-catalog.service.spec.js.map
