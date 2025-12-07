import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import usersReducer from './slices/usersSlice';
import profileReducer from './slices/profileSlice';
import batchesReducer from './slices/batchesSlice';
import subjectsReducer from './slices/subjectsSlice';
import videosReducer from './slices/videosSlice';
import smtpSettingsReducer from './slices/smtpSettingsSlice';
import notificationSettingsReducer from './slices/notificationSettingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    users: usersReducer,
    profile: profileReducer,
    batches: batchesReducer,
    subjects: subjectsReducer,
    videos: videosReducer,
    smtpSettings: smtpSettingsReducer,
    notificationSettings: notificationSettingsReducer,
  },
});

