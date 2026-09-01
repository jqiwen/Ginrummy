import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthenticationStatus = "authenticated" | "initializing" | "unauthenticated";

export interface UserState {
  id: string | null;
  email: string;
  username: string;
  displayName: string;
  status: AuthenticationStatus;
}

const initialState: UserState = {
  id: null,
  email: "",
  username: "",
  displayName: "",
  status: "initializing",
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthenticatedUser: (
      state,
      action: PayloadAction<Pick<UserState, "displayName" | "email" | "id" | "username">>,
    ) => ({ ...action.payload, status: "authenticated" }),
    setAuthInitializing: (state) => {
      state.status = "initializing";
    },
    setUnauthenticated: () => ({ ...initialState, status: "unauthenticated" as const }),
  },
});

export const { setAuthenticatedUser, setAuthInitializing, setUnauthenticated } = userSlice.actions;
export default userSlice.reducer;
