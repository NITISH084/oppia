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
  private readonly PAGE_SIZE = 20;
  feedbackItems: PlatformFeedbackListItem[] = [];
  selectedFeedback: PlatformFeedbackListItem | null = null;
  isLoading: boolean = false;
  cursorHistory: Array<string | null> = [null];
  currentPageIndex: number = 0;
  hasNextPage: boolean = false;
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
      this.cursorHistory = [null];
      this.currentPageIndex = 0;
      this.feedbackItems = [];
      this.selectedFeedback = null;
    }

    try {
      const dateFromMsecs = this.dateFrom
        ? new Date(this.dateFrom).getTime()
        : null;
      const dateToMsecs = this.dateTo ? new Date(this.dateTo).getTime() : null;
      const cursor = this.cursorHistory[this.currentPageIndex] || null;
      const response =
        await this.platformFeedbackBackendApiService.fetchFeedbackListAsync(
          cursor,
          this.categoryFilter || null,
          dateFromMsecs,
          dateToMsecs
        );
      this.hasNextPage = response.more;
      this.feedbackItems = response.results;
      if (!this.selectedFeedback && this.feedbackItems.length) {
        this.selectedFeedback = this.feedbackItems[0];
      }
      if (response.cursor) {
        this.cursorHistory[this.currentPageIndex + 1] = response.cursor;
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

  async goToNextPage(): Promise<void> {
    if (!this.hasNextPage || this.isLoading) {
      return;
    }
    this.currentPageIndex += 1;
    await this.loadFeedbackPage(false);
  }

  async goToPreviousPage(): Promise<void> {
    if (this.currentPageIndex === 0 || this.isLoading) {
      return;
    }
    this.currentPageIndex -= 1;
    await this.loadFeedbackPage(false);
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
    if (!confirm('Delete this feedback permanently?')) {
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
