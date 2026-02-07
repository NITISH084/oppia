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

"""Controllers for platform (web) user feedback."""

from __future__ import annotations

from core import feconf
from core.controllers import acl_decorators, base
from core.domain import html_cleaner
from core.domain import platform_feedback_services

from typing import Dict, Optional, TypedDict


class PlatformFeedbackSubmitPayloadDict(TypedDict):
    """Payload for platform feedback submit."""

    category: str
    description: str
    page_url: str
    language_code: str
    rating: Optional[int]
    screenshot_filename: Optional[str]
    contact_email: Optional[str]
    allow_contact: Optional[bool]
    include_session_info: Optional[bool]
    session_info: Optional[Dict[str, Optional[str]]]
    captcha_token: Optional[str]


class PlatformFeedbackSubmitHandler(
    base.BaseHandler[PlatformFeedbackSubmitPayloadDict, Dict[str, str]]
):
    """Handles submission of platform feedback from the web."""

    REQUIRE_PAYLOAD_CSRF_CHECK = False
    POST_HANDLER_ERROR_RETURN_TYPE = feconf.HANDLER_TYPE_JSON
    URL_PATH_ARGS_SCHEMAS: Dict[str, str] = {}
    HANDLER_ARGS_SCHEMAS = {
        'POST': {
            'category': {
                'schema': {'type': 'basestring'},
                'default_value': 'platform',
            },
            'description': {'schema': {'type': 'basestring'}},
            'page_url': {'schema': {'type': 'basestring'}},
            'language_code': {'schema': {'type': 'basestring'}},
            'rating': {'schema': {'type': 'int'}, 'default_value': None},
            'screenshot_filename': {
                'schema': {'type': 'basestring'},
                'default_value': None,
            },
            'contact_email': {
                'schema': {'type': 'basestring'},
                'default_value': None,
            },
            'allow_contact': {
                'schema': {'type': 'bool'},
                'default_value': False,
            },
            'include_session_info': {
                'schema': {'type': 'bool'},
                'default_value': False,
            },
            'session_info': {
                'schema': {'type': 'dict'},
                'default_value': None,
            },
            'captcha_token': {
                'schema': {'type': 'basestring'},
                'default_value': None,
            },
        }
    }

    def post(self) -> None:
        """Submits platform feedback. Allowed for logged-in and anonymous."""
        assert self.normalized_payload is not None
        payload = self.normalized_payload
        description = payload.get('description', '').strip()
        if not description:
            raise self.InvalidInputException('Description is required.')

        category = payload.get('category') or 'platform'
        if category not in ('lesson', 'platform'):
            category = 'platform'

        page_url = (payload.get('page_url') or '').strip() or '/'
        language_code = (payload.get('language_code') or 'en').strip() or 'en'
        rating = payload.get('rating')
        if rating is not None and (
            not isinstance(rating, int) or rating < 1 or rating > 5
        ):
            rating = None

        # For logged-out users, CAPTCHA will be required (stub for now).
        if not self.user_id and not payload.get('captcha_token'):
            # Allow in dev / stub; in production we would verify captcha_token.
            pass

        contact_email = None
        if payload.get('allow_contact'):
            contact_email = (payload.get('contact_email') or '').strip()
            if self.user_id:
                # Use logged-in user's email from user_services if needed.
                from core.domain import user_services

                user_settings = user_services.get_user_settings(self.user_id)
                if user_settings and user_settings.email:
                    contact_email = user_settings.email

        session_info = None
        if payload.get('include_session_info') and payload.get('session_info'):
            session_info = payload.get('session_info')

        screenshot_filename = (
            payload.get('screenshot_filename') or ''
        ).strip() or None

        sanitized_description = html_cleaner.strip_html_tags(description)
        feedback_id = platform_feedback_services.create_platform_feedback(
            category=category,
            description=sanitized_description,
            page_url=page_url,
            language_code=language_code,
            rating=rating,
            screenshot_filename=screenshot_filename,
            contact_email=contact_email or None,
            session_info=session_info,
            user_id=self.user_id,
        )
        self.render_json({'feedback_id': feedback_id})


class PlatformFeedbackListHandlerNormalizedRequestDict(TypedDict):
    """Request params for platform feedback list."""

    cursor: Optional[str]
    category: Optional[str]
    date_from_msecs: Optional[float]
    date_to_msecs: Optional[float]


class PlatformFeedbackListHandler(
    base.BaseHandler[
        Dict[str, str], PlatformFeedbackListHandlerNormalizedRequestDict
    ]
):
    """Returns a paginated list of platform feedback for admins."""

    GET_HANDLER_ERROR_RETURN_TYPE = feconf.HANDLER_TYPE_JSON
    URL_PATH_ARGS_SCHEMAS: Dict[str, str] = {}
    HANDLER_ARGS_SCHEMAS = {
        'GET': {
            'cursor': {'schema': {'type': 'basestring'}, 'default_value': None},
            'category': {
                'schema': {'type': 'basestring'},
                'default_value': None,
            },
            'date_from_msecs': {
                'schema': {'type': 'float'},
                'default_value': None,
            },
            'date_to_msecs': {
                'schema': {'type': 'float'},
                'default_value': None,
            },
        }
    }

    @acl_decorators.can_access_admin_page
    def get(self) -> None:
        """Returns a page of platform feedback."""
        assert self.normalized_request is not None
        req = self.normalized_request
        page_size = 20
        results, next_cursor, more = (
            platform_feedback_services.get_platform_feedback_list(
                page_size=page_size,
                cursor=req.get('cursor'),
                category_filter=req.get('category'),
                date_from_msecs=req.get('date_from_msecs'),
                date_to_msecs=req.get('date_to_msecs'),
            )
        )
        result_dicts = [r.to_dict() for r in results]
        self.render_json(
            {
                'results': result_dicts,
                'cursor': next_cursor,
                'more': more,
            }
        )


class PlatformFeedbackDetailHandler(
    base.BaseHandler[Dict[str, str], Dict[str, str]]
):
    """Returns a single platform feedback by id for admins."""

    GET_HANDLER_ERROR_RETURN_TYPE = feconf.HANDLER_TYPE_JSON
    URL_PATH_ARGS_SCHEMAS = {'feedback_id': {'schema': {'type': 'basestring'}}}
    HANDLER_ARGS_SCHEMAS: Dict[str, Dict[str, str]] = {'GET': {}}

    @acl_decorators.can_access_admin_page
    def get(self, feedback_id: str) -> None:
        """Returns full detail for one feedback."""
        feedback = platform_feedback_services.get_platform_feedback_by_id(
            feedback_id
        )
        if feedback is None:
            raise self.NotFoundException(
                'Platform feedback with id %s not found.' % feedback_id
            )
        self.render_json(feedback.to_dict())


class PlatformFeedbackUpdateStatusPayloadDict(TypedDict):
    """Payload for update status."""

    status: str


class PlatformFeedbackUpdateStatusHandler(
    base.BaseHandler[PlatformFeedbackUpdateStatusPayloadDict, Dict[str, str]]
):
    """Updates the status of a platform feedback (admin)."""

    URL_PATH_ARGS_SCHEMAS = {'feedback_id': {'schema': {'type': 'basestring'}}}
    HANDLER_ARGS_SCHEMAS = {
        'PUT': {'status': {'schema': {'type': 'basestring'}}}
    }

    @acl_decorators.can_access_admin_page
    def put(self, feedback_id: str) -> None:
        """Sets status to open, dismissed, or deleted."""
        assert self.normalized_payload is not None
        new_status = (self.normalized_payload.get('status') or '').strip()
        if new_status not in ('open', 'dismissed', 'deleted'):
            raise self.InvalidInputException('Invalid status.')
        updated = platform_feedback_services.update_platform_feedback_status(
            feedback_id, new_status
        )
        if not updated:
            raise self.NotFoundException(
                'Platform feedback with id %s not found.' % feedback_id
            )
        self.render_json({})


class PlatformFeedbackDeleteHandler(
    base.BaseHandler[Dict[str, str], Dict[str, str]]
):
    """Permanently deletes a platform feedback (admin)."""

    DELETE_HANDLER_ERROR_RETURN_TYPE = feconf.HANDLER_TYPE_JSON
    URL_PATH_ARGS_SCHEMAS = {'feedback_id': {'schema': {'type': 'basestring'}}}
    HANDLER_ARGS_SCHEMAS: Dict[str, Dict[str, str]] = {'DELETE': {}}

    @acl_decorators.can_access_admin_page
    def delete(self, feedback_id: str) -> None:
        """Deletes the feedback."""
        deleted = platform_feedback_services.delete_platform_feedback(
            feedback_id
        )
        if not deleted:
            raise self.NotFoundException(
                'Platform feedback with id %s not found.' % feedback_id
            )
        self.render_json({})
