# Web User Feedback Collection - Technical Design

## Summary

Implement a unified, site-wide feedback flow that collects platform or lesson feedback, optionally includes a screenshot and session data, protects anonymous submissions with CAPTCHA, and provides an admin-only dashboard for triage. The implementation will reuse existing backend platform feedback models and handlers, integrate the image uploader component for screenshots, and add new frontend surfaces and services.

## Goals

- Provide a feedback entrypoint from any page.
- Collect rating, category, description, optional screenshot, optional contact info, and optional session info.
- Require CAPTCHA for logged-out users.
- Persist platform feedback and expose it to an admin-only dashboard with pagination and filters.
- Route lesson feedback to existing lesson feedback threads so creators see it in the Feedback tab.
- Enforce privacy, retention, and deletion policies.

## Non-Goals

- Feedback recategorization workflows.
- Auto-translation of feedback text.
- Android app feedback.

## Existing Building Blocks

- Platform feedback storage and services: `core/storage/platform_feedback/gae_models.py`, `core/domain/platform_feedback_services.py`.
- Platform feedback endpoints: `core/controllers/platform_feedback.py`.
- Image uploader component: `core/templates/components/forms/custom-forms-directives/image-uploader.component.ts`.
- Cron job infrastructure: `core/controllers/cron.py`.
- Lesson feedback threads: `core/domain/feedback_services.py` and related controllers.

## UX Overview

### Entry Point

- Add a floating entrypoint in the base shell so it appears on every page.
- Keep the existing footer link but route it to the new modal.

### Feedback Modal

- Fields: rating (1-5), category (platform or lesson), description, optional screenshot, optional contact info, optional session data checkbox, optional email for logged-out users, CAPTCHA for logged-out users.
- For lesson category, require lesson selection or infer current exploration when on a lesson page.
- Include a privacy disclaimer in the modal.

### Admin Dashboard UX

- Dedicated admin page “Platform Feedback”.
- Two-column layout.
- Left column: filters and list.
- Filters: category, status, date range, and free-text search over loaded results.
- List items: created time, category badge, rating (if provided), short description, status pill.
- Right column: full detail view.
- Detail view fields: description, page URL, language code, rating, screenshot preview, contact email, session info (expandable JSON), created timestamp.
- Actions: Dismiss, Reopen, Delete with confirmation.
- Pagination: cursor-based, 20 per page.
- Empty states for no data and for filtered results.

## Data Model

### Platform Feedback Model

Use existing `PlatformFeedbackModel` with small additions and validation rules:

- `category`: `lesson` or `platform`.
- `rating`: optional int 1..5.
- `description`: sanitized text.
- `page_url`: submission URL.
- `language_code`: UI language.
- `status`: `open`, `dismissed`, `deleted`.
- `screenshot_filename`: optional.
- `contact_email`: optional.
- `session_info`: optional JSON.
- `user_id`: optional.

### Session Data Capture Shape

Stored in `session_info` only when user opts in.

- `client_time_msecs`: number.
- `timezone_offset_mins`: number.
- `user_agent`: string.
- `viewport`: object with `width` and `height`.
- `page`: object with `url`, `path`, `title`, `referrer`.
- `locale`: object with `language_code`, `direction`.
- `network`: object with `effective_type`, `downlink` when available.
- `errors`: array of recent error summaries, capped.
- `logs`: array of recent log summaries, capped.

### Privacy and Size Limits

- No cookies, local storage, or DOM capture.
- Cap logs and errors, for example 20 logs and 10 errors.
- Strip any user-entered content from error summaries where possible.

## Backend API Design

### Existing Endpoints

- Submit: `PLATFORM_FEEDBACK_SUBMIT_URL`.
- List: `PLATFORM_FEEDBACK_LIST_URL`.
- Detail: `PLATFORM_FEEDBACK_DETAIL_URL`.
- Update status: `PLATFORM_FEEDBACK_UPDATE_STATUS_URL`.
- Delete: `PLATFORM_FEEDBACK_DELETE_URL`.

### Changes

- Validate session_info shape and size server-side.
- Enforce CAPTCHA verification for anonymous submissions.
- Add an optional `lesson_id` or `exploration_id` parameter when category is `lesson`.
- On lesson feedback, create a feedback thread for the exploration via existing feedback services and persist a platform feedback entry referencing that thread id for admin visibility.

## CAPTCHA Design

### Behavior

- Required for logged-out users only.
- Optional for logged-in users.

### Implementation

- Add a `captcha_services.py` to verify tokens against the CAPTCHA provider.
- Store keys in `feconf.py` and appropriate secrets handling.
- Reject submission when token is missing or verification fails for anonymous users.
- Feature flag in dev to bypass verification.

## Screenshot Upload

- Reuse the existing image uploader modal.
- Add a backend upload handler for platform feedback screenshots with size/type limits.
- Store the filename or blob key in `screenshot_filename`.
- Display the screenshot in the admin dashboard detail panel.

## Lesson Feedback Routing

- For category `lesson`, use existing feedback thread creation with `feedback_services.create_thread` and `create_message`.
- Use exploration id from the current page when on a lesson page, or provide a search dropdown for the user to select a lesson.
- Store a reference to the created thread id in `session_info` or as a new field on the model if needed.

## Retention and Deletion

- Add a cron handler to delete feedback older than 6 months.
- Allow admin delete to hard delete immediately.
- Ensure feedback data is scrubbed on user deletion per existing deletion policies.

## Frontend Architecture

- New `FeedbackBackendApiService` for submit, list, detail, update, delete.
- New feedback modal component mounted from `base-content.component.html`.
- Session info collection service to prepare `session_info` payload.
- Admin dashboard page under admin routes.

## Testing Plan

### Backend

- Unit tests for CAPTCHA verification logic.
- Unit tests for platform feedback list, detail, update, delete.
- Tests for lesson feedback routing and thread creation.
- Cron test for 6-month deletion.

### Frontend

- Unit tests for modal validation and payload construction.
- Unit tests for session info capture service.
- Admin dashboard component tests for list + detail rendering.

### Acceptance Tests

- Anonymous submission with CAPTCHA.
- Logged-in submission with session info.
- Lesson category routes to feedback tab.
- Admin can list, dismiss, and delete feedback.

## Rollout

- Land backend changes and API endpoints first.
- Add frontend entrypoint and modal behind a feature flag if needed.
- Add admin dashboard and enable for admins only.

## Open Questions

- Should platform feedback and lesson feedback be stored in the same table or linked by a reference only.
- Where to display session info in admin dashboard for best readability.
- Which CAPTCHA provider and configuration settings to use.
