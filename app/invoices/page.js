"use client";
import React, { useState, useRef, useEffect } from "react";
import Invoice from "@/components/modals/Invoice";
import SigninFirst from "@/components/states/SigninFirst";
import { ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";

const invoice = () => {
  // ----------------------------------- For invoice pop up -----------------------------------
  // for open/close
  const [IsOpenInv, setIsOpenInv] = useState(false);

  // for invoice mode
  const [invoiceMode, setInvoiceMode] = useState("create");

  // for invoice id
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // to create a new invoice
  const handleOpenCreate = () => {
    setInvoiceMode("create");
    setSelectedInvoice(null);
    setIsOpenInv(true);
  };

  // to edit the invoice
  const handleOpenEdit = (invoiceData) => {
    setInvoiceMode("edit");
    setSelectedInvoice(invoiceData);
    setIsOpenInv(true);
  };

  // to show the invoice
  const handleOpenShow = (invoiceData) => {
    setInvoiceMode("show");
    setSelectedInvoice(invoiceData);
    setIsOpenInv(true);
  };

  // to close the pop up
  const handleCloseInvoice = () => {
    setIsOpenInv(false);
  };

  // ------------------------ State for fulter button and search bar toggle ------------------------
  const [isPreviewFilterd, setIsPreviewFilterd] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typingQuery, setTypingQuery] = useState("");
  const triggerSearch = () => {
    setSearchQuery(typingQuery);
  };

  // ---------------------- State to control which row's 3dot's popup is open ----------------------
  const [openPopupIndex, setOpenPopupIndex] = useState(null);
  const togglePopup = (index) => {
    setOpenPopupIndex(openPopupIndex === index ? null : index);
  };
  const popupRef = useRef(null);
  // handle out side click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setOpenPopupIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --------------------------- state to make the box gray when ckecked ----------------------------
  const [checkedRows, setCheckedRows] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("checkedRows");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  // Save to localStorage whenever checkedRows state changes
  useEffect(() => {
    localStorage.setItem("checkedRows", JSON.stringify(checkedRows));
  }, [checkedRows]);
  // Handle checkbox change log
  const handleCheckboxChange = (index) => {
    if (checkedRows.includes(index)) {
      setCheckedRows(checkedRows.filter((i) => i !== index));
    } else {
      setCheckedRows([...checkedRows, index]);
    }
  };

  // --------------------------- collecting all the data from the database ---------------------------
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);

    fetch(`/api/invoice?userId=${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setItems(data);
      })
      .catch((err) => {
        console.error("The actual error is:", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  // ----------------------------- collect all the data from the database -----------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // giving tatals name
  let totalPaidAmount = 0;
  let totalUnpaidAmount = 0;
  let totalOverdueAmount = 0;
  let totalInTransitAmount = 0;

  // variables for tracking the latest dates
  let lastPaidDate = null;
  let lastUnpaidDate = null;
  let lastOverdueDate = null;
  let lastInTransitDate = null;

  // getting all the data from the database
  if (items && items.length > 0) {
    items.forEach((item) => {
      const invoiceTotal =
        item.invoice_items?.reduce((sum, current) => {
          return sum + current.units * current.price;
        }, 0) || 0;

      const status = item.status;
      const currentIssueDate = item.invoice_issue_date;

      if (status === "paid") {
        totalPaidAmount += Number(item.invoice_paymented_ammount) || 0;

        // tracking last paid date
        if (
          currentIssueDate &&
          (!lastPaidDate || new Date(currentIssueDate) > new Date(lastPaidDate))
        ) {
          lastPaidDate = currentIssueDate;
        }
      } else {
        // If status is not paid, it's counted as unpaid
        totalUnpaidAmount += invoiceTotal;

        // tracking last unpaid date
        if (
          currentIssueDate &&
          (!lastUnpaidDate ||
            new Date(currentIssueDate) > new Date(lastUnpaidDate))
        ) {
          lastUnpaidDate = currentIssueDate;
        }

        // Check due date to separate Overdue vs In Transit
        if (item.invoice_due_date) {
          const dueDate = new Date(item.invoice_due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate <= today) {
            // Due date has passed today, so it is Overdue
            totalOverdueAmount += invoiceTotal;

            // tracking last overdue date
            if (
              currentIssueDate &&
              (!lastOverdueDate ||
                new Date(currentIssueDate) > new Date(lastOverdueDate))
            ) {
              lastOverdueDate = currentIssueDate;
            }
          } else {
            // Due date is today or in the future, so it is In Transit / Pending
            totalInTransitAmount += invoiceTotal;

            // tracking last intransit date
            if (
              currentIssueDate &&
              (!lastInTransitDate ||
                new Date(currentIssueDate) > new Date(lastInTransitDate))
            ) {
              lastInTransitDate = currentIssueDate;
            }
          }
        }
      }
    });
  }
  // format function to display date cleanly (e.g., "Jan 24")
  const formatSummaryDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // ------------------- calculating all the things neeeded for the invoices list -------------------
  const itemsWithStatus = React.useMemo(() => {
    if (!items?.length) return [];

    const filterKey = isPreviewFilterd.toLowerCase();
    const searchKey = searchQuery.toLowerCase().trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items
      .map((item) => {
        let currentStatus = "Paid";
        let badgeClass = "bg-green-50 text-green-600 border-green-200";
        let dotClass = "bg-green-500";

        if (item.status?.toLowerCase() !== "paid" && item.invoice_due_date) {
          const dueDate = new Date(item.invoice_due_date);
          dueDate.setHours(0, 0, 0, 0);

          if (dueDate <= today) {
            currentStatus = "Overdue";
            badgeClass = "bg-red-50 text-red-600 border-red-200";
            dotClass = "bg-red-500";
          } else {
            currentStatus = "In Transit";
            badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
            dotClass = "bg-blue-500";
          }
        }

        return { ...item, currentStatus, badgeClass, dotClass };
      })
      .filter((item) => {
        const matchesStatus =
          filterKey === "all" || item.currentStatus.toLowerCase() === filterKey;

        const matchesSearch =
          !searchKey ||
          (item.client_name || "").toLowerCase().includes(searchKey) ||
          (item.invoice_number || "").toLowerCase().includes(searchKey);

        return matchesStatus && matchesSearch;
      });
  }, [items, isPreviewFilterd, searchQuery]);

  // ------------------------------------------- formatter -------------------------------------------
  const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });

  const fullFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });

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
    return <SigninFirst />;
  } else {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-auto thin-scrollbar">
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
        {/* --- 1. TOP NAVIGATION AREA --- */}
        <header className="flex-none flex justify-between items-center mb-8 max-[782px]:mt-3">
          {/* Page Title */}
          <span className="text-3xl font-extrabold text-gray-900 cursor-default max-[782px]:pl-16 max-[450px]:pl-16">
            Invoices
          </span>
          {/* Action Buttons Group */}
          <button
            onClick={() => handleOpenCreate()}
            className="bg-blue-500 text-white hover:bg-blue-600 shadow-md active:scale-95 mainbar-actn-cmn cursor-pointer"
          >
            <img className="w-7 pt-0.5" src="/add.png" alt="plus icon" />
            New Invoice
          </button>
        </header>

        {/* --- 2. STATS OVERVIEW SECTION --- */}
        <section className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden cursor-default">
          {/* Main Flex Container for Stats */}
          <div className="grid grid-cols-4 max-[820px]:grid-cols-2 max-[450px]:gap-6 items-center p-8 max-[900px]:p-4 max-[390px]:p-2">
            {/* Stat Card 01: Total Paid */}
            <div className="col-span-1 min-[450px]:border-r border-gray-300 px-6 max-[390px]:px-3 max-[900px]:scale-90 max-[390px]:scale-[0.88]">
              <span className="flex items-center mb-2 gap-2.5">
                <img src="/total_paid.png" alt="paid icon" />
                <p className="text-base font-bold text-green-500 text-nowrap uppercase tracking-wider">
                  Total Paid
                </p>
              </span>
              <h3 className="text-3xl font-black text-gray-800 truncate">
                $
                <span className="inline min-[540px]:hidden min-[820px]:inline min-[1040px]:hidden">
                  {compactFormatter.format(
                    isLoading ? 0 : `${totalPaidAmount || 0}`,
                  )}
                </span>
                <span className="hidden min-[540px]:inline min-[820px]:hidden min-[1040px]:inline">
                  {fullFormatter.format(
                    isLoading ? 0 : `${totalPaidAmount || 0}`,
                  )}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                Last update: {formatSummaryDate(lastPaidDate)}
              </p>
            </div>
            {/* Stat Card 02: Total Unpaid */}
            <div className="col-span-1 min-[450px]:border-r border-gray-300 px-6 max-[390px]:px-3 max-[900px]:scale-90 max-[390px]:scale-[0.88]">
              <span className="flex items-center mb-2 gap-2.5">
                <img src="/total_unpaid.png" alt="unpaid icon" />
                <p className="text-base font-bold text-orange-500 text-nowrap uppercase tracking-wider">
                  Total Unpaid
                </p>
              </span>
              <h3 className="text-3xl font-black text-gray-800 truncate">
                $
                <span className="inline min-[540px]:hidden min-[820px]:inline min-[1040px]:hidden">
                  {compactFormatter.format(
                    isLoading ? 0 : `${totalUnpaidAmount || 0}`,
                  )}
                </span>
                <span className="hidden min-[540px]:inline min-[820px]:hidden min-[1040px]:inline">
                  {fullFormatter.format(
                    isLoading ? 0 : `${totalUnpaidAmount || 0}`,
                  )}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                Last update: {formatSummaryDate(lastUnpaidDate)}
              </p>
            </div>

            {/* Stat Card 03: In Transit */}
            <div className="col-span-1 min-[450px]:border-r border-gray-300 px-6 max-[390px]:px-3 max-[900px]:scale-90 max-[390px]:scale-[0.88]">
              <span className="flex items-center mb-2 gap-2.5">
                <img src="/in_transit.png" alt="transit icon" />
                <p className="text-base font-bold text-blue-500 text-nowrap uppercase tracking-wider">
                  In Transit
                </p>
              </span>
              <h3 className="text-3xl font-black text-gray-800 truncate">
                $
                <span className="inline min-[540px]:hidden min-[820px]:inline min-[1040px]:hidden">
                  {compactFormatter.format(
                    isLoading ? 0 : `${totalInTransitAmount || 0}`,
                  )}
                </span>
                <span className="hidden min-[540px]:inline min-[820px]:hidden min-[1040px]:inline">
                  {fullFormatter.format(
                    isLoading ? "0" : `${totalInTransitAmount || 0}`,
                  )}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                Last update: {formatSummaryDate(lastInTransitDate)}
              </p>
            </div>
            {/* Stat Card 04: Total Overdue */}
            <div className="col-span-1 min-[450px]:max-[820px]:border-r border-gray-300 px-6 max-[390px]:px-3 max-[900px]:scale-90 max-[390px]:scale-[0.88]">
              <span className="flex items-center mb-2 gap-2.5">
                <img src="/total_overdue.png" alt="overdue icon" />
                <p className="text-base font-bold text-red-500 text-nowrap uppercase tracking-wider">
                  Total Overdue
                </p>
              </span>
              <h3 className="text-3xl font-black text-gray-800 truncate">
                $
                <span className="inline min-[540px]:hidden min-[820px]:inline min-[1040px]:hidden">
                  {compactFormatter.format(
                    isLoading ? 0 : `${totalOverdueAmount || 0}`,
                  )}
                </span>
                <span className="hidden min-[540px]:inline min-[820px]:hidden min-[1040px]:inline">
                  {fullFormatter.format(
                    isLoading ? 0 : `${totalOverdueAmount || 0}`,
                  )}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                Last update: {formatSummaryDate(lastOverdueDate)}
              </p>
            </div>
          </div>
        </section>

        {/* --- 3. STATS TABLE SECTION --- */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm mt-6 flex-1 flex flex-col min-h-85">
          {/* --- 1. HEADER PART --- */}
          <div className="flex items-center justify-between p-6 max-[450px]:px-2 max-[450px]:py-4">
            {/* Left side: Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsPreviewFilterd("all")}
                className={`table-btn ${isPreviewFilterd === "all" ? "bg-gray-500 text-white" : ""}`}
              >
                All
              </button>
              <button
                onClick={() => setIsPreviewFilterd("paid")}
                className={`table-btn ${isPreviewFilterd === "paid" ? "bg-gray-500 text-white" : ""}`}
              >
                Paid
              </button>
              <button
                onClick={() => setIsPreviewFilterd("in transit")}
                className={`table-btn whitespace-nowrap ${isPreviewFilterd === "in transit" ? "bg-gray-500 text-white" : ""}`}
              >
                In Transit
              </button>
              <button
                onClick={() => setIsPreviewFilterd("overdue")}
                className={`table-btn ${isPreviewFilterd === "overdue" ? "bg-gray-500 text-white" : ""} mr-4`}
              >
                Overdue
              </button>
            </div>

            {/* Right side: Search and Filter */}
            <div className="flex gap-2 ">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoice or client..."
                  value={typingQuery}
                  onChange={(e) => setTypingQuery(e.target.value)}
                  className="w-full px-5 max-[540px]:px-1.5 py-3 bg-white border truncate border-gray-200 rounded-2xl shadow-sm outline-none focus:border-gray-400 text-base font-medium transition-all text-gray-700"
                />
              </div>
              <button
                onClick={triggerSearch}
                className="table-btn flex items-center gap-2 text-gray-500 shadow rounded-xl shrink-0"
              >
                <img className="scale-90" src="/search.png" alt="filter icon" />
                <span className="max-[540px]:hidden">Search</span>
              </button>
            </div>
          </div>

          {/* --- 2. MID PART (TABLE) --- */}
          <div className="w-full flex-1 min-h-0 overflow-auto thin-scrollbar flex flex-col">
            {/* Tables Header Section */}
            <table className="w-full table-fixed border-collapse text-left min-w-225">
              <thead>
                <tr className="border-y border-gray-200 bg-[#f8fafb] text-gray-500 text-sm uppercase tracking-wider">
                  <th className="w-[2%] max-[1050px]:w-[3.5%]"></th>
                  <th className="p-3 w-[15.5%] max-[1050px]:w-[19%] font-bold ">
                    Invoice ID
                  </th>
                  <th className="p-3 pl-5 w-[30%] max-[1050px]:w-[25%] font-bold">
                    Client
                  </th>
                  <th className="p-3 w-[17.5%] max-[1050px]:w-[17.5%] font-bold text-center">
                    Issue Date
                  </th>
                  <th className="p-3 w-[17.5%] max-[1050px]:w-[17.5%] font-bold text-center">
                    Status
                  </th>
                  <th className="p-3 w-[13.5%] max-[1050px]:w-[13.5%] font-bold text-center">
                    Due
                  </th>
                  <th className="w-[4%] max-[1050px]:w-[4%]"></th>
                </tr>
              </thead>
            </table>
            {/* Tables Body */}
            <div className="overflow-y-auto flex-1 min-h-0 thin-scrollbar min-w-225">
              <table className="w-full table-fixed ">
                <tbody className="divide-y divide-gray-50 ">
                  {isLoading ? (
                    // loding state
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#2a55ca] rounded-full animate-spin"></div>
                          <div className="flex flex-col gap-1">
                            <p className="text-lg font-bold text-slate-700 tracking-wide animate-pulse">
                              Retrieving Invoices...
                            </p>
                            <p className="text-sm text-slate-400">
                              Please wait while we secure your billing data.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : items && items.length > 0 ? (
                    itemsWithStatus && itemsWithStatus.length > 0 ? (
                      [...itemsWithStatus]
                        .sort((a, b) => {
                          const dateA = new Date(
                            a.createdAt || a.invoice_issue_date,
                          ).getTime();
                          const dateB = new Date(
                            b.createdAt || b.invoice_issue_date,
                          ).getTime();
                          return dateB - dateA;
                        })
                        .map((item, originalIndex) => {
                          const rowId = item._id || originalIndex;
                          const isRowChecked = checkedRows.includes(rowId);

                          const totalPrice =
                            item.invoice_items?.reduce((sum, current) => {
                              return sum + current.units * current.price;
                            }, 0) || 0;

                          const formattedDate = item.invoice_issue_date
                            ? new Date(
                                item.invoice_issue_date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A";

                          return (
                            <tr
                              key={rowId}
                              className="hover:bg-gray-50 transition-colors border-b border-gray-200"
                            >
                              {/* Invoice Id */}
                              <td className="p-4 pl-3 w-[17.5%] max-[1050px]:w-[22.5%] text-sm text-gray-500">
                                <div className="flex items-center gap-3.5">
                                  <input
                                    type="checkbox"
                                    checked={isRowChecked}
                                    onChange={() => handleCheckboxChange(rowId)}
                                    className="table-row-chk relative z-10 shrink-0"
                                  />
                                  <div
                                    className={`flex items-center gap-3.5 transition-opacity duration-200 ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                                  >
                                    <button
                                      onClick={() => handleOpenShow(rowId)}
                                      className="table-row-inv-btn shrink-0"
                                    >
                                      <img src="/doc.png" alt="invoice icon" />
                                    </button>
                                    <span className="text-base font-bold text-gray-900 cursor-default shrink-0">
                                      #{item.invoice_number || "000"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Client */}
                              <td
                                className={`p-4 w-[30%] max-[1050px]:w-[25%] transition-opacity duration-200 ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-gray-50 overflow-hidden shrink-0">
                                    <img
                                      src={
                                        item.client_photo &&
                                        typeof item.client_photo === "string"
                                          ? item.client_photo
                                          : "/anonymous-client.png"
                                      }
                                      alt="client photo"
                                      className="w-full h-full object-cover block"
                                      onError={(e) => {
                                        e.target.src = "/anonymous-client.png";
                                      }}
                                    />
                                  </div>
                                  <span className="text-lg font-semibold text-gray-800 cursor-default truncate min-w-0 block">
                                    {item.client_name || "Unknown Client"}
                                  </span>
                                </div>
                              </td>

                              {/* Issue date */}
                              <td
                                className={`p-4 w-[17.5%] max-[1050px]:w-[17.5%] text-lg text-black font-semibold cursor-default transition-opacity duration-200 ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                              >
                                <div className="w-full grid justify-center">
                                  {formattedDate}
                                </div>
                              </td>

                              {/* Status */}
                              <td
                                className={`p-4 w-[17.5%] max-[1050px]:w-[17.5%] transition-opacity duration-200  ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                              >
                                <div className="w-full grid justify-center">
                                  <span
                                    className={`table-row-sts ${item.badgeClass}`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full mt-1 ${item.dotClass}`}
                                    ></span>
                                    <span>{item.currentStatus}</span>
                                  </span>
                                </div>
                              </td>

                              {/* Price */}
                              <td className="p-4 w-[17.5%] max-[1050px]:w-[17.5%]">
                                <div className="flex justify-between">
                                  <span
                                    className={`py-4 w-[80%] text-center text-lg font-black text-gray-900 cursor-default transition-opacity duration-200 ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                                  >
                                    {compactFormatter.format(totalPrice)}
                                  </span>
                                  <div
                                    onClick={() =>
                                      !isRowChecked && togglePopup(rowId)
                                    }
                                    ref={
                                      openPopupIndex === rowId ? popupRef : null
                                    }
                                    className={`table-row-3dt-btn relative transition-opacity duration-200 ${isRowChecked ? "opacity-40 pointer-events-none" : ""}`}
                                  >
                                    ⋮
                                    {openPopupIndex === rowId && (
                                      <div className="absolute px-2 right-4 mt-1 w-28 bg-white border border-slate-200/80 rounded-xl p-1 shadow-lg shadow-slate-200/50 z-50 flex flex-col gap-0.5 text-left">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenPopupIndex(null);
                                            handleOpenEdit(rowId);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-base font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                          <img
                                            src="/edit.png"
                                            alt="edit icon"
                                          />
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOpenPopupIndex(null)
                                          }
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-base font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                          <img
                                            src="/delete.png"
                                            alt="delete icon"
                                          />
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      // if there is no invoices, display message
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-12 text-gray-500 font-medium bg-white rounded-b-2xl"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <img src="/no search.png" alt="no search icon" />
                            <p className="text-base text-gray-600">
                              No invoices found matching your search.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  ) : (
                    /* If there are no invoices, display message */
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          {/* Optional: You can put an icon here */}
                          <p className="text-xl font-bold text-gray-700">
                            No Invoices Available
                          </p>
                          <p className="text-sm text-gray-400 max-w-sm">
                            There are currently no invoices recorded in the
                            system. New invoices will appear here once
                            generated.
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
        {/*  New invoice pop up */}
        <Invoice
          isOpen={IsOpenInv}
          onClose={handleCloseInvoice}
          mode={invoiceMode}
          invoice={selectedInvoice}
        />
      </div>
    );
  }
};

export default invoice;
