import {
  ApiService,
  init_api_service
} from "./chunk-EIHBOTHX.js";
import {
  Injectable,
  TestBed,
  __decorate,
  catchError,
  defaultIfEmpty,
  filter,
  forkJoin,
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
} from "./chunk-F2G3574Q.js";
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
  loadCatalog() {
    return forkJoin([
      this.fetchProducts(),
      this.fetchPackages(),
      this.fetchPublicCatalog("EBOOK")
    ]).pipe(map(([products, packages, publicEbooks]) => {
      const merged = [...products, ...packages, ...publicEbooks];
      const mapById = /* @__PURE__ */ new Map();
      for (const item of merged) {
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
    }));
  }
  loadPackages() {
    return this.fetchPackages().pipe(catchError((error) => {
      console.warn("[CatalogService] falha ao carregar pacotes, usando fallback.", error);
      return of(this.buildPackageFallbacks());
    }));
  }
  loadEbooks() {
    return this.fetchPublicCatalog("EBOOK").pipe(catchError((error) => {
      console.warn("[CatalogService] falha ao carregar e-books, usando fallback.", error);
      return of(this.buildEbookFallbacks());
    }));
  }
  loadSectors() {
    const endpoints = ["/api/public/catalog/sectors", "/public/catalog/sectors"];
    return from(endpoints).pipe(switchMap((endpoint) => this.api.get(endpoint).pipe(map((response) => {
      const list = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : Array.isArray(response?.data) ? response.data : [];
      return list.filter(Boolean).map((item) => this.normalizeSector(item));
    }), catchError(() => of([])))), filter((sectors) => sectors.length > 0), take(1), defaultIfEmpty([]));
  }
  fetchProducts() {
    return this.api.get("/api/products").pipe(map((products) => Array.isArray(products) ? products : []), map((products) => products.map((product) => this.toCatalogItem(product, "EBOOK", product.coverImageUrl ?? product.imageUrl ?? null))));
  }
  fetchPackages() {
    return this.api.get("/api/packages").pipe(map((packages) => Array.isArray(packages) ? packages : []), map((packages) => packages.map((pkg) => this.toCatalogItem(pkg, "PACKAGE", pkg.coverImageUrl ?? pkg.imageUrl ?? null))));
  }
  fetchPublicCatalog(type) {
    return this.api.get(`/public/catalog?type=${type}`).pipe(map((data) => {
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
      return list.map((item) => this.toCatalogItem(item, type, item.coverImageUrl ?? item.imageUrl ?? null));
    }));
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
  buildPackageFallbacks() {
    return [
      {
        id: "pkg-leadership-sst",
        title: "Programa de Lideran\xE7a em SST",
        description: "Sequ\xEAncia completa de workshops e materiais focados em fortalecer a cultura de seguran\xE7a ocupacional nas organiza\xE7\xF5es.",
        format: "PACKAGE",
        sectors: ["global"]
      },
      {
        id: "pkg-onboarding",
        title: "Onboarding de Seguran\xE7a para Novos Colaboradores",
        description: "Trilha guiada com v\xEDdeos, checklists e avalia\xE7\xF5es r\xE1pidas para integrar novas pessoas aos protocolos de SST.",
        format: "PACKAGE",
        sectors: ["industria", "servicos"]
      },
      {
        id: "pkg-bem-estar",
        title: "Jornada de Bem-estar & Ergonomia",
        description: "Planos mensais com conte\xFAdos multim\xEDdia para reduzir afastamentos, prevenir les\xF5es e promover h\xE1bitos saud\xE1veis.",
        format: "PACKAGE",
        sectors: ["saude", "global"]
      }
    ];
  }
  buildEbookFallbacks() {
    return [
      {
        id: "ebook-ergonomia-escritorio",
        title: "Ergonomia Essencial para Escrit\xF3rios",
        description: "Guia pr\xE1tico com orienta\xE7\xF5es, exerc\xEDcios e checklists para organizar postos de trabalho e reduzir les\xF5es.",
        format: "EBOOK",
        sectors: ["administrativo", "global"]
      },
      {
        id: "ebook-gestao-riscos",
        title: "Gest\xE3o de Riscos Ocupacionais Simplificada",
        description: "Material base para implementar programas de preven\xE7\xE3o com linguagem acess\xEDvel e modelos edit\xE1veis.",
        format: "EBOOK",
        sectors: ["industria", "servicos"]
      },
      {
        id: "ebook-bem-estar",
        title: "Bem-estar Mental no Trabalho",
        description: "Conte\xFAdo curado com pr\xE1ticas de acolhimento e pol\xEDticas para cuidar da sa\xFAde emocional das equipes.",
        format: "EBOOK",
        sectors: ["recursos-humanos", "global"]
      }
    ];
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
    const responses = {
      "/api/products": [{ id: 1, title: "E-book", description: "A", format: "EBOOK" }],
      "/api/packages": [{ id: 1, title: "Combo SST", description: "B", format: "PACKAGE" }],
      "/public/catalog?type=EBOOK": { items: [{ id: 2, title: "Checklist", description: "C", type: "EBOOK" }] }
    };
    apiService.get.and.callFake((path) => {
      const payload = responses[path] ?? [];
      return of(payload);
    });
    service.loadCatalog().subscribe((items) => {
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.some((item) => item.format === "PACKAGE")).toBeTrue();
      expect(items.some((item) => item.format === "EBOOK" && item.id === "1")).toBeTrue();
      expect(items.some((item) => item.format === "EBOOK" && item.id !== "1")).toBeTrue();
      done();
    });
  });
  it("fornece fallback quando loadPackages falha", (done) => {
    apiService.get.and.returnValue(throwError(() => new Error("fail")));
    service.loadPackages().subscribe((items) => {
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.format === "PACKAGE")).toBeTrue();
      done();
    });
  });
  it("fornece fallback quando loadEbooks falha", (done) => {
    apiService.get.and.returnValue(throwError(() => new Error("fail")));
    service.loadEbooks().subscribe((items) => {
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.format === "EBOOK")).toBeTrue();
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
