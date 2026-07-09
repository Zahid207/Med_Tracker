"use client";
import React, { useState, useEffect } from "react";
import { useUploadThing } from "@/utils/uploadthing";
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function SigninPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/?login=success");
    }
  }, [status, router]);

  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userImg, setUserImg] = useState(null);
  const [dbUsers, setDbUsers] = useState([]);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPass, setshowPass] = useState(true);

  const { startUpload } = useUploadThing("imageUploader");

  const fetchUsers = () => {
    fetch("/api/user")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => setDbUsers(data))
      .catch((err) => console.error("Error fetching users:", err.message));
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTestSignin = () => {
    setSigninEmail("theresawebba@medtracker.com");
    setSigninPassword("12we34ar56tstr");
  };

  const handleResetForm = () => {
    setName("");
    setRole("");
    setEmail("");
    setPassword("");
    setUserImg(null);
    setSigninEmail("");
    setSigninPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUpMode) {
      const isExisting = dbUsers.some(
        (c) => c.user_email?.toLowerCase() === email.trim().toLowerCase(),
      );

      if (isExisting) {
        toast.error(
          "User with this email already exists! Try to Signin instead!",
        );
        setLoading(false);
        return;
      }

      let uploadedImgUrl = "";
      if (userImg && typeof userImg === "object") {
        try {
          toast.info("Uploading profile photo to the cloud...");
          const uploadRes = await startUpload([userImg]);
          if (uploadRes && uploadRes[0]) {
            uploadedImgUrl = uploadRes[0].ufsUrl || uploadRes[0].url;
          } else {
            toast.error("Photo upload failed! Registering without a photo.");
          }
        } catch (uploadErr) {
          console.error("Cloud upload error:", uploadErr);
        }
      }

      try {
        const response = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: name,
            role: role,
            user_photo: uploadedImgUrl,
            user_email: email,
            password: password,
          }),
        });

        const result = await response.json();
        if (result.success) {
          toast.success("Account created successfully! Now you can Signin!");
          handleResetForm();
          setIsSignUpMode(false);
          fetchUsers();
        } else {
          toast.error(result.message || "Failed to sign up!");
        }
      } catch (err) {
        toast.error("Something went wrong during sign up.");
      }
    } else {
      try {
        const res = await signIn("credentials", {
          redirect: false,
          email: signinEmail.trim().toLowerCase(),
          password: signinPassword,
        });

        if (res?.error) {
          toast.error(res.error || "Invalid Email or Password!");
        } else {
          toast.success("Signed in successfully!");
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        toast.error("Something went wrong during sign in.");
      }
    }

    setLoading(false);
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-blue-600 font-bold animate-pulse text-lg">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <ToastContainer
        stacked
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-8 relative">
        {/* header section */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-slate-800">Welcome</h2>

          <div className="flex bg-slate-100 p-1 rounded-xl my-4 max-w-80 mx-auto border border-slate-200/50">
            <button
              type="button"
              onClick={() => setIsSignUpMode(false)}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                !isSignUpMode
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUpMode(true)}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                isSignUpMode
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          <p className="text-base text-slate-400 mt-1">
            {isSignUpMode
              ? "Create an account to manage your invoices"
              : "Sign in to manage your invoices"}
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUpMode ? (
            <>
              {/* Name Input */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Zahidul Islam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                  required
                />
              </div>

              {/* Role Input */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Role
                </label>
                <input
                  type="text"
                  placeholder="e.g.  Developer / Manager "
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                />
              </div>

              {/* Photo Input  */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Profile Photo (Under 4MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setUserImg(file);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-3 file:cursor-pointer file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>

              {/* Email Address */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Password
                </label>
                <span className="flex gap-2">
                  <input
                    type={showPass ? "password" : "text"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setshowPass(!showPass)}
                    className="h-full px-2 rounded-xl border border-slate-300 flex items-center bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={showPass ? "/hide.png" : "/show.png"}
                      alt="toggle password"
                    />
                  </button>
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Email Address */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="grid gap-1.5">
                <label className="text-base font-semibold text-slate-600">
                  Password
                </label>
                <span className="flex gap-2">
                  <input
                    type={showPass ? "password" : "text"}
                    placeholder="••••••••"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setshowPass(!showPass)}
                    className="h-full px-2 rounded-xl border border-slate-300 flex items-center bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={showPass ? "/hide.png" : "/show.png"}
                      alt="toggle password"
                    />
                  </button>
                </span>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 text-base mt-2 active:scale-[0.99]"
          >
            {loading
              ? isSignUpMode
                ? "Registering..."
                : "Signing in..."
              : "Submit"}
          </button>
        </form>

        {!isSignUpMode && (
          <>
            {/* Test Section */}
            <div className="mt-6 pt-5 border-t border-dashed border-slate-100 text-center">
              <button
                type="button"
                onClick={handleTestSignin}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-900 bg-sky-100 hover:bg-amber-100 px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                ✨ Test as Theresa Webba
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
