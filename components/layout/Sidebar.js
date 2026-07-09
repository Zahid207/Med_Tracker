"use client";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";

export default function Sidebar({ children }) {
  // ------------------- State for pages button toggle -------------------
  const pathname = usePathname();

  // ------------------- State for collapse button toggle -------------------
  const [src, setSrc] = useState("/logo.png");

  // ------------------- State for collapse button toggle -------------------
  const [ShowSidebar, setShowSidebar] = useState(false);

  // ------------------- State to control profile delete popup visibility -------------------
  const [isOpenProfile, setIsOpenProfile] = useState(false);

  // Ref to handle click outside detection
  const profileRef = useRef(null);

  // Click outside implementation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsOpenProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refs for sidebar and collapse button outside click detection
  const sidebarRef = useRef(null);
  const collapseBtnRef = useRef(null);

  // Click outside implementation for Sidebar
  useEffect(() => {
    const handleSidebarClickOutside = (event) => {
      if (ShowSidebar) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target) &&
          (!collapseBtnRef.current ||
            !collapseBtnRef.current.contains(event.target))
        ) {
          setShowSidebar(false);
          setSrc("/logo.png");
        }
      }
    };
    document.addEventListener("mousedown", handleSidebarClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleSidebarClickOutside);
  }, [ShowSidebar]);

  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="bg-[#ffffff] w-screen h-screen min-[782px]:p-2">
      <div className="bg-[#e8eeeed7] w-full h-full min-[782px]:rounded-[29px] flex overflow-hidden relative">
        {/* --- SIDEBAR START --- */}
        <aside
          ref={sidebarRef}
          className={`w-[17%] flex flex-col p-7 pr-5 ${ShowSidebar ? "absolute left-0 top-0 h-full min-w-95 bg-[#e8eeeea6] z-20 backdrop-blur-sm pl-5" : "max-[1323px]:hidden"} min-[782px]:p-2`}
        >
          {/*  -- BrandSection --  */}
          <div className="flex items-center py-5 px-2 ">
            <div className="flex-1 flex items-center gap-3 cursor-default">
              {/* Logo Icon */}
              <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center ">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="font-bold text-xl text-gray-800">
                MedTracker
              </span>
            </div>
          </div>

          {/*  -- NavigationMenu --  */}
          <nav className=" flex-1 flex flex-col justify-between pb-3 pt-0 px-2 ">
            {/* navbar top */}
            <span>
              <Link href="/">
                <button
                  onClick={() => {
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className={`sidebar-nav-button ${pathname === "/" ? "shadow-slate-300 shadow-sm bg-slate-50" : ""}`}
                >
                  <img src="/Dashboard.png" alt="dashboard logo" />
                  <span className="font-[550] text-[16px]">Dashboard</span>
                </button>
              </Link>
              <Link href="/invoices">
                <button
                  onClick={() => {
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className={`sidebar-nav-button ${pathname === "/invoices" ? "shadow-slate-300 shadow-sm bg-slate-50" : ""}`}
                >
                  <img src="/invoice.png" alt="invoice logo" />
                  <span className="font-[550] text-[16px]">Invoices</span>
                </button>
              </Link>
              <Link href="/payments">
                <button
                  onClick={() => {
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className={`sidebar-nav-button ${pathname === "/payments" ? "shadow-slate-300 shadow-sm bg-slate-50" : ""}`}
                >
                  <img src="/payment.png" alt="payment logo" />
                  <span className="font-[550] text-[16px]">Payments</span>
                </button>
              </Link>
              <Link href="/clients">
                <button
                  onClick={() => {
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className={`sidebar-nav-button ${pathname === "/clients" ? "shadow-slate-300 shadow-sm bg-slate-50" : ""}`}
                >
                  <img src="/client.png" alt="client logo" />
                  <span className="font-[550] text-[16px]">Clients</span>
                </button>
              </Link>
            </span>
            {/* navbar bottom */}
            <span>
              <Link href="https://github.com/Zahid207" target="_blank">
                <button
                  onClick={() => {
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className="sidebar-nav-button "
                >
                  <img src="/info.png" alt="info logo" />
                  <span className="font-[550] text-[16px] pb-1 ">
                    Learn about us
                  </span>
                </button>
              </Link>
            </span>
          </nav>

          {/*  -- AccountSettings --  */}
          <div className="relative flex h-20 p-2 items-center gap-3 border-t-2 border-gray-400 select-none">
            {session ? (
              <div className="flex flex-1 items-center gap-3 cursor-default p-1 rounded-xl transition-colors overflow-hidden">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gray-200">
                  <img
                    src={
                      session.user?.user_photo &&
                      session.user.user_photo.startsWith("http")
                        ? session.user.user_photo
                        : "/anonymous-client.png"
                    }
                    alt={session.user?.user_name || "User"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/anonymous-client.png";
                    }}
                  />
                </div>

                {/* Info Section */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[18px] font-semibold text-gray-900 truncate cursor-default">
                    {session.user?.user_name || "Unknown user"}
                  </p>
                  <p className="text-[13px] text-gray-600 truncate cursor-default">
                    {session.user?.role || "User"}
                  </p>
                </div>
                <span ref={profileRef}>
                  <img
                    onClick={() => setIsOpenProfile(!isOpenProfile)}
                    className={`sidebar-more cursor-pointer transition-transform duration-200`}
                    src={`${isOpenProfile ? "arrow up.png" : "arrow down.png"}`}
                    alt="more"
                  />

                  {/*  LOGOUT POPUP  */}
                  {isOpenProfile && (
                    <div className="w-40 absolute bottom-16 right-0 bg-slate-100 border border-slate-200/90 rounded-xl p-1 shadow-xl shadow-slate-300/40 z-50 flex flex-col gap-0.5 text-left  ">
                      {/*  Logout Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setSrc("/logo.png");
                          setShowSidebar(false);
                          setIsOpenProfile(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 border-t border-slate-100 mt-0.5 pt-1.5"
                      >
                        <img src="/logout.png" alt="logout icon" /> Logout
                      </button>
                    </div>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex min-w-full items-center gap-2 cursor-pointer">
                <button
                  onClick={() => {
                    router.push("/signin");
                    setSrc("/logo.png");
                    setShowSidebar(false);
                  }}
                  className="px-4 py-2 text-lg font-bold text-blue-600 border border-blue-600 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer min-w-full"
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}
          </div>
        </aside>
        {/* --- SIDEBAR END --- */}
        {/* --- MAINBAR START --- */}
        <main className="p-8 max-[782px]:p-2 max-[782px]:py-[2.9px] bg-gray-50 flex flex-col flex-1 min-h-0 shadow-sm m-4 max-[782px]:m-2 rounded-[29px] overflow-hidden relative">
          {/* Collapse Button */}
          <button
            ref={collapseBtnRef}
            className={`sidebar-collapse overflow-hidden min-[1323px]:hidden active:scale-125 absolute top-4 z-20 ${src === "/logo.png" ? "left-4" : "left-95"} opacity-85 ${src === "/logo.png" ? "" : "backdrop-blur-xl"}`}
          >
            <img
              src={src}
              alt="Medtracker Logo - Click to open menu"
              onClick={() => {
                setSrc(src === "/logo.png" ? "/exist.png" : "/logo.png");
                setShowSidebar(!ShowSidebar);
              }}
              className="w-full h-full"
            />
          </button>
          {children}
        </main>
        {/* --- MAINBAR END --- */}
      </div>
    </div>
  );
}
