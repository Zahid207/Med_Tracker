import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = await clientPromise;
        const db = client.db("MedTracker");
        const collection = db.collection("users");

        const user = await collection.findOne({
          user_email: credentials.email.toLowerCase().trim(),
        });

        if (!user) {
          throw new Error("No user found with this email!");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordCorrect) {
          throw new Error("Invalid Password!");
        }

        return {
          id: user._id.toString(),
          name: user.user_name,
          email: user.user_email,
          image: user.user_photo,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.user_name = user.name;
        token.user_photo = user.image;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.user_name = token.user_name;
        session.user.user_photo = token.user_photo;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET || "MedTracker_Secret_Fallback_Key_12345!@",
  pages: {
    signIn: "/",
  },
};

const handler = (req, res) => NextAuth(req, res, authOptions);
export { handler as GET, handler as POST };
