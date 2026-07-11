import { useRouter } from "next/navigation";
export default function Wellcome() {
  // ------------------------------ For sending to the sign in page ------------------------------
  const router = useRouter();
  return (
    <div className="min-h-full flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <span className=" text-blue-600 text-base font-medium px-2 py-1 rounded-full mb-2 cursor-default">
          For Freelancers
        </span>

        <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4 cursor-default">
          Invoice Smarter, <br />
          <span className="text-blue-600">Get Paid Faster</span>
        </h1>

        <p className="text-gray-500 max-w-lg leading-relaxed mb-8 cursor-default">
         Stop chasing payments with spreadsheets. Manage clients, send professional invoices, and track every payment with the help of AI — built for freelancers who value their time.
        </p>

        <div className="flex gap-3 mb-12 ">
          <button
            onClick={() => router.push("/signin")}
            className="hover:bg-blue-600 hover:text-white bg-white text-gray-700 border border-gray-200 px-7 py-3 rounded-lg font-bold cursor-pointer transition-colors"
          >
            Get Started — Free
          </button>
          <button
            onClick={() => router.push("/signin")}
            className="hover:bg-blue-600 hover:text-white bg-white text-gray-700 border border-gray-200 px-7 py-3 rounded-lg font-bold cursor-pointer transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-4 max-[650px]:grid-cols-2 gap-4 max-w-4xl w-full">
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-left cursor-default">
            <div className="text-2xl mb-2">
              <img src="/inv.png" alt="invoice icon" />
            </div>
            <div className="font-semibold text-gray-950 mt-3">
              Professional Invoice
            </div>
            <div className="text-sm text-gray-500 leading-relaxed mt-2">
             Create and export professional PDF invoices in seconds.
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-left cursor-default">
            <div className="text-2xl mb-2">
              <img src="/cash.png" alt="payment icon" />
            </div>
            <div className="font-semibold text-gray-950 mt-3">
              Payment Tracking
            </div>
            <div className="text-sm text-gray-500 leading-relaxed mt-2">
             Track every payment — full, partial, or overdue.
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-left cursor-default">
            <div className="text-2xl mb-2">
              <img src="/data analysis.png" alt="database icon" />
            </div>
            <div className="font-semibold text-gray-950 mt-3">Dashboard</div>
            <div className="text-sm text-gray-500 leading-relaxed mt-2">
             Visualize your income, top clients, and growth at a glance.
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-left cursor-default">
            <div className="text-2xl">
              <img src="/MedAI.png" alt="database icon" width="30" height="30"/>
            </div>
            <div className="font-semibold text-gray-950 mt-2">AI-Powered Insights</div>
            <div className="text-sm text-gray-500 leading-relaxed mt-2">
              Ask MedAI anything — your payments, clients, or due balances.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500">
        © 2026 MedTracker — All rights reserved
      </div>
    </div>
  );
}
