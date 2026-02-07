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

"""Services for platform (web) user feedback."""

from __future__ import annotations

import datetime

from core.domain import platform_feedback_domain
from core.platform import models

from typing import Optional, Sequence, Tuple

MYPY = False
if MYPY:  # pragma: no cover
    from mypy_imports import platform_feedback_models

(platform_feedback_models,) = models.Registry.import_models(
    [models.Names.PLATFORM_FEEDBACK]
)


def create_platform_feedback(
    category: str,
    description: str,
    page_url: str,
    language_code: str,
    rating: Optional[int] = None,
    screenshot_filename: Optional[str] = None,
    screenshot_entity_id: Optional[str] = None,
    contact_email: Optional[str] = None,
    session_info: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> str:
    """Creates a new platform feedback and returns its id.

    Args:
        category: One of 'lesson' or 'platform'.
        description: Sanitized feedback text.
        page_url: URL of the page.
        language_code: Language code.
        rating: Optional 1-5 rating.
        screenshot_filename: Optional screenshot blob key.
        screenshot_entity_id: Optional screenshot entity id.
        contact_email: Optional contact email.
        session_info: Optional session/debug info dict.
        user_id: Optional user id if logged in.

    Returns:
        The id of the new feedback.
    """
    return platform_feedback_models.PlatformFeedbackModel.create(
        category=category,
        description=description,
        page_url=page_url,
        language_code=language_code,
        rating=rating,
        screenshot_filename=screenshot_filename,
        screenshot_entity_id=screenshot_entity_id,
        contact_email=contact_email,
        session_info=session_info,
        user_id=user_id,
    )


def get_platform_feedback_by_id(
    feedback_id: str,
) -> Optional[platform_feedback_domain.PlatformFeedback]:
    """Returns the platform feedback with the given id, or None."""
    model = platform_feedback_models.PlatformFeedbackModel.get(
        feedback_id, strict=False
    )
    if model is None:
        return None
    return _model_to_domain(model)


def get_platform_feedback_list(
    page_size: int,
    cursor: Optional[str] = None,
    category_filter: Optional[str] = None,
    date_from_msecs: Optional[float] = None,
    date_to_msecs: Optional[float] = None,
) -> Tuple[
    Sequence[platform_feedback_domain.PlatformFeedback], Optional[str], bool
]:
    """Returns a page of platform feedback for admin.

    Returns:
        3-tuple of (list of PlatformFeedback, next_cursor, more).
    """
    date_from: Optional[datetime.datetime] = None
    date_to: Optional[datetime.datetime] = None
    if date_from_msecs is not None:
        date_from = datetime.datetime.utcfromtimestamp(date_from_msecs / 1000.0)
    if date_to_msecs is not None:
        date_to = datetime.datetime.utcfromtimestamp(date_to_msecs / 1000.0)

    models_list, next_cursor, more = (
        platform_feedback_models.PlatformFeedbackModel.fetch_page(
            page_size=page_size,
            cursor=cursor,
            category_filter=category_filter,
            date_from=date_from,
            date_to=date_to,
        )
    )
    domain_list = [_model_to_domain(m) for m in models_list]
    return (domain_list, next_cursor, more)


def update_platform_feedback_status(feedback_id: str, new_status: str) -> bool:
    """Updates the status of a platform feedback. Returns True if updated."""
    model = platform_feedback_models.PlatformFeedbackModel.get(
        feedback_id, strict=False
    )
    if model is None or new_status not in (
        platform_feedback_models.STATUS_OPEN,
        platform_feedback_models.STATUS_DISMISSED,
        platform_feedback_models.STATUS_DELETED,
    ):
        return False
    model.status = new_status
    model.update_timestamps()
    model.put()
    return True


def delete_platform_feedback(feedback_id: str) -> bool:
    """Permanently deletes the platform feedback. Returns True if deleted."""
    model = platform_feedback_models.PlatformFeedbackModel.get(
        feedback_id, strict=False
    )
    if model is None:
        return False
    model.delete()
    return True


def _model_to_domain(
    model: platform_feedback_models.PlatformFeedbackModel,
) -> platform_feedback_domain.PlatformFeedback:
    """Converts a storage model to a domain object."""
    # Model created_on is UTC; convert to milliseconds since epoch.
    created_on_msecs = (
        (model.created_on - datetime.datetime(1970, 1, 1)).total_seconds()
        * 1000.0
        if model.created_on
        else 0.0
    )
    return platform_feedback_domain.PlatformFeedback(
        feedback_id=model.id,
        category=model.category,
        description=model.description,
        page_url=model.page_url,
        language_code=model.language_code,
        status=model.status,
        created_on_msecs=created_on_msecs,
        rating=model.rating,
        screenshot_filename=model.screenshot_filename,
        screenshot_entity_id=model.screenshot_entity_id,
        contact_email=model.contact_email,
        session_info=model.session_info,
        user_id=model.user_id,
    )
