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
 * @fileoverview Module for image uploader components.
 */

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgbModalModule} from '@ng-bootstrap/ng-bootstrap';
import {TranslateModule} from '@ngx-translate/core';

import {CustomFormsComponentsModule} from './custom-form-components.module';
import {ImageUploaderComponent} from './image-uploader.component';
import {ImageUploaderModalComponent} from './image-uploader-modal.component';
import {ThumbnailDisplayComponent} from './thumbnail-display.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModalModule,
    TranslateModule,
    CustomFormsComponentsModule,
  ],
  declarations: [
    ImageUploaderComponent,
    ImageUploaderModalComponent,
    ThumbnailDisplayComponent,
  ],
  entryComponents: [ImageUploaderModalComponent],
  exports: [
    ImageUploaderComponent,
    ImageUploaderModalComponent,
    ThumbnailDisplayComponent,
  ],
})
export class ImageUploaderModule {}
