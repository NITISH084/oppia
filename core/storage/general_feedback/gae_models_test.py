# coding: utf-8
#
# Copyright 2026 The Oppia Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Tests for web feedback thread and message models."""

from __future__ import annotations

from core.tests import test_utils
from core.platform import models

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import general_feedback_models

(general_feedback_models,) = models.Registry.import_models(
    [models.Names.GENERAL_FEEDBACK]
)


class WebFeedbackThreadModelTests(test_utils.GenericTestBase):
    """Tests for WebFeedbackThreadModel."""

    def test_export_data_for_associated_thread_hides_author_ids(self) -> None:
        self.signup('learner@example.com', 'learner')
        learner_id = self.get_user_id_from_email('learner@example.com')
        self.signup('creator@example.com', 'creator')
        creator_id = self.get_user_id_from_email('creator@example.com')

        thread_id = 'general.thread.1'
        thread_model = general_feedback_models.WebFeedbackThreadModel(
            id=thread_id,
            category=general_feedback_models.CATEGORY_LESSON,
            target_type=general_feedback_models.TARGET_TYPE_EXPLORATION,
            target_id='exp1',
            original_author_id=learner_id,
            page_url='/learn/math',
            language_code='en',
            rating=4,
            has_screenshot=False,
            has_session_info=False,
            status=general_feedback_models.STATUS_CHOICES_OPEN,
            message_count=2,
        )
        thread_model.update_timestamps()
        thread_model.put()

        learner_message_model = general_feedback_models.WebFeedbackMessageModel(
            id='%s.0' % thread_id,
            thread_id=thread_id,
            message_index=0,
            author_id=learner_id,
            author_role=general_feedback_models.AUTHOR_ROLE_LEARNER,
            text='Initial feedback.',
            updated_status=general_feedback_models.STATUS_CHOICES_OPEN,
        )
        learner_message_model.update_timestamps()
        learner_message_model.put()

        creator_message_model = general_feedback_models.WebFeedbackMessageModel(
            id='%s.1' % thread_id,
            thread_id=thread_id,
            message_index=1,
            author_id=creator_id,
            author_role=general_feedback_models.AUTHOR_ROLE_LESSONS_TEAM,
            text='Creator response.',
            updated_status=general_feedback_models.STATUS_CHOICES_OPEN,
        )
        creator_message_model.update_timestamps()
        creator_message_model.put()

        user_data = general_feedback_models.WebFeedbackThreadModel.export_data(
            creator_id
        )

        self.assertIn(thread_id, user_data)
        self.assertNotIn('original_author_id', user_data[thread_id])


class WebFeedbackMessageModelTests(test_utils.GenericTestBase):
    """Tests for WebFeedbackMessageModel."""

    def test_export_data_hides_author_id(self) -> None:
        self.signup('author@example.com', 'author')
        author_id = self.get_user_id_from_email('author@example.com')

        message_model = general_feedback_models.WebFeedbackMessageModel(
            id='general.thread.2.0',
            thread_id='general.thread.2',
            message_index=0,
            author_id=author_id,
            author_role=general_feedback_models.AUTHOR_ROLE_LEARNER,
            text='Feedback text.',
            updated_status=general_feedback_models.STATUS_CHOICES_OPEN,
            screenshot_filename='screenshot.png',
            screenshot_entity_id='screenshot_entity_id',
        )
        message_model.update_timestamps()
        message_model.put()

        user_data = general_feedback_models.WebFeedbackMessageModel.export_data(
            author_id
        )
        self.assertIn('general.thread.2.0', user_data)
        self.assertNotIn('author_id', user_data['general.thread.2.0'])
