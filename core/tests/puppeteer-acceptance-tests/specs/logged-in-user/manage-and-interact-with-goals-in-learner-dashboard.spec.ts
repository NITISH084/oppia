// Copyright 2025 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Acceptance test for Goals Tab — CUJ (Blue + Purple).
 */

import testConstants from '../../utilities/common/test-constants';
import {UserFactory} from '../../utilities/common/user-factory';
import {CurriculumAdmin} from '../../utilities/user/curriculum-admin';
import {ExplorationEditor} from '../../utilities/user/exploration-editor';
import {LoggedInUser} from '../../utilities/user/logged-in-user';
import {LoggedOutUser} from '../../utilities/user/logged-out-user';
import {ReleaseCoordinator} from '../../utilities/user/release-coordinator';
import {TopicManager} from '../../utilities/user/topic-manager';

const ROLES = testConstants.Roles;

describe('Logged-in User', function () {
  jest.setTimeout(6000000);
  let loggedInUser: LoggedInUser & LoggedOutUser;
  let curriculumAdmin: CurriculumAdmin & ExplorationEditor & TopicManager;
  let releaseCoordinator: ReleaseCoordinator;

  beforeAll(async function () {
    curriculumAdmin = await UserFactory.createNewUser(
      'curriculumAdm',
      'curriculumAdmin@example.com',
      [ROLES.CURRICULUM_ADMIN]
    );

    releaseCoordinator = await UserFactory.createNewUser(
      'releaseCoordinator',
      'release_coordinator@example.com',
      [ROLES.RELEASE_COORDINATOR]
    );

    await releaseCoordinator.enableFeatureFlag(
      'show_redesigned_learner_dashboard'
    );
    await releaseCoordinator.closeBrowser();

    await curriculumAdmin.createNewClassroom('Math', 'math');
    await curriculumAdmin.updateClassroom(
      'Math',
      'Welcome to Math classroom!',
      'This course covers basic operations.',
      'In this course, you will learn the following topics: Place Values.'
    );

    await curriculumAdmin.createAndPublishTopic(
      'Place Values',
      'Place Values',
      'Place Values'
    );
    await curriculumAdmin.addTopicToClassroom('Math', 'Place Values');
    await curriculumAdmin.publishClassroom('Math');

    const placeValueChapters = [
      'What are the Place Values',
      'Find the Value of a Number',
      'Comparing Numbers',
    ];

    const chapterIds: (string | null)[] = [];

    for (const chapter of placeValueChapters) {
      const id = await curriculumAdmin.createAndPublishExplorationWithCards(
        chapter,
        'Algebra',
        3
      );
      chapterIds.push(id);
    }

    for (let i = 0; i < 6; i++) {
      await curriculumAdmin.createAndPublishExplorationWithCards(
        `Explore Title ${i + 1}`,
        'Algebra',
        3
      );
    }

    await curriculumAdmin.addStoryToTopic(
      "Jamie's Adventures in the Arcade",
      'story',
      'Place Values'
    );

    for (const [index, id] of chapterIds.entries()) {
      await curriculumAdmin.addChapter(placeValueChapters[index], id as string);
    }

    await curriculumAdmin.saveStoryDraft();
    await curriculumAdmin.publishStoryDraft();
    await curriculumAdmin.closeBrowser();

    loggedInUser = await UserFactory.createNewUser(
      'loggedInUser1',
      'logged_in_user1@example.com'
    );
  });

  it('should display empty Goals tab with title and add goals button', async function () {
    await loggedInUser.navigateToLearnerDashboardUsingProfileDropdown();
    await loggedInUser.navigateToGoalsSection();

    await loggedInUser.expectLearnerGreetingsToBe("loggedInUser1's Goals");

    await loggedInUser.expectScreenshotToMatch(
      'goalsTabEmptyStateWithAddGoalsButton',
      __dirname
    );
  });

  it('should open add goals modal with topic checkboxes and cancel button', async function () {
    await loggedInUser.clickOnAddGoalsButtonInRedesignedLearnerDashboard();

    await loggedInUser.expectAddGoalsModalToBeDisplayed();

    await loggedInUser.expectGoalCheckboxToBeVisible('Place Values');
    await loggedInUser.expectScreenshotToMatch(
      'addGoalsModalWithTopicCheckboxesDisplayed',
      __dirname
    );

    await loggedInUser.cancelGoalModalInRedesignedLearnerDashboard();
  });

  it('should add Place Values goal and display in In Progress section with progress 0', async function () {
    await loggedInUser.clickOnAddGoalsButtonInRedesignedLearnerDashboard();
    await loggedInUser.clickOnGoalCheckboxInRedesignedLearnerDashboard(
      'Place Values',
      true
    );
    await loggedInUser.submitGoalInRedesignedLearnerDashboard();

    await loggedInUser.expectToastMessage(
      "Successfully added to your 'Current Goals' list."
    );

    await loggedInUser.expectRedesignedGoalsSectionToContainHeading(
      'In Progress'
    );
    await loggedInUser.expectGoalCardToBeVisible('Place Values');

    await loggedInUser.expectScreenshotToMatch(
      'goalsTabWithPlaceValuesInProgressCardDisplayed',
      __dirname
    );
  });

  it('should uncheck goal and show remove confirmation modal with trash button', async function () {
    await loggedInUser.clickOnAddGoalsButtonInRedesignedLearnerDashboard();

    await loggedInUser.clickOnGoalCheckboxInRedesignedLearnerDashboard(
      'Place Values',
      false
    );
    await loggedInUser.submitGoalInRedesignedLearnerDashboard();

    await loggedInUser.expectRemoveActivityModelToBeDisplayed(
      "Remove from 'Current Goals' list?",
      "Are you sure you want to remove 'Place Values' from your 'Current Goals' list?"
    );
    await loggedInUser.expectScreenshotToMatch(
      'removeGoalConfirmationModal',
      __dirname
    );

    await loggedInUser.clickButtonInRemoveActivityModal('Remove');

    await loggedInUser.expectGoalCardToBeVisible('Place Values', false);
  });

  it('should return to empty state after confirming goal removal', async function () {
    await loggedInUser.clickOnAddGoalsButtonInRedesignedLearnerDashboard();

    await loggedInUser.expectGoalCheckboxToBeVisible('Place Values');

    await loggedInUser.cancelGoalModalInRedesignedLearnerDashboard();

    await loggedInUser.expectRedesignedGoalsSectionToContainHeading(
      'In Progress',
      false
    );
    await loggedInUser.expectAddGoalsButtonToBeVisible();
  });

  it('should not save changes when canceling goal modal after selecting checkbox', async function () {
    await loggedInUser.clickOnAddGoalsButtonInRedesignedLearnerDashboard();
    await loggedInUser.clickOnGoalCheckboxInRedesignedLearnerDashboard(
      'Place Values',
      true
    );

    await loggedInUser.cancelGoalModalInRedesignedLearnerDashboard();

    await loggedInUser.expectRedesignedGoalsSectionToContainHeading(
      'In Progress',
      false
    );
  });

  it('should display goal card with 0 progress and Start button in In Progress section', async function () {
    await loggedInUser.navigateToLearnerDashboardUsingProfileDropdown();
    await loggedInUser.navigateToGoalsSection();

    await loggedInUser.addGoalInRedesignedLearnerDashboard('Place Values');

    await loggedInUser.expectGoalCardToBeVisible('Place Values');
    await loggedInUser.expectGoalProgressToBeDisplayed('Place Values', 0);

    await loggedInUser.expectGoalCardButtonLabel('Place Values', 'Start');
  });

  it('should expand goal and display all chapters with Start button and percentage', async function () {
    await loggedInUser.clickOnGoalCard('Place Values');

    await loggedInUser.expectGoalDetailPageToBeDisplayed('Place Values');

    await loggedInUser.expectLessonCardToBeVisible('What are the Place Values');
    await loggedInUser.expectLessonCardToBeVisible(
      'Find the Value of a Number'
    );

    await loggedInUser.expectLessonCardButtonLabel(
      'What are the Place Values',
      'Start'
    );
    await loggedInUser.expectScreenshotToMatch(
      'placeValuesGoalDetailWithChaptersDisplayed',
      __dirname
    );
  });

  it('should highlight Goals tab button with green active state in sidebar', async function () {
    await loggedInUser.navigateToLearnerDashboardUsingProfileDropdown();

    await loggedInUser.expectGoalsTabButtonToBeVisible();
    await loggedInUser.navigateToGoalsSection();

    await loggedInUser.expectGoalsTabButtonToBeActive();

    await loggedInUser.expectScreenshotToMatch(
      'goalsTabSidebarHighlightedWithActiveState',
      __dirname
    );
  });

  it('should display goals correctly on mobile viewport with responsive layout', async function () {
    await loggedInUser.setMobileViewport();

    await loggedInUser.navigateToLearnerDashboardUsingProfileDropdown();
    await loggedInUser.navigateToGoalsSection();

    await loggedInUser.expectGoalCardToBeVisible('Place Values');
    await loggedInUser.expectMobileLayoutToBeCorrect();

    await loggedInUser.expectScreenshotToMatch(
      'goalsTabMobileViewportWithResponsiveLayout',
      __dirname
    );

    await loggedInUser.setDesktopViewport();
  });

  afterAll(async function () {
    await UserFactory.closeAllBrowsers();
  });
});
