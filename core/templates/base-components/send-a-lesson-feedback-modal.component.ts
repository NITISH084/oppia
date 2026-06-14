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
import './send-a-lesson-feedback-modal.component.css';

@Component({
  selector: 'oppia-send-a-lesson-feedback-modal',
  templateUrl: './send-a-lesson-feedback-modal.component.html',
})
export class SendALessonFeedbackModalComponent {
  readonly MAX_REVIEW_MESSAGE_LENGTH = 2500;
  isUserLoggedIn: boolean = false;
  feedbackText: string = '';

  constructor(
    private userService: UserService,
    private activeModal: NgbActiveModal,
    private windowRef: WindowRef
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

  sendFeedback(): void {
    if (this.isFeedbackFormValid()) {
      this.activeModal.dismiss();
    }
  }

  closeModal(): void {
    this.feedbackText = '';
    this.activeModal.dismiss();
  }
}
