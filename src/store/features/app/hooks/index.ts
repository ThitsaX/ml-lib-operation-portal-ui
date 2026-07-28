// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import { RootState } from '@store/store';
import {useSelector} from 'react-redux';
import {IAppState} from '../appSlice';

export const useAppState = () => useSelector<RootState, IAppState>(s => s.app);
