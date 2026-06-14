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
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';
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

describe('SiteFeedbackModalComponent', () => {
  let fixture: ComponentFixture<SiteFeedbackModalComponent>;
  let component: SiteFeedbackModalComponent;
  let activeModal: MockActiveModal;
  let feedbackScreenshotStagingService: jasmine.SpyObj<FeedbackScreenshotStagingService>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(SiteFeedbackModalComponent);
    component = fixture.componentInstance;
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

  it('should send feedback', () => {
    createComponent();
    spyOn(component, 'closeModal');
    component.reportMessage = 'Feedback';
    component.submitReport();
    expect(component.closeModal).toHaveBeenCalled();
  });

  it('should not close modal when feedback is invalid', () => {
    createComponent();
    spyOn(component, 'closeModal');
    component.reportMessage = '';
    component.submitReport();

    expect(component.closeModal).not.toHaveBeenCalled();
  });

  it('should close modal when feedback is valid', () => {
    createComponent();
    spyOn(component, 'closeModal');
    component.reportMessage = 'Valid feedback';
    component.submitReport();

    expect(component.closeModal).toHaveBeenCalled();
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
