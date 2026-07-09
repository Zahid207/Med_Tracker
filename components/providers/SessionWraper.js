'use client'
import { SessionProvider } from "next-auth/react";

const SessionWraper = ({ children }) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export default SessionWraper;