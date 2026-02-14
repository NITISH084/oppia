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
  FeedbackCategory,
  FeedbackStatus,
} from 'services/platform-feedback-backend-api.service';

interface ExtendedFeedbackItem extends PlatformFeedbackListItem {
  // From the modal
  rating: number | null;
  category: FeedbackCategory;
  description: string;
  screenshot_url: string | null;
  screenshot_filename: string | null;
  include_session_info?: boolean;

  // Metadata (always collected)
  page_url: string;
  created_on_msecs: number;
  language_code: string;

  // Session info (if user opted in)
  user_agent?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen_resolution?: string;
  viewport_size?: string;

  // Admin fields
  status: FeedbackStatus;
}

@Component({
  selector: 'oppia-admin-platform-feedback-tab',
  templateUrl: './admin-platform-feedback-tab.component.html',
})
export class AdminPlatformFeedbackTabComponent {
  private readonly PAGE_SIZE = 20;
  feedbackItems: ExtendedFeedbackItem[] = [];
  selectedFeedback: ExtendedFeedbackItem | null = null;
  isLoading: boolean = false;
  cursorHistory: Array<string | null> = [null];
  currentPageIndex: number = 0;
  hasNextPage: boolean = false;
  categoryFilter: string = '';
  statusFilter: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  searchQuery: string = '';
  errorMessage: string | null = null;

  // For mock data testing (remove in production)
  private useMockData: boolean = true;

  constructor(
    private platformFeedbackBackendApiService: PlatformFeedbackBackendApiService
  ) {}

  ngOnInit(): void {
    if (this.useMockData) {
      this.loadMockData();
    } else {
      this.loadFeedbackPage(true);
    }
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
      this.feedbackItems = response.results as ExtendedFeedbackItem[];
      if (!this.selectedFeedback && this.feedbackItems.length) {
        this.selectedFeedback = this.feedbackItems[0];
      }
      if (response.cursor) {
        this.cursorHistory[this.currentPageIndex + 1] = response.cursor;
      }
    } catch (e) {
      this.errorMessage = 'Failed to load feedback. Please try again.';
      console.error('Error loading feedback:', e);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    this.loadFeedbackPage(true);
  }

  clearFilters(): void {
    this.categoryFilter = '';
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.searchQuery = '';
    this.applyFilters();
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

  selectFeedback(item: ExtendedFeedbackItem): void {
    this.selectedFeedback = item;
  }

  filteredItems(): ExtendedFeedbackItem[] {
    let items = [...this.feedbackItems];

    // Status filter
    if (this.statusFilter) {
      items = items.filter(item => item.status === this.statusFilter);
    }

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.description.toLowerCase().includes(query) ||
          item.page_url.toLowerCase().includes(query)
      );
    }

    return items;
  }

  async updateStatus(status: string): Promise<void> {
    if (!this.selectedFeedback) {
      return;
    }

    if (!confirm(`Are you sure you want to mark this feedback as ${status}?`)) {
      return;
    }

    const feedbackId = this.selectedFeedback.id;

    try {
      await this.platformFeedbackBackendApiService.updateFeedbackStatusAsync(
        feedbackId,
        status
      );
      this.selectedFeedback.status = status as 'open' | 'dismissed' | 'deleted';

      // Update in the list as well
      const index = this.feedbackItems.findIndex(
        item => item.id === feedbackId
      );
      if (index !== -1) {
        this.feedbackItems[index].status = status as
          | 'open'
          | 'dismissed'
          | 'deleted';
      }
    } catch (e) {
      this.errorMessage = 'Failed to update feedback status. Please try again.';
      console.error('Error updating status:', e);
    }
  }

  async deleteFeedback(): Promise<void> {
    if (!this.selectedFeedback) {
      return;
    }
    if (
      !confirm(
        '⚠️ Delete this feedback permanently? This action cannot be undone.'
      )
    ) {
      return;
    }

    const feedbackId = this.selectedFeedback.id;

    try {
      await this.platformFeedbackBackendApiService.deleteFeedbackAsync(
        feedbackId
      );

      // Remove from list
      this.feedbackItems = this.feedbackItems.filter(
        item => item.id !== feedbackId
      );

      // Select next item or null
      this.selectedFeedback = this.feedbackItems.length
        ? this.feedbackItems[0]
        : null;
    } catch (e) {
      this.errorMessage = 'Failed to delete feedback. Please try again.';
      console.error('Error deleting feedback:', e);
    }
  }

  formatDate(msecs: number): string {
    const date = new Date(msecs);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent feedback
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // Otherwise show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getCountByStatus(status: string): number {
    return this.feedbackItems.filter(item => item.status === status).length;
  }

  getCategoryLabel(category: string): string {
    if (category === 'not_sure') return 'Not Sure';
    if (category === 'platform') return 'The Site';
    if (category === 'lesson') return 'A Lesson';
    return category;
  }

  // Mock data for testing purposes only
  private loadMockData(): void {
    this.feedbackItems = [
      {
        id: 'fb-001',
        category: 'platform',
        status: 'open',
        description:
          'The lesson progress bar is not updating correctly after completing activities. I completed the entire fractions module but my dashboard still shows 0% progress.',
        rating: 2,
        language_code: 'en',
        page_url: 'https://oppia.org/learn/math/fractions',
        contact_email: 'student1@example.com',
        created_on_msecs: Date.now() - 3600000,
        screenshot_url: 'https://example.com/screenshots/fb-001.png',
        screenshot_filename: 'progress-bar-issue.png',
        include_session_info: true,
        user_agent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        browser: 'Chrome 120.0',
        os: 'Windows 10',
        device: 'Desktop',
        screen_resolution: '1920x1080',
        viewport_size: '1366x768',
      },
      {
        id: 'fb-002',
        category: 'lesson',
        status: 'open',
        description:
          'The explanation for quadratic equations could be more detailed. I struggled to understand step 3 where you apply the quadratic formula.',
        rating: 3,
        language_code: 'en',
        page_url: 'https://oppia.org/learn/math/algebra/quadratic-equations',
        contact_email: 'learner@example.com',
        created_on_msecs: Date.now() - 7200000,
        include_session_info: false,
      },
      {
        id: 'fb-003',
        category: 'platform',
        status: 'dismissed',
        description:
          'Mobile app crashes when trying to upload profile picture. Happens every time I click the upload button.',
        rating: 1,
        language_code: 'en',
        page_url: 'https://oppia.org/profile/settings',
        created_on_msecs: Date.now() - 86400000,
        screenshot_url: 'https://example.com/screenshots/fb-003.png',
        screenshot_filename: 'crash-screenshot.png',
        include_session_info: true,
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        browser: 'Safari 17.0',
        os: 'iOS 17.0',
        device: 'iPhone 14 Pro',
        screen_resolution: '1179x2556',
        viewport_size: '390x844',
      },
      {
        id: 'fb-004',
        category: 'lesson',
        status: 'open',
        description:
          'Amazing interactive lesson on photosynthesis! The animations really helped me understand the process. Would love to see more science lessons like this.',
        rating: 5,
        language_code: 'en',
        page_url: 'https://oppia.org/learn/science/biology/photosynthesis',
        contact_email: 'happy.learner@example.com',
        created_on_msecs: Date.now() - 172800000,
        include_session_info: false,
      },
      {
        id: 'fb-005',
        category: 'platform',
        status: 'open',
        description:
          'Search functionality is not working - returns no results even for exact lesson titles that I know exist.',
        rating: 2,
        language_code: 'en',
        page_url: 'https://oppia.org/search',
        contact_email: 'frustrated.user@example.com',
        created_on_msecs: Date.now() - 259200000,
        include_session_info: true,
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        browser: 'Firefox 121.0',
        os: 'macOS 14.0',
        device: 'Desktop',
        screen_resolution: '2560x1440',
        viewport_size: '1440x900',
      },
      {
        id: 'fb-006',
        category: 'lesson',
        status: 'dismissed',
        description:
          'The chemistry lesson has a typo in question 7 - should be "molecules" not "moleculs"',
        rating: 4,
        language_code: 'en',
        page_url: 'https://oppia.org/learn/science/chemistry',
        created_on_msecs: Date.now() - 345600000,
        screenshot_url: 'https://example.com/screenshots/fb-006.png',
        screenshot_filename: 'typo-screenshot.png',
        include_session_info: false,
      },
      {
        id: 'fb-007',
        category: 'not_sure',
        status: 'open',
        description:
          'I love the platform but sometimes the lessons load very slowly. Not sure if this is my internet or the site.',
        rating: 3,
        language_code: 'en',
        page_url: 'https://oppia.org/community/lessons',
        contact_email: 'uncertain.user@example.com',
        created_on_msecs: Date.now() - 432000000,
        include_session_info: true,
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
        browser: 'Chrome 120.0',
        os: 'Ubuntu 22.04',
        device: 'Desktop',
        screen_resolution: '1920x1080',
        viewport_size: '1600x900',
      },
      {
        id: 'fb-008',
        category: 'lesson',
        status: 'open',
        description:
          'The audio narration is too fast in the Spanish lesson. Can we have speed controls?',
        rating: 3,
        language_code: 'es',
        page_url: 'https://oppia.org/learn/language/spanish',
        contact_email: 'spanish.student@example.com',
        created_on_msecs: Date.now() - 518400000,
        include_session_info: false,
      },
      {
        id: 'fb-009',
        category: 'platform',
        status: 'deleted',
        description: 'Inappropriate content detected - admin review required',
        language_code: 'en',
        page_url: 'https://oppia.org/community',
        created_on_msecs: Date.now() - 604800000,
        include_session_info: false,
      },
      {
        id: 'fb-010',
        category: 'lesson',
        status: 'open',
        description:
          'Would love to see more practice questions at the end of the geometry lesson. The current ones are great but I need more to really master the concepts.',
        rating: 4,
        language_code: 'en',
        page_url: 'https://oppia.org/learn/math/geometry',
        contact_email: 'math.enthusiast@example.com',
        created_on_msecs: Date.now() - 691200000,
        include_session_info: false,
      },
    ] as ExtendedFeedbackItem[];

    this.hasNextPage = false;
    this.selectedFeedback = this.feedbackItems[0];
  }
}
