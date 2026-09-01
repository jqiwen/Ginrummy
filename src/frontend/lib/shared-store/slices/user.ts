import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthenticationStatus = "authenticated" | "loading" | "unauthenticated";

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
  status: "loading",
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthenticatedUser: (
      state,
      action: PayloadAction<Pick<UserState, "displayName" | "email" | "id" | "username">>,
    ) => ({ ...action.payload, status: "authenticated" }),
    setAuthLoading: (state) => {
      state.status = "loading";
    },
    setUnauthenticated: () => ({ ...initialState, status: "unauthenticated" as const }),
  },
});

export const { setAuthenticatedUser, setAuthLoading, setUnauthenticated } = userSlice.actions;
export default userSlice.reducer;
