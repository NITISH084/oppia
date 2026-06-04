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

import {Component} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {UserService} from 'services/user.service';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';

@Component({
  selector: 'oppia-feedback-submission-modal',
  templateUrl: './feedback-submission-modal.component.html',
})
export class FeedbackSubmissionModalComponent {
  feedbackRating: number = 0;
  readonly MAX_FEEDBACK_DESCRIPTION_LENGTH: number = 2500;
  readonly feedbackRatinglabels: {[rating: number]: string} = {
    1: 'Very bad',
    2: 'Bad',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  };
  feedbackCategory!: 'platform' | 'lesson';
  feedbackCategoryChoice!: 'platform' | 'lesson' | 'unsure';
  includeSessionInfo: boolean = true;
  submitAnonymously: boolean = true;
  feedbackDescription: string = '';
  feedbackDescriptionError: boolean = false;
  feedbackDescriptionTooLongError: boolean = false;
  isSubmittingFeedback: boolean = false;
  isUserLoggedIn: boolean = false;
  captchaToken: string = '';
  captchaSiteKey: string | null = null;
  screenshotFilename: string | null = null;
  screenshotPreviewDataUrl: string | null = null;
  screenshotFileError: string | null = null;
  allowedScreenshotImageFormats: string[] = ['png', 'jpeg'];
  maxScreenshotSizeInKB: number = 1024;

  constructor(
    private activeModal: NgbActiveModal,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService
      .getUserInfoAsync()
      .then(userInfo => {
        this.isUserLoggedIn = userInfo.isLoggedIn();
        // Captcha checker
      })
      .catch(() => {
        this.isUserLoggedIn = false;
        // Captcha checker
      });
    console.log(this.isUserLoggedIn);
  }

  setFeedbackRating(rating: number): void {
    this.feedbackRating = rating;
  }

  getSelectedFeedbackRatingLabel(): string {
    return this.feedbackRatinglabels[this.feedbackRating];
  }

  setFeedbackCategoryChoice(choice: 'lesson' | 'platform' | 'unsure'): void {
    this.feedbackCategory = choice === 'unsure' ? 'platform' : choice;
  }

  onFeedbacKDescriptionChange(description: string): void {
    this.feedbackDescription = description;
    this.feedbackDescriptionTooLongError =
      description.trim().length > this.MAX_FEEDBACK_DESCRIPTION_LENGTH;
    if (description.trim()) {
      this.feedbackDescriptionError = false;
    }
  }

  onScreenshotFileReceived(file: File): void {}

  removeScreenshot(): void {
    this;
  }

  close(): void {
    // Also remove the staged screenshot.
    this.activeModal.dismiss();
  }
}
