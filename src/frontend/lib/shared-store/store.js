// store.js
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/user';
import testReducer from './slices/test';
import gameReducer from './slices/game'

const store = configureStore({
  reducer: {
    user: userReducer,
    test: testReducer,
    game: gameReducer
  },
  devTools: process.env.NODE_ENV !== 'production',
});
export default store;