// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
export interface IGetAllAnnouncement {
  announcementInfoList: AnnouncementInfo[]
}

export interface AnnouncementInfo {
  id: string
  title: string
  detail: string | null
  date: string
}

export interface IGreetingMessage {
  greetingId: string
  greetingTitle: string
  greetingDetail: string
  createdDate: number
}
