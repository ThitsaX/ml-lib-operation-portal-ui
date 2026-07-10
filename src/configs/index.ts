// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
export class Configs {
  private static instance: Configs;

  public readonly APP_NAME = 'Operation Portal';
  
  private constructor() {
  }

  static getInstance(): Configs {
    if (!Configs.instance) {
      Configs.instance = new Configs();
    }
    return Configs.instance;
  }
}
