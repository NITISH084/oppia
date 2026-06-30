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
 * @fileoverview Acceptance test from CUJv3 Doc
 * https://docs.google.com/document/d/1D7kkFTzg3rxUe3QJ_iPlnxUzBFNElmRkmAWss00nFno/
 *
.* LI.7. Give lesson feedback and engage with lesson creators
 */

import {test} from '@playwright/test';
import {UserFactory} from '../../utilities/common/user-factory';
import testConstants from '../../utilities/common/test-constants';
import {LoggedInUser} from '../../utilities/user/logged-in-user';
import {LoggedOutUser} from '../../utilities/user/logged-out-user';
import {ReleaseCoordinator} from '../../utilities/user/release-coordinator';
import {ExplorationEditor} from '../../utilities/user/exploration-editor';
import {showMessage} from '../../utilities/common/show-message';

const ROLES = testConstants.Roles;

test.describe.configure({mode: 'serial'});

test.describe('Logged-in User', function () {
  let loggedInLearner: LoggedInUser & LoggedOutUser;
  let releaseCoordinator: ReleaseCoordinator;
  let curriculumAdmin: ExplorationEditor;
  let expId: string;

  test.beforeAll(async function ({browser}) {
    curriculumAdmin = await UserFactory.createNewUser(
      'curriculumAdm',
      'curriculumAdmin@example.com',
      browser,
      [ROLES.CURRICULUM_ADMIN]
    );
    releaseCoordinator = await UserFactory.createNewUser(
      'releaseCoordinator',
      'releaseCoordinator@example.com',
      browser,
      [ROLES.RELEASE_COORDINATOR]
    );
    await releaseCoordinator.enableFeatureFlag(
      'show_redesigned_learner_dashboard'
    );
    await releaseCoordinator.enableFeatureFlag('web_feedback_modal_enabled');
    await releaseCoordinator.enableFeatureFlag('new_lesson_player');
    await UserFactory.closeBrowserForUser(releaseCoordinator);

    expId = await curriculumAdmin.createAndPublishExplorationWithCards(
      'What are the Place Values',
      'Algebra',
      2
    );
    await UserFactory.closeBrowserForUser(curriculumAdmin);

    loggedInLearner = await UserFactory.createNewUser(
      'learner',
      'learner@example.com',
      browser
    );
  }, 350000);

  test.afterAll(async function () {
    await UserFactory.closeBrowserForUser(loggedInLearner);
    await UserFactory.closeSuperAdminBrowser();
  });

  test('should play a lesson, open the sidebar options drawer and click on the "Send Lesson Feedback" button.', async function () {
    await loggedInLearner.navigateToLearnerDashboard();
    await loggedInLearner.playLesson(expId);

    await loggedInLearner.toggleOptionsSidebar();
    await loggedInLearner.clickLessonFeedbackButton(true);
    showMessage('Clicked on "Send Lesson Feedback" button.');
    await loggedInLearner.expectScreenshotToMatch('sendALessonFeedbackModal');

    await loggedInLearner.clickButtonInModal(
      'Send Feedback to the Lessons Team',
      'cancel'
    );
    showMessage('Closed Lesson feedback modal.');
  });

  test('should type a constructive message in the feedback text area ("This fraction model is awesome, but can we get more marble examples?") and click "Submit".', async function () {
    await loggedInLearner.clickLessonFeedbackButton(true);
    showMessage('Clicked on "Send Lesson Feedback" button.');
    await loggedInLearner.expectScreenshotToMatch('sendALessonFeedbackModal');
    await loggedInLearner.submitFeedbackInTextArea(
      'This fraction model is awesome, but can we get more marble examples?'
    );
    await loggedInLearner.expectScreenshotToMatch(
      'sendALessonFeedbackModalAfterEnteringFeedback'
    );
    await loggedInLearner.clickButtonInModal(
      'Send Feedback to the Lessons Team',
      'confirm'
    );
    await loggedInLearner.expectScreenshotToMatch(
      'sendALessonFeedbackModalAfterSubmittingFeedback'
    );
    await loggedInLearner.expectToastMessage(
      'Thank you! Your feedback has been sent to the lesson team.'
    );
    await loggedInLearner.toggleOptionsSidebar();
    showMessage('Submitted Lesson feedback.');
  });

  test('should open the options sidebar drawer and click the "Report an Issue" flag icon.', async function () {
    await loggedInLearner.toggleOptionsSidebar();
    await loggedInLearner.clickReportLessonButton(true);
    showMessage('Clicked on "Report an Issue" button.');

    await loggedInLearner.expectScreenshotToMatch('reportALessonModal');

    await loggedInLearner.clickButtonInModal('Report an Issue', 'cancel');
    showMessage('Closed Report an issue feedback modal.');
  });

  test('should be able to choose a "typo" or "confusing or incorrect answer" chip, enter feedback, and click the main "Submit" button at the bottom of the modal overlay', async () => {
    await loggedInLearner.clickReportLessonButton(true);

    await loggedInLearner.selectReportIssueChip('typo');
    showMessage('Typo chip selected in report an issue modal.');
    await loggedInLearner.submitFeedbackInTextArea(
      'There is a typo in this question.'
    );
    await loggedInLearner.addFeedbackScreenshot(testConstants.data.oppiaPage);
    await loggedInLearner.expectIncludeTechnicalLogToBePresent(false);

    await loggedInLearner.expectScreenshotToMatch(
      'reportALessonModalAfterEnteringFeedbackWithTypoChip'
    );
    await loggedInLearner.clickButtonInModal('Report an Issue', 'confirm');
    await loggedInLearner.expectToastMessage(
      'Thank you for your feedback! The team has received your report.'
    );

    await loggedInLearner.clickReportLessonButton(true);
    await loggedInLearner.selectReportIssueChip(
      'confusing or incorrect answer'
    );
    showMessage(
      'Confusing or incorrect answer chip selected in report an issue modal.'
    );
    await loggedInLearner.submitFeedbackInTextArea(
      'There is a confusing or incorrect answer in this question.'
    );
    await loggedInLearner.addFeedbackScreenshot(testConstants.data.oppiaPage);
    await loggedInLearner.expectIncludeTechnicalLogToBePresent(false);

    await loggedInLearner.expectScreenshotToMatch(
      'reportALessonModalAfterEnteringFeedbackWithConfusingChip'
    );
    await loggedInLearner.clickButtonInModal('Report an Issue', 'confirm');
    await loggedInLearner.expectToastMessage(
      'Thank you for your feedback! The team has received your report.'
    );
  });

  test('should be able to choose a "broken layout / image" or "other" chip, enter feedback, and click the main "Submit" button at the bottom of the modal overlay.', async () => {
    await loggedInLearner.clickReportLessonButton(true);

    await loggedInLearner.selectReportIssueChip('broken layout');
    await loggedInLearner.submitFeedbackInTextArea(
      'There is a broken layout / image in this question.'
    );
    await loggedInLearner.addFeedbackScreenshot(testConstants.data.oppiaPage);
    await loggedInLearner.expectIncludeTechnicalLogToBePresent(true);

    await loggedInLearner.expectScreenshotToMatch(
      'reportALessonModalAfterEnteringFeedbackWithBrokenLayoutChip'
    );
    await loggedInLearner.clickButtonInModal('Report an Issue', 'confirm');
    await loggedInLearner.expectToastMessage(
      'Thank you! Your report has been sent to the technical team.'
    );

    await loggedInLearner.clickReportLessonButton(true);

    await loggedInLearner.selectReportIssueChip('other');
    await loggedInLearner.submitFeedbackInTextArea(
      'There is an other issue in this question.'
    );
    await loggedInLearner.addFeedbackScreenshot(testConstants.data.oppiaPage);
    await loggedInLearner.expectIncludeTechnicalLogToBePresent(true);

    await loggedInLearner.expectScreenshotToMatch(
      'reportALessonModalAfterEnteringFeedbackWithOtherChip'
    );
    await loggedInLearner.clickButtonInModal('Report an Issue', 'confirm');
    await loggedInLearner.expectToastMessage(
      'Thank you! Your report has been sent to the technical team.'
    );
    await loggedInLearner.toggleOptionsSidebar();
  });

  test('should be able to click the Profile menu dropdown at the top right, and select the "Report a Website Issue" option.', async () => {
    await loggedInLearner.navigateToLearnerDashboard();
    await loggedInLearner.clickOnProfileDropdown();
    await loggedInLearner.expectProfileDropdownToContainElementWithContent(
      'Report a Website Issue'
    );
    await loggedInLearner.openReportASiteIssueModal();
    showMessage('Clicked on "Report a Website Issue" button.');
    await loggedInLearner.expectScreenshotToMatch('reportASiteIssueModal');
    await loggedInLearner.clickButtonInModal(
      'Report a Website Issue',
      'cancel'
    );
    showMessage('Closed Report a Website Issue feedback modal.');
  });

  test('should submit feedback for "Report a Website Issue".', async () => {
    await loggedInLearner.navigateToContributorDashboardUsingProfileDropdown();
    await loggedInLearner.clickOnProfileDropdown();
    await loggedInLearner.expectProfileDropdownToContainElementWithContent(
      'Report a Website Issue'
    );
    await loggedInLearner.openReportASiteIssueModal();
    showMessage('Clicked on "Report a Website Issue" button.');

    await loggedInLearner.submitFeedbackInTextArea(
      'The contributor dashboard is broken.'
    );
    await loggedInLearner.addFeedbackScreenshot(testConstants.data.oppiaPage);
    await loggedInLearner.expectIncludeTechnicalLogToBePresent(true);

    await loggedInLearner.expectScreenshotToMatch(
      'reportASiteIssueModalAfterEnteringFeedback'
    );
    await loggedInLearner.clickButtonInModal(
      'Report a Website Issue',
      'confirm'
    );
    await loggedInLearner.expectToastMessage(
      'Thank you! Your report has been sent to the technical team.'
    );
    await loggedInLearner.expectScreenshotToMatch(
      'reportASiteIssueModalAfterSubmittingFeedback'
    );
  });
});
