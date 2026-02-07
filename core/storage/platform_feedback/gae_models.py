# Copyright 2025 The Oppia Authors. All Rights Reserved.
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

"""Models for platform (web) user feedback."""

from __future__ import annotations

import datetime
import uuid

from core import utils
from core.platform import models

from typing import Dict, Final, Optional, Sequence, Tuple

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import base_models, datastore_services

(base_models,) = models.Registry.import_models([models.Names.BASE_MODEL])
datastore_services = models.Registry.import_datastore_services()

# Category choices for platform feedback.
CATEGORY_LESSON: Final = 'lesson'
CATEGORY_PLATFORM: Final = 'platform'
CATEGORY_CHOICES: Final = [CATEGORY_LESSON, CATEGORY_PLATFORM]

# Status choices for platform feedback.
STATUS_OPEN: Final = 'open'
STATUS_DISMISSED: Final = 'dismissed'
STATUS_DELETED: Final = 'deleted'
STATUS_CHOICES: Final = [STATUS_OPEN, STATUS_DISMISSED, STATUS_DELETED]

_MAX_ID_GENERATION_ATTEMPTS: Final = 10


def _generate_new_id(model_class: type) -> str:
    """Generates a new unique id for PlatformFeedbackModel.

    Args:
        model_class: class. The PlatformFeedbackModel class.

    Returns:
        str. A new unique id.

    Raises:
        RuntimeError. Failed to generate a unique ID.
    """
    for _ in range(_MAX_ID_GENERATION_ATTEMPTS):
        new_id = utils.convert_to_hash(uuid.uuid4().hex, 22)
        if model_class.get(new_id, strict=False) is None:
            return new_id
    raise RuntimeError(
        'Failed to generate a unique ID after %d attempts'
        % (_MAX_ID_GENERATION_ATTEMPTS)
    )


class PlatformFeedbackModel(base_models.BaseModel):
    """Model for storing platform (web) user feedback.

    Each instance represents one feedback submission from the web platform
    with optional rating, category, screenshot, session info, and contact.
    """

    # We use the model id as a key in the Takeout dict.
    ID_IS_USED_AS_TAKEOUT_KEY: bool = True

    # Category: lesson (content-related) or platform (site-related).
    category = datastore_services.StringProperty(
        required=True, indexed=True, choices=CATEGORY_CHOICES
    )
    # Optional 1-5 star rating; None if not provided.
    rating = datastore_services.IntegerProperty(required=False, indexed=True)
    # Required feedback text (sanitized).
    description = datastore_services.TextProperty(required=True, indexed=False)
    # Page URL where feedback was submitted.
    page_url = datastore_services.StringProperty(required=True, indexed=True)
    # Language code at time of submission.
    language_code = datastore_services.StringProperty(
        required=True, indexed=True
    )
    # Status: open, dismissed, or deleted.
    status = datastore_services.StringProperty(
        required=True, indexed=True, choices=STATUS_CHOICES
    )
    # Optional screenshot blob key or filename; None if not attached.
    screenshot_filename = datastore_services.StringProperty(
        required=False, indexed=True
    )
    # Optional contact email if user opted in.
    contact_email = datastore_services.StringProperty(
        required=False, indexed=True
    )
    # Optional session/debug info JSON if user opted in.
    session_info = datastore_services.JsonProperty(required=False, indexed=True)
    # User ID if logged in; None for anonymous.
    user_id = datastore_services.StringProperty(required=False, indexed=True)

    @staticmethod
    def get_deletion_policy() -> base_models.DELETION_POLICY:
        """Model contains optional user_id and contact_email."""
        return base_models.DELETION_POLICY.LOCALLY_PSEUDONYMIZE

    @staticmethod
    def get_model_association_to_user() -> (
        base_models.MODEL_ASSOCIATION_TO_USER
    ):
        """One user can submit multiple platform feedbacks."""
        return base_models.MODEL_ASSOCIATION_TO_USER.MULTIPLE_INSTANCES_PER_USER

    @classmethod
    def get_export_policy(cls) -> Dict[str, base_models.EXPORT_POLICY]:
        """Export policy for platform feedback."""
        return dict(
            super(cls, cls).get_export_policy(),
            **{
                'category': base_models.EXPORT_POLICY.EXPORTED,
                'rating': base_models.EXPORT_POLICY.EXPORTED,
                'description': base_models.EXPORT_POLICY.EXPORTED,
                'page_url': base_models.EXPORT_POLICY.EXPORTED,
                'language_code': base_models.EXPORT_POLICY.EXPORTED,
                'status': base_models.EXPORT_POLICY.EXPORTED,
                'screenshot_filename': base_models.EXPORT_POLICY.EXPORTED,
                'contact_email': base_models.EXPORT_POLICY.EXPORTED,
                'session_info': base_models.EXPORT_POLICY.EXPORTED,
                'user_id': base_models.EXPORT_POLICY.NOT_APPLICABLE,
            },
        )

    @classmethod
    def has_reference_to_user_id(cls, user_id: str) -> bool:
        """Check whether any feedback was submitted by this user."""
        return cls.query(cls.user_id == user_id).get(keys_only=True) is not None

    @classmethod
    def export_data(cls, user_id: str) -> Dict[str, Dict[str, Optional[str]]]:
        """Exports user's platform feedback for takeout."""
        feedback_models_list: Sequence[PlatformFeedbackModel] = cls.query(
            cls.user_id == user_id
        ).fetch()
        return {
            model.id: {
                'category': model.category,
                'rating': (
                    str(model.rating) if model.rating is not None else None
                ),
                'description': model.description,
                'page_url': model.page_url,
                'language_code': model.language_code,
                'status': model.status,
                'created_on': (
                    model.created_on.isoformat() if model.created_on else None
                ),
            }
            for model in feedback_models_list
        }

    @classmethod
    def fetch_page(
        cls,
        page_size: int,
        cursor: Optional[str],
        category_filter: Optional[str] = None,
        date_from: Optional[datetime.datetime] = None,
        date_to: Optional[datetime.datetime] = None,
    ) -> Tuple[Sequence[PlatformFeedbackModel], Optional[str], bool]:
        """Fetches a page of platform feedback sorted by created_on desc.

        Args:
            page_size: Maximum number of entities to return.
            cursor: Optional urlsafe cursor for pagination.
            category_filter: Optional category to filter by.
            date_from: Optional start date (inclusive).
            date_to: Optional end date (inclusive).

        Returns:
            3-tuple of (results, next_cursor, more).
        """
        query = cls.query()
        if category_filter and category_filter in CATEGORY_CHOICES:
            query = query.filter(cls.category == category_filter)
        if date_from is not None:
            query = query.filter(cls.created_on >= date_from)
        if date_to is not None:
            query = query.filter(cls.created_on <= date_to)
        query = query.order(-cls.created_on)

        start_cursor = datastore_services.make_cursor(urlsafe_cursor=cursor)
        fetch_result: Tuple[
            Sequence[PlatformFeedbackModel],
            datastore_services.Cursor,
            bool,
        ] = query.fetch_page(page_size, start_cursor=start_cursor)
        results, next_cursor, _ = fetch_result
        # Fetch one extra to determine if there are more.
        fetch_plus_one: Tuple[
            Sequence[PlatformFeedbackModel],
            datastore_services.Cursor,
            bool,
        ] = query.fetch_page(page_size + 1, start_cursor=start_cursor)
        plus_one_results, _, _ = fetch_plus_one
        more = len(plus_one_results) == page_size + 1
        next_cursor_str: Optional[str] = None
        if next_cursor and more:
            next_cursor_str = next_cursor.urlsafe().decode('utf-8')
        return (results, next_cursor_str, more)

    @classmethod
    def create(
        cls,
        category: str,
        description: str,
        page_url: str,
        language_code: str,
        rating: Optional[int] = None,
        screenshot_filename: Optional[str] = None,
        contact_email: Optional[str] = None,
        session_info: Optional[Dict[str, Optional[str]]] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """Creates a new PlatformFeedbackModel and returns its id.

        Args:
            category: str. One of CATEGORY_LESSON, CATEGORY_PLATFORM.
            description: str. Sanitized feedback text.
            page_url: str. URL of the page where feedback was submitted.
            language_code: str. Language code.
            rating: int|None. Optional 1-5 rating.
            screenshot_filename: str|None. Optional screenshot blob key/filename.
            contact_email: str|None. Optional contact email.
            session_info: dict|None. Optional session/debug info.
            user_id: str|None. Optional user id if logged in.

        Returns:
            str. The id of the new model.
        """
        entity_id = _generate_new_id(cls)
        entity = cls(
            id=entity_id,
            category=category,
            description=description,
            page_url=page_url,
            language_code=language_code,
            status=STATUS_OPEN,
            rating=rating,
            screenshot_filename=screenshot_filename,
            contact_email=contact_email,
            session_info=session_info,
            user_id=user_id,
        )
        entity.update_timestamps()
        entity.put()
        return entity_id
