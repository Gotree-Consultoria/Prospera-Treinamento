import {
  ApiService,
  HttpBackend,
  HttpClient,
  HttpClientModule,
  HttpErrorResponse,
  HttpEventType,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpStatusCode,
  REQUESTS_CONTRIBUTE_TO_STABILITY,
  init_api_service,
  init_http,
  init_module
} from "./chunk-45ZO4KFT.js";
import {
  FactoryTarget,
  Injectable,
  NgModule,
  Observable,
  TestBed,
  __decorate,
  catchError,
  core_exports,
  filter,
  init_core,
  init_esm,
  init_testing,
  init_tslib_es6,
  map,
  of,
  throwError,
  ɵɵngDeclareClassMetadata,
  ɵɵngDeclareFactory,
  ɵɵngDeclareInjectable,
  ɵɵngDeclareInjector,
  ɵɵngDeclareNgModule
} from "./chunk-6BWBHJC6.js";
import {
  __spreadValues
} from "./chunk-TTULUY32.js";

// node_modules/@angular/common/fesm2022/http/testing.mjs
init_core();
init_core();
init_esm();
init_module();
var HttpTestingController = class {
};
var TestRequest = class {
  request;
  observer;
  /**
   * Whether the request was cancelled after it was sent.
   */
  get cancelled() {
    return this._cancelled;
  }
  /**
   * @internal set by `HttpClientTestingBackend`
   */
  _cancelled = false;
  constructor(request, observer) {
    this.request = request;
    this.observer = observer;
  }
  /**
   * Resolve the request by returning a body plus additional HTTP information (such as response
   * headers) if provided.
   * If the request specifies an expected body type, the body is converted into the requested type.
   * Otherwise, the body is converted to `JSON` by default.
   *
   * Both successful and unsuccessful responses can be delivered via `flush()`.
   */
  flush(body, opts = {}) {
    if (this.cancelled) {
      throw new Error(`Cannot flush a cancelled request.`);
    }
    const url = this.request.urlWithParams;
    const headers = opts.headers instanceof HttpHeaders ? opts.headers : new HttpHeaders(opts.headers);
    body = _maybeConvertBody(this.request.responseType, body);
    let statusText = opts.statusText;
    let status = opts.status !== void 0 ? opts.status : HttpStatusCode.Ok;
    if (opts.status === void 0) {
      if (body === null) {
        status = HttpStatusCode.NoContent;
        statusText ||= "No Content";
      } else {
        statusText ||= "OK";
      }
    }
    if (statusText === void 0) {
      throw new Error("statusText is required when setting a custom status.");
    }
    if (status >= 200 && status < 300) {
      this.observer.next(new HttpResponse({ body, headers, status, statusText, url }));
      this.observer.complete();
    } else {
      this.observer.error(new HttpErrorResponse({ error: body, headers, status, statusText, url }));
    }
  }
  error(error, opts = {}) {
    if (this.cancelled) {
      throw new Error(`Cannot return an error for a cancelled request.`);
    }
    const headers = opts.headers instanceof HttpHeaders ? opts.headers : new HttpHeaders(opts.headers);
    this.observer.error(new HttpErrorResponse({
      error,
      headers,
      status: opts.status || 0,
      statusText: opts.statusText || "",
      url: this.request.urlWithParams
    }));
  }
  /**
   * Deliver an arbitrary `HttpEvent` (such as a progress event) on the response stream for this
   * request.
   */
  event(event) {
    if (this.cancelled) {
      throw new Error(`Cannot send events to a cancelled request.`);
    }
    this.observer.next(event);
  }
};
function _toArrayBufferBody(body) {
  if (typeof ArrayBuffer === "undefined") {
    throw new Error("ArrayBuffer responses are not supported on this platform.");
  }
  if (body instanceof ArrayBuffer) {
    return body;
  }
  throw new Error("Automatic conversion to ArrayBuffer is not supported for response type.");
}
function _toBlob(body) {
  if (typeof Blob === "undefined") {
    throw new Error("Blob responses are not supported on this platform.");
  }
  if (body instanceof Blob) {
    return body;
  }
  if (ArrayBuffer && body instanceof ArrayBuffer) {
    return new Blob([body]);
  }
  throw new Error("Automatic conversion to Blob is not supported for response type.");
}
function _toJsonBody(body, format = "JSON") {
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
    throw new Error(`Automatic conversion to ${format} is not supported for ArrayBuffers.`);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    throw new Error(`Automatic conversion to ${format} is not supported for Blobs.`);
  }
  if (typeof body === "string" || typeof body === "number" || typeof body === "object" || typeof body === "boolean" || Array.isArray(body)) {
    return body;
  }
  throw new Error(`Automatic conversion to ${format} is not supported for response type.`);
}
function _toTextBody(body) {
  if (typeof body === "string") {
    return body;
  }
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
    throw new Error("Automatic conversion to text is not supported for ArrayBuffers.");
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    throw new Error("Automatic conversion to text is not supported for Blobs.");
  }
  return JSON.stringify(_toJsonBody(body, "text"));
}
function _maybeConvertBody(responseType, body) {
  if (body === null) {
    return null;
  }
  switch (responseType) {
    case "arraybuffer":
      return _toArrayBufferBody(body);
    case "blob":
      return _toBlob(body);
    case "json":
      return _toJsonBody(body);
    case "text":
      return _toTextBody(body);
    default:
      throw new Error(`Unsupported responseType: ${responseType}`);
  }
}
var HttpClientTestingBackend = class _HttpClientTestingBackend {
  /**
   * List of pending requests which have not yet been expected.
   */
  open = [];
  /**
   * Used when checking if we need to throw the NOT_USING_FETCH_BACKEND_IN_SSR error
   */
  isTestingBackend = true;
  /**
   * Handle an incoming request by queueing it in the list of open requests.
   */
  handle(req) {
    return new Observable((observer) => {
      const testReq = new TestRequest(req, observer);
      this.open.push(testReq);
      observer.next({ type: HttpEventType.Sent });
      return () => {
        testReq._cancelled = true;
      };
    });
  }
  /**
   * Helper function to search for requests in the list of open requests.
   */
  _match(match) {
    if (typeof match === "string") {
      return this.open.filter((testReq) => testReq.request.urlWithParams === match);
    } else if (typeof match === "function") {
      return this.open.filter((testReq) => match(testReq.request));
    } else {
      return this.open.filter((testReq) => (!match.method || testReq.request.method === match.method.toUpperCase()) && (!match.url || testReq.request.urlWithParams === match.url));
    }
  }
  /**
   * Search for requests in the list of open requests, and return all that match
   * without asserting anything about the number of matches.
   */
  match(match) {
    const results = this._match(match);
    results.forEach((result) => {
      const index = this.open.indexOf(result);
      if (index !== -1) {
        this.open.splice(index, 1);
      }
    });
    return results;
  }
  /**
   * Expect that a single outstanding request matches the given matcher, and return
   * it.
   *
   * Requests returned through this API will no longer be in the list of open requests,
   * and thus will not match twice.
   */
  expectOne(match, description) {
    description ||= this.descriptionFromMatcher(match);
    const matches = this.match(match);
    if (matches.length > 1) {
      throw new Error(`Expected one matching request for criteria "${description}", found ${matches.length} requests.`);
    }
    if (matches.length === 0) {
      let message = `Expected one matching request for criteria "${description}", found none.`;
      if (this.open.length > 0) {
        const requests = this.open.map(describeRequest).join(", ");
        message += ` Requests received are: ${requests}.`;
      }
      throw new Error(message);
    }
    return matches[0];
  }
  /**
   * Expect that no outstanding requests match the given matcher, and throw an error
   * if any do.
   */
  expectNone(match, description) {
    description ||= this.descriptionFromMatcher(match);
    const matches = this.match(match);
    if (matches.length > 0) {
      throw new Error(`Expected zero matching requests for criteria "${description}", found ${matches.length}.`);
    }
  }
  /**
   * Validate that there are no outstanding requests.
   */
  verify(opts = {}) {
    let open = this.open;
    if (opts.ignoreCancelled) {
      open = open.filter((testReq) => !testReq.cancelled);
    }
    if (open.length > 0) {
      const requests = open.map(describeRequest).join(", ");
      throw new Error(`Expected no open requests, found ${open.length}: ${requests}`);
    }
  }
  descriptionFromMatcher(matcher) {
    if (typeof matcher === "string") {
      return `Match URL: ${matcher}`;
    } else if (typeof matcher === "object") {
      const method = matcher.method || "(any)";
      const url = matcher.url || "(any)";
      return `Match method: ${method}, URL: ${url}`;
    } else {
      return `Match by function: ${matcher.name}`;
    }
  }
  static \u0275fac = \u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _HttpClientTestingBackend, deps: [], target: FactoryTarget.Injectable });
  static \u0275prov = \u0275\u0275ngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _HttpClientTestingBackend });
};
\u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: HttpClientTestingBackend, decorators: [{
  type: Injectable
}] });
function describeRequest(testRequest) {
  const url = testRequest.request.urlWithParams;
  const method = testRequest.request.method;
  return `${method} ${url}`;
}
function provideHttpClientTesting() {
  return [
    HttpClientTestingBackend,
    { provide: HttpBackend, useExisting: HttpClientTestingBackend },
    { provide: HttpTestingController, useExisting: HttpClientTestingBackend },
    { provide: REQUESTS_CONTRIBUTE_TO_STABILITY, useValue: false }
  ];
}
var HttpClientTestingModule = class _HttpClientTestingModule {
  static \u0275fac = \u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _HttpClientTestingModule, deps: [], target: FactoryTarget.NgModule });
  static \u0275mod = \u0275\u0275ngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.2", ngImport: core_exports, type: _HttpClientTestingModule, imports: [HttpClientModule] });
  static \u0275inj = \u0275\u0275ngDeclareInjector({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: _HttpClientTestingModule, providers: [provideHttpClientTesting()], imports: [HttpClientModule] });
};
\u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: core_exports, type: HttpClientTestingModule, decorators: [{
  type: NgModule,
  args: [{
    imports: [HttpClientModule],
    providers: [provideHttpClientTesting()]
  }]
}] });

// src/app/core/services/admin.service.spec.ts
init_testing();

// src/app/core/services/admin.service.ts
init_tslib_es6();
init_http();
init_core();
init_esm();
init_api_service();
var AdminService = class AdminService2 {
  api;
  http;
  constructor(api, http) {
    this.api = api;
    this.http = http;
  }
  getSectors() {
    return this.api.get("/admin/sectors").pipe(map((response) => this.unwrapList(response).map(this.normalizeSector)));
  }
  // --- Organizations (Admin) ---
  getOrganizations() {
    return this.api.get("/admin/organizations").pipe(map((resp) => this.unwrapList(resp).map((o) => this.normalizeOrganization(o))));
  }
  getOrganizationById(orgId) {
    return this.api.get(`/admin/organizations/${encodeURIComponent(orgId)}`).pipe(map((resp) => this.normalizeOrganization(resp)));
  }
  updateOrganizationEnabled(orgId, enabled) {
    const newStatus = enabled ? "ACTIVE" : "INACTIVE";
    return this.api.patch(`/admin/organizations/${encodeURIComponent(orgId)}/status`, { newStatus }).pipe(catchError((err) => {
      if (err && (err.status === 400 || err.status === 404 || err.status === 405)) {
        return this.api.patch(`/admin/organizations/${encodeURIComponent(orgId)}`, { enabled });
      }
      return throwError(() => err);
    }));
  }
  // --- Users (Admin) ---
  getUsers() {
    return this.api.get("/admin/users").pipe(map((resp) => this.unwrapList(resp).map((u) => this.normalizeUser(u))));
  }
  getUserById(userId) {
    return this.api.get(`/admin/users/${encodeURIComponent(userId)}`).pipe(map((resp) => this.normalizeUser(resp)));
  }
  updateUserEnabled(userId, enabled) {
    return this.api.patch(`/admin/users/${encodeURIComponent(userId)}`, { enabled }).pipe(catchError((err) => {
      if (err && (err.status === 400 || err.status === 404 || err.status === 405)) {
        const newStatus = enabled ? "ACTIVE" : "INACTIVE";
        return this.api.patch(`/admin/users/${encodeURIComponent(userId)}/status`, { newStatus });
      }
      return throwError(() => err);
    }));
  }
  createSector(name) {
    return this.api.post("/admin/sectors", { name }).pipe(map(this.normalizeSector));
  }
  deleteSector(id) {
    return this.api.delete(`/admin/sectors/${encodeURIComponent(id)}`).pipe(map(() => void 0));
  }
  getSectorById(id) {
    return this.api.get(`/admin/sectors/${encodeURIComponent(id)}`).pipe(map(this.normalizeSector));
  }
  getTrainings() {
    return this.api.get("/admin/trainings").pipe(map((response) => this.unwrapList(response).map(this.normalizeTraining)));
  }
  createTraining(payload) {
    return this.api.post("/admin/trainings", payload).pipe(map(this.normalizeTraining));
  }
  getTrainingById(id) {
    return this.api.get(`/admin/trainings/${encodeURIComponent(id)}`).pipe(map(this.normalizeTraining));
  }
  updateTraining(id, changes) {
    return this.api.put(`/admin/trainings/${encodeURIComponent(id)}`, changes).pipe(map(this.normalizeTraining));
  }
  publishTraining(id) {
    return this.api.post(`/admin/trainings/${encodeURIComponent(id)}/publish`, {}).pipe(map(() => void 0));
  }
  deleteTraining(id) {
    return this.api.delete(`/admin/trainings/${encodeURIComponent(id)}`).pipe(map(() => void 0));
  }
  assignTrainingToSector(trainingId, assignment) {
    return this.api.post(`/admin/trainings/${encodeURIComponent(trainingId)}/sectors`, assignment).pipe(map(() => void 0));
  }
  unlinkTrainingSector(trainingId, sectorId) {
    return this.api.delete(`/admin/trainings/${encodeURIComponent(trainingId)}/sectors/${encodeURIComponent(sectorId)}`).pipe(map(() => void 0));
  }
  orgUnfollowSector(orgId, sectorId) {
    return this.api.delete(`/organizations/${encodeURIComponent(orgId)}/sectors/${encodeURIComponent(sectorId)}`).pipe(map(() => void 0));
  }
  uploadEbookFile(trainingId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.api.post(`/admin/trainings/ebooks/${encodeURIComponent(trainingId)}/upload`, formData);
  }
  uploadEbookFileWithProgress(trainingId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const url = this.api.createUrl(`/admin/trainings/ebooks/${encodeURIComponent(trainingId)}/upload`);
    const request = new HttpRequest("POST", url, formData, {
      reportProgress: true
    });
    return this.http.request(request).pipe(map((event) => {
      if (event.type === HttpEventType.UploadProgress) {
        const progress = event.total ? Math.round(event.loaded / event.total * 100) : 0;
        return { type: "progress", progress };
      }
      if (event.type === HttpEventType.Response) {
        return { type: "response", body: event.body ?? null };
      }
      return null;
    }), filter((event) => event !== null), catchError((error) => {
      const message = error instanceof HttpErrorResponse ? error.message || "Falha no upload do e-book." : "Falha no upload do e-book.";
      return throwError(() => new Error(message));
    }));
  }
  uploadTrainingCoverImage(trainingId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const url = this.api.createUrl(`/admin/trainings/${encodeURIComponent(trainingId)}/cover-image`);
    const request = new HttpRequest("POST", url, formData, { reportProgress: true });
    return this.http.request(request).pipe(map((event) => {
      if (event.type === HttpEventType.UploadProgress) {
        const progress = event.total ? Math.round(event.loaded / event.total * 100) : 0;
        return { type: "progress", progress };
      }
      if (event.type === HttpEventType.Response) {
        return { type: "response", body: event.body ?? null };
      }
      return null;
    }), filter((e) => e !== null), catchError((err) => throwError(() => new Error(err?.message || "Falha no upload da capa."))));
  }
  fetchEbookProgress(trainingId) {
    return this.api.get(`/progress/ebooks/${encodeURIComponent(trainingId)}`).pipe(catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return of(null);
      }
      return throwError(() => error);
    }));
  }
  updateEbookProgress(trainingId, lastPageRead) {
    return this.api.put(`/progress/ebooks/${encodeURIComponent(trainingId)}`, { lastPageRead }).pipe(map(() => void 0));
  }
  buildEbookFileUrl(fileName) {
    if (!fileName) {
      return null;
    }
    return this.api.createUrl(`/admin/ebooks/${encodeURIComponent(fileName)}`);
  }
  /**
   * Verifica se há PDF disponível seguindo a mesma heurística robusta do legacy:
   * 1. Flags booleanas conhecidas (hasPdf, pdfUploaded, ebookFileUploaded, fileUploaded)
   * 2. Conjunto de chaves de caminho/URL que terminem em .pdf
   * 3. ebookDetails.filePath
   * 4. Busca rasa (profundidade 1) por qualquer string terminando em .pdf
   */
  trainingHasPdf(training) {
    return this.trainingPdfDebug(training).has;
  }
  /**
   * Método de diagnóstico que explica COMO o PDF foi (ou não) detectado.
   * Retorna a primeira correspondência encontrada para facilitar debug.
   * Utilize no console: adminService.trainingPdfDebug(obj)
   */
  trainingPdfDebug(training) {
    if (!training)
      return { has: false, matchedBy: "no-training" };
    const visited = /* @__PURE__ */ new Set();
    const anyT = training;
    const looksLikePdf = (raw) => {
      if (typeof raw !== "string")
        return false;
      const trimmed = raw.trim();
      const base = trimmed.split("?")[0].trim().toLowerCase();
      if (base.endsWith(".pdf"))
        return true;
      if (/\.pdf($|\?)/i.test(trimmed))
        return true;
      return false;
    };
    const booleanFlags = ["hasPdf", "pdfUploaded", "ebookFileUploaded", "fileUploaded"];
    for (const flag of booleanFlags) {
      if (anyT && anyT[flag]) {
        return { has: true, matchedBy: "boolean-flag", key: flag, valueSample: String(anyT[flag]) };
      }
    }
    const ed = anyT.ebookDetails;
    if (ed && typeof ed === "object") {
      const edPaths = [ed.filePath, ed.file, ed.filepath, ed.pdfFilePath, ed.pdfPath, ed.url, ed.fileUrl, ed.name, ed.filename, ed.originalName];
      const match = edPaths.find((v) => looksLikePdf(v));
      if (match) {
        return { has: true, matchedBy: "ebookDetails", key: "ebookDetails.*", valueSample: String(match) };
      }
    }
    const pathKeys = [
      "filePath",
      "filepath",
      "file",
      "pdfPath",
      "pdfFilePath",
      "pdfFile",
      "ebookFile",
      "ebookFilePath",
      "ebookPath",
      "ebookPdfPath",
      "ebookFileUrl",
      "fileUrl",
      "pdfUrl",
      "pdf",
      "ebookUrl",
      "ebook",
      "document",
      "documentPath",
      "resourcePath",
      "resourceUrl",
      "pdfFileName",
      "ebookFileName",
      "filename",
      "name",
      "originalName"
    ];
    for (const k of pathKeys) {
      const v = anyT[k];
      if (looksLikePdf(v)) {
        return { has: true, matchedBy: "direct-key", key: k, valueSample: String(v) };
      }
    }
    const queue = [{ value: anyT, depth: 0, path: "root" }];
    const MAX_DEPTH = 5;
    const MAX_NODES = 500;
    let processed = 0;
    while (queue.length) {
      const current = queue.shift();
      const { value, depth, path } = current;
      if (!value || typeof value !== "object")
        continue;
      if (visited.has(value))
        continue;
      visited.add(value);
      processed++;
      if (processed > MAX_NODES)
        break;
      const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
      for (const [k, v] of entries) {
        if (looksLikePdf(v)) {
          return { has: true, matchedBy: "deep-scan", key: k, valueSample: String(v), path: path + "." + k };
        }
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const nameLike = v.name || v.fileName || v.filename || v.originalName;
          const urlLike = v.url || v.fileUrl;
          if (looksLikePdf(nameLike)) {
            return { has: true, matchedBy: "deep-file-object-name", key: k, valueSample: String(nameLike), path: path + "." + k };
          }
          if (looksLikePdf(urlLike)) {
            return { has: true, matchedBy: "deep-file-object-url", key: k, valueSample: String(urlLike), path: path + "." + k };
          }
        }
        if (v && typeof v === "object" && depth < MAX_DEPTH) {
          queue.push({ value: v, depth: depth + 1, path: path + "." + k });
        }
      }
    }
    return { has: false, matchedBy: "not-found" };
  }
  extractPdfFileName(training) {
    if (!training) {
      return "";
    }
    const looksLikePdf = (raw) => {
      if (typeof raw !== "string")
        return false;
      const trimmed = raw.trim();
      const base = trimmed.split("?")[0].trim().toLowerCase();
      if (base.endsWith(".pdf"))
        return true;
      if (/\.pdf($|\?)/i.test(trimmed))
        return true;
      return false;
    };
    const pathKeys = [
      "filePath",
      "filepath",
      "file",
      "pdfPath",
      "pdfFilePath",
      "pdfFile",
      "ebookFile",
      "ebookFilePath",
      "ebookPath",
      "ebookPdfPath",
      "ebookFileUrl",
      "fileUrl",
      "pdfUrl",
      "pdf",
      "ebookUrl"
    ];
    for (const key of pathKeys) {
      const value = training[key];
      if (looksLikePdf(value)) {
        try {
          return decodeURIComponent(value.split("/").pop().split("?")[0]);
        } catch {
          return value.split("/").pop() ?? "";
        }
      }
    }
    const ed = training.ebookDetails;
    if (ed && looksLikePdf(ed.filePath)) {
      try {
        return decodeURIComponent(ed.filePath.split("/").pop().split("?")[0]);
      } catch {
        return ed.filePath.split("/").pop() ?? "";
      }
    }
    return "";
  }
  extractPdfUpdatedDate(training) {
    if (!training) {
      return null;
    }
    const dateKeys = [
      "pdfUpdatedAt",
      "fileUpdatedAt",
      "ebookUpdatedAt",
      "ebookFileUpdatedAt",
      "updatedAt",
      "lastUpdatedAt",
      "modifiedAt",
      "fileModifiedAt"
    ];
    for (const key of dateKeys) {
      const value = training[key];
      if (value && (typeof value === "string" || typeof value === "number")) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return null;
  }
  normalizeTraining = (raw) => {
    const source = raw ?? {};
    const id = this.normalizeId(source);
    return __spreadValues({
      id,
      title: String(source.title ?? source.name ?? "Treinamento"),
      description: source.description ?? null,
      author: source.author ?? null,
      entityType: source.entityType ?? source.format ?? source.type ?? null,
      publicationStatus: source.publicationStatus ?? source.status ?? null,
      coverImageUrl: source.coverImageUrl ?? source.imageUrl ?? null,
      organizationId: source.organizationId ?? null,
      updatedAt: source.updatedAt ?? null
    }, source);
  };
  // --- Monetização: Planos & Assinaturas ---
  /**
   * Cria um novo plano de assinatura.
   * O backend (exemplo fornecido) mostra os preços como strings ("19.90").
   * Enviamos como string para preservar precisão e formato decimal esperado.
   */
  createPlan(payload) {
    const body = {
      name: (payload.name || "").trim(),
      description: (payload.description || "").trim().slice(0, 512),
      originalPrice: (payload.originalPrice || "").trim(),
      currentPrice: (payload.currentPrice || "").trim(),
      durationInDays: Number(payload.durationInDays) || 0
    };
    return this.api.post("/admin/plans", body);
  }
  /**
   * Cria manualmente uma assinatura para um usuário.
   */
  createSubscription(payload) {
    const body = { userId: (payload.userId || "").trim(), planId: (payload.planId || "").trim() };
    return this.api.post("/admin/subscriptions", body);
  }
  normalizeSector = (raw) => {
    const source = raw ?? {};
    const id = this.normalizeId(source);
    return __spreadValues({
      id,
      name: String(source.name ?? source.title ?? source.label ?? "Setor")
    }, source);
  };
  normalizeId(raw) {
    const candidate = raw["id"] ?? raw.uuid ?? raw.code ?? raw.slug ?? raw.trainingId;
    if (candidate != null) {
      return String(candidate);
    }
    return `admin-${Math.random().toString(36).slice(2, 11)}`;
  }
  unwrapList(response) {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === "object") {
      const collection = response.items ?? response.data ?? response.content;
      if (Array.isArray(collection)) {
        return collection;
      }
    }
    return [];
  }
  normalizeUser(raw) {
    if (!raw)
      return { id: "", email: "", enabled: false };
    const id = String(raw.id ?? raw.userId ?? raw._id ?? "");
    const email = String(raw.email ?? raw.userEmail ?? "");
    const role = raw.role ?? raw.systemRole ?? null;
    const enabled = raw.enabled === false ? false : true;
    return __spreadValues({ id, email, role, enabled }, raw);
  }
  normalizeOrganization(raw) {
    const src = raw || {};
    const id = String(src.id ?? src.orgId ?? src._id ?? "");
    const name = String(src.razaoSocial ?? src.companyName ?? src.name ?? src.title ?? "");
    const cnpj = src.cnpj ?? src.CNPJ ?? null;
    let enabled;
    if (src.enabled === true)
      enabled = true;
    else if (src.enabled === false)
      enabled = false;
    else if (typeof src.status === "string") {
      const st = src.status.toLowerCase();
      enabled = st === "active" || st === "enabled" || st === "true";
    } else if (typeof src.active === "boolean")
      enabled = src.active;
    else if (typeof src.state === "string") {
      const st = src.state.toLowerCase();
      enabled = st === "active" || st === "enabled";
    } else
      enabled = true;
    const memberCount = typeof src.memberCount === "number" ? src.memberCount : Array.isArray(src.members) ? src.members.length : void 0;
    return __spreadValues({ id, name, cnpj, enabled, memberCount }, src);
  }
  searchPdfInNested(obj, depth = 0) {
    if (!obj || depth > 1) {
      return false;
    }
    for (const value of Object.values(obj)) {
      if (typeof value === "string" && /\.pdf($|\?)/i.test(value)) {
        return true;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (this.searchPdfInNested(value, depth + 1)) {
          return true;
        }
      }
    }
    return false;
  }
  static ctorParameters = () => [
    { type: ApiService },
    { type: HttpClient }
  ];
};
AdminService = __decorate([
  Injectable({ providedIn: "root" })
], AdminService);

// src/app/core/services/admin.service.spec.ts
init_api_service();
describe("AdminService", () => {
  let service;
  let httpMock;
  let api;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService, ApiService]
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiService);
  });
  afterEach(() => {
    httpMock.verify();
  });
  it("should load trainings normalizing payload", () => {
    const payload = {
      items: [
        {
          id: 123,
          title: "Treinamento Integra\xE7\xE3o",
          publicationStatus: "PUBLISHED",
          description: "Conte\xFAdo",
          entityType: "EBOOK"
        }
      ]
    };
    let responseLength = 0;
    service.getTrainings().subscribe((trainings) => {
      responseLength = trainings.length;
      expect(trainings[0].id).toBe("123");
      expect(trainings[0].title).toBe("Treinamento Integra\xE7\xE3o");
      expect(trainings[0].publicationStatus).toBe("PUBLISHED");
    });
    const req = httpMock.expectOne(api.createUrl("/admin/trainings"));
    expect(req.request.method).toBe("GET");
    req.flush(payload);
    expect(responseLength).toBe(1);
  });
  it("should create training with payload and normalize response", () => {
    const requestBody = {
      title: "Novo Curso",
      description: "Descri\xE7\xE3o",
      entityType: "RECORDED_COURSE"
    };
    service.createTraining(requestBody).subscribe((training) => {
      expect(training.id).toBe("course-1");
      expect(training.title).toBe("Novo Curso");
      expect(training.entityType).toBe("RECORDED_COURSE");
    });
    const req = httpMock.expectOne(api.createUrl("/admin/trainings"));
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(requestBody);
    req.flush(__spreadValues({ id: "course-1" }, requestBody));
  });
  it("should build ebook url with base path", () => {
    const url = service.buildEbookFileUrl("ebook.pdf");
    expect(url).toContain("/admin/ebooks/ebook.pdf");
    expect(url?.startsWith("http")).toBeTrue();
  });
  it("should detect pdf metadata and extract file name", () => {
    const training = {
      title: "E-book",
      ebookFileUrl: "https://example.com/uploads/ebook-prospera.pdf?token=abc"
    };
    expect(service.trainingHasPdf(training)).toBeTrue();
    expect(service.extractPdfFileName(training)).toBe("ebook-prospera.pdf");
  });
});
/*! Bundled license information:

@angular/common/fesm2022/http/testing.mjs:
  (**
   * @license Angular v20.3.2
   * (c) 2010-2025 Google LLC. https://angular.io/
   * License: MIT
   *)
*/
//# sourceMappingURL=spec-admin.service.spec.js.map
