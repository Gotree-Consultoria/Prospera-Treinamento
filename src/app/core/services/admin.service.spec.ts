import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminService } from './admin.service';
import { ApiService } from './api.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  let api: ApiService;

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

  it('should load trainings normalizing payload', () => {
    const payload = {
      items: [
        {
          id: 123,
          title: 'Treinamento Integração',
          publicationStatus: 'PUBLISHED',
          description: 'Conteúdo',
          entityType: 'EBOOK'
        }
      ]
    };

    let responseLength = 0;
    service.getTrainings().subscribe(trainings => {
      responseLength = trainings.length;
      expect(trainings[0].id).toBe('123');
      expect(trainings[0].title).toBe('Treinamento Integração');
      expect(trainings[0].publicationStatus).toBe('PUBLISHED');
    });

    const req = httpMock.expectOne(api.createUrl('/admin/trainings'));
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(responseLength).toBe(1);
  });

  it('should create training with payload and normalize response', () => {
    const requestBody = {
      title: 'Novo Curso',
      description: 'Descrição',
      entityType: 'RECORDED_COURSE'
    };

    service.createTraining(requestBody).subscribe(training => {
      expect(training.id).toBe('course-1');
      expect(training.title).toBe('Novo Curso');
      expect(training.entityType).toBe('RECORDED_COURSE');
    });

    const req = httpMock.expectOne(api.createUrl('/admin/trainings'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    req.flush({ id: 'course-1', ...requestBody });
  });

  it('should build ebook url with base path', () => {
    const url = service.buildEbookFileUrl('ebook.pdf');
    // URL should include the encoded filename and be an absolute URL
    expect(url).toContain(encodeURIComponent('ebook.pdf'));
    expect(url?.startsWith('http')).toBeTrue();
  });

  it('should detect pdf metadata and extract file name', () => {
    const training: any = {
      title: 'E-book',
      ebookFileUrl: 'https://example.com/uploads/ebook-prospera.pdf?token=abc'
    };

    expect(service.trainingHasPdf(training)).toBeTrue();
    expect(service.extractPdfFileName(training)).toBe('ebook-prospera.pdf');
  });
});
