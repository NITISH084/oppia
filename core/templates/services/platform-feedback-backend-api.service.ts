// Copyright 2026 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Backend API service for platform feedback submission.
 */

import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';

export interface PlatformFeedbackSubmitPayload {
  category: 'platform' | 'lesson';
  description: string;
  page_url: string;
  language_code: string;
  rating: number | null;
  screenshot_filename: string | null;
  contact_email: string | null;
  allow_contact: boolean;
  include_session_info: boolean;
  session_info: {
    client_time_msecs: number;
    timezone_offset_mins: number;
    user_agent: string;
    viewport: {
      width: number;
      height: number;
    };
    page: {
      url: string;
      path: string;
      title: string;
      referrer: string;
    };
    locale: {
      language_code: string;
      direction: 'ltr' | 'rtl';
    };
  } | null;
  captcha_token: string | null;
}

export interface PlatformFeedbackSubmitResponse {
  feedback_id: string;
}

export interface PlatformFeedbackListItem {
  id: string;
  category: string;
  description: string;
  page_url: string;
  language_code: string;
  status: string;
  created_on_msecs: number;
  rating: number | null;
  screenshot_filename: string | null;
  contact_email: string | null;
  session_info: object | null;
}

export interface PlatformFeedbackListResponse {
  results: PlatformFeedbackListItem[];
  cursor: string | null;
  more: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PlatformFeedbackBackendApiService {
  private submitUrl = '/platform_feedback_handler';
  private listUrl = '/platform_feedback_list_handler';
  private updateStatusUrlTemplate =
    '/platform_feedback_update_status_handler/<feedback_id>';
  private deleteUrlTemplate = '/platform_feedback_delete_handler/<feedback_id>';

  constructor(private http: HttpClient) {}

  async submitFeedbackAsync(
    payload: PlatformFeedbackSubmitPayload
  ): Promise<PlatformFeedbackSubmitResponse> {
    try {
      return await this.http
        .post<PlatformFeedbackSubmitResponse>(this.submitUrl, payload)
        .toPromise();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        return Promise.reject(error);
      }
      throw error;
    }
  }

  async fetchFeedbackListAsync(
    cursor: string | null,
    category: string | null,
    dateFromMsecs: number | null,
    dateToMsecs: number | null
  ): Promise<PlatformFeedbackListResponse> {
    const params: {[key: string]: string} = {};
    if (cursor) {
      params.cursor = cursor;
    }
    if (category) {
      params.category = category;
    }
    if (dateFromMsecs) {
      params.date_from_msecs = String(dateFromMsecs);
    }
    if (dateToMsecs) {
      params.date_to_msecs = String(dateToMsecs);
    }
    return this.http
      .get<PlatformFeedbackListResponse>(this.listUrl, {params})
      .toPromise();
  }

  async updateFeedbackStatusAsync(
    feedbackId: string,
    status: string
  ): Promise<void> {
    const url = this.updateStatusUrlTemplate.replace(
      '<feedback_id>',
      feedbackId
    );
    await this.http.put<void>(url, {status}).toPromise();
  }

  async deleteFeedbackAsync(feedbackId: string): Promise<void> {
    const url = this.deleteUrlTemplate.replace('<feedback_id>', feedbackId);
    await this.http.delete<void>(url).toPromise();
  }
}
