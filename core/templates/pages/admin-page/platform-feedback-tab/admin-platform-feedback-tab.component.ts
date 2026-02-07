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
 * @fileoverview Platform feedback admin tab.
 */

import {Component} from '@angular/core';
import {
  PlatformFeedbackBackendApiService,
  PlatformFeedbackListItem,
} from 'services/platform-feedback-backend-api.service';

@Component({
  selector: 'oppia-admin-platform-feedback-tab',
  templateUrl: './admin-platform-feedback-tab.component.html',
  styleUrls: ['./admin-platform-feedback-tab.component.css'],
})
export class AdminPlatformFeedbackTabComponent {
  feedbackItems: PlatformFeedbackListItem[] = [];
  selectedFeedback: PlatformFeedbackListItem | null = null;
  isLoading: boolean = false;
  cursor: string | null = null;
  hasMore: boolean = false;
  categoryFilter: string = '';
  statusFilter: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  errorMessage: string | null = null;

  constructor(
    private platformFeedbackBackendApiService: PlatformFeedbackBackendApiService
  ) {}

  ngOnInit(): void {
    this.loadFeedbackPage(true);
  }

  async loadFeedbackPage(reset: boolean): Promise<void> {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    if (reset) {
      this.cursor = null;
      this.feedbackItems = [];
      this.selectedFeedback = null;
    }

    try {
      const dateFromMsecs = this.dateFrom
        ? new Date(this.dateFrom).getTime()
        : null;
      const dateToMsecs = this.dateTo ? new Date(this.dateTo).getTime() : null;
      const response =
        await this.platformFeedbackBackendApiService.fetchFeedbackListAsync(
          this.cursor,
          this.categoryFilter || null,
          dateFromMsecs,
          dateToMsecs
        );
      this.cursor = response.cursor;
      this.hasMore = response.more;
      this.feedbackItems = this.feedbackItems.concat(response.results);
      if (!this.selectedFeedback && this.feedbackItems.length) {
        this.selectedFeedback = this.feedbackItems[0];
      }
    } catch (e) {
      this.errorMessage = 'Failed to load feedback.';
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    this.loadFeedbackPage(true);
  }

  selectFeedback(item: PlatformFeedbackListItem): void {
    this.selectedFeedback = item;
  }

  filteredItems(): PlatformFeedbackListItem[] {
    if (!this.statusFilter) {
      return this.feedbackItems;
    }
    return this.feedbackItems.filter(item => item.status === this.statusFilter);
  }

  async updateStatus(status: string): Promise<void> {
    if (!this.selectedFeedback) {
      return;
    }
    const feedbackId = this.selectedFeedback.id;
    await this.platformFeedbackBackendApiService.updateFeedbackStatusAsync(
      feedbackId,
      status
    );
    this.selectedFeedback.status = status;
  }

  async deleteFeedback(): Promise<void> {
    if (!this.selectedFeedback) {
      return;
    }
    const feedbackId = this.selectedFeedback.id;
    await this.platformFeedbackBackendApiService.deleteFeedbackAsync(
      feedbackId
    );
    this.feedbackItems = this.feedbackItems.filter(
      item => item.id !== feedbackId
    );
    this.selectedFeedback = this.feedbackItems.length
      ? this.feedbackItems[0]
      : null;
  }

  formatDate(msecs: number): string {
    return new Date(msecs).toLocaleString();
  }
}
