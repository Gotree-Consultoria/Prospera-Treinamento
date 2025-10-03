import {
  AuthService,
  Router,
  init_auth_service,
  init_router
} from "./chunk-3D7PORAA.js";
import {
  ApiService,
  init_api_service
} from "./chunk-EIHBOTHX.js";
import "./chunk-OAVGZ6BQ.js";
import {
  TestBed,
  filter,
  firstValueFrom,
  init_esm,
  init_operators,
  init_testing,
  of,
  take,
  throwError
} from "./chunk-F2G3574Q.js";
import {
  __async,
  __commonJS
} from "./chunk-TTULUY32.js";

// src/app/core/services/auth.service.spec.ts
var require_auth_service_spec = __commonJS({
  "src/app/core/services/auth.service.spec.ts"(exports) {
    init_testing();
    init_router();
    init_esm();
    init_operators();
    init_api_service();
    init_auth_service();
    describe("AuthService", () => {
      let service;
      let apiService;
      let router;
      beforeEach(() => {
        apiService = jasmine.createSpyObj("ApiService", ["get", "post", "patch"]);
        router = jasmine.createSpyObj("Router", ["navigate"]);
        window.localStorage.clear();
        TestBed.configureTestingModule({
          providers: [
            AuthService,
            { provide: ApiService, useValue: apiService },
            { provide: Router, useValue: router }
          ]
        });
        service = TestBed.inject(AuthService);
      });
      afterEach(() => {
        window.localStorage.clear();
      });
      it("persiste token e emite usu\xE1rio quando login retorna perfil", () => __async(null, null, function* () {
        const profile = { id: "1", email: "ana@empresa.com", name: "Ana" };
        apiService.post.and.returnValue(of({ token: "jwt-token", profile }));
        const result = yield firstValueFrom(service.login({ email: "ana@empresa.com", password: "123456" }));
        expect(result.email).toBe("ana@empresa.com");
        expect(apiService.post).toHaveBeenCalledWith("/auth/login", { email: "ana@empresa.com", password: "123456" }, { withCredentials: true });
        expect(window.localStorage.getItem("jwtToken")).toBe("jwt-token");
        const emitted = yield firstValueFrom(service.user$.pipe(filter(Boolean), take(1)));
        expect(emitted?.name).toBe("Ana");
      }));
      it("faz logout limpando sess\xE3o e redirecionando para /entrar", () => __async(null, null, function* () {
        apiService.post.and.returnValue(of({ token: "token", profile: { email: "ana@empresa.com" } }));
        yield firstValueFrom(service.login({ email: "ana@empresa.com", password: "123456" }));
        const removeSpy = spyOn(window.localStorage, "removeItem").and.callThrough();
        service.logout();
        expect(removeSpy).toHaveBeenCalledWith("jwtToken");
        expect(router.navigate).toHaveBeenCalledWith(["/entrar"]);
        expect(service.isAuthenticated()).toBeFalse();
      }));
      it("falha ao buscar perfil quando n\xE3o h\xE1 token", () => __async(null, null, function* () {
        yield expectAsync(firstValueFrom(service.fetchProfile())).toBeRejectedWithError("Token ausente.");
        expect(router.navigate).not.toHaveBeenCalled();
      }));
      it("limpa sess\xE3o e navega ao falhar em buscar perfil com token", () => __async(null, null, function* () {
        window.localStorage.setItem("jwtToken", "token");
        apiService.get.and.returnValue(throwError(() => new Error("fail")));
        yield expectAsync(firstValueFrom(service.fetchProfile())).toBeRejected();
        expect(router.navigate).toHaveBeenCalledWith(["/entrar"]);
        expect(window.localStorage.getItem("jwtToken")).toBeNull();
      }));
      it("atualiza perfil preservando e-mail armazenado", () => __async(null, null, function* () {
        const profile = { id: "1", email: "ana@empresa.com", name: "Ana" };
        apiService.post.and.returnValue(of({ token: "token", profile }));
        yield firstValueFrom(service.login({ email: "ana@empresa.com", password: "123456" }));
        apiService.patch.and.returnValue(of({ id: "1", name: "Ana Carolina" }));
        const updated = yield firstValueFrom(service.updateProfile({ name: "Ana Carolina" }));
        expect(updated.name).toBe("Ana Carolina");
        const latest = yield firstValueFrom(service.user$.pipe(take(1)));
        expect(latest?.email).toBe("ana@empresa.com");
        expect(latest?.name).toBe("Ana Carolina");
      }));
    });
  }
});
export default require_auth_service_spec();
//# sourceMappingURL=spec-auth.service.spec.js.map
