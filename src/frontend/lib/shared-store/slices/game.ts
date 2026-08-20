import { createSlice, PayloadAction } from '@reduxjs/toolkit';


export type SideBarType = "Rules"|'Grades'| null
export interface GameState {
  showSideBar?: SideBarType
  // password: string;
}

const initialState: GameState = {
    showSideBar: null,
  // password: '',
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameStatus: (state, action: PayloadAction<GameState>) => {
      state.showSideBar = action.payload.showSideBar;
    },
    resetGameStatus: (state) => {
        state.showSideBar = null;
    },
  },
});

export const { setGameStatus, resetGameStatus } = gameSlice.actions;
export default gameSlice.reducer;
