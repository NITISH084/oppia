// Copyright 2026 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Unit tests for PlatformFeedbackBackendApiService.
 */

import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {TestBed, fakeAsync, flushMicrotasks} from '@angular/core/testing';

import {
  PlatformFeedbackBackendApiService,
  PlatformFeedbackSubmitPayload,
} from 'services/platform-feedback-backend-api.service';

describe('Platform feedback backend api service', () => {
  let platformFeedbackBackendApiService: PlatformFeedbackBackendApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    platformFeedbackBackendApiService = TestBed.get(
      PlatformFeedbackBackendApiService
    );
    httpTestingController = TestBed.get(HttpTestingController);
  });

  it('should submit feedback', fakeAsync(() => {
    const payload: PlatformFeedbackSubmitPayload = {
      category: 'platform',
      description: 'desc',
      page_url: 'https://example.com',
      language_code: 'en',
      rating: 4,
      screenshot_filename: null,
      screenshot_entity_id: null,
      contact_email: null,
      allow_contact: false,
      include_session_info: false,
      session_info: null,
      captcha_token: null,
    };

    let onSuccess = jasmine.createSpy('onSuccess');
    platformFeedbackBackendApiService
      .submitFeedbackAsync(payload)
      .then(onSuccess);

    const req = httpTestingController.expectOne('/platform_feedback_handler');
    expect(req.request.method).toEqual('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({feedback_id: 'feedback_id'});
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalledWith({feedback_id: 'feedback_id'});
  }));

  it('should upload screenshots', fakeAsync(() => {
    let onSuccess = jasmine.createSpy('onSuccess');
    const file = new Blob(['data'], {type: 'image/png'});

    platformFeedbackBackendApiService
      .uploadScreenshotAsync(file, 'screenshot.png')
      .then(onSuccess);

    const req = httpTestingController.expectOne(
      '/platform_feedback_image_upload_handler'
    );
    expect(req.request.method).toEqual('POST');
    req.flush({filename: 'screenshot.png', entity_id: 'entity_123'});
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalledWith({
      filename: 'screenshot.png',
      entity_id: 'entity_123',
    });
  }));

  it('should fetch feedback list', fakeAsync(() => {
    let onSuccess = jasmine.createSpy('onSuccess');

    platformFeedbackBackendApiService
      .fetchFeedbackListAsync(null, null, null, null)
      .then(onSuccess);

    const req = httpTestingController.expectOne(
      '/platform_feedback_list_handler'
    );
    expect(req.request.method).toEqual('GET');
    req.flush({results: [], cursor: null, more: false});
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalledWith({
      results: [],
      cursor: null,
      more: false,
    });
  }));

  it('should update feedback status', fakeAsync(() => {
    let onSuccess = jasmine.createSpy('onSuccess');

    platformFeedbackBackendApiService
      .updateFeedbackStatusAsync('fid', 'dismissed')
      .then(onSuccess);

    const req = httpTestingController.expectOne(
      '/platform_feedback_update_status_handler/fid'
    );
    expect(req.request.method).toEqual('PUT');
    expect(req.request.body).toEqual({status: 'dismissed'});
    req.flush({});
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalled();
  }));

  it('should delete feedback', fakeAsync(() => {
    let onSuccess = jasmine.createSpy('onSuccess');

    platformFeedbackBackendApiService
      .deleteFeedbackAsync('fid')
      .then(onSuccess);

    const req = httpTestingController.expectOne(
      '/platform_feedback_delete_handler/fid'
    );
    expect(req.request.method).toEqual('DELETE');
    req.flush({});
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalled();
  }));
});
