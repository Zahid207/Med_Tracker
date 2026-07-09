import { useRouter } from "next/navigation";
export default function SigninFirst() {
  // ------------------------------ For sending to the sign in page ------------------------------
  const router = useRouter();
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-6">
      <div className="text-4xl mb-1 cursor-default">
        <img src="/construction.png" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3 cursor-default">
        To Be Continued...
      </h1>

      <p className="text-gray-500 max-w-xs leading-relaxed mb-8 cursor-default">
        This page is under construction. Sign in first to access all features.
      </p>

      <button
        onClick={() => router.push("/signin")}
        className="hover:bg-blue-600 hover:text-white bg-white text-gray-700 border border-gray-200 px-7 py-3 rounded-lg font-bold cursor-pointer transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}
