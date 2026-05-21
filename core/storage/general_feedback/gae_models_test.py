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

from core import utils
from core.tests import test_utils
from core.platform import models

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import base_models, general_feedback_models

(base_models, general_feedback_models) = models.Registry.import_models(
    [models.Names.BASE_MODEL, models.Names.GENERAL_FEEDBACK]
)


class WebFeedbackThreadModelTests(test_utils.GenericTestBase):
    """Tests for WebFeedbackThreadModel."""

    NONEXISTENT_USER_ID = 'id_x'
    LESSON_TARGET_TYPE = 'exploration'
    PLATFORM_TARGET_TYPE = 'general'
    LESSON_TARGET_ID = 'exp_id_2'
    PLATFORM_TARGET_ID = 'platform_target'
    CATEGORY1 = 'lesson'
    CATEGORY2 = 'platform'
    PAGE_URL = '/learn/math'
    LANGUAGE_CODE = 'en'
    RATING = 4
    thread_id1 = 'general.thread.1'
    thread_id2 = 'general.thread.2'

    def setUp(self) -> None:
        super().setUp()

        self.signup('learner@example.com', 'learner')
        self.USER_ID = self.get_user_id_from_email('learner@example.com')

        thread_model1 = general_feedback_models.WebFeedbackThreadModel(
            id=self.thread_id1,
            category=self.CATEGORY1,
            target_type=self.LESSON_TARGET_TYPE,
            target_id=self.LESSON_TARGET_ID,
            original_author_id=self.USER_ID,
            page_url=self.PAGE_URL,
            language_code=self.LANGUAGE_CODE,
            rating=self.RATING,
            has_screenshot=False,
            has_session_info=False,
            status=general_feedback_models.STATUS_CHOICES_OPEN,
            message_count=2,
        )
        thread_model1.put()

        thread_model2 = general_feedback_models.WebFeedbackThreadModel(
            id=self.thread_id2,
            category=self.CATEGORY2,
            target_type=self.PLATFORM_TARGET_TYPE,
            target_id=self.PLATFORM_TARGET_ID,
            original_author_id=self.USER_ID,
            page_url=self.PAGE_URL,
            language_code=self.LANGUAGE_CODE,
            rating=self.RATING,
            has_screenshot=False,
            has_session_info=False,
            status=general_feedback_models.STATUS_CHOICES_OPEN,
            message_count=2,
        )
        thread_model2.put()

    def test_get_deletion_policy(self) -> None:
        self.assertEqual(
            general_feedback_models.WebFeedbackThreadModel.get_deletion_policy(),
            base_models.DELETION_POLICY.LOCALLY_PSEUDONYMIZE,
        )

    def test_has_reference_to_user_id(self) -> None:
        self.assertTrue(
            general_feedback_models.WebFeedbackThreadModel.has_reference_to_user_id(
                self.USER_ID
            )
        )
        self.assertFalse(
            general_feedback_models.WebFeedbackThreadModel.has_reference_to_user_id(
                self.NONEXISTENT_USER_ID
            )
        )

    def test_get_model_associated_with_user_id(self) -> None:

        self.assertEqual(
            general_feedback_models.WebFeedbackThreadModel.get_model_association_to_user(),
            base_models.MODEL_ASSOCIATION_TO_USER.MULTIPLE_INSTANCES_PER_USER,
        )

    def test_get_export_policy(self) -> None:
        self.assertEqual(
            general_feedback_models.WebFeedbackThreadModel.get_export_policy(),
            {
                'category': base_models.EXPORT_POLICY.EXPORTED,
                'target_type': base_models.EXPORT_POLICY.EXPORTED,
                'target_id': base_models.EXPORT_POLICY.EXPORTED,
                'original_author_id': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'page_url': base_models.EXPORT_POLICY.EXPORTED,
                'language_code': base_models.EXPORT_POLICY.EXPORTED,
                'rating': base_models.EXPORT_POLICY.EXPORTED,
                'has_screenshot': base_models.EXPORT_POLICY.EXPORTED,
                'has_session_info': base_models.EXPORT_POLICY.EXPORTED,
                'status': base_models.EXPORT_POLICY.EXPORTED,
                'message_count': base_models.EXPORT_POLICY.EXPORTED,
                'created_on': base_models.EXPORT_POLICY.EXPORTED,
                'last_updated': base_models.EXPORT_POLICY.EXPORTED,
                'deleted': base_models.EXPORT_POLICY.NOT_APPLICABLE,
            },
        )

    def test_get_field_names_for_takeout(self) -> None:
        self.assertEqual(
            general_feedback_models.WebFeedbackThreadModel.get_field_names_for_takeout(),
            {
                'created_on': 'created_on_msec',
                'last_updated': 'last_updated_msec',
            },
        )

    def test_export_data(self) -> None:
        thread_with_session_info = (
            general_feedback_models.WebFeedbackThreadModel.get_by_id(
                self.thread_id1
            )
        )
        thread_with_session_info.has_session_info = True
        thread_with_session_info.update_timestamps()
        thread_with_session_info.put()

        general_feedback_models.FeedbackSessionLogModel.create(
            self.thread_id1,
            console_errors_json=[{'message': 'err'}],
            failed_requests_json=[{'url': '/test'}],
            navigation_history_json=[{'url': '/learn/math'}],
            environment_json={'user_agent': 'test-agent'},
        )
        session_log_model = (
            general_feedback_models.FeedbackSessionLogModel.get_by_id(
                self.thread_id1
            )
        )

        export_data = (
            general_feedback_models.WebFeedbackThreadModel.export_data(
                self.USER_ID
            )
        )
        expected_export_data = {
            self.thread_id1: (self.CATEGORY1, self.LESSON_TARGET_TYPE),
            self.thread_id2: (self.CATEGORY2, self.PLATFORM_TARGET_TYPE),
        }
        self.assertEqual(
            set(export_data.keys()), set(expected_export_data.keys())
        )

        for thread_id, (
            expected_category,
            expected_target_type,
        ) in expected_export_data.items():
            thread_data = {
                'category': expected_category,
                'target_type': expected_target_type,
                'page_url': self.PAGE_URL,
                'language_code': self.LANGUAGE_CODE,
                'rating': self.RATING,
                'has_screenshot': False,
                'has_session_info': thread_id == self.thread_id1,
                'session_info': (
                    session_log_model.to_dict()
                    if thread_id == self.thread_id1
                    else None
                ),
                'status': general_feedback_models.STATUS_CHOICES_OPEN,
                'message_count': 2,
                'created_on': utils.get_time_in_millisecs(
                    general_feedback_models.WebFeedbackThreadModel.get_by_id(
                        thread_id
                    ).created_on
                ),
                'last_updated': utils.get_time_in_millisecs(
                    general_feedback_models.WebFeedbackThreadModel.get_by_id(
                        thread_id
                    ).last_updated
                ),
            }

            if expected_target_type == self.LESSON_TARGET_TYPE:
                thread_data['target_id'] = self.LESSON_TARGET_ID

            self.assertEqual(
                export_data[thread_id],
                thread_data,
            )

    def test_get_filtered_query_of_feedback_threads(self) -> None:
        # Test filtering by category.
        threads = general_feedback_models.WebFeedbackThreadModel.get_filtered_query_of_feedback_threads(
            category_filter=self.CATEGORY1
        ).fetch()
        self.assertEqual(len(threads), 1)
        self.assertEqual(threads[0].id, self.thread_id1)

        # Test filtering by target_type.
        threads = general_feedback_models.WebFeedbackThreadModel.get_filtered_query_of_feedback_threads(
            target_type_filter=self.PLATFORM_TARGET_TYPE
        ).fetch()
        self.assertEqual(len(threads), 1)
        self.assertEqual(threads[0].id, self.thread_id2)

        # Test filtering by category and target_type.
        threads = general_feedback_models.WebFeedbackThreadModel.get_filtered_query_of_feedback_threads(
            category_filter=self.CATEGORY1,
            target_type_filter=self.LESSON_TARGET_TYPE,
        ).fetch()
        self.assertEqual(len(threads), 1)
        self.assertEqual(threads[0].id, self.thread_id1)

    def test_fetch_page_of_feedback_threads(self) -> None:
        seen_thread_ids = []
        cursor = None

        while True:
            threads, cursor, more = (
                general_feedback_models.WebFeedbackThreadModel.fetch_page_of_feedback_threads(
                    page_size=1, cursor=cursor
                )
            )
            self.assertLessEqual(len(threads), 1)
            seen_thread_ids.extend(thread.id for thread in threads)
            if not more:
                break

        self.assertEqual(
            set(seen_thread_ids), {self.thread_id1, self.thread_id2}
        )

    def test_generate_new_thread_id(self) -> None:
        new_thread_id = general_feedback_models.WebFeedbackThreadModel.generate_new_thread_id(
            entity_type=self.LESSON_TARGET_TYPE, entity_id='new_exp_id'
        )
        self.assertTrue(new_thread_id.startswith('exploration.new_exp_id.'))

        new_thread_id = general_feedback_models.WebFeedbackThreadModel.generate_new_thread_id(
            entity_type=self.PLATFORM_TARGET_TYPE,
            entity_id='new_platform_target',
        )
        self.assertTrue(
            new_thread_id.startswith('general.new_platform_target.')
        )

    def test_create(self) -> None:
        with self.assertRaisesRegex(
            ValueError, 'Lesson feedback must have target_type'
        ):
            general_feedback_models.WebFeedbackThreadModel.create(
                category=self.CATEGORY1,
                target_type=self.PLATFORM_TARGET_TYPE,
                target_id='new_platform_target',
                original_author_id=self.USER_ID,
                page_url=self.PAGE_URL,
                language_code=self.LANGUAGE_CODE,
                rating=self.RATING,
                has_screenshot=False,
                has_session_info=False,
            )

        with self.assertRaisesRegex(
            ValueError, 'Platform feedback must have target_type'
        ):
            general_feedback_models.WebFeedbackThreadModel.create(
                category=self.CATEGORY2,
                target_type=self.LESSON_TARGET_TYPE,
                target_id='new_exp_id',
                original_author_id=self.USER_ID,
                page_url=self.PAGE_URL,
                language_code=self.LANGUAGE_CODE,
                rating=self.RATING,
                has_screenshot=False,
                has_session_info=False,
            )

        new_thread_id = general_feedback_models.WebFeedbackThreadModel.create(
            category=self.CATEGORY1,
            target_type=self.LESSON_TARGET_TYPE,
            target_id='new_exp_id',
            original_author_id=self.USER_ID,
            page_url=self.PAGE_URL,
            language_code=self.LANGUAGE_CODE,
            rating=self.RATING,
            has_screenshot=False,
            has_session_info=False,
        )
        thread_model = general_feedback_models.WebFeedbackThreadModel.get_by_id(
            new_thread_id
        )
        self.assertIsNotNone(thread_model)
        self.assertEqual(thread_model.category, self.CATEGORY1)
        self.assertEqual(thread_model.target_type, self.LESSON_TARGET_TYPE)
        self.assertEqual(thread_model.target_id, 'new_exp_id')
        self.assertEqual(thread_model.original_author_id, self.USER_ID)
        self.assertEqual(thread_model.page_url, self.PAGE_URL)
        self.assertEqual(thread_model.language_code, self.LANGUAGE_CODE)
        self.assertEqual(thread_model.rating, self.RATING)
        self.assertFalse(thread_model.has_screenshot)
        self.assertFalse(thread_model.has_session_info)
        self.assertEqual(
            thread_model.status, general_feedback_models.STATUS_CHOICES_OPEN
        )
        self.assertEqual(thread_model.message_count, 0)
