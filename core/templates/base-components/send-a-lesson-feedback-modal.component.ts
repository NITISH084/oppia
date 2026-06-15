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
 * @fileoverview Modal for sending a lesson related feedback.
 */

import {Component} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {WindowRef} from 'services/contextual/window-ref.service';
import {UserService} from 'services/user.service';
import {PlayerPositionService} from 'pages/exploration-player-page/services/player-position.service';
import {PageContextService} from 'services/page-context.service';
import {LearnerAnswerInfoService} from 'pages/exploration-player-page/services/learner-answer-info.service';
import {SendALessonFeedbackModel} from 'domain/feedback/feedback.model';
import {FeedbackBackendApiService} from 'domain/feedback/feedback-backend-api.service';
import './send-a-lesson-feedback-modal.component.css';

@Component({
  selector: 'oppia-send-a-lesson-feedback-modal',
  templateUrl: './send-a-lesson-feedback-modal.component.html',
})
export class SendALessonFeedbackModalComponent {
  readonly MAX_REVIEW_MESSAGE_LENGTH = 2500;
  isUserLoggedIn: boolean = false;
  feedbackText: string = '';
  explorationId: string = '';
  explorationVersion: number | null = 0;
  stateName: string = '';
  stateIndex: number = 0;
  learnerCurrentAnswer: string | null = null;

  constructor(
    private userService: UserService,
    private activeModal: NgbActiveModal,
    private windowRef: WindowRef,
    private playerPositionService: PlayerPositionService,
    private pageContextService: PageContextService,
    private learnerAnswerInfoService: LearnerAnswerInfoService,
    private feedbackBackendApiService: FeedbackBackendApiService
  ) {}

  ngOnInit(): void {
    this.userService.getUserInfoAsync().then(userInfo => {
      this.isUserLoggedIn = userInfo.isLoggedIn();
    });
  }

  signIn(): void {
    this.userService.getLoginUrlAsync().then(loginUrl => {
      if (loginUrl) {
        (
          this.windowRef.nativeWindow as {location: string | Location}
        ).location = loginUrl;
      } else {
        this.windowRef.nativeWindow.location.reload();
      }
    });
  }

  isFeedbackFormValid(): boolean {
    if (!this.feedbackText) {
      return false;
    }

    return (
      this.feedbackText.trim().length > 0 &&
      this.feedbackText.length <= this.MAX_REVIEW_MESSAGE_LENGTH
    );
  }

  async sendFeedback(): Promise<void> {
    if (!this.isFeedbackFormValid()) {
      return;
    }
    this.explorationId = this.pageContextService.getExplorationId();
    this.explorationVersion = this.pageContextService.getExplorationVersion();
    this.stateName = this.playerPositionService.getCurrentStateName();
    this.stateIndex = this.playerPositionService.getDisplayedCardIndex();
    this.learnerCurrentAnswer =
      this.learnerAnswerInfoService.getCurrentAnswer();

    const feedbackPayload = SendALessonFeedbackModel.createForSubmission({
      feedbackText: this.feedbackText,
      exploration_context: {
        explorationId: this.explorationId,
        explorationVersion: this.explorationVersion ?? 0,
        stateName: this.stateName,
        stateIndex: this.stateIndex,
        learnerCurrentAnswer: this.learnerCurrentAnswer,
      },
    });

    try {
      await this.feedbackBackendApiService.submitLessonFeedbackAsync(
        feedbackPayload
      );
      // Show success toast.
    } catch (error) {
      // Show error toast.
      console.error('Failed to submit Lesson Feedback', error);
      return;
    }
    this.closeModal();
  }

  closeModal(): void {
    this.feedbackText = '';
    this.explorationId = '';
    this.explorationVersion = 0;
    this.stateName = '';
    this.stateIndex = 0;
    this.learnerCurrentAnswer = null;
    this.activeModal.dismiss();
  }
}
