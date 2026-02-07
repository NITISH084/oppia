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

"""Domain objects for platform (web) user feedback."""

from __future__ import annotations

from typing import Any, Dict, Optional


class PlatformFeedback:
    """Domain object for a single platform feedback submission."""

    def __init__(
        self,
        feedback_id: str,
        category: str,
        description: str,
        page_url: str,
        language_code: str,
        status: str,
        created_on_msecs: float,
        rating: Optional[int] = None,
        screenshot_filename: Optional[str] = None,
        screenshot_entity_id: Optional[str] = None,
        contact_email: Optional[str] = None,
        session_info: Optional[Dict[str, Optional[str]]] = None,
        user_id: Optional[str] = None,
    ) -> None:
        self.feedback_id = feedback_id
        self.category = category
        self.description = description
        self.page_url = page_url
        self.language_code = language_code
        self.status = status
        self.created_on_msecs = created_on_msecs
        self.rating = rating
        self.screenshot_filename = screenshot_filename
        self.screenshot_entity_id = screenshot_entity_id
        self.contact_email = contact_email
        self.session_info = session_info
        self.user_id = user_id

    def to_dict(self) -> Dict[str, Any]:
        """Returns a dict representation for API responses."""
        return {
            'id': self.feedback_id,
            'category': self.category,
            'description': self.description,
            'page_url': self.page_url,
            'language_code': self.language_code,
            'status': self.status,
            'created_on_msecs': self.created_on_msecs,
            'rating': self.rating,
            'screenshot_filename': self.screenshot_filename,
            'screenshot_entity_id': self.screenshot_entity_id,
            'contact_email': self.contact_email,
            'session_info': self.session_info,
        }
