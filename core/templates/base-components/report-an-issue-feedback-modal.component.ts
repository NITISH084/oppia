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
 * @fileoverview Modal for reporting lesson related issues and bugs.
 */

import {Component} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FeedbackScreenshotStagingService} from 'domain/feedback/feedback-screenshot-staging.service';
import {PlayerPositionService} from 'pages/exploration-player-page/services/player-position.service';
import {PageContextService} from 'services/page-context.service';
import {LearnerAnswerInfoService} from 'pages/exploration-player-page/services/learner-answer-info.service';
import {FeedbackSessionInfoService} from 'services/feedback-session-info.service';

import './report-an-issue-feedback-modal.component.css';

type LessonissueCategory =
  | 'typo'
  | 'broken_layout_or_image'
  | 'confusing_or_incorrect_answer'
  | 'other_or_not_sure';

@Component({
  selector: 'oppia-report-an-issue-feedback-modal',
  templateUrl: './report-an-issue-feedback-modal.component.html',
})
export class ReportAnIssueFeedbackModalComponent {
  readonly MAX_REPORT_MESSAGE_LENGTH = 2500;
  category: LessonissueCategory | '' = '';
  ShowTechnicalLogsCheckbox: boolean = true;
  includeTechnicalLogs: boolean = true;
  reportMessage: string = '';
  screenshotFilename: string | null = null;
  screenshotPreviewDataUrl: string | null = null;
  isUploadingScreenshot: boolean = false;
  screenshotFileError: string | null = null;
  allowedScreenshotImageFormats: string[] = ['png', 'jpg', 'jpeg'];
  maxScreenshotSizeInKB: number = 1024;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private feedbackScreenshotStagingService: FeedbackScreenshotStagingService,
    private playerPositionService: PlayerPositionService,
    private pageContextService: PageContextService,
    private learnerAnswerInfoService: LearnerAnswerInfoService,
    private feedbackSessionInfoService: FeedbackSessionInfoService
  ) {}

  selectCategory(category: LessonissueCategory): void {
    this.category = category;

    this.ShowTechnicalLogsCheckbox =
      category === 'broken_layout_or_image' || category === 'other_or_not_sure';
    console.log(category, this.ShowTechnicalLogsCheckbox);
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

  isReportFormValid(): boolean {
    return (
      this.reportMessage.trim().length > 0 &&
      this.reportMessage.length <= this.MAX_REPORT_MESSAGE_LENGTH
    );
  }

  submitReport(): void {
    if (!this.isReportFormValid()) {
      return;
    }

    // const explorationId = this.pageContextService.getExplorationId();
    // const explorationVersion = this.pageContextService.getExplorationVersion();
    // const stateName = this.playerPositionService.getCurrentStateName();
    // const stateIndex = this.playerPositionService.getDisplayedCardIndex();
    // const learnerAnswerInfo = this.learnerAnswerInfoService.getCurrentAnswer();
    // const sessioninfo = this.feedbackSessionInfoService.getSessionInfo()

    // console.log({
    //   explorationId,
    //   explorationVersion,
    //   stateName,
    //   stateIndex,
    //   learnerAnswerInfo,
    //   sessioninfo,
    //   category: this.category,
    //   includeTechnicalLogs: this.includeTechnicalLogs,
    //   reportMessage: this.reportMessage,
    //   screenshotFilename: this.screenshotFilename
    // });

    this.closeModal();
  }

  closeModal(): void {
    this.reportMessage = '';
    this.category = '';
    this.includeTechnicalLogs = true;
    this.removeScreenshot();
    this.ngbActiveModal.dismiss();
  }

  ngOnDestroy(): void {
    this.closeModal();
  }
}
