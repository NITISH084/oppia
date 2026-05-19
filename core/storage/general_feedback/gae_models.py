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

"""Models for web user feedback threads, messages and session logs."""

from __future__ import annotations

from core import feconf, utils
from core.platform import models

from typing import (
    Dict,
    Final,
    List,
    Literal,
    Optional,
    Sequence,
    Tuple,
    Union,
    overload,
)

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import base_models, datastore_services

(base_models,) = models.Registry.import_models([models.Names.BASE_MODEL])

datastore_services = models.Registry.import_datastore_services()

# Category choices for feedback threads.
CATEGORY_LESSON: Final = 'lesson'
CATEGORY_PLATFORM: Final = 'platform'
CATEGORY_CHOICES: Final = [CATEGORY_LESSON, CATEGORY_PLATFORM]

# Target type choices for feedback threads.
TARGET_TYPE_EXPLORATION: Final = 'exploration'
TARGET_TYPE_GENERAL: Final = 'general'
TARGET_TYPE_CHOICES: Final = [TARGET_TYPE_EXPLORATION, TARGET_TYPE_GENERAL]

# Allowed feedback thread statuses.
STATUS_CHOICES_OPEN: Final = 'open'
STATUS_CHOICES_FIXED: Final = 'fixed'
STATUS_CHOICES_IGNORED: Final = 'ignored'
STATUS_CHOICES_COMPLIMENT: Final = 'compliment'
STATUS_CHOICES_NOT_ACTIONABLE: Final = 'not_actionable'
STATUS_CHOICES: Final = [
    STATUS_CHOICES_OPEN,
    STATUS_CHOICES_FIXED,
    STATUS_CHOICES_IGNORED,
    STATUS_CHOICES_COMPLIMENT,
    STATUS_CHOICES_NOT_ACTIONABLE,
]

# Author roles for two-way feedback messages.
AUTHOR_ROLE_LEARNER: Final = 'learner'
AUTHOR_ROLE_LESSONS_TEAM: Final = 'editor'
AUTHOR_ROLE_FEEDBACK_ADMIN: Final = 'feedback_admin'
AUTHOR_ROLE_CHOICES: Final = [
    AUTHOR_ROLE_LEARNER,
    AUTHOR_ROLE_LESSONS_TEAM,
    AUTHOR_ROLE_FEEDBACK_ADMIN,
]


class WebFeedbackThreadModel(base_models.BaseModel):
    """Storage model for thread-based web feedback submissions.

    This model represents a single feedback thread and serves as the
    primary source of truth for all feedback submitted across the Oppia
    web platform. Each feedback submission creates exactly one thread.

    The id of instances of this class has the form
        [entity_type].[entity_id].[generated_string]

    Note:
        The actual feedback description is NOT stored in this model.
        It is stored as the text of the first message (message_index = 0)
        in WebFeedbackMessageModel. This ensures a clean separation
        between metadata and user-generated content.


    Fields:
        id: str. Unique identifier for the feedback thread
            (<entity_type>.<entity_id>.<random_string>).
        category: str. Type of feedback ("platform" or "lesson").
        target_type: str. Entity type ("exploration" for lesson feedback,
            "general" for platform feedback).
        target_id: str.  Identifier for the feedback target:
            For lesson feedback: exploration_id
            For platform feedback: deterministically generated as sha1(page_url).
        original_author_id: Optional[str]. User ID of the submitter,
            or None for anonymous users.
        page_url: str. URL where the feedback was submitted.
        language_code: str. Language selected by the user.
        rating: int. Rating value in range [0, 5].
        has_session_info: bool. Whether session diagnostics are included.
        has_screenshot: bool. Whether a screenshot is included in message-0.
        status: str. Moderation status of the feedback
            (open | fixed | ignored | compliment | not_actionable).
        message_count: int. Total number of messages in the thread.
        created_on: datetime. Timestamp of thread creation.
        last_updated: datetime. Timestamp of last update.
        deleted: bool. Whether the thread is soft-deleted.
    """

    # We use the model id as a key in the Takeout dict.
    ID_IS_USED_AS_TAKEOUT_KEY: Literal[True] = True

    category = datastore_services.StringProperty(
        required=True, indexed=True, choices=CATEGORY_CHOICES
    )
    target_type = datastore_services.StringProperty(
        required=True, indexed=True, choices=TARGET_TYPE_CHOICES
    )
    target_id = datastore_services.StringProperty(
        required=True,
        indexed=True,
    )
    original_author_id = datastore_services.StringProperty(
        required=False,
        indexed=True,
    )
    page_url = datastore_services.StringProperty(
        required=True,
        indexed=False,
    )
    language_code = datastore_services.StringProperty(
        required=True,
        indexed=False,
    )
    rating = datastore_services.IntegerProperty(
        required=False,
        indexed=False,
    )
    has_screenshot = datastore_services.BooleanProperty(
        required=True,
        default=False,
        indexed=False,
    )
    has_session_info = datastore_services.BooleanProperty(
        required=True,
        default=False,
        indexed=False,
    )
    status = datastore_services.StringProperty(
        required=True,
        indexed=True,
        choices=STATUS_CHOICES,
    )
    message_count = datastore_services.IntegerProperty(
        required=True,
        default=0,
        indexed=False,
    )
    deleted = datastore_services.BooleanProperty(
        required=True, default=False, indexed=True
    )

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Model contains user ids to pseudonymize."""
        return base_models.DELETION_POLICY.LOCALLY_PSEUDONYMIZE

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """Model is exported as one user can participate in multiple feedback threads."""
        return base_models.MODEL_ASSOCIATION_TO_USER.MULTIPLE_INSTANCES_PER_USER

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Model contains data to export correspon
        ding to a user."""
        return dict(
            super(cls, cls).get_export_policy(),
            **{
                'category': base_models.EXPORT_POLICY.EXPORTED,
                'target_type': base_models.EXPORT_POLICY.EXPORTED,
                'target_id': base_models.EXPORT_POLICY.EXPORTED,
                # Intentionally not exporting original_author_id to protect user privacy.
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
            },
        )

    @classmethod
    def get_field_names_for_takeout(cls) -> Dict[str, str]:
        """Indicates renamed keys used in takeout exports."""
        return {
            'created_on': 'created_on_msec',
            'last_updated': 'last_updated_msec',
        }

    @classmethod
    def has_reference_to_user_id(cls, user_id: str) -> bool:
        """Checks whether thread/message data references the given user ID.

        Args:
            user_id: str. The ID of the user whose data should be checked.

        Returns:
            bool. True if the user ID is referenced in any thread or message, False otherwise.
        """
        if cls.query(cls.original_author_id == user_id).get(keys_only=True):
            return True

        return (
            WebFeedbackMessageModel.query(
                WebFeedbackMessageModel.author_id == user_id
            ).get(keys_only=True)
            is not None
        )

    @classmethod
    def export_data(
        cls, user_id: str
    ) -> Dict[str, Dict[str, Union[str, bool, None]]]:
        """Exports feedback thread data corresponding to a user_id.

        Args:
            user_id: str. The ID of the user whose data should be exported.

        Returns:
            dict. The exported data, structured as a dict with thread IDs as keys and
            thread details as values.
        """

        user_data = {}
        feedback_models: Sequence[WebFeedbackThreadModel] = (
            cls.get_all().filter(cls.original_author_id == user_id).fetch()
        )

        for feedback_model in feedback_models:
            user_data[feedback_model.id] = {
                'category': feedback_model.category,
                'target_type': feedback_model.target_type,
                'target_id': feedback_model.target_id,
                'page_url': feedback_model.page_url,
                'language_code': feedback_model.language_code,
                'rating': feedback_model.rating,
                'has_screenshot': feedback_model.has_screenshot,
                'has_session_info': feedback_model.has_session_info,
                'status': feedback_model.status,
                'message_count': feedback_model.message_count,
                'created_on': utils.get_time_in_millisecs(
                    feedback_model.created_on
                ),
                'last_updated': utils.get_time_in_millisecs(
                    feedback_model.last_updated
                ),
            }

        return user_data

    @classmethod
    def get_filtered_query_of_feedback_threads(
        cls,
        category_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        target_type_filter: Optional[str] = None,
        target_id_filter: Optional[str] = None,
        date_from: Optional[datetime.datetime] = None,
        date_to: Optional[datetime.datetime] = None,
    ) -> List[WebFeedbackThreadModel]:
        """Returns a list of feedback threads matching the given filters.

        Args:
            category_filter: Optional[str]. If provided, only threads with this category are returned.
            status_filter: Optional[str]. If provided, only threads with this status are returned.
            target_type_filter: Optional[str]. If provided, only threads with this target type are returned.
            target_id_filter: Optional[str]. If provided, only threads with this target ID are returned.
            date_from: Optional[datetime.datetime]. If provided, only threads created on or after this date are returned.
            date_to: Optional[datetime.datetime]. If provided, only threads created on or before this date are returned.

        Returns:
            List[WebFeedbackThreadModel]. A list of feedback thread models matching the filters.
        """
        query = cls.query()


class WebFeedbackMessageModel(base_models.BaseModel):
    """Storage model for messages within a web feedback thread.

    This model stores individual messages that belong to a feedback
    thread. Each thread contains a sequence of messages, starting
    with the initial user submission (message_index = 0).

    Messages support:
    - Text content
    - Status updates
    - Optional screenshot attachments

    This enables structured conversation history, moderation workflows,
    and audit tracking.

    Fields:
        id: str. Unique identifier in format "<thread_id>.<message_index>".
        thread_id: str. ID of the associated WebFeedbackThreadModel.
        message_index: int. Sequential index of the message within the thread.
        author_id: Optional[str]. User ID of the message author,
            or None for anonymous users.
        author_status: str. Role of the author
            ("learner" | "feedback_admin" | "editor").
        text: Optional[str]. Message content.
        updated_status: Optional[str]. Status change associated with
            this message, if any.
        screenshot_filename: Optional[str]. FileName of the uploaded
            screenshot stored in GCS.
        screenshot_entity_id: Optional[str]. Entity ID used for
            screenshot storage in GCS.
        created_on: datetime. Timestamp of message creation.
        last_updated: datetime. Timestamp of last update.
        deleted: bool. Whether the message is soft-deleted.
    """
