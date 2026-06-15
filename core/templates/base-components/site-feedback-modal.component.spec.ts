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
 * @fileoverview Unit tests for the report an issue feedback modal.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {RouterTestingModule} from '@angular/router/testing';
import {SiteFeedbackModalComponent} from './site-feedback-modal.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {FormsModule} from '@angular/forms';
import {FeedbackSessionInfoService} from 'services/feedback-session-info.service';
import {FeedbackBackendApiService} from 'domain/feedback/feedback-backend-api.service';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';
import {FeedbackSessionInfo} from 'domain/feedback/feedback.model';
import {MockTranslatePipe} from 'tests/unit-test-utils';

@Component({
  selector: 'oppia-image-receiver',
  template: '',
})
class MockImageReceiverComponent {
  @Input() allowedImageFormats: string[] = [];
  @Input() maxImageSizeInKB: number = 0;
  @Output() fileChanged: EventEmitter<File> = new EventEmitter<File>();
}

class MockActiveModal {
  dismiss(): void {}
}

const feedbackSessionInfo: FeedbackSessionInfo = {
  console_logs_json: [
    {
      error_message: 'TypeError: Something went wrong',
      log_level: 'error',
      timestamp_msecs: 1234567890,
      stack_trace: 'Error stack trace',
    },
  ],
  failed_requests_json: [
    {
      url: '/createhandler/web_feedback',
      method: 'POST',
      status_code: 500,
      timestamp_msecs: 1234567891,
      status_text: 'Internal Server Error',
      error_message: 'Request failed',
    },
  ],
  navigation_history_json: [
    {
      path: '/learn/math',
      timestamp_msecs: 1234567892,
    },
  ],
  environment_json: {
    client_time_msecs: 1234567893,
    timezone_offset_mins: -330,
    user_agent: 'Mozilla/5.0 Chrome/136.0',
    viewport: {
      width: 1920,
      height: 1080,
    },
    page: {
      url: 'http://localhost:8181/explore/test',
      title: 'Test Exploration',
    },
    locale: {
      language_code: 'en',
      direction: 'ltr',
    },
  },
};

describe('SiteFeedbackModalComponent', () => {
  let fixture: ComponentFixture<SiteFeedbackModalComponent>;
  let component: SiteFeedbackModalComponent;
  let activeModal: MockActiveModal;
  let feedbackScreenshotStagingService: jasmine.SpyObj<FeedbackScreenshotStagingService>;
  let feedbackSessionInfoService: FeedbackSessionInfoService;
  let feedbackBackendApiService: FeedbackBackendApiService;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(SiteFeedbackModalComponent);
    component = fixture.componentInstance;
    feedbackSessionInfoService = TestBed.inject(FeedbackSessionInfoService);
    feedbackBackendApiService = TestBed.inject(FeedbackBackendApiService);
    fixture.detectChanges();
  };

  beforeEach(waitForAsync(() => {
    activeModal = new MockActiveModal();
    feedbackScreenshotStagingService = jasmine.createSpyObj(
      'FeedbackScreenshotStagingService',
      ['stageScreenshotAsync', 'clearStagedScreenshot']
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, RouterTestingModule],
      declarations: [
        SiteFeedbackModalComponent,
        MockImageReceiverComponent,
        MockTranslatePipe,
      ],
      providers: [
        FeedbackBackendApiService,
        FeedbackSessionInfoService,
        {
          provide: NgbActiveModal,
          useValue: activeModal,
        },
        {
          provide: FeedbackScreenshotStagingService,
          useValue: feedbackScreenshotStagingService,
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  it('should be defined', () => {
    createComponent();
    expect(component).toBeDefined();
  });

  it('should return false if feedback form is invalid', () => {
    createComponent();
    component.reportMessage = '';
    expect(component.isReportFormValid()).toBe(false);
  });

  it('should return true if feedback form is valid', () => {
    createComponent();
    component.reportMessage = 'Feedback';
    expect(component.isReportFormValid()).toBe(true);
  });

  it('should close modal when feedback is valid', fakeAsync(() => {
    createComponent();
    spyOn(component, 'closeModal');

    spyOn(
      feedbackBackendApiService,
      'submitSiteAndLessonIssueReportAsync'
    ).and.returnValue(Promise.resolve());

    component.reportMessage = 'Valid feedback';
    component.includeTechnicalLogs = true;
    spyOn(feedbackSessionInfoService, 'getSessionInfo').and.returnValue(
      feedbackSessionInfo
    );
    component.submitReport();
    tick();

    expect(component.closeModal).toHaveBeenCalled();
  }));

  it('should send feedback', fakeAsync(() => {
    createComponent();
    spyOn(feedbackSessionInfoService, 'getSessionInfo').and.returnValue(
      feedbackSessionInfo
    );

    const submitSpy = spyOn(
      feedbackBackendApiService,
      'submitSiteAndLessonIssueReportAsync'
    ).and.returnValue(Promise.resolve());

    component.reportMessage = 'Feedback';
    component.includeTechnicalLogs = true;

    component.submitReport();
    tick();

    expect(submitSpy).toHaveBeenCalled();
  }));

  it('should log error when feedback submission fails', fakeAsync(() => {
    createComponent();
    spyOn(
      feedbackBackendApiService,
      'submitSiteAndLessonIssueReportAsync'
    ).and.returnValue(Promise.reject(new Error('Backend failed')));

    const consoleSpy = spyOn(console, 'error');

    component.reportMessage = 'Feedback';
    component.includeTechnicalLogs = false;

    component.submitReport();
    tick();

    expect(consoleSpy).toHaveBeenCalled();
  }));

  it('should not close modal when feedback is invalid', () => {
    createComponent();
    spyOn(component, 'closeModal');
    component.reportMessage = '';
    component.submitReport();

    expect(component.closeModal).not.toHaveBeenCalled();
  });

  it('should return false when feedback exceeds max length', () => {
    createComponent();
    component.reportMessage = 'a'.repeat(
      component.MAX_REPORT_MESSAGE_LENGTH + 1
    );

    expect(component.isReportFormValid()).toBe(false);
  });

  it('should stage screenshot and show preview', fakeAsync(() => {
    const file = new File(['image'], 'screenshot.png', {
      type: 'image/png',
    });
    feedbackScreenshotStagingService.stageScreenshotAsync.and.returnValue(
      Promise.resolve({
        filename: 'screenshot.png',
        previewDataUrl: 'data:image/png;base64,image',
      })
    );

    createComponent();
    component.onScreenshotFileReceived(file);
    expect(component.isUploadingScreenshot).toBe(true);
    flushMicrotasks();

    expect(
      feedbackScreenshotStagingService.stageScreenshotAsync
    ).toHaveBeenCalledWith(file);
    expect(component.screenshotFilename).toEqual('screenshot.png');
    expect(component.screenshotPreviewDataUrl).toEqual(
      'data:image/png;base64,image'
    );
    expect(component.screenshotFileError).toBeNull();
    expect(component.isUploadingScreenshot).toBe(false);
  }));

  it('should show screenshot upload error when staging fails', fakeAsync(() => {
    const file = new File(['image'], 'screenshot.png', {
      type: 'image/png',
    });
    feedbackScreenshotStagingService.stageScreenshotAsync.and.returnValue(
      Promise.reject(new Error('Upload failed.'))
    );

    createComponent();
    component.onScreenshotFileReceived(file);
    flushMicrotasks();

    expect(component.screenshotFilename).toBeNull();
    expect(component.screenshotPreviewDataUrl).toBeNull();
    expect(component.screenshotFileError).toEqual(
      'I18N_FEEDBACK_SCREENSHOT_UPLOAD_ERROR'
    );
    expect(component.isUploadingScreenshot).toBe(false);
  }));

  it('should clear a staged screenshot', () => {
    createComponent();
    component.screenshotFilename = 'screenshot.png';
    component.screenshotPreviewDataUrl = 'data:image/png;base64,image';
    component.screenshotFileError = 'I18N_FEEDBACK_SCREENSHOT_UPLOAD_ERROR';

    component.removeScreenshot();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).toHaveBeenCalledWith('screenshot.png');
    expect(component.screenshotFilename).toBeNull();
    expect(component.screenshotPreviewDataUrl).toBeNull();
    expect(component.screenshotFileError).toBeNull();
  });

  it('should not clear storage when no screenshot is staged', () => {
    createComponent();
    component.removeScreenshot();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).not.toHaveBeenCalled();
  });

  it('should close the modal and remove screenshot', () => {
    createComponent();
    spyOn(activeModal, 'dismiss');
    component.screenshotFilename = 'screenshot.png';
    component.screenshotPreviewDataUrl = 'data:image/png;base64,image';

    component.closeModal();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).toHaveBeenCalledWith('screenshot.png');
    expect(activeModal.dismiss).toHaveBeenCalled();
    expect(component.screenshotFilename).toBeNull();
    expect(component.screenshotPreviewDataUrl).toBeNull();
  });

  it('should reset form on destroy', fakeAsync(() => {
    createComponent();
    flushMicrotasks();
    component.reportMessage = 'Feedback';
    component.screenshotFilename = 'screenshot.png';
    component.includeTechnicalLogs = false;
    component.screenshotPreviewDataUrl = 'data:image/png;base64,image';

    component.ngOnDestroy();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).toHaveBeenCalledWith('screenshot.png');
    expect(component.reportMessage).toBe('');
    expect(component.screenshotFilename).toBeNull();
    expect(component.includeTechnicalLogs).toBe(true);
    expect(component.screenshotPreviewDataUrl).toBeNull();
  }));
});
