import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  username: string;
  // password: string;
}

const initialState: UserState = {
  username: '',
  // password: '',
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserInfo: (state, action: PayloadAction<{ username: string;}>) => {
      state.username = action.payload.username;
    },
    clearUserInfo: (state) => {
      state.username = '';
    },
  },
});

export const { setUserInfo, clearUserInfo } = userSlice.actions;
export default userSlice.reducer;
