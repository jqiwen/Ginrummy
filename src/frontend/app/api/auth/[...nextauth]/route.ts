import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import NextAuth from "next-auth/next"

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: {
          label: "email",
          type: "email",
          placeholder: "example@gmail.com",
        },
        password: {
          label: "password",
          type: "password",
          placeholder: "please input password",
        },
      },
      async authorize(credentials, req) {
        const user = { id: "1", name: "John", email: credentials?.email }
        if (user) {
          // Any object returned will be saved in `user` property of the JWT
          return user
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null

          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
