import {
  AuthService,
  NoPreloading,
  ROUTER_CONFIGURATION,
  ROUTER_PROVIDERS,
  ROUTES,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterModule,
  RouterOutlet,
  afterNextNavigation,
  init_auth_service,
  init_router,
  init_router2,
  init_router_module,
  withPreloading
} from "./chunk-3D7PORAA.js";
import "./chunk-EIHBOTHX.js";
import {
  init_testing as init_testing2,
  provideLocationMocks
} from "./chunk-GMRRR2XI.js";
import {
  AsyncPipe,
  NgForOf,
  NgIf,
  init_common
} from "./chunk-OAVGZ6BQ.js";
import {
  Component,
  EventEmitter,
  FactoryTarget,
  Injectable,
  Input,
  NgModule,
  Output,
  TestBed,
  ViewChild,
  __decorate,
  core_exports,
  init_core,
  init_esm,
  init_operators,
  init_testing,
  init_tslib_es6,
  inject,
  map,
  of,
  signal,
  ɵɵngDeclareClassMetadata,
  ɵɵngDeclareComponent,
  ɵɵngDeclareFactory,
  ɵɵngDeclareInjectable,
  ɵɵngDeclareInjector,
  ɵɵngDeclareNgModule
} from "./chunk-F2G3574Q.js";
import {
  __async,
  __commonJS,
  __esm
} from "./chunk-TTULUY32.js";

// node_modules/@angular/router/fesm2022/testing.mjs
var RouterTestingModule, RootFixtureService, RootCmp, RouterTestingHarness;
var init_testing3 = __esm({
  "node_modules/@angular/router/fesm2022/testing.mjs"() {
    "use strict";
    init_core();
    init_core();
    init_testing();
    init_router2();
    init_router_module();
    init_testing2();
    RouterTestingModule = class _RouterTestingModule {
      static withRoutes(routes, config) {
        return {
          ngModule: _RouterTestingModule,
          providers: [
            { provide: ROUTES, multi: true, useValue: routes },
            { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} }
          ]
        };
      }
      static \u0275fac = \u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _RouterTestingModule, deps: [], target: FactoryTarget.NgModule });
      static \u0275mod = \u0275\u0275ngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.2", ngImport: core_exports, type: _RouterTestingModule, exports: [RouterModule] });
      static \u0275inj = \u0275\u0275ngDeclareInjector({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _RouterTestingModule, providers: [
        ROUTER_PROVIDERS,
        provideLocationMocks(),
        withPreloading(NoPreloading).\u0275providers,
        { provide: ROUTES, multi: true, useValue: [] }
      ], imports: [RouterModule] });
    };
    \u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: RouterTestingModule, decorators: [{
      type: NgModule,
      args: [{
        exports: [RouterModule],
        providers: [
          ROUTER_PROVIDERS,
          provideLocationMocks(),
          withPreloading(NoPreloading).\u0275providers,
          { provide: ROUTES, multi: true, useValue: [] }
        ]
      }]
    }] });
    RootFixtureService = class _RootFixtureService {
      fixture;
      harness;
      createHarness() {
        if (this.harness) {
          throw new Error("Only one harness should be created per test.");
        }
        this.harness = new RouterTestingHarness(this.getRootFixture());
        return this.harness;
      }
      getRootFixture() {
        if (this.fixture !== void 0) {
          return this.fixture;
        }
        this.fixture = TestBed.createComponent(RootCmp);
        this.fixture.detectChanges();
        return this.fixture;
      }
      static \u0275fac = \u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _RootFixtureService, deps: [], target: FactoryTarget.Injectable });
      static \u0275prov = \u0275\u0275ngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _RootFixtureService, providedIn: "root" });
    };
    \u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: RootFixtureService, decorators: [{
      type: Injectable,
      args: [{ providedIn: "root" }]
    }] });
    RootCmp = class _RootCmp {
      outlet;
      routerOutletData = signal(void 0, ...ngDevMode ? [{ debugName: "routerOutletData" }] : []);
      static \u0275fac = \u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _RootCmp, deps: [], target: FactoryTarget.Component });
      static \u0275cmp = \u0275\u0275ngDeclareComponent({ minVersion: "14.0.0", version: "20.3.2", type: _RootCmp, isStandalone: true, selector: "ng-component", viewQueries: [{ propertyName: "outlet", first: true, predicate: RouterOutlet, descendants: true }], ngImport: core_exports, template: '<router-outlet [routerOutletData]="routerOutletData()"></router-outlet>', isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name", "routerOutletData"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] });
    };
    \u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: RootCmp, decorators: [{
      type: Component,
      args: [{
        template: '<router-outlet [routerOutletData]="routerOutletData()"></router-outlet>',
        imports: [RouterOutlet]
      }]
    }], propDecorators: { outlet: [{
      type: ViewChild,
      args: [RouterOutlet]
    }] } });
    RouterTestingHarness = class {
      /**
       * Creates a `RouterTestingHarness` instance.
       *
       * The `RouterTestingHarness` also creates its own root component with a `RouterOutlet` for the
       * purposes of rendering route components.
       *
       * Throws an error if an instance has already been created.
       * Use of this harness also requires `destroyAfterEach: true` in the `ModuleTeardownOptions`
       *
       * @param initialUrl The target of navigation to trigger before returning the harness.
       */
      static create(initialUrl) {
        return __async(this, null, function* () {
          const harness = TestBed.inject(RootFixtureService).createHarness();
          if (initialUrl !== void 0) {
            yield harness.navigateByUrl(initialUrl);
          }
          return harness;
        });
      }
      /**
       * Fixture of the root component of the RouterTestingHarness
       */
      fixture;
      /** @internal */
      constructor(fixture) {
        this.fixture = fixture;
      }
      /** Instructs the root fixture to run change detection. */
      detectChanges() {
        this.fixture.detectChanges();
      }
      /** The `DebugElement` of the `RouterOutlet` component. `null` if the outlet is not activated. */
      get routeDebugElement() {
        const outlet = this.fixture.componentInstance.outlet;
        if (!outlet || !outlet.isActivated) {
          return null;
        }
        return this.fixture.debugElement.query((v) => v.componentInstance === outlet.component);
      }
      /** The native element of the `RouterOutlet` component. `null` if the outlet is not activated. */
      get routeNativeElement() {
        return this.routeDebugElement?.nativeElement ?? null;
      }
      navigateByUrl(url, requiredRoutedComponentType) {
        return __async(this, null, function* () {
          const router = TestBed.inject(Router);
          let resolveFn;
          const redirectTrackingPromise = new Promise((resolve) => {
            resolveFn = resolve;
          });
          afterNextNavigation(TestBed.inject(Router), resolveFn);
          yield router.navigateByUrl(url);
          yield redirectTrackingPromise;
          this.fixture.detectChanges();
          const outlet = this.fixture.componentInstance.outlet;
          if (outlet && outlet.isActivated && outlet.activatedRoute.component) {
            const activatedComponent = outlet.component;
            if (requiredRoutedComponentType !== void 0 && !(activatedComponent instanceof requiredRoutedComponentType)) {
              throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but got ${activatedComponent.constructor.name}`);
            }
            return activatedComponent;
          } else {
            if (requiredRoutedComponentType !== void 0) {
              throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but the navigation did not activate any component.`);
            }
            return null;
          }
        });
      }
    };
  }
});

// angular:jit:template:src\app\app.html
var app_default;
var init_app = __esm({
  "angular:jit:template:src\\app\\app.html"() {
    app_default = `<div class="app-shell">\r
  <pros-layout-header\r
    [navItems]="navItems"\r
    [isAuthenticated]="(isAuthenticated$ | async) ?? false"\r
  [userLabel]="(accountLabel$ | async) ?? 'Minha conta'"\r
    (accountClick)="onAccountClick()"\r
    (logout)="onLogout()"\r
  ></pros-layout-header>\r
\r
  <main class="app-content">\r
    <router-outlet />\r
  </main>\r
\r
  <pros-layout-footer\r
    brand="Prospera"\r
    [description]="footerDescription"\r
    [columns]="footerColumns"\r
    [socialLinks]="socialLinks"\r
    [copyright]="'\xA9 ' + currentYear + ' Prospera Treinamentos. Todos os direitos reservados.'"\r
  ></pros-layout-footer>\r
</div>\r
`;
  }
});

// angular:jit:style:src\app\app.scss
var app_default2;
var init_app2 = __esm({
  "angular:jit:style:src\\app\\app.scss"() {
    app_default2 = "/* src/app/app.scss */\n.app-shell {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n  background: var(--off-white);\n}\n.app-content {\n  flex: 1;\n  display: block;\n}\n.app-content > * {\n  display: block;\n}\n/*# sourceMappingURL=app.css.map */\n";
  }
});

// angular:jit:template:src\app\shared\components\layout\footer\footer.component.html
var footer_component_default;
var init_footer_component = __esm({
  "angular:jit:template:src\\app\\shared\\components\\layout\\footer\\footer.component.html"() {
    footer_component_default = `<footer class="footer">\r
  <div class="container">\r
    <div class="footer-content">\r
      <section class="footer-section footer-brand">\r
        <h3>{{ brand }}</h3>\r
        <p *ngIf="description">{{ description }}</p>\r
        <div class="social-links" *ngIf="socialLinks.length">\r
          <ng-container *ngFor="let link of socialLinks; trackBy: trackLink">\r
            <a\r
              *ngIf="link.externalUrl; else internalSocialLink"\r
              [href]="link.externalUrl"\r
              target="_blank"\r
              rel="noopener noreferrer"\r
              [attr.aria-label]="link.label"\r
            >\r
              <i class="{{ link.iconClass || 'fas fa-link' }}" aria-hidden="true"></i>\r
            </a>\r
            <ng-template #internalSocialLink>\r
              <a\r
                [routerLink]="link.route || '/'"\r
                [queryParams]="link.queryParams || null"\r
                [attr.aria-label]="link.label"\r
              >\r
                <i class="{{ link.iconClass || 'fas fa-link' }}" aria-hidden="true"></i>\r
              </a>\r
            </ng-template>\r
          </ng-container>\r
        </div>\r
      </section>\r
\r
      <section class="footer-section" *ngFor="let column of columns; trackBy: trackColumn">\r
        <h4>{{ column.title }}</h4>\r
        <ul>\r
          <li *ngFor="let link of column.links; trackBy: trackLink">\r
            <a\r
              *ngIf="link.externalUrl; else internalLink"\r
              [href]="link.externalUrl"\r
              target="_blank"\r
              rel="noopener noreferrer"\r
            >\r
              {{ link.label }}\r
            </a>\r
            <ng-template #internalLink>\r
              <a [routerLink]="link.route || '/'" [queryParams]="link.queryParams || null">\r
                {{ link.label }}\r
              </a>\r
            </ng-template>\r
          </li>\r
        </ul>\r
      </section>\r
    </div>\r
\r
    <div class="footer-bottom" *ngIf="copyright">\r
      <p>{{ copyright }}</p>\r
    </div>\r
  </div>\r
</footer>\r
`;
  }
});

// angular:jit:style:src\app\shared\components\layout\footer\footer.component.scss
var footer_component_default2;
var init_footer_component2 = __esm({
  "angular:jit:style:src\\app\\shared\\components\\layout\\footer\\footer.component.scss"() {
    footer_component_default2 = "/* src/app/shared/components/layout/footer/footer.component.scss */\n:host {\n  display: block;\n}\n.footer {\n  background-color: var(--verde-escuro);\n  color: var(--white);\n  padding: var(--spacing-xxl) 0 var(--spacing-lg);\n}\n.footer-content {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: var(--spacing-xl);\n  margin-bottom: var(--spacing-xl);\n}\n.footer-section h3,\n.footer-section h4 {\n  color: var(--white);\n  margin-bottom: var(--spacing-md);\n}\n.footer-section p {\n  color: rgba(255, 255, 255, 0.85);\n  margin-bottom: var(--spacing-md);\n}\n.footer-section ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.footer-section ul li {\n  margin-bottom: var(--spacing-xs);\n}\n.footer-section ul li a {\n  color: rgba(255, 255, 255, 0.85);\n  text-decoration: none;\n  transition: color var(--transition-fast);\n}\n.footer-section ul li a:hover {\n  color: var(--verde-claro);\n}\n.footer-bottom {\n  border-top: 1px solid rgba(255, 255, 255, 0.12);\n  padding-top: var(--spacing-lg);\n  text-align: center;\n}\n.footer-bottom p {\n  color: rgba(255, 255, 255, 0.7);\n  margin: 0;\n}\n.social-links {\n  display: flex;\n  align-items: center;\n  gap: var(--spacing-sm);\n}\n.social-links a {\n  color: inherit;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  border: 1px solid rgba(255, 255, 255, 0.15);\n  transition: background var(--transition-fast), border var(--transition-fast);\n}\n.social-links a:hover {\n  background: rgba(255, 255, 255, 0.12);\n  border-color: rgba(255, 255, 255, 0.25);\n}\n/*# sourceMappingURL=footer.component.css.map */\n";
  }
});

// src/app/shared/components/layout/footer/footer.component.ts
var FooterComponent;
var init_footer_component3 = __esm({
  "src/app/shared/components/layout/footer/footer.component.ts"() {
    "use strict";
    init_tslib_es6();
    init_footer_component();
    init_footer_component2();
    init_core();
    init_common();
    init_router();
    FooterComponent = class FooterComponent2 {
      columns = [];
      socialLinks = [];
      description = "";
      brand = "Prospera";
      copyright = "";
      trackColumn(_, column) {
        return column.title;
      }
      trackLink(_, link) {
        return `${link.label}-${link.route ?? link.externalUrl ?? ""}`;
      }
      static propDecorators = {
        columns: [{ type: Input, args: [{ required: true }] }],
        socialLinks: [{ type: Input }],
        description: [{ type: Input }],
        brand: [{ type: Input }],
        copyright: [{ type: Input }]
      };
    };
    FooterComponent = __decorate([
      Component({
        selector: "pros-layout-footer",
        standalone: true,
        imports: [NgForOf, NgIf, RouterLink],
        template: footer_component_default,
        styles: [footer_component_default2]
      })
    ], FooterComponent);
  }
});

// angular:jit:template:src\app\shared\components\layout\header\header.component.html
var header_component_default;
var init_header_component = __esm({
  "angular:jit:template:src\\app\\shared\\components\\layout\\header\\header.component.html"() {
    header_component_default = `<header class="header">\r
  <div class="container">\r
    <div class="nav-brand">\r
      <a class="brand-link" routerLink="/" aria-label="Prospera">\r
        <img src="assets/images/logo-prospera.png" alt="Prospera" class="site-logo" />\r
      </a>\r
    </div>\r
    <nav class="nav-menu" aria-label="Navega\xE7\xE3o principal">\r
      <a\r
        *ngFor="let item of navItems; trackBy: trackByLabel"\r
        class="nav-link"\r
        routerLink="{{ item.route }}"\r
        routerLinkActive="active"\r
        [routerLinkActiveOptions]="{ exact: item.exact ?? true }"\r
      >\r
        {{ item.label }}\r
      </a>\r
    </nav>\r
    <div class="nav-actions" *ngIf="showAccount">\r
      <ng-container *ngIf="!isAuthenticated; else accountMenu">\r
        <button type="button" class="btn-icon" (click)="accountClick.emit()">\r
          <i class="fas fa-user" aria-hidden="true"></i>\r
          <span>Entrar</span>\r
        </button>\r
      </ng-container>\r
      <ng-template #accountMenu>\r
        <div class="account-actions">\r
          <button type="button" class="btn-icon" (click)="accountClick.emit()">\r
            <i class="fas fa-user-circle" aria-hidden="true"></i>\r
            <span>{{ userLabel || 'Minha conta' }}</span>\r
          </button>\r
          <button type="button" class="btn-icon btn-logout" (click)="logout.emit()">\r
            <i class="fas fa-right-from-bracket" aria-hidden="true"></i>\r
            <span>Sair</span>\r
          </button>\r
        </div>\r
      </ng-template>\r
    </div>\r
  </div>\r
</header>\r
`;
  }
});

// angular:jit:style:src\app\shared\components\layout\header\header.component.scss
var header_component_default2;
var init_header_component2 = __esm({
  "angular:jit:style:src\\app\\shared\\components\\layout\\header\\header.component.scss"() {
    header_component_default2 = "/* src/app/shared/components/layout/header/header.component.scss */\n:host {\n  display: block;\n}\n.header {\n  position: sticky;\n  top: 0;\n  z-index: 1000;\n  background-color: var(--white);\n  box-shadow: var(--shadow-sm);\n}\n.header .container {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--spacing-sm) var(--spacing-md);\n  gap: var(--spacing-md);\n}\n.nav-brand .site-logo {\n  max-width: 220px;\n  width: 100%;\n  height: auto;\n  display: block;\n}\n.nav-menu {\n  display: flex;\n  gap: var(--spacing-lg);\n  align-items: center;\n}\n.nav-link {\n  color: var(--gray-dark);\n  text-decoration: none;\n  font-weight: 500;\n  padding: var(--spacing-xs) 0;\n  border-bottom: 2px solid transparent;\n  transition: all var(--transition-fast);\n}\n.nav-link:hover,\n.nav-link.active {\n  color: var(--verde-escuro);\n  border-bottom-color: var(--verde-claro);\n}\n.nav-actions {\n  display: flex;\n  align-items: center;\n  gap: var(--spacing-sm);\n}\n.account-actions {\n  display: flex;\n  align-items: center;\n  gap: var(--spacing-xs);\n}\n.account-actions .btn-icon {\n  background: var(--off-white);\n  border: 1px solid transparent;\n}\n.account-actions .btn-icon:hover,\n.account-actions .btn-icon:focus-visible {\n  border-color: var(--verde-escuro);\n}\n.account-actions .btn-logout {\n  background: transparent;\n  color: var(--gray-medium);\n}\n.account-actions .btn-logout:hover {\n  color: var(--coral);\n}\n@media (max-width: 820px) {\n  .header .container {\n    flex-direction: column;\n    align-items: stretch;\n  }\n  .nav-menu {\n    width: 100%;\n    flex-wrap: wrap;\n    justify-content: center;\n    gap: var(--spacing-md);\n  }\n  .nav-actions {\n    justify-content: center;\n  }\n}\n@media (max-width: 720px) {\n  .nav-brand .site-logo {\n    max-width: 160px;\n    margin: 0 auto;\n  }\n}\n/*# sourceMappingURL=header.component.css.map */\n";
  }
});

// src/app/shared/components/layout/header/header.component.ts
var HeaderComponent;
var init_header_component3 = __esm({
  "src/app/shared/components/layout/header/header.component.ts"() {
    "use strict";
    init_tslib_es6();
    init_header_component();
    init_header_component2();
    init_core();
    init_common();
    init_router();
    HeaderComponent = class HeaderComponent2 {
      navItems = [];
      showAccount = true;
      isAuthenticated = false;
      userLabel = "Conta";
      accountClick = new EventEmitter();
      logout = new EventEmitter();
      trackByLabel(_, item) {
        return item.label;
      }
      static propDecorators = {
        navItems: [{ type: Input, args: [{ required: true }] }],
        showAccount: [{ type: Input }],
        isAuthenticated: [{ type: Input }],
        userLabel: [{ type: Input }],
        accountClick: [{ type: Output }],
        logout: [{ type: Output }]
      };
    };
    HeaderComponent = __decorate([
      Component({
        selector: "pros-layout-header",
        standalone: true,
        imports: [NgForOf, NgIf, RouterLink, RouterLinkActive],
        template: header_component_default,
        styles: [header_component_default2]
      })
    ], HeaderComponent);
  }
});

// src/app/app.ts
var App;
var init_app3 = __esm({
  "src/app/app.ts"() {
    "use strict";
    init_tslib_es6();
    init_app();
    init_app2();
    init_common();
    init_core();
    init_router();
    init_operators();
    init_auth_service();
    init_footer_component3();
    init_header_component3();
    App = class App2 {
      router = inject(Router);
      authService = inject(AuthService);
      navItems = [
        { label: "In\xEDcio", route: "/" },
        { label: "Cat\xE1logo", route: "/catalogo" },
        { label: "Planos", route: "/planos" },
        { label: "Organiza\xE7\xF5es", route: "/organizacoes" },
        { label: "Contato", route: "/contato" },
        { label: "Suporte", route: "/suporte" },
        { label: "FAQ", route: "/faq" }
      ];
      isAuthenticated$ = this.authService.isAuthenticated$;
      user$ = this.authService.user$;
      accountLabel$ = this.user$.pipe(map((user) => {
        if (!user) {
          return "Minha conta";
        }
        const [primary] = [user.name, user.fullName, user.email].map((value) => typeof value === "string" ? value.trim() : "").filter((value) => !!value);
        return primary || "Minha conta";
      }));
      footerDescription = "Plataforma integrada para desenvolver talentos, promover bem-estar e garantir conformidade nas organiza\xE7\xF5es.";
      footerColumns = [
        {
          title: "Plataforma",
          links: [
            { label: "Como funciona", route: "/sobre" },
            { label: "Cat\xE1logo de treinamentos", route: "/catalogo" },
            { label: "E-books e materiais", route: "/ebooks" }
          ]
        },
        {
          title: "Recursos",
          links: [
            { label: "Calend\xE1rio de eventos", route: "/agenda" },
            { label: "Central de suporte", route: "/suporte" },
            { label: "Perguntas frequentes", route: "/faq" }
          ]
        },
        {
          title: "Institucional",
          links: [
            { label: "Sobre a Prospera", route: "/sobre" },
            { label: "Pol\xEDticas e LGPD", route: "/politicas" },
            { label: "Fale conosco", route: "/contato" }
          ]
        }
      ];
      socialLinks = [
        { label: "LinkedIn", externalUrl: "https://linkedin.com", iconClass: "fab fa-linkedin-in" },
        { label: "Instagram", externalUrl: "https://instagram.com", iconClass: "fab fa-instagram" },
        { label: "YouTube", externalUrl: "https://youtube.com", iconClass: "fab fa-youtube" }
      ];
      currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      onAccountClick() {
        if (this.authService.isAuthenticated()) {
          this.router.navigate(["/conta"]);
        } else {
          this.router.navigate(["/entrar"]);
        }
      }
      onLogout() {
        this.authService.logout();
      }
    };
    App = __decorate([
      Component({
        selector: "app-root",
        standalone: true,
        imports: [RouterOutlet, HeaderComponent, FooterComponent, AsyncPipe],
        template: app_default,
        styles: [app_default2]
      })
    ], App);
  }
});

// src/app/app.spec.ts
var require_app_spec = __commonJS({
  "src/app/app.spec.ts"(exports) {
    init_testing();
    init_testing3();
    init_esm();
    init_app3();
    init_auth_service();
    var AuthServiceStub = class {
      user$ = of(null);
      isAuthenticated$ = of(false);
      isAuthenticated() {
        return false;
      }
      logout() {
      }
    };
    describe("App", () => {
      beforeEach(() => __async(null, null, function* () {
        yield TestBed.configureTestingModule({
          imports: [App, RouterTestingModule],
          providers: [{ provide: AuthService, useClass: AuthServiceStub }]
        }).compileComponents();
      }));
      it("should create the app", () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
      });
      it("should render header navigation", () => {
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        const compiled = fixture.nativeElement;
        const navLabels = Array.from(compiled.querySelectorAll("header nav a")).map((link) => link.textContent?.trim());
        expect(navLabels).toContain("Cat\xE1logo");
      });
    });
  }
});
export default require_app_spec();
/*! Bundled license information:

@angular/router/fesm2022/testing.mjs:
  (**
   * @license Angular v20.3.2
   * (c) 2010-2025 Google LLC. https://angular.io/
   * License: MIT
   *)
*/
//# sourceMappingURL=spec-app.spec.js.map
