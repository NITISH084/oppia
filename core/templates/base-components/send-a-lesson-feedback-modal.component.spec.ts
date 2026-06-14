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
 * @fileoverview Unit tests for the send a lesson feedback modal.
 */

import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {WindowRef} from 'services/contextual/window-ref.service';
import {UserService} from 'services/user.service';
import {SendALessonFeedbackModalComponent} from './send-a-lesson-feedback-modal.component';
import {PlayerPositionService} from 'pages/exploration-player-page/services/player-position.service';
import {PageContextService} from 'services/page-context.service';
import {LearnerAnswerInfoService} from 'pages/exploration-player-page/services/learner-answer-info.service';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {FormsModule} from '@angular/forms';
import {UserInfo} from 'domain/user/user-info.model';

class MockActiveModal {
  dismiss(): void {
    return;
  }

  close(): void {
    return;
  }
}

class MockWindowRef {
  nativeWindow = {
    location: {
      pathname: '/learn/math',
      href: '',
      reload: jasmine.createSpy('reload'),
    },
    gtag: () => {},
  };
}

describe('SendALessonFeedbackModalComponent', () => {
  let userInfo = {
    isLoggedIn: () => true,
  } as UserInfo;
  let component: SendALessonFeedbackModalComponent;
  let fixture: ComponentFixture<SendALessonFeedbackModalComponent>;
  let windowRef: WindowRef;
  let activeModal: MockActiveModal;
  let userService: UserService;
  let pageContextService: PageContextService;
  let playerPositionService: PlayerPositionService;
  let learnerAnswerInfoService: LearnerAnswerInfoService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [SendALessonFeedbackModalComponent],
      providers: [
        UserService,
        PageContextService,
        PlayerPositionService,
        LearnerAnswerInfoService,
        {
          provide: WindowRef,
          useClass: MockWindowRef,
        },
        {
          provide: NgbActiveModal,
          useClass: MockActiveModal,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SendALessonFeedbackModalComponent);
    windowRef = TestBed.inject(WindowRef);
    component = fixture.componentInstance;
    activeModal = TestBed.inject(NgbActiveModal);
    userService = TestBed.inject(UserService);
    pageContextService = TestBed.inject(PageContextService);
    playerPositionService = TestBed.inject(PlayerPositionService);
    learnerAnswerInfoService = TestBed.inject(LearnerAnswerInfoService);
    spyOn(userService, 'getUserInfoAsync').and.returnValue(
      Promise.resolve(userInfo)
    );
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should get user information on initialization', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(userService.getUserInfoAsync).toHaveBeenCalled();
    expect(component.isUserLoggedIn).toBe(true);
  }));

  it('should return false if feedback form is invalid', () => {
    component.feedbackText = '';
    expect(component.isFeedbackFormValid()).toBe(false);
  });

  it('should return true if feedback form is valid', () => {
    component.feedbackText = 'Feedback';
    expect(component.isFeedbackFormValid()).toBe(true);
  });

  it('should send feedback', () => {
    component.feedbackText = 'Feedback';
    component.sendFeedback();
    expect(component.feedbackText).toBe('');
  });

  it('should not close modal when feedback is invalid', () => {
    spyOn(component, 'closeModal');

    component.feedbackText = '';
    component.sendFeedback();

    expect(component.closeModal).not.toHaveBeenCalled();
  });

  it('should close modal when feedback is valid', () => {
    spyOn(component, 'closeModal');

    component.feedbackText = 'Valid feedback';
    component.sendFeedback();

    expect(component.closeModal).toHaveBeenCalled();
  });

  it('should return false when feedback exceeds max length', () => {
    component.feedbackText = 'a'.repeat(
      component.MAX_REVIEW_MESSAGE_LENGTH + 1
    );

    expect(component.isFeedbackFormValid()).toBe(false);
  });

  it('should redirect to login url when login url exists', fakeAsync(() => {
    spyOn(userService, 'getLoginUrlAsync').and.returnValue(
      Promise.resolve('/login')
    );

    component.signIn();
    tick();

    expect(windowRef.nativeWindow.location).toBe('/login');
  }));

  it('should reload page when login url is unavailable', fakeAsync(() => {
    spyOn(userService, 'getLoginUrlAsync').and.returnValue(Promise.resolve(''));

    component.signIn();
    tick();

    expect(windowRef.nativeWindow.location.reload).toHaveBeenCalled();
  }));

  it('should close', () => {
    spyOn(activeModal, 'dismiss');
    component.closeModal();
    expect(component.feedbackText).toBe('');
    expect(activeModal.dismiss).toHaveBeenCalled();
  });
});
