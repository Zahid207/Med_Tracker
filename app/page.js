"use client";
import React, { useState, useRef, useEffect, Suspense } from "react"; // Suspense যুক্ত করা হয়েছে
import { toast, ToastContainer } from "react-toastify";
import Client from "@/components/modals/Client";
import Payment from "@/components/modals/Payment";
import Invoice from "@/components/modals/Invoice";
import Wellcome from "@/components/states/Welcome";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

// --- man component ---
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-500 text-sm font-medium animate-pulse">
            Please wait while loading your data...
          </p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

// --- `The main component` that renders the content of the page ---
function HomeContent() {
  // ----------------------------------- For add client pop up -----------------------------------
  const [isOpenAdd, setIsOpenAdd] = useState(false);

  // ------------------------------ For record payment button pop up ------------------------------
  const [IsOpenPay, setIsOpenPay] = useState(false);

  // ----------------------------------- For new invoice pop up -----------------------------------
  const [IsOpenInv, setIsOpenInv] = useState(false);

  // ------------------- States to control active filter dropdown visibility -------------------
  const [activeDropdown, setActiveDropdown] = useState(null); // 'status' or 'date' or null
  const [selectedStatus, setSelectedStatus] = useState("Total");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-US", { month: "long" }),
  );
  const isTotalView = !selectedStatus || selectedStatus === "Total";

  // ------------------------- collecting all the data from the database and userId --------------------------
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [clients, setclients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    let timeoutId;
    const startTime = Date.now();

    Promise.all([
      fetch(`/api/client?userId=${userId}`)
        .then((r) => r.json())
        .then(setclients),
      fetch(`/api/invoice?userId=${userId}`)
        .then((r) => r.json())
        .then(setItems),
    ])
      .catch(console.error)
      .finally(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 50 - elapsed);

        timeoutId = setTimeout(() => setIsLoading(false), remaining);
      });

    return () => clearTimeout(timeoutId);
  }, [userId]);

  // -------------------------- Refs to handle click outside detection --------------------------
  const statusRef = useRef(null);
  const dateRef = useRef(null);
  // Toggle dropdown logic
  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };
  // Click outside implementation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        activeDropdown === "status" &&
        statusRef.current &&
        !statusRef.current.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
      if (
        activeDropdown === "date" &&
        dateRef.current &&
        !dateRef.current.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // ---------------------------------------- for status ----------------------------------------
  const statusOptions = [
    "Total",
    "Total Paid",
    "Total Unpaid",
    "Total Overdue",
  ];

  // ----------------------------------- for charts date filters ----------------------------------
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentYear = new Date().getFullYear();
  const dateOptions = [
    ...months,
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
    String(currentYear - 3),
  ];

  //  -------------------------------- Dynamic Chart Filtering Logic --------------------------------
  const filteredChartData = React.useMemo(() => {
    if (!items || items.length === 0) return [];

    const isMonthSelected = months.includes(selectedDate);
    const targetYear = isMonthSelected
      ? new Date().getFullYear()
      : parseInt(selectedDate) || new Date().getFullYear();

    const getInvoiceTotal = (item) =>
      item.invoice_items?.reduce(
        (sum, curr) => sum + (curr.units || 0) * (curr.price || 0),
        0,
      ) || 0;

    const getItemStatusFlags = (item) => {
      const itemStatus = item.status?.toLowerCase().trim();
      const flags = { isPaid: false, isUnpaid: false, isOverdue: false };

      if (itemStatus === "paid") {
        flags.isPaid = true;
      } else {
        flags.isUnpaid = true;

        if (item.invoice_due_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDate = new Date(item.invoice_due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate <= today) {
            flags.isOverdue = true;
          }
        }
      }
      return flags;
    };

    const currentSelected = selectedStatus?.toLowerCase().trim();

    let filteredItems = items.filter((item) => {
      if (isTotalView) return true;
      const { isPaid, isUnpaid, isOverdue } = getItemStatusFlags(item);
      if (currentSelected === "total paid") return isPaid;
      if (currentSelected === "total unpaid") return isUnpaid;
      if (currentSelected === "total overdue") return isOverdue;
      return true;
    });

    const buildBuckets = () => {
      if (isMonthSelected) {
        const monthIndex = months.indexOf(selectedDate);
        const daysInMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
        return {
          monthIndex,
          daysInMonth,
          data: Array.from({ length: daysInMonth }, (_, i) => ({
            name: String(i + 1),
            income: 0,
            paid: 0,
            unpaid: 0,
            overdue: 0,
          })),
        };
      }
      return {
        data: months.map((month) => ({
          name: month.substring(0, 3),
          income: 0,
          paid: 0,
          unpaid: 0,
          overdue: 0,
        })),
      };
    };

    const { data, monthIndex: fixedMonthIndex, daysInMonth } = buildBuckets();

    filteredItems.forEach((item) => {
      const { isPaid, isUnpaid, isOverdue } = getItemStatusFlags(item);
      const targetDateStr = isPaid
        ? item.invoice_payment_date
        : item.invoice_issue_date;
      if (!targetDateStr) return;

      const finalDate = new Date(targetDateStr);
      if (finalDate.getFullYear() !== targetYear) return;

      const invoiceAmount = isPaid
        ? Number(item.invoice_paymented_ammount) || 0
        : getInvoiceTotal(item);

      const mIndex = finalDate.getMonth();
      const day = finalDate.getDate();

      const updateBucket = (bucket) => {
        bucket.income += invoiceAmount;
        if (isPaid) bucket.paid += invoiceAmount;
        if (isUnpaid) bucket.unpaid += invoiceAmount;
        if (isOverdue) bucket.overdue += invoiceAmount;
      };

      if (isMonthSelected) {
        if (mIndex !== fixedMonthIndex) return;
        if (day < 1 || day > daysInMonth) return;
        updateBucket(data[day - 1]);
      } else {
        if (mIndex < 0 || mIndex > 11) return;
        updateBucket(data[mIndex]);
      }
    });

    return data;
  }, [items, selectedStatus, selectedDate]);

  //  ----------------------------- check if the graph chart is empty ------------------------------
  const isChartEmpty =
    !filteredChartData ||
    filteredChartData.length === 0 ||
    filteredChartData.every((item) => item.income === 0);

  // ---------------------------- collect filtered data for summary card ----------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPaidAmount = 0;
  let totalUnpaidAmount = 0;
  let totalOverdueAmount = 0;

  if (items && items.length > 0) {
    items.forEach((item) => {
      // Calculate single invoice total amount
      const invoiceTotal =
        item.invoice_items?.reduce((sum, current) => {
          return sum + (current.units || 0) * (current.price || 0);
        }, 0) || 0;

      if (item.status === "paid") {
        totalPaidAmount += Number(item.invoice_paymented_ammount) || 0;
      } else {
        totalUnpaidAmount += invoiceTotal;

        // Check if overdue by due date
        if (item.invoice_due_date) {
          const dueDate = new Date(item.invoice_due_date);
          dueDate.setHours(0, 0, 0, 0);

          if (dueDate <= today) {
            totalOverdueAmount += invoiceTotal;
          }
        }
      }
    });
  }
  const totalInvoicesCount = items ? items.length : 0;

  // ------------------- Dynamic Table Filtering & Sorting for Upcoming Invoices -------------------
  const upcomingInvoices = items
    ? items
        .filter((inv) => {
          const statusClean = inv.status?.toLowerCase();
          return statusClean === "pending" || statusClean === "unpaid";
        })
        .sort((a, b) => {
          const dateA = new Date(a.invoice_due_date).getTime();
          const dateB = new Date(b.invoice_due_date).getTime();

          return dateB - dateA;
        })
    : [];

  // ----------- Dynamic Table Filtering & Sorting for paid Invoices for Recent Payments -----------
  const recentPayments = React.useMemo(() => {
    if (!items || items.length === 0) return [];

    const paidInvoices = items.filter(
      (item) => item.status?.toLowerCase().trim() === "paid",
    );

    return paidInvoices.sort((a, b) => {
      return (
        new Date(b.invoice_payment_date).getTime() -
        new Date(a.invoice_payment_date).getTime()
      );
    });
  }, [items]);

  // ------------------- Calculating all the things needed for the Top clients -------------------
  const clientsWithScores = clients.map((client) => {
    const clientInvoices = items.filter(
      (clnt) =>
        clnt.client_email?.toLowerCase() === client.client_email?.toLowerCase(),
    );

    const TotalInvoice = clientInvoices.length;

    const TotalPaid = clientInvoices.reduce(
      (sum, clnt) => sum + (Number(clnt.invoice_paymented_ammount) || 0),
      0,
    );

    const TotalDue = clientInvoices.reduce((totalSum, invoice) => {
      const invoiceItemsSum = (invoice.invoice_items || []).reduce(
        (itemSum, item) => {
          const units = Number(item.units) || 0;
          const price = Number(item.price) || 0;
          return itemSum + units * price;
        },
        0,
      );

      return totalSum + invoiceItemsSum;
    }, 0);

    const paymentRatio =
      TotalDue > 0 ? Math.round((TotalPaid / TotalDue) * 100) : 0;

    return {
      ...client,
      TotalInvoice,
      TotalPaid,
      TotalDue,
      paymentRatio,
    };
  });

  // ---------------------------------------- for currency ----------------------------------------
  const [currency, setCurrency] = useState("USD");
  const [bdtRate, setBdtRate] = useState(121);
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates && data.rates.BDT) {
          setBdtRate(data.rates.BDT);
          console.log("Real-time BDT Rate Loaded:", data.rates.BDT);
        }
      })
      .catch((err) => console.error("Failed to fetch real-time rate:", err));
  }, []);
  const dynamicCurrencyFormatter = (amountInUSD, symbol, locale, isCompact) => {
    const rate = locale === "bn-BD" ? bdtRate : 1;
    const convertedAmount = amountInUSD * rate;

    const formatterOptions = isCompact
      ? {
          notation: "compact",
          compactDisplay: "short",
          maximumFractionDigits: 2,
        } // choto formatter
      : { maximumFractionDigits: 2 }; // boro formatter (comma o .00 shoho)

    const formatter = new Intl.NumberFormat(locale, formatterOptions);

    return `${symbol}${formatter.format(convertedAmount || 0)}`;
  };

  // ------------------------------------- Number formatter -------------------------------------
  const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });
  const fullFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });

  // ---------------------------- For sign-in success message ---------------------------------
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const loginStatus = searchParams.get("login");
    if (loginStatus === "success") {
      toast.success("Sign-in successful. Welcome to MedTracker.", {
      });
      router.replace("/");
    }
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
        <p className="text-gray-500 text-sm font-medium animate-pulse">
          Please wait while loading your data...
        </p>
      </div>
    );
  }
  if (status === "unauthenticated" || !userId) {
    return <Wellcome />;
  } else {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto p-2.5 pb-6 scrollbar-none ">
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
        {/* --- Summary Crad --- */}
        <div className="w-full grid grid-cols-4 max-[948px]:grid-cols-2 gap-5 ">
          {/* Card 1: Total Invoices */}
          <div className="flex-1 p-6 min-[400px]:pl-11 rounded-4xl border border-gray-200/50 flex flex-col gap-3 shadow-lg cursor-default overflow-hidden">
            <p className="text-gray-600 text-[11px] font-semibold uppercase tracking-wide">
              Total invoices
            </p>
            <h2 className="text text-3xl font-black truncate">
              <span className="inline min-[540px]:hidden min-[948px]:inline min-[1109px]:hidden ">
                {compactFormatter.format(totalInvoicesCount)}
              </span>
              <span className="hidden min-[540px]:inline min-[948px]:hidden min-[1109px]:inline">
                {fullFormatter.format(totalInvoicesCount)}
              </span>
            </h2>
            <p className="mt-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-blue-500/20 text-blue-500 w-fit">
              invoice
            </p>
          </div>

          {/* Card 2: Total Paid */}
          <div className="flex-1 p-6 min-[400px]:pl-11 rounded-4xl border border-gray-200/50 bg-white/5  flex flex-col gap-3 shadow-lg cursor-default overflow-hidden">
            <p className="text-gray-600 text-[11px] font-semibold uppercase tracking-wide">
              Total paid
            </p>
            <h2 className="text text-3xl font-black truncate">
              <span className="inline min-[540px]:hidden min-[948px]:inline min-[1109px]:hidden">
                {dynamicCurrencyFormatter(
                  totalPaidAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  true,
                )}
              </span>
              <span className="hidden min-[540px]:inline min-[948px]:hidden min-[1109px]:inline">
                {dynamicCurrencyFormatter(
                  totalPaidAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  false, //
                )}
              </span>
            </h2>
            <p className="mt-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-green-500/20 text-green-500 w-fit">
              paid
            </p>
          </div>

          {/* Card 3: Total Unpaid */}
          <div className="flex-1 p-6 min-[400px]:pl-11 rounded-4xl border border-gray-200/50 bg-white/5  flex flex-col gap-3 shadow-lg cursor-default overflow-hidden">
            <p className="text-gray-600 text-[11px] font-semibold uppercase tracking-wide">
              Total unpaid
            </p>
            <h2 className="text text-3xl font-black truncate">
              <span className="inline min-[540px]:hidden min-[948px]:inline min-[1109px]:hidden">
                {dynamicCurrencyFormatter(
                  totalUnpaidAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  true,
                )}
              </span>
              <span className="hidden min-[540px]:inline min-[948px]:hidden min-[1109px]:inline">
                {dynamicCurrencyFormatter(
                  totalUnpaidAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  false, //
                )}
              </span>
            </h2>
            <p className="mt-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-orange-500/20 text-orange-500 w-fit">
              unpaid
            </p>
          </div>

          {/* Card 4: Total Overdue */}
          <div className="flex-1 p-6 min-[400px]:pl-11 rounded-4xl border border-gray-200/50 bg-white/5  flex flex-col gap-3 shadow-lg cursor-default overflow-hidden">
            <p className="text-gray-600 text-[11px] font-semibold uppercase tracking-wide">
              Total overdue
            </p>
            <h2 className="text text-3xl font-black truncate">
              <span className="inline min-[540px]:hidden min-[948px]:inline min-[1109px]:hidden">
                {dynamicCurrencyFormatter(
                  totalOverdueAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  true,
                )}
              </span>
              <span className="hidden min-[540px]:inline min-[948px]:hidden min-[1109px]:inline">
                {dynamicCurrencyFormatter(
                  totalOverdueAmount,
                  currency === "USD" ? "$" : "৳",
                  currency === "USD" ? "en-US" : "bn-BD",
                  false, //
                )}
              </span>
            </h2>
            <p className="mt-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-red-500/20 text-red-400 w-fit">
              overdue
            </p>
          </div>
        </div>
        {/* --- Chart and Quick Link --- */}
        <div className="min-[1540px]:flex w-full gap-6 mt-8 grid ">
          {/* Chart */}
          {/* --- Chart and Quick Link --- */}
          <div className="min-[1540px]:flex w-full gap-6 grid ">
            {/* Chart */}
            <div className="p-6 rounded-[2.5rem] border border-gray-200/50 shadow-lg w-full h-full min-h-100 relative flex-1 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-black text-2xl font-bold mb-2 cursor-default max-[408px]:text-xl max-[408px]:w-21">
                  Income overview
                </h3>
                <span className="flex gap-2">
                  <span className="relative shrink-0" ref={statusRef}>
                    <button
                      type="button"
                      onClick={() => toggleDropdown("status")}
                      className="flex items-center gap-1 active:scale-[.98] px-3 pb-1 pl-4 border-2 border-gray-300 cursor-pointer rounded-2xl hover:bg-white hover:scale-[1.02] transition-all duration-200 ease-in-out  shrink-0"
                    >
                      <p className="text-xl max-[416px]:text-base max-[416px]:font-bold font-semibold">
                        {selectedStatus}
                      </p>
                      <img
                        src={`${activeDropdown === "status" ? "/arrow up.png" : "/arrow down.png"}`}
                        alt="arrow"
                      />
                    </button>
                    {activeDropdown === "status" && (
                      <div className="absolute left-0 mt-1.5 w-40 bg-white border border-slate-200/80 rounded-xl p-1 shadow-lg shadow-slate-200/40 z-50 flex flex-col gap-0.5 animate-fade-in">
                        {statusOptions.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setSelectedStatus(status);
                              setActiveDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${selectedStatus === status ? "bg-slate-50 text-gray-900" : "text-slate-600 hover:bg-slate-50/80 hover:text-gray-900"}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </span>
                  <span className="relative shrink-0" ref={dateRef}>
                    <button
                      type="button"
                      onClick={() => toggleDropdown("date")}
                      className="flex items-center gap-1 active:scale-[.98] px-3 pb-1 pl-4 border-2 border-gray-300 cursor-pointer rounded-2xl hover:bg-white hover:scale-[1.02] transition-all duration-200 ease-in-out shrink-0"
                    >
                      <p className="text-xl max-[416px]:text-base max-[416px]:font-bold font-semibold">
                        {selectedDate}
                      </p>
                      <img
                        src={`${activeDropdown === "date" ? "/arrow up.png" : "/arrow down.png"}`}
                        alt="arrow"
                      />
                    </button>
                    {activeDropdown === "date" && (
                      <div className="absolute left-0 mt-1.5 w-36 bg-white border border-slate-200/80 rounded-xl p-1 shadow-lg shadow-slate-200/40 z-50 flex flex-col gap-0.5 animate-fade-in">
                        <div className="max-h-48 overflow-y-auto thin-scrollbar pr-0.5 flex flex-col gap-0.5">
                          {dateOptions.map((date) => (
                            <button
                              key={date}
                              type="button"
                              onClick={() => {
                                setSelectedDate(date);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${selectedDate === date ? "bg-slate-50 text-gray-900" : "text-slate-600 hover:bg-slate-50/80 hover:text-gray-900"}`}
                            >
                              {date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </span>
                </span>
              </div>

              {/* Dynamic Loader & Chart Handler */}
              {isLoading ? (
                <div className="absolute inset-x-6 bottom-6 top-20 flex flex-col items-center justify-center bg-slate-50/40 rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                  {/* Animated Skeleton Waves behind the spinner */}
                  <div className="absolute inset-0 flex items-end justify-between px-4 opacity-25 pointer-events-none">
                    <div className="w-[12%] h-[40%] bg-gray-300 rounded-t-lg animate-pulse"></div>
                    <div className="w-[12%] h-[65%] bg-gray-300 rounded-t-lg animate-pulse delay-75"></div>
                    <div className="w-[12%] h-[50%] bg-gray-300 rounded-t-lg animate-pulse delay-150"></div>
                    <div className="w-[12%] h-[85%] bg-gray-300 rounded-t-lg animate-pulse delay-200"></div>
                    <div className="w-[12%] h-[35%] bg-gray-300 rounded-t-lg animate-pulse delay-300"></div>
                    <div className="w-[12%] h-[70%] bg-gray-300 rounded-t-lg animate-pulse delay-500"></div>
                  </div>

                  {/* Spinner and Text */}
                  <div className="relative flex flex-col items-center gap-3 z-10">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-t-purple-600 border-r-purple-600 rounded-full animate-spin"></div>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <p className="text-sm font-bold text-gray-700 tracking-wide animate-pulse">
                        Loading Analytics
                      </p>
                      <p className="text-xs text-gray-400">
                        Preparing your income overview graph...
                      </p>
                    </div>
                  </div>
                </div>
              ) : isChartEmpty ? (
                <div className="absolute inset-x-6 bottom-6 top-20 flex flex-col items-center justify-center bg-slate-50/40 rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                  {/* Animated Skeleton Waves behind the spinner */}
                  <div className="absolute inset-0 flex items-end justify-between px-4 opacity-25 pointer-events-none">
                    <div className="w-[12%] h-[40%] bg-gray-400 rounded-t-lg"></div>
                    <div className="w-[12%] h-[70%] bg-gray-400 rounded-t-lg"></div>
                    <div className="w-[12%] h-[50%] bg-gray-400 rounded-t-lg"></div>
                    <div className="w-[12%] h-[65%] bg-gray-400 rounded-t-lg"></div>
                    <div className="w-[12%] h-[35%] bg-gray-400 rounded-t-lg"></div>
                    <div className="w-[12%] h-[85%] bg-gray-400 rounded-t-lg"></div>
                  </div>

                  <div className="flex flex-col items-center justify-center backdrop-blur-[1px] rounded-xl transition-all duration-300 min-h-[90%]">
                    <div className="flex flex-col items-center gap-2 text-center p-6">
                      <h4 className="text-base font-bold text-gray-800 mt-2">
                        No Activity Recorded
                      </h4>
                      <p className="text-xs text-gray-400 max-w-55 font-medium leading-relaxed">
                        There is no transaction or invoice data available for
                        the selected period.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  className="pb-11 pt-2 pr-0.5 min-[1120px]:pl-2"
                >
                  <AreaChart
                    data={filteredChartData}
                    margin={{
                      top: 20,
                      right: 20,
                      left: 25,
                    }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis
                      stroke="#888"
                      width={20}
                      tickFormatter={(value) => {
                        if (value >= 1000000000000)
                          return `${(value / 1000000000000).toFixed(1).replace(/\.0$/, "")}T`;
                        if (value >= 1000000000)
                          return `${(value / 1000000000).toFixed(1).replace(/\.0$/, "")}B`;
                        if (value >= 1000000)
                          return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
                        if (value >= 1000)
                          return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
                        return value;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #c2c2c2a1",
                        borderRadius: "12px",
                      }}
                    />

                    {isTotalView ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="unpaid"
                          name="Unpaid"
                          stroke="#f59e0b"
                          fill="#f59e1b"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="overdue"
                          name="Overdue"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="paid"
                          name="Paid"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </>
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Total"
                        stroke="#8884d8"
                        fill="#8884d8"
                        strokeWidth={3}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* quick links */}
          <div className="p-6 rounded-[2.5rem] border border-gray-200/50 shadow-lg flex flex-col min-[1540px]:w-[22%]">
            <h3 className="text-black text-2xl font-bold mb-2 cursor-default">
              Quick links
            </h3>
            <div className="grid min-[480px]:grid-cols-2 min-[856px]:grid-cols-4 min-[1540px]:grid-cols-1 flex-1 py-4 gap-2">
              <button
                onClick={() => setIsOpenAdd(true)}
                className="sidebar-nav-button flex-1 hover:bg-gray-200"
              >
                <img src="/add client.png" alt="add client logo" />
                <span className="font-[550] text-[16px]">Add Client</span>
              </button>
              <button
                onClick={() => setIsOpenInv(true)}
                className="sidebar-nav-button flex-1 flex justify-start min-[1540px]:justify-start min-[1540px]:flex-row-reverse hover:bg-gray-200 pr-1"
              >
                <img src="/add invoice.png" alt="add invoice logo" />
                <span className="font-[550] text-[16px]">New Invoice</span>
              </button>
              <button
                onClick={() => setIsOpenPay(true)}
                className="sidebar-nav-button flex-1 hover:bg-gray-200"
              >
                <img src="/record payment.png" alt="record payment logo" />
                <span className="font-[550] text-[16px]">Record Payment</span>
              </button>
              <button
                onClick={() => setCurrency(currency === "USD" ? "BDT" : "USD")}
                className="sidebar-nav-button flex-1 flex justify-start min-[1540px]:justify-start min-[1540px]:flex-row-reverse items-center hover:bg-gray-200 pr-2 gap-2"
              >
                <img
                  className="pt-1.5"
                  src="/change currency.png"
                  alt="Change currency logo"
                />
                <span className="font-[550] text-[16px]">Change currency </span>
              </button>
            </div>
          </div>
        </div>
        {/* --- Bottom rows — two tables --- */}
        <div className="w-full flex max-[884px]:flex-col gap-6 mt-8 cursor-default flex-2 min-h-100 max-[884px]:min-h-200">
          {/* Left Section: Recent Payments */}
          <div className="flex-1 p-6 rounded-[2.5rem] border border-gray-200/50 bg-white/5  flex flex-col shadow-lg max-[884px]:min-h-100">
            <h3 className=" text-xl font-bold mt-1 mb-6">Recent payments</h3>
            <div className="w-full overflow-auto thin-scrollbar flex-1 flex flex-col min-h-0">
              <table className="w-full text-left table-fixed max-[884px]:min-w-100">
                <thead>
                  <tr className="text-gray-700 text-[11px] uppercase tracking-tighter border-b border-white/5">
                    <th className="p-2 pl-1 font-semibold">Client</th>
                    <th className="p-2 pr-4 font-semibold text-center">
                      Amount
                    </th>
                    <th className="p-2 pr-5 font-semibold text-right">
                      Status
                    </th>
                  </tr>
                </thead>
              </table>
              <div className="flex-1 min-h-0 overflow-x-auto thin-scrollbar pr-2 max-[884px]:min-w-100">
                <table className="w-full table-fixed">
                  <tbody className="divide-y divide-white/5">
                    {isLoading && (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-12 text-center text-sm text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                            <span className="font-medium tracking-wide">
                              Fetching recent payments...
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isLoading && recentPayments.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-12 text-center text-sm text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <p className="font-semibold text-gray-600 text-base">
                              No recent payments
                            </p>
                            <p className="text-xs text-gray-500/80">
                              No invoice payments recorded at the moment.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Recent Payments List */}
                    {!isLoading &&
                      recentPayments.map((inv, index) => (
                        <tr key={inv._id || index} className="group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-50 overflow-hidden shrink-0">
                                <img
                                  src={
                                    typeof inv.client_photo === "string" &&
                                    inv.client_photo.trim() !== ""
                                      ? inv.client_photo
                                      : "/anonymous-client.png"
                                  }
                                  alt="client photo"
                                  className="w-full h-full object-cover block"
                                  onError={(e) => {
                                    e.target.src = "/anonymous-client.png";
                                  }}
                                />
                              </div>
                              <span className="text-sm text-gray-500 font-medium truncate max-w-45">
                                {inv.client_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500 text-center font-semibold">
                            {compactFormatter.format(
                              Number(inv.invoice_paymented_ammount) || 0,
                            )}
                          </td>
                          <td className="py-4 text-right">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-200/50 text-green-500 border border-green-500/20 uppercase">
                              PAID
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Right Section: Upcoming Invoices */}
          <div className="flex-1 p-6 rounded-[2.5rem] border border-gray-200/50 bg-white/5  flex flex-col shadow-lg max-[884px]:min-h-100">
            <div className="mb-6">
              <h3 className="text-xl font-bold mt-1">Upcoming invoices</h3>
            </div>
            <div className="w-full overflow-auto thin-scrollbar flex-1 flex flex-col min-h-0">
              <table className="w-full text-left table-fixed max-[884px]:min-w-100">
                <thead>
                  <tr className="text-gray-700 text-[11px] uppercase tracking-tighter border-b border-white/5">
                    <th className="p-2 pl-1 font-semibold">Client</th>
                    <th className="p-2 pr-5 font-semibold text-right">
                      Due Date
                    </th>
                    <th className="p-2 pr-5 font-semibold text-right">
                      Status
                    </th>
                  </tr>
                </thead>
              </table>
              <div className="flex-1 overflow-x-auto thin-scrollbar pr-2 max-[884px]:min-w-100">
                <table className="w-full table-fixed">
                  <tbody className="divide-y divide-white/5">
                    {/* when data is loading, display loader */}
                    {isLoading && (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-12 text-center text-sm text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                            <span className="font-medium tracking-wide">
                              Fetching upcoming invoices...
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* if there are no invoices, display message */}
                    {!isLoading && upcomingInvoices.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-12 text-center text-sm text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <p className="font-semibold text-gray-600 text-base">
                              No upcoming invoices
                            </p>
                            <p className="text-xs text-gray-500/80">
                              All clear! No pending or unpaid invoices found at
                              the moment.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Invoice list */}
                    {!isLoading &&
                      upcomingInvoices.map((inv, index) => (
                        <tr key={inv._id || index} className="group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-50 overflow-hidden shrink-0">
                                <img
                                  src={
                                    typeof inv.client_photo === "string" &&
                                    inv.client_photo.trim() !== ""
                                      ? inv.client_photo
                                      : "/anonymous-client.png"
                                  }
                                  alt="client photo"
                                  className="w-full h-full object-cover block"
                                  onError={(e) => {
                                    // Fallback resource handler for broken URLs or network errors
                                    e.target.src = "/anonymous-client.png";
                                  }}
                                />
                              </div>
                              <span className="text-sm text-gray-500 font-medium truncate">
                                {inv.client_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500 text-right">
                            {inv.invoice_due_date
                              ? new Date(
                                  inv.invoice_due_date,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </td>
                          <td className="py-4 text-right">
                            {(() => {
                              let currentStatus = "PENDING";
                              let badgeStyle =
                                "bg-orange-100 text-orange-500 border-orange-300";

                              if (inv.invoice_due_date) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const dueDate = new Date(inv.invoice_due_date);
                                dueDate.setHours(0, 0, 0, 0);

                                if (dueDate <= today) {
                                  currentStatus = "OVERDUE";
                                  badgeStyle =
                                    "bg-red-100 text-red-400 border-red-300";
                                }
                              }

                              return (
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase ${badgeStyle}`}
                                >
                                  {currentStatus}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* --- Top Clients Section  --- */}
        <section className=" border border-gray-200/50 rounded-[2.5rem] shadow-lg p-8 mt-7 max-[884px]:mt-15 cursor-default flex-3 max-[884px]:min-h-120 min-h-140 flex flex-col ">
          {/* Header Part */}
          <div className="mb-6">
            <h3 className="text-gray-900 text-2xl font-black mt-1">
              Top clients
            </h3>
          </div>
          {/* Table Part */}
          <div className="w-full overflow-auto thin-scrollbar flex-1 flex flex-col">
            <table className="w-full text-left table-fixed min-w-142.5">
              <thead>
                <tr className="text-gray-700 text-xs uppercase tracking-wider border-b border-gray-50">
                  <th className="pb-4 w-[50%] font-bold">Client Name</th>
                  <th className="pb-4 font-bold text-center">Total Invoices</th>
                  <th className="pb-4 font-bold text-center">Total Paid</th>
                  <th className="pb-4 pr-3 font-bold text-center">
                    Reliability Rate
                  </th>
                </tr>
              </thead>
            </table>
            <div className="flex-1 overflow-x-auto thin-scrollbar pr-2 min-w-143.75">
              <table className="w-full table-fixed">
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-12 text-center text-sm text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          <span className="font-medium tracking-wide">
                            Fetching top clents...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : clients && clients.length > 0 ? (
                    [...clientsWithScores]
                      .sort((a, b) => b.paymentRatio - a.paymentRatio)
                      .map((client) => {
                        const scoreColor =
                          client.paymentRatio < 30
                            ? "text-red-600"
                            : client.paymentRatio <= 80
                              ? "text-blue-600"
                              : client.paymentRatio > 100
                                ? "text-indigo-500 font-extrabold drop-shadow-sm"
                                : "text-green-600";

                        return (
                          <tr
                            key={client._id || client.client_name}
                            className="transition-colors hover:bg-slate-50/50 cursor-default"
                          >
                            <td className="py-5 w-[51%]">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                  <img
                                    src={
                                      client.client_photo ||
                                      "/anonymous-client.png"
                                    }
                                    alt={client.client_name || "client"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/anonymous-client.png";
                                    }}
                                  />
                                </div>
                                <span className="text-lg font-bold text-gray-800 truncate">
                                  {client.client_name || "Unknown Client"}
                                </span>
                              </div>
                            </td>

                            <td className="py-5 text-lg text-center font-semibold text-gray-600">
                              {client.TotalInvoice || 0}
                            </td>

                            <td className="py-5 text-center font-black text-gray-900 truncate">
                              {compactFormatter.format(client.TotalPaid || 0)}
                            </td>

                            <td className="py-5 text-center">
                              <span
                                className={`${scoreColor} font-bold text-lg`}
                              >
                                {client.paymentRatio}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-12 text-center text-sm text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                          <p className="font-semibold text-gray-600 text-lg">
                            No clients found
                          </p>
                          <p className="text-xs text-gray-500/80">
                            No clients recorded at the moment.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        {/* client pop up */}
        <Client isOpen={isOpenAdd} onClose={() => setIsOpenAdd(false)} />
        {/*  Record payment pop up */}
        <Payment isOpen={IsOpenPay} onClose={() => setIsOpenPay(false)} />
        {/*  New invoice pop up */}
        <Invoice isOpen={IsOpenInv} onClose={() => setIsOpenInv(false)} />
      </div>
    );
  }
}