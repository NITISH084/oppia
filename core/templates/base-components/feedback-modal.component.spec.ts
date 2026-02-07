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
 * @fileoverview Tests for FeedbackModalComponent.
 */

import {NO_ERRORS_SCHEMA} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FeedbackModalComponent} from './feedback-modal.component';
import {MockTranslatePipe} from 'tests/unit-test-utils';
import {PlatformFeedbackBackendApiService} from 'services/platform-feedback-backend-api.service';
import {UserService} from 'services/user.service';
import {WindowRef} from 'services/contextual/window-ref.service';
import {UrlService} from 'services/contextual/url.service';
import {I18nLanguageCodeService} from 'services/i18n-language-code.service';

class MockUserService {
  getUserInfoAsync(): Promise<{isLoggedIn: () => boolean}> {
    return Promise.resolve({isLoggedIn: () => false});
  }
}

class MockWindowRef {
  nativeWindow = {
    location: {href: 'https://example.com'},
    navigator: {userAgent: 'test-agent'},
    innerWidth: 800,
    innerHeight: 600,
    document: {title: 'Test', referrer: ''},
  };
}

class MockUrlService {
  getPathname(): string {
    return '/test';
  }
}

class MockI18nLanguageCodeService {
  getCurrentI18nLanguageCode(): string {
    return 'en';
  }

  isCurrentLanguageRTL(): boolean {
    return false;
  }
}

describe('FeedbackModalComponent', () => {
  let fixture: ComponentFixture<FeedbackModalComponent>;
  let component: FeedbackModalComponent;
  let platformFeedbackBackendApiService: jasmine.SpyObj<PlatformFeedbackBackendApiService>;

  beforeEach(waitForAsync(() => {
    platformFeedbackBackendApiService = jasmine.createSpyObj(
      'PlatformFeedbackBackendApiService',
      ['submitFeedbackAsync']
    );

    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [FeedbackModalComponent, MockTranslatePipe],
      providers: [
        NgbActiveModal,
        {
          provide: PlatformFeedbackBackendApiService,
          useValue: platformFeedbackBackendApiService,
        },
        {provide: UserService, useClass: MockUserService},
        {provide: WindowRef, useClass: MockWindowRef},
        {provide: UrlService, useClass: MockUrlService},
        {
          provide: I18nLanguageCodeService,
          useClass: MockI18nLanguageCodeService,
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeedbackModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should not submit feedback when description is empty', () => {
    component.feedbackDescription = '   ';
    component.submitFeedback();
    expect(component.feedbackDescriptionError).toBeTrue();
    expect(
      platformFeedbackBackendApiService.submitFeedbackAsync
    ).not.toHaveBeenCalled();
  });

  it('should submit feedback and reset the form', fakeAsync(() => {
    platformFeedbackBackendApiService.submitFeedbackAsync.and.returnValue(
      Promise.resolve({feedback_id: 'feedback_id'})
    );
    component.feedbackDescription = 'Some feedback';
    component.feedbackRating = 5;
    component.allowContact = true;
    component.feedbackContactEmail = 'test@example.com';
    component.includeSessionInfo = false;
    component.submitFeedback();
    tick();
    expect(
      platformFeedbackBackendApiService.submitFeedbackAsync
    ).toHaveBeenCalled();
    expect(component.submitSuccess).toBeTrue();
    expect(component.feedbackDescription).toBe('');
  }));

  it('should set an i18n error key on submission failure', fakeAsync(() => {
    platformFeedbackBackendApiService.submitFeedbackAsync.and.returnValue(
      Promise.reject(null)
    );
    component.feedbackDescription = 'Some feedback';
    component.submitFeedback();
    tick();
    expect(component.submitError).toBe('I18N_FEEDBACK_SUBMIT_ERROR');
    expect(component.submitErrorIsI18nKey).toBeTrue();
  }));
});
