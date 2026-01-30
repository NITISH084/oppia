// Copyright 2020 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Unit tests for SiteAnalyticsService.
 */

import {TestBed} from '@angular/core/testing';
import {SiteAnalyticsService} from 'services/site-analytics.service';
import {WindowRef} from 'services/contextual/window-ref.service';
import {LocalStorageService} from 'services/local-storage.service';
import {UserService} from 'services/user.service';
import {NavbarAndFooterGATrackingPages} from 'app.constants';
import jasmine from 'jasmine';

describe('Site Analytics Service', () => {
  let sas: SiteAnalyticsService;
  let ws: WindowRef;
  let gtagSpy: jasmine.Spy;
  let pathname = 'pathname';
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let userService: jasmine.SpyObj<UserService>;
  const explorationId = 'abc1';

  class MockWindowRef {
    nativeWindow = {
      gtag: () => {},
      dataLayer: [],
      location: {
        pathname,
      },
    };
  }

  beforeEach(() => {
    const localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', [
      'getLastPageViewTime',
      'setLastPageViewTime',
    ]);
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUserInfoAsync',
    ]);
    TestBed.configureTestingModule({
      providers: [
        SiteAnalyticsService,
        {
          provide: WindowRef,
          useClass: MockWindowRef,
        },
        {provide: LocalStorageService, useValue: localStorageServiceSpy},
        {provide: UserService, useValue: userServiceSpy},
      ],
    }).compileComponents();

    sas = TestBed.inject(SiteAnalyticsService);
    ws = TestBed.inject(WindowRef);
    localStorageService = TestBed.inject(
      LocalStorageService
    ) as jasmine.SpyObj<LocalStorageService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    userService.getUserInfoAsync.and.resolveTo({
      isLoggedIn: () => true,
    } as {isLoggedIn: () => boolean});
  });

  it('should initialize google analytics', () => {
    expect(ws.nativeWindow.gtag).toBeDefined();
  });

  describe('when tested using gtag spy', () => {
    beforeEach(() => {
      gtagSpy = spyOn(ws.nativeWindow, 'gtag');
    });

    it('should register start login event', async () => {
      const element = 'LoginEventButton';
      await sas.registerStartLoginEvent(element);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'login', {
        source_element: 'LoginEventButton',
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register new signup event', async () => {
      await sas.registerNewSignupEvent('srcElement');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'sign_up', {
        source_element: 'srcElement',
        login_status: 'logged_in',
      });
    });

    it('should register click browse lessons event', async () => {
      await sas.registerClickBrowseLessonsButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'browse_lessons_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register click start learning button event', async () => {
      await sas.registerClickStartLearningButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'start_learning_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register click start contributing button event', async () => {
      await sas.registerClickStartContributingButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'start_contributing_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register go to donation site event', async () => {
      const donationSite = 'https://donation.com';
      await sas.registerGoToDonationSiteEvent(donationSite);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'go_to_donation_site', {
        donation_site_name: donationSite,
        login_status: 'logged_in',
      });
    });

    it('should register apply to teach with oppia event', async () => {
      await sas.registerApplyToTeachWithOppiaEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'apply_to_teach_with_oppia',
        {login_status: 'logged_in'}
      );
    });

    it('should register click create exploration button event', async () => {
      await sas.registerClickCreateExplorationButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'create_exploration_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register create new exploration event', async () => {
      const explorationId = 'exp123';
      await sas.registerCreateNewExplorationEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'create_new_exploration', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register create new exploration in collection event', async () => {
      const explorationId = 'exp123';
      await sas.registerCreateNewExplorationInCollectionEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'create_new_exploration_in_collection',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register new collection event', async () => {
      const collectionId = 'abc1';
      await sas.registerCreateNewCollectionEvent(collectionId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'create_new_collection', {
        collection_id: collectionId,
        login_status: 'logged_in',
      });
    });

    it('should register commit changes to private exploration event', async () => {
      const explorationId = 'exp123';
      await sas.registerCommitChangesToPrivateExplorationEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'commit_changes_to_private_exploration',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register share exploration event', async () => {
      const network = 'ShareExplorationNetwork';
      await sas.registerShareExplorationEvent(network);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'share_exploration', {
        network: network,
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register share collection event', async () => {
      const network = 'ShareCollectionNetwork';
      await sas.registerShareCollectionEvent(network);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'share_collection', {
        network: network,
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register share blog post event', async () => {
      const network = 'ShareBlogPostNetwork';
      await sas.registerShareBlogPostEvent(network);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'share_blog_post', {
        network: network,
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register open embed info event', async () => {
      await sas.registerOpenEmbedInfoEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'open_embed_info_modal', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register commit changes to public exploration event', async () => {
      await sas.registerCommitChangesToPublicExplorationEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'commit_changes_to_public_exploration',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register tutorial modal open event', async () => {
      await sas.registerTutorialModalOpenEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'tutorial_modal_open', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register decline tutorial modal event', async () => {
      await sas.registerDeclineTutorialModalEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'decline_tutorial_modal', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register accept tutorial modal event', async () => {
      await sas.registerAcceptTutorialModalEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'accept_tutorial_modal', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register click help button event', async () => {
      await sas.registerClickHelpButtonEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'click_help_button', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register visit help center event', async () => {
      await sas.registerVisitHelpCenterEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'visit_help_center', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register open tutorial from help center event', async () => {
      await sas.registerOpenTutorialFromHelpCenterEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'open_tutorial_from_help_center',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register skip tutorial event', async () => {
      await sas.registerSkipTutorialEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'skip_tutorial', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register finish tutorial event', async () => {
      await sas.registerFinishTutorialEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'finish_tutorial', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register editor first entry event', async () => {
      await sas.registerEditorFirstEntryEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'editor_first_entry', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register first open content box event', async () => {
      await sas.registerFirstOpenContentBoxEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'first_open_content_box', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register first save content event', async () => {
      await sas.registerFirstSaveContentEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'first_save_content', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register first click add interaction event', async () => {
      await sas.registerFirstClickAddInteractionEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'first_click_add_interaction',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register select interaction type event', async () => {
      await sas.registerFirstSelectInteractionTypeEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'first_select_interaction_type',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register first save interaction event', async () => {
      await sas.registerFirstSaveInteractionEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'first_save_interaction', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register first save rule event', async () => {
      await sas.registerFirstSaveRuleEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'first_save_rule', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register first create second state event', async () => {
      await sas.registerFirstCreateSecondStateEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'first_create_second_state',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register save playable exploration event', async () => {
      await sas.registerSavePlayableExplorationEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'save_playable_exploration',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register open publish exploration modal event', async () => {
      await sas.registerOpenPublishExplorationModalEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'open_publish_exploration_modal',
        {
          exploration_id: explorationId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register publish exploration event', async () => {
      await sas.registerPublishExplorationEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'publish_exploration', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register visit oppia from iframe event', async () => {
      await sas.registerVisitOppiaFromIframeEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'visit_oppia_from_iframe', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register new card when card number is less than 10', async () => {
      const cardNumber = 1;
      await sas.registerNewCard(cardNumber, 'abc1');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'new_card_load', {
        exploration_id: 'abc1',
        card_number: cardNumber,
        login_status: 'logged_in',
      });
    });

    it(
      'should register new card when card number is greater than 10 and' +
        " it's a multiple of 10",
      async () => {
        const cardNumber = 20;
        await sas.registerNewCard(cardNumber, 'abc1');

        expect(gtagSpy).toHaveBeenCalledWith('event', 'new_card_load', {
          exploration_id: 'abc1',
          card_number: cardNumber,
          login_status: 'logged_in',
        });
      }
    );

    it('should not register new card', async () => {
      const cardNumber = 35;
      await sas.registerNewCard(cardNumber, 'abc1');

      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('should register finish exploration event', async () => {
      await sas.registerFinishExploration('123');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'lesson_completed', {
        exploration_id: '123',
        login_status: 'logged_in',
      });
    });

    it('should register curated lesson started event', async () => {
      await sas.registerCuratedLessonStarted('Fractions', '123');

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'classroom_lesson_started',
        {
          topic_name: 'Fractions',
          exploration_id: '123',
          login_status: 'logged_in',
        }
      );
    });

    it('should register curated lesson completed event', async () => {
      await sas.registerCuratedLessonCompleted(
        'math',
        'Fractions',
        'ch1',
        '123',
        '2',
        '3',
        'en'
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'classroom_lesson_completed',
        {
          classroom_name: 'math',
          topic_name: 'Fractions',
          chapter_name: 'ch1',
          exploration_id: '123',
          chapter_number: '2',
          chapter_card_count: '3',
          exploration_language: 'en',
          login_status: 'logged_in',
        }
      );
    });

    it('should register open collection from landing page event', async () => {
      const collectionId = 'abc1';
      await sas.registerOpenCollectionFromLandingPageEvent(collectionId);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'open_fractions_from_landing_page',
        {
          collection_id: collectionId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register save recorded audio event', async () => {
      await sas.registerSaveRecordedAudioEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'save_recorded_audio', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register audio recording event', async () => {
      await sas.registerStartAudioRecordingEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'start_audio_recording', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register upload audio event', async () => {
      await sas.registerUploadAudioEvent(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'upload_recorded_audio', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register Contributor Dashboard suggest event', async () => {
      const contributionType = 'Translation';
      await sas.registerContributorDashboardSuggestEvent(contributionType);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'contributor_dashboard_suggest',
        {
          contribution_type: contributionType,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Contributor Dashboard submit suggestion event', async () => {
      const contributionType = 'Translation';
      await sas.registerContributorDashboardSubmitSuggestionEvent(
        contributionType
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'contributor_dashboard_submit_suggestion',
        {
          contribution_type: contributionType,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Contributor Dashboard view suggestion for review event', async () => {
      const contributionType = 'Translation';
      await sas.registerContributorDashboardViewSuggestionForReview(
        contributionType
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'contributor_dashboard_view_suggestion_for_review',
        {
          contribution_type: contributionType,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Contributor Dashboard accept suggestion event', async () => {
      const contributionType = 'Translation';
      await sas.registerContributorDashboardAcceptSuggestion(contributionType);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'contributor_dashboard_accept_suggestion',
        {
          contribution_type: contributionType,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Contributor Dashboard reject suggestion event', async () => {
      const contributionType = 'Translation';
      await sas.registerContributorDashboardRejectSuggestion(contributionType);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'contributor_dashboard_reject_suggestion',
        {
          contribution_type: contributionType,
          login_status: 'logged_in',
        }
      );
    });

    it('should register active lesson usage', async () => {
      await sas.registerLessonActiveUse();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'active_user_start_and_saw_cards',
        {
          login_status: 'logged_in',
        }
      );
    });

    it('should register exploration start', async () => {
      await sas.registerStartExploration(explorationId);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'lesson_started', {
        exploration_id: explorationId,
        login_status: 'logged_in',
      });
    });

    it('should register classroom page viewed', async () => {
      spyOn(
        sas as unknown as {_sendEventToGoogleAnalytics: Function},
        '_sendEventToGoogleAnalytics'
      );

      await sas.registerClassroomPageViewed();
      expect(
        (sas as unknown as {_sendEventToGoogleAnalytics: jasmine.Spy})
          ._sendEventToGoogleAnalytics
      ).toHaveBeenCalledWith('view_classroom', {});
    });

    it('should register active classroom lesson usage', async () => {
      let explorationId = '123';
      await sas.registerClassroomLessonEngagedWithEvent(
        'math',
        'Fractions',
        'ch1',
        explorationId,
        '2',
        '3',
        'en'
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'classroom_lesson_engaged_with',
        {
          classroom_name: 'math',
          topic_name: 'Fractions',
          chapter_name: 'ch1',
          exploration_id: '123',
          chapter_number: '2',
          chapter_card_count: '3',
          exploration_language: 'en',
          login_status: 'logged_in',
        }
      );
    });

    it('should register community lesson completed event', async () => {
      await sas.registerCommunityLessonCompleted('exp_id');

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'community_lesson_completed',
        {
          exploration_id: 'exp_id',
          login_status: 'logged_in',
        }
      );
    });

    it('should register community lesson started event', async () => {
      await sas.registerCommunityLessonStarted('exp_id');

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'community_lesson_started',
        {
          exploration_id: 'exp_id',
          login_status: 'logged_in',
        }
      );
    });

    it('should register audio play event', async () => {
      await sas.registerStartAudioPlayedEvent('exp_id', 0);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'audio_played', {
        exploration_id: 'exp_id',
        card_number: 0,
        login_status: 'logged_in',
      });
    });

    it('should register practice session start event', async () => {
      await sas.registerPracticeSessionStartEvent('math', 'topic', '1,2,3');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'practice_session_start', {
        classroom_name: 'math',
        topic_name: 'topic',
        practice_session_id: '1,2,3',
        login_status: 'logged_in',
      });
    });

    it('should register practice session end event', async () => {
      await sas.registerPracticeSessionEndEvent(
        'math',
        'topic',
        '1,2,3',
        10,
        10
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'practice_session_complete',
        {
          classroom_name: 'math',
          topic_name: 'topic',
          practice_session_id: '1,2,3',
          questions_answered: 10,
          total_score: 10,
          login_status: 'logged_in',
        }
      );
    });

    it('should register search results viewed event', async () => {
      await sas.registerSearchResultsViewedEvent();

      expect(gtagSpy).toHaveBeenCalledWith('event', 'view_search_results', {
        login_status: 'logged_in',
      });
    });

    it('should register homepage start learning button click event', async () => {
      await sas.registerClickHomePageStartLearningButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'discovery_start_learning',
        {
          login_status: 'logged_in',
        }
      );
    });

    it('should register submitted answer', async () => {
      const answerIsCorrect = true;
      await sas.registerAnswerSubmitted(explorationId, answerIsCorrect);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'answer_submitted', {
        exploration_id: explorationId,
        answer_is_correct: answerIsCorrect,
        login_status: 'logged_in',
      });
    });

    it('should register Volunteer CTA button click event', async () => {
      const srcElement = 'Volunteer with Oppia';
      await sas.registerClickVolunteerCTAButtonEvent(srcElement);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'volunteer_cta_button_click',
        {
          page_path: pathname,
          source_element: srcElement,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Partner CTA button click event', async () => {
      const srcElement = 'Partner with us at the top of the page';
      await sas.registerClickPartnerCTAButtonEvent(srcElement);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'partner_cta_button_click',
        {
          page_path: pathname,
          source_element: srcElement,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Donate CTA button click event', async () => {
      await sas.registerClickDonateCTAButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith('event', 'donate_cta_button_click', {
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register Get the Android App button click event', async () => {
      await sas.registerClickGetAndroidAppButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'get_android_app_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Volunteer Learn more button click event', async () => {
      await sas.registerClickLearnMoreVolunteerButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'learn_more_volunteer_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Partner Learn more button click event', async () => {
      await sas.registerClickLearnMorePartnerButtonEvent();

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'learn_more_partner_button_click',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
    });

    it('should register Navbar button click events', async () => {
      const buttonName = NavbarAndFooterGATrackingPages.ABOUT;
      await sas.registerClickNavbarButtonEvent(buttonName);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'navbar_button_click', {
        button_name: buttonName,
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should register Footer button click events', async () => {
      const buttonName = NavbarAndFooterGATrackingPages.ABOUT;
      await sas.registerClickFooterButtonEvent(buttonName);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'footer_button_click', {
        button_name: buttonName,
        page_path: pathname,
        login_status: 'logged_in',
      });
    });

    it('should send first time page view in month event if time difference is more than one month', async () => {
      const thirtyOneDaysInMillis = 31 * 24 * 60 * 60 * 1000;
      const lastPageViewTime = new Date().getTime() - thirtyOneDaysInMillis;
      localStorageService.getLastPageViewTime.and.returnValue(lastPageViewTime);
      const testKey = 'testKey';
      await sas.registerFirstTimePageViewEvent(testKey);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'first_time_page_view_in_month',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
      expect(localStorageService.setLastPageViewTime).toHaveBeenCalledWith(
        testKey
      );
    });

    it('should send first time page view in week event if time difference is more than one week', async () => {
      const eightDaysInMillis = 8 * 24 * 60 * 60 * 1000;
      const lastPageViewTime = new Date().getTime() - eightDaysInMillis;
      localStorageService.getLastPageViewTime.and.returnValue(lastPageViewTime);
      const testKey = 'testKey';
      await sas.registerFirstTimePageViewEvent(testKey);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'first_time_page_view_in_week',
        {
          page_path: pathname,
          login_status: 'logged_in',
        }
      );
      expect(localStorageService.setLastPageViewTime).toHaveBeenCalledWith(
        testKey
      );
    });

    it('should not send any event if time difference is less than one week', async () => {
      const sixDaysInMillis = 6 * 24 * 60 * 60 * 1000;
      const lastPageViewTime = new Date().getTime() - sixDaysInMillis;
      localStorageService.getLastPageViewTime.and.returnValue(lastPageViewTime);
      const testKey = 'testKey';
      await sas.registerFirstTimePageViewEvent(testKey);

      expect(gtagSpy).not.toHaveBeenCalled();
      expect(localStorageService.setLastPageViewTime).toHaveBeenCalledWith(
        testKey
      );
    });

    it('should set last page view time if lastPageViewTime is null', async () => {
      localStorageService.getLastPageViewTime.and.returnValue(null);
      const testKey = 'testKey';
      await sas.registerFirstTimePageViewEvent(testKey);

      expect(gtagSpy).not.toHaveBeenCalled();
      expect(localStorageService.setLastPageViewTime).toHaveBeenCalledWith(
        testKey
      );
    });

    it('should register classroom card click event', async () => {
      const srcElement = 'Classroom card in the navigation dropdown';
      await sas.registerClickClassroomCardEvent(srcElement, 'Math');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'classroom_card_click', {
        page_path: pathname,
        source_element: srcElement,
        classroom_name: 'Math',
        login_status: 'logged_in',
      });
    });

    it('should register new classroom lesson card click event', async () => {
      await sas.registerNewClassroomLessonEngagedWithEvent('Math', 'Addition');

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'new_classroom_lesson_engaged_with',
        {
          classroom_name: 'Math',
          topic_name: 'Addition',
          login_status: 'logged_in',
        }
      );
    });

    it('should register in-progress classroom lesson card click event', async () => {
      await sas.registerInProgressClassroomLessonEngagedWithEvent(
        'Math',
        'Addition'
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'classroom_lesson_in_progress_engaged_with',
        {
          classroom_name: 'Math',
          topic_name: 'Addition',
          login_status: 'logged_in',
        }
      );
    });

    it('should register diagnostic test completion event', async () => {
      const classroomName = 'Math101';

      await sas.registerDiagnosticTestCompletionEvent(classroomName);

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'diagnostic_test_completion',
        {
          classroom_name: classroomName,
          login_status: 'logged_in',
        }
      );
    });

    it('should register recommendation accepted event with topic ID', async () => {
      const classroomName = 'Math101';
      const topicId = 'algebra-fundamentals';

      await sas.registerDiagnosticTestRecommendationAcceptedEvent(
        classroomName,
        topicId
      );

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'diagnostic_test_recommendation_accepted',
        {
          classroom_name: classroomName,
          topic_id: topicId,
          login_status: 'logged_in',
        }
      );
    });

    it('should register diagnostic test started event', async () => {
      const classroomName = 'Math101';

      expect(gtagSpy).not.toHaveBeenCalled();
      await sas.registerDiagnosticTestStartedEvent(classroomName);

      expect(gtagSpy).toHaveBeenCalledWith('event', 'diagnostic_test_started', {
        classroom_name: classroomName,
        login_status: 'logged_in',
      });
    });
  });
});
