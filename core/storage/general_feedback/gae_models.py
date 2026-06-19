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

"""Models for web user feedback and session logs."""

from __future__ import annotations

import datetime

from core import feconf, utils
from core.domain import general_feedback_domain
from core.platform import models

from typing import Dict, Final, List, Literal, Optional, Sequence, Tuple, Union

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import base_models, datastore_services

(base_models,) = models.Registry.import_models([models.Names.BASE_MODEL])

datastore_services = models.Registry.import_datastore_services()

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

# Allowed Report category choices.
CATEGORY_TYPO: Final = 'typo'
CATEGORY_BROKEN_LAYOUT_OR_IMAGE: Final = 'broken_layout_or_image'
CATEGORY_CONFUSING_OR_INCORRECT_ANSWER: Final = 'confusing_or_incorrect_answer'
CATEGORY_OTHER_OR_NOT_SURE: Final = 'other_or_not_sure'
CATEGORY_CHOICES: Final = [
    CATEGORY_TYPO,
    CATEGORY_BROKEN_LAYOUT_OR_IMAGE,
    CATEGORY_CONFUSING_OR_INCORRECT_ANSWER,
    CATEGORY_OTHER_OR_NOT_SURE,
]

# Categories that route to the Creator Dashboard.
_CREATOR_DASHBOARD_CATEGORIES: Final = frozenset(
    [
        CATEGORY_TYPO,
        CATEGORY_CONFUSING_OR_INCORRECT_ANSWER,
    ]
)

# Report source choices.
SOURCE_LESSON: Final = 'lesson'
SOURCE_APP: Final = 'app'
SOURCE_CHOICES: Final = [SOURCE_LESSON, SOURCE_APP]

# platform choices.
PLATFORM_WEB: Final = 'web'
PLATFORM_ANDROID: Final = 'android'
PLATFORM_CHOICES: Final = [PLATFORM_WEB, PLATFORM_ANDROID]

DESTINATION_CREATOR: Final = 'creator'
DESTINATION_TECHNICAL: Final = 'technical'
DESTINATION_CHOICES: Final = [DESTINATION_CREATOR, DESTINATION_TECHNICAL]


# Constants used for generating new ids.
_MAX_RETRIES: Final = 10
_RAND_RANGE: Final = 127 * 127


class BaseFeedbackModel(base_models.BaseModel):
    """Abstract base model shared by LessonFeedbackModel and PlatformFeedbackModel.

    Subclasses MUST implement:
        get_deletion_policy()
        get_model_association_to_user()
        get_export_policy()
        has_reference_to_user_id()
        export_data()

    Fields:
        author_id: Optional[str]. User ID of the submitter, or None for
            reports.
        feedback_text: str. The main text body submitted by the learner.
        status: str. Current moderation status of the feedback entry
            (open | closed | ignored | not_actionable).
        lesson_metadata_schema_version: Optional[int]. Schema version for the
            lesson_metadata_json blob. Allows future migrations.
        lesson_metadata_json: Optional[Dict]. Lesson Metadata at
            submission time. Contains:
                exploration_id (str),
                exploration_version (int),
                state_name (str),
                state_index (int),
                learner_current_answer (str | None).
            None for site-level (non-lesson) submissions.
        created_on: datetime. Timestamp of creation (set by BaseModel).
        last_updated: datetime. Timestamp of last update (set by BaseModel).
        deleted: bool. Soft-delete flag (set by BaseModel).
    """

    # Subclasses must set this if the model id doubles as a takeout key.
    ID_IS_USED_AS_TAKEOUT_KEY: bool = True

    author_id = datastore_services.StringProperty(
        required=False,
        indexed=True,
    )
    feedback_text = datastore_services.TextProperty(required=True)
    status = datastore_services.StringProperty(
        required=True,
        indexed=True,
        choices=STATUS_CHOICES,
    )
    lesson_metadata_schema_version = datastore_services.IntegerProperty(
        required=False,
        indexed=True,
    )
    lesson_metadata_json = datastore_services.JsonProperty(
        required=False,
        indexed=False,
    )

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Subclasses must override this."""
        raise NotImplementedError(
            'Subclasses of BaseFeedbackModel must implement '
            'get_deletion_policy().'
        )

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """Subclasses must override this."""
        raise NotImplementedError(
            'Subclasses of BaseFeedbackModel must implement '
            'get_model_association_to_user().'
        )

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Merges base export policy with the shared fields defined here."""
        return dict(
            super().get_export_policy(),
            **{
                # author_id is pseudonymized, not exported directly.
                'author_id': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'feedback_text': base_models.EXPORT_POLICY.EXPORTED,
                'status': base_models.EXPORT_POLICY.EXPORTED,
                'lesson_metadata_schema_version': (
                    base_models.EXPORT_POLICY.NOT_APPLICABLE
                ),
                'lesson_metadata_json': base_models.EXPORT_POLICY.EXPORTED,
            },
        )

    @classmethod
    def has_reference_to_user_id(cls, user_id: str) -> bool:
        """Checks whether any non-deleted entry references the given user ID.

        Args:
            user_id: str. The ID of the user to check.

        Returns:
            bool. True if the user ID appears in any non-deleted entry.
        """
        return (
            cls.query(cls.author_id == user_id)
            .filter(cls.deleted.IN([False]))
            .get(keys_only=True)
            is not None
        )

    # Subclasses must override this with their own prefix string, e.g.
    # 'feedback.lesson' or 'feedback.platform'. The generated ID will have
    # the form '<ID_PREFIX>.<timestamp_b64><random_b64>'.
    ID_PREFIX: str = ''

    @classmethod
    def _generate_new_id(cls) -> str:
        """Generates a unique prefixed model ID.

        The ID has the form:
            <ID_PREFIX>.<timestamp_base64><random_base64>

        e.g. 'feedback.lesson.MTczNzAwMDAwMDAwMGFi'

        Returns:
            str. A globally unique ID containing the model's type prefix.

        Raises:
            Exception. Raised when too many collisions occur while generating
                a new ID.
        """
        if not cls.ID_PREFIX:
            raise Exception(
                'Subclasses of BaseFeedbackModel must define a non-empty '
                'ID_PREFIX. Got empty string for %s.' % cls.__name__
            )
        for _ in range(_MAX_RETRIES):
            new_id = '%s.%s%s' % (
                cls.ID_PREFIX,
                utils.base64_from_int(
                    int(utils.get_current_time_in_millisecs())
                ),
                utils.base64_from_int(utils.get_random_int(_RAND_RANGE)),
            )
            if not cls.get_by_id(new_id):
                return new_id
        raise Exception(
            '%s ID generator is producing too many collisions.' % cls.__name__
        )


class LessonFeedbackModel(BaseFeedbackModel):
    """Primary datastore model for learner lesson feedback submissions.

    Each learner submission creates exactly one LessonFeedbackModel.
    Creator responses are stored inline as a JSON list.

    When a learner clicks "Add a Note" from My Suggestions tab in New Learner Dashboard on a closed feedback entry, a new
    LessonFeedbackModel is created and its parent_feedback_id references
    the original entry.

    The id of instances of this class has the form
        feedback.lesson.<timestamp_base64><random_base64>

    Fields (in addition to BaseFeedbackModel fields):
        parent_feedback_id: Optional[str]. References the original
            LessonFeedbackModel when this entry is a follow-up note.
            None for top-level submissions.
        response_list: List[Dict]. Ordered list of creator responses. Each
            element is a dict with keys:
                response_text (str),
                responded_by (str),
                responded_on (float, milliseconds since epoch).
        response_count: int. Total number of creator responses.
        seen_response_count: int. Number of responses the learner has
            already seen.
    """

    ID_IS_USED_AS_TAKEOUT_KEY: Literal[True] = True
    ID_PREFIX: str = 'feedback.lesson'

    parent_feedback_id = datastore_services.StringProperty(
        required=False,
        indexed=True,
    )
    response_list = datastore_services.JsonProperty(
        required=True,
        indexed=False,
    )
    response_count = datastore_services.IntegerProperty(
        required=True,
        default=0,
        indexed=False,
    )
    seen_response_count = datastore_services.IntegerProperty(
        required=True,
        default=0,
        indexed=False,
    )

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Model contains user IDs to pseudonymize."""
        return base_models.DELETION_POLICY.LOCALLY_PSEUDONYMIZE

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """One user can have multiple lesson feedback entries."""
        return base_models.MODEL_ASSOCIATION_TO_USER.MULTIPLE_INSTANCES_PER_USER

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Model contains data to export corresponding to a user."""
        return dict(
            super().get_export_policy(),
            **{
                'parent_feedback_id': base_models.EXPORT_POLICY.EXPORTED,
                # response_list stores responded_by (raw user ID) internally
                # but export_data strips it, emitting only response_text
                # and responded_on to the takeout output.
                'response_list': base_models.EXPORT_POLICY.EXPORTED,
                'response_count': base_models.EXPORT_POLICY.EXPORTED,
                'seen_response_count': base_models.EXPORT_POLICY.EXPORTED,
                'created_on': base_models.EXPORT_POLICY.EXPORTED,
                'last_updated': base_models.EXPORT_POLICY.EXPORTED,
            },
        )

    @classmethod
    def get_field_names_for_takeout(cls) -> Dict[str, str]:
        """Renames timestamp keys for takeout exports."""
        return {
            'created_on': 'created_on_msec',
            'last_updated': 'last_updated_msec',
        }

    @classmethod
    def export_data(
        cls, user_id: str
    ) -> Dict[str, Dict[str, Union[str, int, float, bool, None, list]]]:
        """Exports lesson feedback data corresponding to a user_id.

        Args:
            user_id: str. The ID of the user whose data should be exported.

        Returns:
            dict. A mapping of feedback IDs to their exported field values.
        """
        user_data = {}
        feedback_models: Sequence[LessonFeedbackModel] = (
            cls.get_all()
            .filter(cls.deleted.IN([False]))
            .filter(cls.author_id == user_id)
            .fetch()
        )

        for feedback_model in feedback_models:
            # Sanitize each response dict to ensure no raw user IDs are exported.
            sanitized_response_list = [
                {
                    'response_text': response.get('response_text'),
                    'responded_on': response.get('responded_on'),
                }
                for response in feedback_model.response_list
            ]
            user_data[feedback_model.id] = {
                'feedback_text': feedback_model.feedback_text,
                'status': feedback_model.status,
                'lesson_metadata_json': feedback_model.lesson_metadata_json,
                'parent_feedback_id': feedback_model.parent_feedback_id,
                'response_list': sanitized_response_list,
                'response_count': feedback_model.response_count,
                'seen_response_count': feedback_model.seen_response_count,
                'created_on_msec': utils.get_time_in_millisecs(
                    feedback_model.created_on
                ),
                'last_updated_msec': utils.get_time_in_millisecs(
                    feedback_model.last_updated
                ),
            }

        return user_data

    @classmethod
    def create(
        cls,
        author_id: str,
        feedback_text: str,
        lesson_metadata_json: general_feedback_domain.LessonMetadataDict,
        parent_feedback_id: Optional[str] = None,
    ) -> str:
        """Creates a new LessonFeedbackModel and returns its ID.

        Args:
            author_id: str. User ID of the submitter.
            feedback_text: str. The main text body submitted by the learner.
            lesson_metadata_json: Dict.Lesson metadata at
                submission time. Must include exploration_id,
                exploration_version, state_name, state_index, and
                learner_current_answer.
            parent_feedback_id: Optional[str]. If this submission is a
                follow-up note, references the original LessonFeedbackModel.

        Returns:
            str. The ID of the newly created model.
        """
        feedback_id = cls._generate_new_id()
        feedback_model = cls(
            id=feedback_id,
            author_id=author_id,
            feedback_text=feedback_text,
            status=STATUS_CHOICES_OPEN,
            lesson_metadata_schema_version=feconf.CURRENT_LESSON_METADATA_SCHEMA_VERSION,
            lesson_metadata_json=lesson_metadata_json,
            parent_feedback_id=parent_feedback_id,
            response_list=[],
            response_count=0,
            seen_response_count=0,
        )
        feedback_model.update_timestamps()
        feedback_model.put()
        return feedback_id


class PlatformFeedbackModel(BaseFeedbackModel):
    """Primary datastore model for lesson issue reports and site issue reports.

    Each report submission creates exactly one PlatformFeedbackModel. The
    destination_dashboard field is set automatically at creation time
    based on the source and category:

        typo                        → creator
        confusing_or_incorrect_answer → creator
        broken_layout_or_image      → technical
        other_or_not_sure           → technical
        all site (app) reports      → technical

    The id of instances of this class has the form
        feedback.platform.<timestamp_base64><random_base64>

    Fields (in addition to BaseFeedbackModel fields):
        source: str. Origin of the report ("lesson" | "app").
        platform: str. Platform of the report ("web" | "android").
        destination_dashboard: str. Routing target ("creator" | "technical").
        category: Optional[str]. Report category; required for lesson reports,
            must be None for site reports.
        include_technical_logs: bool. Whether session diagnostics are included.
        screenshot_filename: Optional[str]. Filename of the uploaded
            screenshot stored in GCS.
        screenshot_entity_id: Optional[str]. Entity ID used for screenshot
            storage in GCS. Must be present if and only if screenshot_filename
            is present.
    """

    ID_IS_USED_AS_TAKEOUT_KEY: Literal[True] = True
    ID_PREFIX: str = 'feedback.platform'

    source = datastore_services.StringProperty(
        required=True,
        indexed=True,
        choices=SOURCE_CHOICES,
    )
    platform = datastore_services.StringProperty(
        required=True,
        indexed=True,
        choices=PLATFORM_CHOICES,
    )
    destination_dashboard = datastore_services.StringProperty(
        required=True,
        indexed=True,
        choices=DESTINATION_CHOICES,
    )
    category = datastore_services.StringProperty(
        required=False,
        indexed=True,
        choices=CATEGORY_CHOICES,
    )
    include_technical_logs = datastore_services.BooleanProperty(
        required=True,
        indexed=True,
    )
    screenshot_filename = datastore_services.TextProperty(
        required=False,
    )
    screenshot_entity_id = datastore_services.TextProperty(
        required=False,
    )

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Model is not directly associated with users."""
        return base_models.DELETION_POLICY.DELETE

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """Model is not directly associated with users."""
        return base_models.MODEL_ASSOCIATION_TO_USER.NOT_CORRESPONDING_TO_USER

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Model does not correspond directly to a user."""
        return dict(
            super().get_export_policy(),
            **{
                # Fields inherited from BaseFeedbackModel.
                'author_id': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'feedback_text': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'status': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'lesson_metadata_schema_version': (
                    base_models.EXPORT_POLICY.NOT_APPLICABLE
                ),
                'lesson_metadata_json': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                # Fields specific to PlatformFeedbackModel.
                'source': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'platform': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'destination_dashboard': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'category': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'include_technical_logs': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'screenshot_filename': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'screenshot_entity_id': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'created_on': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'last_updated': base_models.EXPORT_POLICY.NOT_APPLICABLE,
            },
        )

    @classmethod
    def _determine_destination_dashboard(
        cls, source: str, category: Optional[str]
    ) -> str:
        """Determines the destination dashboard based on source and category.

        Routing rules:
            - All site (app) reports → technical
            - typo → creator
            - confusing_or_incorrect_answer → creator
            - broken_layout_or_image → technical
            - other_or_not_sure → technical

        Args:
            source: str. The report source ("lesson" | "app").
            category: Optional[str]. The report category; None for site reports.

        Returns:
            str. The destination dashboard ("creator" | "technical").
        """
        if source == SOURCE_APP:
            return DESTINATION_TECHNICAL
        elif category in _CREATOR_DASHBOARD_CATEGORIES:
            return DESTINATION_CREATOR
        else:
            return DESTINATION_TECHNICAL

    @classmethod
    def create(
        cls,
        feedback_text: str,
        source: str,
        platform: str,
        category: Optional[str],
        lesson_metadata_json: Optional[
            general_feedback_domain.LessonMetadataDict
        ],
        include_technical_logs: bool,
        screenshot_filename: Optional[str],
        screenshot_entity_id: Optional[str],
    ) -> str:
        """Creates a new PlatformFeedbackModel and returns its ID.

        Args:
            author_id: None.
            feedback_text: str. The text body of the report.
            source: str. Origin of the report ("lesson" | "app").
            platform: str. Platform of the report ("web" | "android").
            category: Optional[str]. Report category; can be for lesson
                reports, must be None for site (app) reports.
            lesson_metadata_json: Optional[Dict]. Lesson metadata at
                submission time;
                required for lesson reports, must be None for site reports.
            include_technical_logs: bool. Whether session diagnostics are included.
            screenshot_filename: Optional[str]. GCS filename of the
                screenshot, or None if no screenshot was uploaded.
            screenshot_entity_id: Optional[str]. GCS entity ID for the
                screenshot. Must be provided if and only if screenshot_filename
                is provided.

        Returns:
            str. The ID of the newly created model.

        Raises:
            ValueError. If source is "lesson" and lesson_metadata_json is
                missing.
            ValueError. If source is "app" and category is not None.
            ValueError. If source is "app" and lesson_metadata_json is not
                None.
            ValueError. If exactly one of screenshot_filename and
                screenshot_entity_id is provided.
        """
        if source == SOURCE_LESSON:
            if not lesson_metadata_json:
                raise ValueError(
                    'Lesson feedback must include lesson metadata.'
                )
        elif source == SOURCE_APP:
            if category:
                raise ValueError('App feedback must not include a category.')
            if lesson_metadata_json:
                raise ValueError(
                    'App feedback must not include lesson metadata.'
                )
        else:
            raise ValueError('Invalid source: %s' % source)

        screenshot_provided = (
            screenshot_filename is not None,
            screenshot_entity_id is not None,
        )
        if screenshot_provided[0] != screenshot_provided[1]:
            raise ValueError(
                'screenshot_filename and screenshot_entity_id must both be '
                'provided or both be None.'
            )

        destination_dashboard = cls._determine_destination_dashboard(
            source, category
        )
        report_id = cls._generate_new_id()

        platform_feedback_model = cls(
            id=report_id,
            author_id=None,
            feedback_text=feedback_text,
            status=STATUS_CHOICES_OPEN,
            lesson_metadata_schema_version=(
                feconf.CURRENT_LESSON_METADATA_SCHEMA_VERSION
                if lesson_metadata_json is not None
                else None
            ),
            lesson_metadata_json=lesson_metadata_json,
            source=source,
            platform=platform,
            category=category,
            destination_dashboard=destination_dashboard,
            include_technical_logs=include_technical_logs,
            screenshot_filename=screenshot_filename,
            screenshot_entity_id=screenshot_entity_id,
        )
        platform_feedback_model.update_timestamps()
        platform_feedback_model.put()
        return report_id


class FeedbackSessionLogModel(base_models.BaseModel):
    """Storage model for feedback session diagnostics.

    This model stores optional debugging context associated with a
    feedback submission. Session diagnostics are collected when the
    user opts in to share session information in the feedback modal.

    Each session log is directly associated with a feedback
    using the same ID as PlatformFeedbackModel.

    Fields:
        id: str. PlatformFeedbackModel ID associated with the session log.
        session_info_schema_version: int. Schema version for FeedbackSessionLogModel schema.
        console_logs_json: List[Dict]. Console errors captured during session.
        failed_requests_json: List[Dict]. Failed HTTP request logs.
        navigation_history_json: List[Dict]. Recent navigation history.
        environment_json: Dict. Browser and device metadata.
        created_on: datetime. Timestamp of creation.
        last_updated: datetime. Timestamp of last update.
        deleted: bool.
    """

    # We use the thread ID as the model ID to ensure a one-to-one relationship.
    ID_IS_USED_AS_TAKEOUT_KEY: bool = True

    session_info_schema_version = datastore_services.IntegerProperty(
        required=True,
        indexed=True,
    )
    console_logs_json = datastore_services.JsonProperty(
        required=False,
        indexed=False,
    )
    failed_requests_json = datastore_services.JsonProperty(
        required=False,
        indexed=False,
    )
    navigation_history_json = datastore_services.JsonProperty(
        required=False,
        indexed=False,
    )
    environment_json = datastore_services.JsonProperty(
        required=False,
        indexed=False,
    )

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Model is not directly associated with users."""
        return base_models.DELETION_POLICY.NOT_APPLICABLE

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """Model does not correspond directly to a user."""
        return base_models.MODEL_ASSOCIATION_TO_USER.NOT_CORRESPONDING_TO_USER

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Model should not be exported directly in takeout."""
        return dict(
            super(cls, cls).get_export_policy(),
            **{
                'session_info_schema_version': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'console_logs_json': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'failed_requests_json': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'navigation_history_json': (
                    base_models.EXPORT_POLICY.NOT_APPLICABLE
                ),
                'environment_json': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'created_on': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'last_updated': base_models.EXPORT_POLICY.NOT_APPLICABLE,
                'deleted': base_models.EXPORT_POLICY.NOT_APPLICABLE,
            },
        )

    @classmethod
    def create(
        cls,
        report_id: str,
        console_logs_json: Optional[List[Dict[str, str]]],
        failed_requests_json: Optional[List[Dict[str, str]]],
        navigation_history_json: Optional[List[Dict[str, str]]],
        environment_json: Optional[Dict[str, str]],
    ) -> str:
        """Creates a new FeedbackSessionLogModel for a given thread ID."""
        if cls.get_by_id(report_id):
            raise Exception(
                'Session log for thread ID %s already exists.' % report_id
            )
        session_log = cls(
            id=report_id,
            session_info_schema_version=feconf.CURRENT_SESSION_INFO_SCHEMA_VERSION,
            console_logs_json=console_logs_json,
            failed_requests_json=failed_requests_json,
            navigation_history_json=navigation_history_json,
            environment_json=environment_json,
        )
        session_log.update_timestamps()
        session_log.put()
        return report_id
