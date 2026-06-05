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
 * @fileoverview Component for the web user feedback submission modal.
 */

import {Component, ElementRef, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {UserService} from 'services/user.service';
import {WindowRef} from 'services/contextual/window-ref.service';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';
import {FeedbackBackendApiService} from 'domain/feedback/feedback-backend-api.service';
import {
  InsertScriptService,
  KNOWN_SCRIPTS,
} from 'services/insert-script.service';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
}

interface TurnstileWindow extends Window {
  turnstile?: TurnstileApi;
}

@Component({
  selector: 'oppia-feedback-submission-modal',
  templateUrl: './feedback-submission-modal.component.html',
  styleUrls: ['./feedback-submission-modal.component.css'],
})
export class FeedbackSubmissionModalComponent {
  feedbackRating: number = 0;
  @ViewChild('turnstileContainer')
  turnstileContainer!: ElementRef<HTMLDivElement>;
  readonly MAX_FEEDBACK_DESCRIPTION_LENGTH: number = 2500;
  readonly feedbackRatinglabels: {[rating: number]: string} = {
    1: 'Very bad',
    2: 'Bad',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  };
  private turnstileWidgetId: string | null = null;
  feedbackCategory!: 'platform' | 'lesson' | null;
  feedbackCategoryChoice!: 'platform' | 'lesson' | 'unsure' | null;
  includeSessionInfo: boolean = true;
  submitAnonymously: boolean = true;
  feedbackDescription: string = '';
  feedbackDescriptionError: boolean = false;
  feedbackDescriptionTooLongError: boolean = false;
  isSubmittingFeedback: boolean = false;
  isUserLoggedIn: boolean = false;
  captchaToken: string = '';
  captchaSiteKey: string | null = null;
  captchaLoadError: string | null = null;
  screenshotFilename: string | null = null;
  screenshotPreviewDataUrl: string | null = null;
  screenshotFileError: string | null = null;
  allowedScreenshotImageFormats: string[] = ['png', 'jpeg'];
  maxScreenshotSizeInKB: number = 1024;
  isUploadingScreenshot: boolean = false;
  submitSuccess: boolean = false;
  submitErrorIsI18nKey: boolean = false;
  submitError: string | null = null;

  constructor(
    private activeModal: NgbActiveModal,
    private userService: UserService,
    private windowRef: WindowRef,
    private insertScriptService: InsertScriptService,
    private feedbackScreenshotStagingService: FeedbackScreenshotStagingService,
    private feedbackBackendApiService: FeedbackBackendApiService
  ) {}

  ngOnInit(): void {
    this.userService
      .getUserInfoAsync()
      .then(userInfo => {
        this.isUserLoggedIn = userInfo.isLoggedIn();
        this.initializeCaptchaIfRequired();
      })
      .catch(() => {
        this.isUserLoggedIn = false;
        this.initializeCaptchaIfRequired();
      });
  }

  setFeedbackRating(rating: number): void {
    this.feedbackRating = rating;
  }

  getSelectedFeedbackRatingLabel(): string {
    return this.feedbackRatinglabels[this.feedbackRating];
  }

  setFeedbackCategoryChoice(choice: 'lesson' | 'platform' | 'unsure'): void {
    this.feedbackCategoryChoice = choice;
    this.feedbackCategory = choice === 'unsure' ? 'platform' : choice;
  }

  onFeedbackDescriptionChange(description: string): void {
    this.feedbackDescription = description;
    this.feedbackDescriptionTooLongError =
      description.trim().length > this.MAX_FEEDBACK_DESCRIPTION_LENGTH;
    if (description.trim()) {
      this.feedbackDescriptionError = false;
    }
  }

  onScreenshotFileReceived(file: File): void {
    this.isUploadingScreenshot = true;
    this.removeScreenshot();
    this.feedbackScreenshotStagingService
      .stageScreenshotAsync(file)
      .then(stagedScreenshot => {
        this.screenshotFilename = stagedScreenshot.filename;
        this.screenshotPreviewDataUrl = stagedScreenshot.previewDataUrl;
      })
      .catch(() => {
        this.screenshotFileError = 'I18N_FEEDBACK_SCREENSHOT_UPLOAD_ERROR';
        this.screenshotFilename = null;
        this.screenshotPreviewDataUrl = null;
      })
      .finally(() => {
        this.isUploadingScreenshot = false;
      });
  }

  removeScreenshot(): void {
    if (this.screenshotFilename) {
      this.feedbackScreenshotStagingService.clearStagedScreenshot(
        this.screenshotFilename
      );
    }
    this.screenshotFilename = null;
    this.screenshotPreviewDataUrl = null;
    this.screenshotFileError = null;
  }

  async submitFeedback(): Promise<void> {
    this.submitSuccess = false;
    this.submitError = null;
    this.submitErrorIsI18nKey = false;
    const trimmedDescription = this.feedbackDescription.trim();
    this.feedbackDescriptionError = !trimmedDescription;
    this.feedbackDescriptionTooLongError =
      trimmedDescription.length > this.MAX_FEEDBACK_DESCRIPTION_LENGTH;
    if (this.feedbackDescriptionError || this.feedbackDescriptionTooLongError) {
      return;
    }
    if (!this.isUserLoggedIn && !this.captchaToken) {
      this.submitError = 'Please complete captcha before submitting Feedback.';
      this.submitErrorIsI18nKey = false;
      return;
    }

    this.isSubmittingFeedback = true;
    // TODO(M1.8): Implement the actual feedback submission logic here, including sending the feedback data to the backend and handling the response.
    this.isSubmittingFeedback = false;
  }

  close(): void {
    this.removeScreenshot();
    this.activeModal.dismiss();
  }

  private resetFeedbackForm(): void {
    this.removeScreenshot();
    this.feedbackRating = 0;
    this.feedbackCategory = null;
    this.feedbackCategoryChoice = null;
    this.includeSessionInfo = true;
    this.submitAnonymously = true;
    this.feedbackDescription = '';
    this.captchaToken = '';
    if (this.turnstileWidgetId) {
      const turnstileWindow = this.windowRef.nativeWindow as TurnstileWindow;
      turnstileWindow.turnstile?.reset(this.turnstileWidgetId);
    }
  }

  private initializeCaptchaIfRequired(): void {
    if (this.isUserLoggedIn) {
      return;
    }
    this.feedbackBackendApiService
      .fetchCaptchaConfigAsync()
      .then(config => {
        this.captchaSiteKey = config.site_key;
        if (!this.captchaSiteKey) {
          this.captchaLoadError =
            'Captcha is currently unavailable. Please Login to submit feedback.';
          return;
        }
        this.insertScriptService.loadScript(KNOWN_SCRIPTS.TURNSTILE, () => {
          this.renderTurnstile();
        });
      })
      .catch(() => {
        this.captchaLoadError =
          'Captcha is currently unavailable, Please Login to submit feedback.';
      });
  }

  private renderTurnstile(): void {
    if (
      this.turnstileWidgetId ||
      !this.captchaSiteKey ||
      !this.turnstileContainer
    ) {
      return;
    }
    const turnstileWindow = this.windowRef.nativeWindow as TurnstileWindow;
    if (!turnstileWindow.turnstile) {
      this.captchaLoadError = 'Captcha failed to load.';
      return;
    }
    this.turnstileWidgetId = turnstileWindow.turnstile.render(
      this.turnstileContainer.nativeElement,
      {
        sitekey: this.captchaSiteKey,
        callback: (token: string) => {
          this.captchaToken = token;
          this.captchaLoadError = null;
        },
        'error-callback': () => {
          this.captchaToken = '';
          this.captchaLoadError = 'Captcha failed to load.';
        },
        'expired-callback': () => {
          this.captchaToken = '';
        },
      }
    );
  }

  ngOnDestroy(): void {
    this.resetFeedbackForm();
  }
}
