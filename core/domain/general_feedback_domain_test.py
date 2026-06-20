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

"""Tests for web user feedback thread and message domain objects."""

from __future__ import annotations

from core.tests import test_utils

from typing import Dict


class WebFeedbackThreadDomainUnitTests(test_utils.GenericTestBase):
    EXP_ID = 'exp0'
    ENTITY_ID = 'entity_id_123'
    THREAD_ID1 = 'exploration.exp0.thread0'
    THREAD_ID2 = 'general.entity_id_123.thread1'
    # Here we use object because session-info payloads contain heterogeneous
    # nested JSON-like values (dicts, lists, strings, ints).
    SESSION_INFO: Dict[str, object] = {
        'console_logs_json': [
            {
                'error_message': 'TypeError: Cannot read properties of undefined',
                'log_level': 'error',
                'timestamp_msecs': 1767225600000,
                'stack_trace': (
                    'TypeError: Cannot read properties of undefined\n'
                    ' at FeedbackComponent.submit (feedback.component.ts:45)'
                ),
            }
        ],
        'failed_requests_json': [
            {
                'url': '/createhandler/web_feedback',
                'method': 'POST',
                'status_code': 500,
                'timestamp_msecs': 1767225601000,
                'status_text': 'Internal Server Error',
                'error_message': 'Request failed with status code 500',
            }
        ],
        'navigation_history_json': [
            {
                'path': '/learn/math',
                'timestamp_msecs': 1767225590000,
            },
            {
                'path': '/explore/exp0',
                'timestamp_msecs': 1767225600000,
            },
        ],
        'environment_json': {
            'client_time_msecs': 1767225602000,
            'timezone_offset_mins': -330,
            'user_agent': (
                'Mozilla/5.0 (X11; Linux x86_64) '
                'AppleWebKit/537.36 Chrome/136.0 Safari/537.36'
            ),
            'viewport': {
                'width': 1920,
                'height': 1080,
            },
            'page': {
                'url': 'http://oppia.org/explore/exp0',
                'title': 'Fractions Exploration',
            },
            'locale': {
                'language_code': 'en',
                'direction': 'ltr',
            },
        },
    }
