"use client";
import React, { useState, useRef, useEffect } from "react";
import Payment from "@/components/modals/Payment";
import SigninFirst from "@/components/states/SigninFirst";
import { toast, ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";

export default function payments() {
  // ------------------------ State for fulter button and search bar toggle -------------------------
  const [isPreviewFilterd, setIsPreviewFilterd] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typingQuery, setTypingQuery] = useState("");
  const triggerSearch = () => {
    setSearchQuery(typingQuery);
  };

  // -------------------------- State to control which row's popup is open --------------------------
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

  // -------------------------- collecting all the data from the database --------------------------
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

  // ---------------------------------- for paid payments and  -------------------------------------
  const paidItems = React.useMemo(() => {
    if (!items || items.length === 0) return [];

    return items.filter((item) => item.status?.toLowerCase().trim() === "paid");
  }, [items]);

  const filteredItems = paidItems
    .map((item) => {
      const totalAmount =
        item.invoice_items?.reduce((sum, current) => {
          return sum + current.units * current.price;
        }, 0) || 0;
      const paidAmount = Number(item.invoice_paymented_ammount) || 0;
      const dueAmount = totalAmount - paidAmount;
      return {
        ...item,
        paidAmount,
        dueAmount,
      };
    })
    .filter((item) => {
      const filterKey = isPreviewFilterd.toLowerCase();
      const itemStatus = item.dueAmount <= 0 ? "paid" : "partial";
      const matchesStatus = filterKey === "all" || itemStatus === filterKey;

      const searchKey = searchQuery.toLowerCase().trim();

      const clientName = (item.client_name || "").toLowerCase();
      const invoiceId = (item.invoice_number || "").toLowerCase();

      const matchesSearch =
        searchKey === "" ||
        clientName.includes(searchKey) ||
        invoiceId.includes(searchKey);

      return matchesStatus && matchesSearch;
    });

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

  // ------------------------------------------ formatter ------------------------------------------
  const fullFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });
  const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });

  // ----------------------------------- For Payment pop up -----------------------------------
  // for open/close
  const [IsOpenPay, setIsOpenPay] = useState(false);

  // for Payment mode
  const [payMode, setPayMode] = useState("create");

  // for Payment id
  const [selectedPay, setSelectedPay] = useState(null);

  // to record a new payment
  const handleRecordPay = () => {
    setPayMode("create");
    setSelectedPay(null);
    setIsOpenPay(true);
  };

  // to delete the payment
  const handleEditPay = (invoiceId) => {
    setPayMode("edit");
    setSelectedPay(invoiceId);
    setIsOpenPay(true);
  };

  // to close the pop up
  const handleClosePay = () => {
    setIsOpenPay(false);
  };

  // to delete the payment
  const handleDeletePay = async (payId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!",
      background: "#ffffff",
      customClass: { popup: "rounded-2xl" },
    });

    if (!result.isConfirmed) return;

    toast.promise(
      fetch("/api/invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payId,
          invoice_paymented_ammount: "",
          invoice_payment_date: "",
          invoice_payment_methode: "",
          status: "unpaid",
        }),
      }).then(async (r) => {
        const result = await r.json();
        if (!result.success) throw new Error(result.message || "Failed");
        setItems((prevItems) =>
            prevItems.filter((inv) => inv._id !== payId),
          );
        setTimeout(() => window.location.reload(), 1000);
        return result;
      }),
      {
        pending: "Deleting payment...",
        success: "Payment deleted successfully",
        error: {
          render({ data }) {
            return data?.message || "Failed!";
          },
        },
      },
    );
  };

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
      <div className="w-full h-full flex flex-col min-h-0 bg-[#f8fafc] gap-4 overflow-auto no-scrollbar max-[782px]:pb-1.5 relative min-[782px]:-top-4">
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
        {/* --- Header area --- */}
        <header className="flex shrink-0 justify-between items-center pb-2 overflow-y-auto thin-scrollbar relative">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight cursor-default max-[782px]:pl-16">
            Payments
          </h1>

          {/* + Record Payment Button */}
          <button
            onClick={() => handleRecordPay()}
            className="bg-blue-500 text-white hover:bg-blue-600 shadow-md active:scale-95 max-[782px]:scale-90 max-[782px]:active:scale-85 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>
              <img src="/add.png" alt="add icon" />
            </span>
            Record Payment
          </button>
        </header>

        {/* --- FILTER + SEARCH CONTROLS --- */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 max-[500px]:p-3 flex items-center justify-between">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsPreviewFilterd("all")}
              className={`px-4 py-2 font-bold rounded-xl transform-all duration-200 ease-in-out cursor-pointer ${isPreviewFilterd === "all" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              All
            </button>
            <button
              onClick={() => setIsPreviewFilterd("paid")}
              className={`px-4 py-2 font-bold rounded-xl transform-all duration-200 ease-in-out cursor-pointer ${isPreviewFilterd === "paid" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Full
            </button>
            <button
              onClick={() => setIsPreviewFilterd("partial")}
              className={`px-4 py-2 font-bold rounded-xl transform-all duration-200 ease-in-out cursor-pointer ${isPreviewFilterd === "partial" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"} mr-3`}
            >
              Partial
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full max-w-80.5 flex gap-2">
            <input
              type="text"
              placeholder="Search by Client or Invoice..."
              value={typingQuery}
              onChange={(e) => setTypingQuery(e.target.value)}
              className="w-full px-5 py-3 max-[400px]:px-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:border-gray-400 text-base font-medium transition-all text-gray-700 truncate"
            />
            <button
              onClick={triggerSearch}
              className="bg-white w-16 flex shrink-0 items-center justify-center border border-gray-200 rounded-xl shadow-sm outline-none cursor-pointer active:scale-95"
            >
              <img src="/search.png" alt="search icon" />
            </button>
          </div>
        </section>

        {/* --- PAYMENT LIST TABLE --- */}
        <section className="bg-white border border-gray-100 rounded-4xl shadow-sm flex-5 flex flex-col overflow-auto no-scrollbar relative min-h-130">
          <div className="p-6 border-b border-gray-50 sticky left-0">
            <h3 className="text-xl font-black text-gray-900 cursor-default">
              All Payment Record
            </h3>
          </div>
          {/* head part */}
          <div className="w-full flex-1 flex flex-col min-h-0 min-w-185">
            {/* table header */}
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="bg-gray-100 text-gray-500 text-sm font-bold uppercase tracking-wider border-b border-gray-100 cursor-default">
                  <th className="p-4 pl-8 w-[15%]">Invoice ID ↓</th>
                  <th className="p-4 w-[25%]">Client</th>
                  <th className="p-4 pl-2 text-center w-[15%]">Amount</th>
                  <th className="p-4 pl-0 text-center w-[15%]">Date</th>
                  <th className="p-4 pl-2 text-center w-[15%]">Method</th>
                  <th className="p-4 pl-0 text-center w-[12%]">Status</th>
                  <th className="p-4 text-center w-[3%]"></th>
                </tr>
              </thead>
            </table>
            {/* body part */}
            <div className="w-full flex-1 overflow-y-auto min-h-0 thin-scrollbar">
              <table className="w-full text-left table-fixed ">
                <tbody className="divide-y divide-gray-50 text-gray-700 text-sm font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
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
                  ) : !paidItems || paidItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12">
                        <div className="flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-xl transition-all duration-300 min-h-45">
                          <div className="flex flex-col items-center gap-1 text-center p-6">
                            <h4 className="text-xl font-bold text-gray-800 mt-2">
                              No Payments Recorded
                            </h4>
                            <p className="text-sm text-gray-400 max-w-75 font-medium leading-relaxed">
                              There are currently no payment recorded in the
                              system. New payments will appear here once
                              generated.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems && filteredItems.length > 0 ? (
                    [...filteredItems]
                      .sort((a, b) => {
                        const dateA = new Date(
                          a.createdAt || a.issueDate,
                        ).getTime();
                        const dateB = new Date(
                          b.createdAt || b.issueDate,
                        ).getTime();
                        return dateB - dateA;
                      })
                      .map((item, index) => {
                        return (
                          <tr
                            className="hover:bg-gray-100/50 transition-colors"
                            key={item._id || index}
                          >
                            {/* ID */}
                            <td className="p-4 pl-8 font-bold text-gray-900 text-nowrap text-base cursor-default w-[15%]">
                              #INV-{item.invoice_number || "000"}
                            </td>

                            {/* Client */}
                            <td className="p-4 cursor-default w-[25%]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden shrink-0">
                                  <img
                                    src={
                                      typeof item.client_photo === "string" &&
                                      item.client_photo.trim() !== ""
                                        ? item.client_photo
                                        : "/anonymous-client.png"
                                    }
                                    alt="client"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = "/anonymous-client.png";
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-base text-gray-900 truncate min-w-0 block">
                                  {item.client_name || "Unknown Client"}
                                </span>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="p-4 text-center text-base font-black text-gray-900 cursor-default w-[15%]">
                              ${fullFormatter.format(item.paidAmount)}
                              {item.dueAmount > 0 ? (
                                <span className="text-sm text-red-400 block font-normal">
                                  ${fullFormatter.format(item.dueAmount)}
                                </span>
                              ) : (
                                ""
                              )}
                            </td>

                            {/* Date */}
                            <td className="p-4 text-center text-base text-gray-500 cursor-default w-[15%]">
                              {item.invoice_payment_date
                                ? new Date(
                                    item.invoice_payment_date,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </td>

                            {/* Method */}
                            <td className="p-4 text-center cursor-default w-[15%]">
                              {(() => {
                                const method =
                                  item.invoice_payment_methode
                                    ?.toLowerCase()
                                    .trim() || "";
                                let colorStyles = "bg-slate-100 text-slate-600";

                                if (method === "cash") {
                                  colorStyles = "bg-blue-100 text-blue-600";
                                } else if (method === "bank") {
                                  colorStyles = "bg-purple-100 text-purple-600";
                                } else if (method === "bkash") {
                                  colorStyles = "bg-pink-100 text-pink-600";
                                } else if (method === "nagad") {
                                  colorStyles = "bg-amber-100 text-amber-600";
                                } else if (method === "other") {
                                  colorStyles = "bg-cyan-100 text-cyan-600";
                                }

                                return (
                                  <span
                                    className={`inline-block w-20 text-center rounded-lg px-2.5 py-1 text-sm font-bold truncate uppercase ${colorStyles}`}
                                  >
                                    {item.invoice_payment_methode || "N/A"}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Status */}
                            <td className="p-4 text-center cursor-default w-[10%]">
                              <span className="px-4 py-1.5 rounded-lg text-sm font-bold uppercase bg-green-100 text-green-600">
                                {item.status || "PAID"}
                              </span>
                            </td>

                            {/* Actions Cell */}
                            <td className="p-4 text-center text-gray-400 font-bold hover:text-gray-900 text-xl w-[5%] relative">
                              <button
                                onClick={() => togglePopup(item._id)}
                                className="block w-full h-full select-none cursor-pointer"
                                ref={openPopupIndex === index ? popupRef : null}
                              >
                                ⋮
                              </button>

                              {openPopupIndex === item._id && (
                                <div className="absolute right-4 mt-1 w-28 bg-white border border-slate-200/80 rounded-xl px-2 p-1 shadow-lg shadow-slate-200/50 z-50 flex flex-col gap-0.5 animate-fade-in text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPopupIndex(null);
                                      handleEditPay(item._id);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-base font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <img src="/edit.png" alt="edit icon" /> Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPopupIndex(null);
                                      handleDeletePay(item._id);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-base font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <img src="/delete.png" alt="delete icon" />{" "}
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }) // if there is no payments, display message
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-gray-500 font-medium bg-white rounded-b-2xl"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <img src="/no search.png" alt="no search icon" />
                          <p className="text-base text-gray-600">
                            No payments found matching your search.
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

        {/* --- Recent + Upcoming --- */}
        <div className="w-full flex flex-2 min-[631px]:min-h-70 max-[630px]:flex-col max-[630px]:flex-none gap-4 min-h-0 cursor-default mb-1">
          {/* Recent Payments Quick Box */}
          <div className="flex-1 min-w-0 max-[630px]:flex-none max-[630px]:h-56 flex flex-col p-4 rounded-4xl border border-gray-100 bg-white shadow-sm">
            <h4 className="text-gray-900 font-black text-lg mb-4">
              Last Payments
            </h4>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto thin-scrollbar pr-1">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400">
                  <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                  <span className="font-medium tracking-wide">
                    Fetching last payments...
                  </span>
                </div>
              )}

              {!isLoading && paidItems.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-1 py-12 text-sm text-gray-400">
                  <p className="font-semibold text-gray-600 text-base">
                    No last payments
                  </p>
                  <p className="text-xs text-gray-500/80">
                    No invoice payments recorded at the moment.
                  </p>
                </div>
              )}

              {!isLoading &&
                paidItems
                  .sort((a, b) => {
                    return (
                      new Date(b.invoice_payment_date).getTime() -
                      new Date(a.invoice_payment_date).getTime()
                    );
                  })
                  .map((inv, index) => (
                    <div
                      key={inv._id || index}
                      className="flex justify-between items-center gap-2 p-3 hover:bg-gray-100/50 border-b border-gray-200 rounded-xl"
                    >
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-base font-bold bg-gray-100 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-md">
                          #INV-{inv.invoice_number || "000"}
                        </span>
                        <span className="text-base font-bold text-gray-800 truncate">
                          {inv.client_name || "Unknown Client"}
                        </span>
                      </div>
                      <span className="shrink-0 text-base font-black text-green-600 text-nowrap">
                        +$
                        {fullFormatter.format(
                          Number(inv.invoice_paymented_ammount) || 0,
                        )}
                      </span>
                    </div>
                  ))}
            </div>
          </div>

          {/* Upcoming Payments Quick Box */}
          <div className="flex-1 min-w-0 max-[630px]:flex-none max-[630px]:h-56 flex flex-col p-4 rounded-4xl border border-gray-100 bg-white shadow-sm">
            <h4 className="text-gray-900 font-black text-lg mb-4">
              Upcoming Payments
            </h4>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto thin-scrollbar pr-1">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400">
                  <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500  rounded-full animate-spin"></div>
                  <span className="font-medium tracking-wide">
                    Fetching upcoming payments...
                  </span>
                </div>
              )}

              {!isLoading && upcomingInvoices.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-1 py-12 text-sm text-gray-400">
                  <p className="font-semibold text-gray-600 text-base">
                    No upcoming payments
                  </p>
                  <p className="text-xs text-gray-500/80">
                    All clear! No invoice payments recorded at the moment.
                  </p>
                </div>
              )}

              {/* dinamic upcoming payment list */}
              {!isLoading && (
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto thin-scrollbar pr-1">
                  {upcomingInvoices.map((inv, index) => {
                    const totalAmount =
                      inv.invoice_items?.reduce((sum, current) => {
                        return sum + current.units * current.price;
                      }, 0) ||
                      Number(inv.invoice_total_amount) ||
                      0;

                    return (
                      <div
                        key={inv._id || index}
                        className="flex justify-between items-center gap-2 p-3 hover:bg-gray-100/50 border-b border-gray-200 rounded-xl transition-colors group"
                      >
                        {/* upcoming payment amount */}
                        {(() => {
                          let badgeStyle =
                            "text-orange-500 bg-orange-100 border-orange-300";

                          if (inv.invoice_due_date) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const dueDate = new Date(inv.invoice_due_date);
                            dueDate.setHours(0, 0, 0, 0);

                            if (dueDate <= today) {
                              badgeStyle =
                                "text-red-500 bg-red-100 border-red-300";
                            }
                          }

                          return (
                            <span
                              className={`shrink-0 w-22 text-base text-center font-bold px-2 py-0.5 rounded-md text-nowrap border ${badgeStyle}`}
                            >
                              {compactFormatter.format(totalAmount)}
                            </span>
                          );
                        })()}

                        {/* client name */}
                        <span className="flex-1 min-w-0 text-base font-bold text-gray-800 truncate">
                          {inv.client_name || "Unknown Client"}
                        </span>

                        {/* date */}
                        <span className="shrink-0 text-base font-medium text-gray-500 text-nowrap">
                          {inv.invoice_due_date
                            ? new Date(inv.invoice_due_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "N/A"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {/*  Record payment pop up */}
        <Payment
          isOpen={IsOpenPay}
          onClose={handleClosePay}
          mode={payMode}
          payId={selectedPay}
        />
      </div>
    );
  }
}
