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
 * @fileoverview Component for the platform feedback modal.
 */

import {Component} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {PlatformFeedbackBackendApiService} from 'services/platform-feedback-backend-api.service';
import {UserService} from 'services/user.service';
import {WindowRef} from 'services/contextual/window-ref.service';
import {UrlService} from 'services/contextual/url.service';
import {I18nLanguageCodeService} from 'services/i18n-language-code.service';

interface SessionInfo {
  client_time_msecs: number;
  timezone_offset_mins: number;
  user_agent: string;
  viewport: {
    width: number;
    height: number;
  };
  page: {
    url: string;
    path: string;
    title: string;
    referrer: string;
  };
  locale: {
    language_code: string;
    direction: 'ltr' | 'rtl';
  };
}

@Component({
  selector: 'oppia-feedback-modal',
  templateUrl: './feedback-modal.component.html',
  styleUrls: ['./feedback-modal.component.css'],
})
export class FeedbackModalComponent {
  ratingStars: number[] = [1, 2, 3, 4, 5];
  feedbackRating: number = 0;
  feedbackCategory: 'platform' | 'lesson' = 'platform';
  feedbackCategoryChoice: 'lesson' | 'platform' | 'unsure' = 'platform';
  allowContact: boolean = false;
  includeSessionInfo: boolean = false;
  feedbackDescription: string = '';
  feedbackContactEmail: string = '';
  feedbackDescriptionError: boolean = false;
  isSubmittingFeedback: boolean = false;
  submitError: string | null = null;
  submitErrorIsI18nKey: boolean = false;
  submitSuccess: boolean = false;
  isUserLoggedIn: boolean = false;
  captchaToken: string = '';
  captchaChecked: boolean = false;
  screenshotPreviewUrl: string | null = null;
  screenshotFilename: string | null = null;
  screenshotEntityId: string | null = null;
  screenshotFileError: string | null = null;
  isUploadingScreenshot: boolean = false;

  constructor(
    private activeModal: NgbActiveModal,
    private platformFeedbackBackendApiService: PlatformFeedbackBackendApiService,
    private userService: UserService,
    private windowRef: WindowRef,
    private urlService: UrlService,
    private i18nLanguageCodeService: I18nLanguageCodeService
  ) {}

  ngOnInit(): void {
    this.userService
      .getUserInfoAsync()
      .then(userInfo => {
        this.isUserLoggedIn = userInfo.isLoggedIn();
      })
      .catch(() => {
        this.isUserLoggedIn = false;
      });
  }

  close(): void {
    this.activeModal.dismiss();
  }

  setFeedbackRating(star: number): void {
    this.feedbackRating = star;
  }

  setFeedbackCategory(category: 'platform' | 'lesson'): void {
    this.feedbackCategory = category;
  }

  setFeedbackCategoryChoice(choice: 'lesson' | 'platform' | 'unsure'): void {
    this.feedbackCategoryChoice = choice;
    this.feedbackCategory = choice === 'lesson' ? 'lesson' : 'platform';
  }

  private buildScreenshotFilename(file: File): string {
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    return `platform_feedback_${timestamp}_${randomSuffix}.${extension}`;
  }

  onScreenshotFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const isValidType = file.type === 'image/png' || file.type === 'image/jpeg';
    if (!isValidType) {
      this.screenshotFileError = 'I18N_FEEDBACK_SCREENSHOT_FILETYPE_ERROR';
      this.screenshotPreviewUrl = null;
      this.screenshotFilename = null;
      this.screenshotEntityId = null;
      return;
    }
    const maxBytes = 100 * 1024;
    if (file.size > maxBytes) {
      this.screenshotFileError = 'I18N_FEEDBACK_SCREENSHOT_SIZE_ERROR';
      this.screenshotPreviewUrl = null;
      this.screenshotFilename = null;
      this.screenshotEntityId = null;
      return;
    }
    this.screenshotFileError = null;
    this.isUploadingScreenshot = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.screenshotPreviewUrl = String(reader.result);
    };
    reader.readAsDataURL(file);

    const filename = this.buildScreenshotFilename(file);
    this.platformFeedbackBackendApiService
      .uploadScreenshotAsync(file, filename)
      .then(response => {
        this.screenshotFilename = response.filename;
        this.screenshotEntityId = response.entity_id;
      })
      .catch(() => {
        this.screenshotFileError = 'I18N_FEEDBACK_SCREENSHOT_UPLOAD_ERROR';
        this.screenshotFilename = null;
        this.screenshotEntityId = null;
      })
      .finally(() => {
        this.isUploadingScreenshot = false;
      });
  }

  private buildSessionInfo(): SessionInfo {
    const window = this.windowRef.nativeWindow;
    return {
      client_time_msecs: new Date().valueOf(),
      timezone_offset_mins: new Date().getTimezoneOffset(),
      user_agent: window.navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      page: {
        url: window.location.href,
        path: this.urlService.getPathname(),
        title: window.document.title,
        referrer: window.document.referrer,
      },
      locale: {
        language_code:
          this.i18nLanguageCodeService.getCurrentI18nLanguageCode(),
        direction: this.i18nLanguageCodeService.isCurrentLanguageRTL()
          ? 'rtl'
          : 'ltr',
      },
    };
  }

  submitFeedback(): void {
    this.submitSuccess = false;
    this.submitError = null;
    this.submitErrorIsI18nKey = false;
    const trimmedDescription = this.feedbackDescription.trim();
    this.feedbackDescriptionError = !trimmedDescription;
    if (this.feedbackDescriptionError) {
      return;
    }

    this.isSubmittingFeedback = true;
    const pageUrl = this.windowRef.nativeWindow.location.href;
    const sessionInfo = this.includeSessionInfo
      ? this.buildSessionInfo()
      : null;
    console.log(sessionInfo);
    const rating = this.feedbackRating > 0 ? this.feedbackRating : null;

    this.platformFeedbackBackendApiService
      .submitFeedbackAsync({
        category: this.feedbackCategory,
        description: trimmedDescription,
        page_url: pageUrl,
        language_code:
          this.i18nLanguageCodeService.getCurrentI18nLanguageCode(),
        rating: rating,
        screenshot_filename: this.screenshotFilename,
        screenshot_entity_id: this.screenshotEntityId,
        contact_email: this.allowContact ? this.feedbackContactEmail : null,
        allow_contact: this.allowContact,
        include_session_info: this.includeSessionInfo,
        session_info: sessionInfo,
        captcha_token: this.isUserLoggedIn
          ? null
          : this.captchaChecked
            ? this.captchaToken || 'mock'
            : null,
      })
      .then(() => {
        this.submitSuccess = true;
        this.resetFeedbackForm();
      })
      .catch(error => {
        if (error && error.error && error.error.error) {
          this.submitError = error.error.error;
          this.submitErrorIsI18nKey = false;
        } else {
          this.submitError = 'I18N_FEEDBACK_SUBMIT_ERROR';
          this.submitErrorIsI18nKey = true;
        }
      })
      .finally(() => {
        this.isSubmittingFeedback = false;
      });
  }

  private resetFeedbackForm(): void {
    this.feedbackRating = 0;
    this.feedbackCategory = 'platform';
    this.allowContact = false;
    this.includeSessionInfo = false;
    this.feedbackDescription = '';
    this.feedbackContactEmail = '';
    this.captchaToken = '';
    this.screenshotPreviewUrl = null;
    this.screenshotFilename = null;
    this.screenshotEntityId = null;
    this.screenshotFileError = null;
  }
}
