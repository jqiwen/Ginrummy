// anotherSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: [],
};

const testSlice = createSlice({
  name: 'my test slice',
  initialState,
  reducers: {
    setData: (state, action) => {
      state.data = action.payload;
    },
    clearData: (state) => {
      state.data = [];
    },
  },
});

export const { setData, clearData } = testSlice.actions;
export default testSlice.reducer;
