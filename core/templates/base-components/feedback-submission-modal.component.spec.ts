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
 * @fileoverview Unit tests for the web user feedback submission modal.
 */

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
  waitForAsync,
} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

import {FeedbackBackendApiService} from 'domain/feedback/feedback-backend-api.service';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';
import {WindowRef} from 'services/contextual/window-ref.service';
import {
  InsertScriptService,
  KNOWN_SCRIPTS,
} from 'services/insert-script.service';
import {UserService} from 'services/user.service';
import {MockTranslatePipe} from 'tests/unit-test-utils';

import {FeedbackSubmissionModalComponent} from './feedback-submission-modal.component';

@Component({
  selector: 'oppia-image-receiver',
  template: '',
})
class MockImageReceiverComponent {
  @Input() allowedImageFormats: string[] = [];
  @Input() maxImageSizeInKB: number = 0;
  @Output() fileChanged: EventEmitter<File> = new EventEmitter<File>();
}

class MockUserService {
  isLoggedIn: boolean = false;
  shouldReject: boolean = false;

  getUserInfoAsync(): Promise<{isLoggedIn: () => boolean}> {
    if (this.shouldReject) {
      return Promise.reject(new Error('Failed to fetch user info.'));
    }
    return Promise.resolve({
      isLoggedIn: () => this.isLoggedIn,
    });
  }
}

class MockActiveModal {
  dismiss(): void {}
}

class MockWindowRef {
  nativeWindow: {
    location: {href: string};
    navigator: {userAgent: string};
    innerWidth: number;
    innerHeight: number;
    document: {title: string};
    turnstile?: {
      render: jasmine.Spy;
      reset: jasmine.Spy;
    };
  } = {
    location: {
      href: 'https://www.oppia.org/learn/math',
    },
    navigator: {
      userAgent: 'test-agent',
    },
    innerWidth: 800,
    innerHeight: 600,
    document: {
      title: 'Oppia',
    },
    turnstile: {
      render: jasmine.createSpy('render').and.callFake(
        (
          _container: HTMLElement,
          options: {
            sitekey: string;
            callback: (token: string) => void;
            'error-callback': () => void;
            'expired-callback': () => void;
          }
        ) => {
          options.callback('captcha-token');
          return 'widget-id';
        }
      ),
      reset: jasmine.createSpy('reset'),
    },
  };
}

describe('FeedbackSubmissionModalComponent', () => {
  let fixture: ComponentFixture<FeedbackSubmissionModalComponent>;
  let component: FeedbackSubmissionModalComponent;
  let activeModal: MockActiveModal;
  let userService: MockUserService;
  let windowRef: MockWindowRef;
  let feedbackBackendApiService: jasmine.SpyObj<FeedbackBackendApiService>;
  let feedbackScreenshotStagingService: jasmine.SpyObj<FeedbackScreenshotStagingService>;
  let insertScriptService: jasmine.SpyObj<InsertScriptService>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(FeedbackSubmissionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(waitForAsync(() => {
    activeModal = new MockActiveModal();
    userService = new MockUserService();
    windowRef = new MockWindowRef();
    feedbackBackendApiService = jasmine.createSpyObj(
      'FeedbackBackendApiService',
      ['fetchCaptchaConfigAsync', 'submitFeedbackAsync']
    );
    feedbackScreenshotStagingService = jasmine.createSpyObj(
      'FeedbackScreenshotStagingService',
      ['stageScreenshotAsync', 'clearStagedScreenshot']
    );
    insertScriptService = jasmine.createSpyObj('InsertScriptService', [
      'loadScript',
    ]);

    feedbackBackendApiService.fetchCaptchaConfigAsync.and.returnValue(
      Promise.resolve({
        site_key: 'site-key',
      })
    );
    feedbackBackendApiService.submitFeedbackAsync.and.returnValue(
      Promise.resolve({
        thread_id: 'thread-id',
      })
    );
    insertScriptService.loadScript.and.callFake(
      (_scriptName: string, callback?: () => void) => {
        if (callback) {
          callback();
        }
        return true;
      }
    );

    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [
        FeedbackSubmissionModalComponent,
        MockImageReceiverComponent,
        MockTranslatePipe,
      ],
      providers: [
        {
          provide: NgbActiveModal,
          useValue: activeModal,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: WindowRef,
          useValue: windowRef,
        },
        {
          provide: FeedbackBackendApiService,
          useValue: feedbackBackendApiService,
        },
        {
          provide: FeedbackScreenshotStagingService,
          useValue: feedbackScreenshotStagingService,
        },
        {
          provide: InsertScriptService,
          useValue: insertScriptService,
        },
      ],
    }).compileComponents();
  }));

  it('should be defined', () => {
    createComponent();

    expect(component).toBeDefined();
  });

  it('should initialize captcha for logged-out users', fakeAsync(() => {
    createComponent();
    flushMicrotasks();

    expect(component.isUserLoggedIn).toBe(false);
    expect(
      feedbackBackendApiService.fetchCaptchaConfigAsync
    ).toHaveBeenCalled();
    expect(insertScriptService.loadScript).toHaveBeenCalledWith(
      KNOWN_SCRIPTS.TURNSTILE,
      jasmine.any(Function)
    );
    const turnstile = windowRef.nativeWindow.turnstile;
    expect(turnstile).toBeDefined();
    if (turnstile) {
      expect(turnstile.render).toHaveBeenCalled();
    }
    expect(component.captchaToken).toEqual('captcha-token');
  }));

  it('should not initialize captcha for logged-in users', fakeAsync(() => {
    userService.isLoggedIn = true;

    createComponent();
    flushMicrotasks();

    expect(component.isUserLoggedIn).toBe(true);
    expect(
      feedbackBackendApiService.fetchCaptchaConfigAsync
    ).not.toHaveBeenCalled();
    expect(insertScriptService.loadScript).not.toHaveBeenCalled();
  }));

  it('should initialize captcha when user info cannot be loaded', fakeAsync(() => {
    userService.shouldReject = true;

    createComponent();
    flushMicrotasks();

    expect(component.isUserLoggedIn).toBe(false);
    expect(
      feedbackBackendApiService.fetchCaptchaConfigAsync
    ).toHaveBeenCalled();
  }));

  it('should show an error when captcha config has no site key', fakeAsync(() => {
    feedbackBackendApiService.fetchCaptchaConfigAsync.and.returnValue(
      Promise.resolve({
        site_key: null,
      })
    );

    createComponent();
    flushMicrotasks();

    expect(component.captchaLoadError).toEqual(
      'Captcha is currently unavailable. Please Login to submit feedback.'
    );
    expect(insertScriptService.loadScript).not.toHaveBeenCalled();
  }));

  it('should show an error when captcha config fails to load', fakeAsync(() => {
    feedbackBackendApiService.fetchCaptchaConfigAsync.and.returnValue(
      Promise.reject(new Error('Failed to load config.'))
    );

    createComponent();
    flushMicrotasks();

    expect(component.captchaLoadError).toEqual(
      'Captcha is currently unavailable, Please Login to submit feedback.'
    );
    expect(insertScriptService.loadScript).not.toHaveBeenCalled();
  }));

  it('should show an error when turnstile fails to load', fakeAsync(() => {
    windowRef.nativeWindow.turnstile = undefined;

    createComponent();
    flushMicrotasks();

    expect(component.captchaLoadError).toEqual('Captcha failed to load.');
  }));

  it('should update captcha state from turnstile callbacks', fakeAsync(() => {
    const turnstile = windowRef.nativeWindow.turnstile;
    expect(turnstile).toBeDefined();
    if (!turnstile) {
      return;
    }
    turnstile.render.and.callFake(
      (
        _container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback': () => void;
          'expired-callback': () => void;
        }
      ) => {
        options.callback('captcha-token');
        options['expired-callback']();
        options['error-callback']();
        return 'widget-id';
      }
    );

    createComponent();
    flushMicrotasks();

    expect(component.captchaToken).toEqual('');
    expect(component.captchaLoadError).toEqual('Captcha failed to load.');
  }));

  it('should not render turnstile when captcha site key is missing', () => {
    createComponent();
    component.captchaSiteKey = null;
    component.ngOnInit();

    const turnstile = windowRef.nativeWindow.turnstile;
    expect(turnstile).toBeDefined();

    if (turnstile) {
      expect(turnstile.render).not.toHaveBeenCalled();
    }
  });

  it('should set feedback rating and label', () => {
    createComponent();

    component.setFeedbackRating(5);

    expect(component.feedbackRating).toEqual(5);
    expect(component.getSelectedFeedbackRatingLabel()).toEqual('Excellent');
  });

  it('should set feedback category choice', () => {
    createComponent();

    component.setFeedbackCategoryChoice('lesson');

    expect(component.feedbackCategoryChoice).toEqual('lesson');
    expect(component.feedbackCategory).toEqual('lesson');
  });

  it('should treat unsure category choice as platform feedback', () => {
    createComponent();

    component.setFeedbackCategoryChoice('unsure');

    expect(component.feedbackCategoryChoice).toEqual('unsure');
    expect(component.feedbackCategory).toEqual('platform');
  });

  it('should update description and clear required error', () => {
    createComponent();
    component.feedbackDescriptionError = true;

    component.onFeedbackDescriptionChange('Helpful feedback.');

    expect(component.feedbackDescription).toEqual('Helpful feedback.');
    expect(component.feedbackDescriptionError).toBe(false);
    expect(component.feedbackDescriptionTooLongError).toBe(false);
  });

  it('should show an error when description is too long', () => {
    createComponent();

    component.onFeedbackDescriptionChange(
      'a'.repeat(component.MAX_FEEDBACK_DESCRIPTION_LENGTH + 1)
    );

    expect(component.feedbackDescriptionTooLongError).toBe(true);
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

  it('should not submit feedback when category is not selected', fakeAsync(() => {
    createComponent();
    component.feedbackCategory = null;

    component.submitFeedback();
    flushMicrotasks();

    expect(component.feedbackCategoryError).toBe(true);
    expect(
      feedbackBackendApiService.submitFeedbackAsync
    ).not.toHaveBeenCalled();
  }));

  it('should not submit feedback when description is empty', fakeAsync(() => {
    createComponent();
    component.feedbackCategory = 'lesson';
    component.feedbackDescription = '   ';

    component.submitFeedback();
    flushMicrotasks();

    expect(component.feedbackDescriptionError).toBe(true);
    expect(
      feedbackBackendApiService.submitFeedbackAsync
    ).not.toHaveBeenCalled();
  }));

  it('should not submit feedback when description is too long', fakeAsync(() => {
    createComponent();
    component.feedbackCategory = 'lesson';
    component.feedbackDescription = 'a'.repeat(
      component.MAX_FEEDBACK_DESCRIPTION_LENGTH + 1
    );

    component.submitFeedback();
    flushMicrotasks();

    expect(component.feedbackDescriptionTooLongError).toBe(true);
    expect(
      feedbackBackendApiService.submitFeedbackAsync
    ).not.toHaveBeenCalled();
  }));

  it('should require captcha before logged-out users submit feedback', fakeAsync(() => {
    createComponent();
    component.feedbackCategory = 'platform';
    component.feedbackDescription = 'Helpful feedback.';
    component.captchaToken = '';

    component.submitFeedback();
    flushMicrotasks();

    expect(component.submitError).toEqual(
      'Please complete captcha before submitting Feedback.'
    );
    expect(component.submitErrorIsI18nKey).toBe(false);
    expect(
      feedbackBackendApiService.submitFeedbackAsync
    ).not.toHaveBeenCalled();
  }));

  it('should mark feedback as submitting when validation passes', fakeAsync(() => {
    createComponent();
    component.feedbackCategory = 'platform';
    component.feedbackDescription = 'Helpful feedback.';
    component.captchaToken = 'captcha-token';

    component.submitFeedback();
    flushMicrotasks();

    expect(component.feedbackDescriptionError).toBe(false);
    expect(component.feedbackDescriptionTooLongError).toBe(false);
    expect(component.submitError).toBeNull();
    expect(component.isSubmittingFeedback).toBe(false);
  }));

  it('should close the modal and remove screenshot', () => {
    spyOn(activeModal, 'dismiss');
    createComponent();
    component.screenshotFilename = 'screenshot.png';

    component.close();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).toHaveBeenCalledWith('screenshot.png');
    expect(activeModal.dismiss).toHaveBeenCalled();
  });

  it('should reset form on destroy', fakeAsync(() => {
    createComponent();
    flushMicrotasks();
    component.feedbackRating = 4;
    component.feedbackCategory = 'lesson';
    component.feedbackCategoryChoice = 'lesson';
    component.includeSessionInfo = false;
    component.submitAnonymously = false;
    component.feedbackDescription = 'Helpful feedback.';
    component.captchaToken = 'captcha-token';
    component.screenshotFilename = 'screenshot.png';

    component.ngOnDestroy();

    expect(
      feedbackScreenshotStagingService.clearStagedScreenshot
    ).toHaveBeenCalledWith('screenshot.png');
    expect(component.feedbackRating).toEqual(0);
    expect(component.feedbackCategory).toBeNull();
    expect(component.feedbackCategoryChoice).toBeNull();
    expect(component.includeSessionInfo).toBe(true);
    expect(component.submitAnonymously).toBe(true);
    expect(component.feedbackDescription).toEqual('');
    expect(component.captchaToken).toEqual('');
    const turnstile = windowRef.nativeWindow.turnstile;
    expect(turnstile).toBeDefined();
    if (turnstile) {
      expect(turnstile.reset).toHaveBeenCalledWith('widget-id');
    }
  }));
});
