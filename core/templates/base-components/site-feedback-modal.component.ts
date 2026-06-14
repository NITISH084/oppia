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
 * @fileoverview Modal for reporting website related issues.
 */
import {Component} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';

import './site-feedback-modal.component.css';

@Component({
  selector: 'oppia-site-feedback-modal',
  templateUrl: './site-feedback-modal.component.html',
})
export class SiteFeedbackModalComponent {
  readonly MAX_REPORT_LENGTH = 2500;
  reportMessage: string = '';
  screenshotFilename: string | null = null;
  includeTechnicalLogs: boolean = true;
  screenshotPreviewDataUrl: string | null = null;
  isUploadingScreenshot: boolean = false;
  screenshotFileError: string | null = null;
  allowedScreenshotImageFormats: string[] = ['png', 'jpg', 'jpeg'];
  maxScreenshotSizeInKB: number = 5120;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private feedbackScreenshotStagingService: FeedbackScreenshotStagingService
  ) {}

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

  isReportFormValid(): boolean {
    return (
      this.reportMessage.trim().length > 0 &&
      this.reportMessage.length <= this.MAX_REPORT_LENGTH
    );
  }

  submitReport(): void {
    if (!this.isReportFormValid()) {
      return;
    }
    this.ngbActiveModal.close();
  }

  closeModal(): void {
    this.ngbActiveModal.dismiss('cancel');
  }
}
