import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthenticationStatus = "authenticated" | "initializing" | "unauthenticated";

export interface UserState {
  id: string | null;
  email: string;
  playerId: string;
  avatarPath: string | null;
  status: AuthenticationStatus;
}

const initialState: UserState = {
  id: null,
  email: "",
  playerId: "",
  avatarPath: null,
  status: "initializing",
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthenticatedUser: (
      state,
      action: PayloadAction<Pick<UserState, "avatarPath" | "email" | "id" | "playerId">>,
    ) => ({ ...action.payload, status: "authenticated" }),
    setAvatarPath: (state, action: PayloadAction<string | null>) => {
      state.avatarPath = action.payload;
    },
    setAuthInitializing: (state) => {
      state.status = "initializing";
    },
    setUnauthenticated: () => ({ ...initialState, status: "unauthenticated" as const }),
  },
});

export const { setAuthenticatedUser, setAuthInitializing, setAvatarPath, setUnauthenticated } = userSlice.actions;
export default userSlice.reducer;
