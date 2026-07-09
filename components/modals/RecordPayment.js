import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";

const RecordPayment = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // --------------------------- states for all those inputs value ------------------------------
  const [IsOpen, setIsOpen] = useState(false); // to open the invoice list
  const [selectedInv, setSelectedInv] = useState(null);
  const [pmntAmunt, setpmntAmunt] = useState(""); // for payment ammount
  const [pmntDate, setpmntDate] = useState(
    new Date().toISOString().split("T")[0],
  ); // for payment date
  const [pmntMthd, setpmntMthd] = useState(""); // for payment method

  // ---------------------------- function to add client in database ----------------------------
  const recordNewPayment = async () => {
    if (!selectedInv) {
      toast.error("Please select an invoice first! ");

      return;
    }
    onClose();

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      invoiceId: selectedInv?._id,
      invoice_paymented_ammount: pmntAmunt,
      invoice_payment_date: pmntDate,
      invoice_payment_methode: pmntMthd,
    });

    const requestOptions = {
      method: "PUT",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const savePaymentPromise = new Promise(async (resolve, reject) => {
      try {
        const r = await fetch("/api/invoice", requestOptions);

        if (!r.ok) {
          const errorText = await r.text();
          reject(
            new Error(
              `Server Error: ${r.status}. ${errorText.substring(0, 50)}`,
            ),
          );
          return;
        }

        const result = await r.json();

        if (result.success) {
          resolve(result);
          fetchClients();
        } else {
          reject(new Error(result.message || "Failed to update payment"));
        }
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(savePaymentPromise, {
      pending: "Updating record information...",
      success: "Record updated successfully ",
      error: {
        render({ data }) {
          return data?.message || "Failed to update record !";
        },
      },
    });
  };

  // ----------------------- collecting all clietns data from the database -----------------------
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [invoices, setinvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchClients = () => {
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
        setinvoices(data);
      })
      .catch((err) => {
        console.error("The actual error is:", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  // Fetch once on mount
  useEffect(() => {
    fetchClients();
  }, [userId]);

  // --------------------------------- filtered unpaid invoices ---------------------------------
  const processedInvoices = invoices
    .filter((item) => {
      const itemStatus = (item.status || "").toLowerCase().trim();

      return itemStatus === "unpaid";
    })
    .map((item) => {
      const totalAmount =
        (item.invoice_items || []).reduce((sum, current) => {
          const units = Number(current.units) || 0;
          const price = Number(current.price) || 0;
          return sum + units * price;
        }, 0) || 0;

      return {
        ...item,
        totalAmount,
      };
    });

  // ------------------------------------- Number formatter -------------------------------------
  const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });

  {
    /*  Record payment pop up */
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      {/* main pop up container */}
      <div className="bg-white border border-gray-400 p-6 rounded-4xl w-full max-w-150 shadow-xl flex flex-col gap-5">
        {/* Header (Title + Close Button) */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-extrabold text-gray-900 cursor-default">
            Record Payment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 font-bold text-2xl cursor-pointer"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            recordNewPayment();
          }}
          className="flex flex-col gap-4"
        >
          {/* Invoice Select */}
          <div className="relative">
            <label className="block text-base font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Invoice
            </label>
            <div
              onClick={() => setIsOpen(!IsOpen)}
              className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-gray-400 transition-all"
            >
              {selectedInv ? (
                <div className="flex w-full items-center justify-between gap-2 overflow-hidden">
                  <span className="shrink-0">
                    #INV-{selectedInv.invoice_number}
                  </span>
                  <span className="truncate text-gray-700 font-normal">
                    {selectedInv.client_name}
                  </span>
                  <span className="shrink-0">
                    {compactFormatter.format(selectedInv.totalAmount)}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 font-normal">
                  Select invoice
                </span>
              )}
              <span
                className={`transition-transform ml-10 text-slate-400 ${IsOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </div>

            {IsOpen &&
              (isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/40 backdrop-blur-sm">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-[#2a55ca] rounded-full animate-spin"></div>
                  <div className="flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
                    <p className="text-lg font-bold text-slate-700 tracking-wide animate-pulse">
                      Retrieving Invoices...
                    </p>
                    <p className="text-sm text-slate-400">
                      Please wait while we secure your billing data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-62.5 overflow-y-auto overflow-x-hidden thin-scrollbar">
                  {processedInvoices && processedInvoices.length > 0 ? (
                    processedInvoices
                      .sort((a, b) => {
                        const dateA = new Date(
                          a.createdAt || a.invoice_issue_date,
                        ).getTime();
                        const dateB = new Date(
                          b.createdAt || b.invoice_issue_date,
                        ).getTime();
                        return dateB - dateA;
                      })
                      .map((item) => (
                        <li
                          key={item._id}
                          onClick={() => {
                            setSelectedInv(item);
                            setIsOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-2 border-b border-gray-100 last:border-none overflow-hidden"
                        >
                          <span className="shrink-0 flex-1">
                            #INV-{item.invoice_number}
                          </span>
                          <span className="truncate text-gray-700 font-normal flex-3 text-center">
                            {item.client_name}
                          </span>
                          <span className="shrink-0 flex-1 text-right">
                            {compactFormatter.format(item.totalAmount)}
                          </span>
                        </li>
                      ))
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                      <p className="font-semibold text-gray-600 text-base">
                        No invoices found
                      </p>
                      <p className="text-xs text-gray-500/80">
                        No invoice data found at the moment.
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Ammount and Payment date */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-base font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Amount *
              </label>
              <input
                type="number"
                required
                value={pmntAmunt}
                onChange={(e) => setpmntAmunt(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-3 outline-none focus:border-gray-400 font-semibold text-base transition-all"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-base font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Payment date *
              </label>
              <input
                type="date"
                required
                value={pmntDate}
                onChange={(e) => setpmntDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-3 outline-none focus:border-gray-400 font-semibold text-base transition-all "
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-base font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Payment method *
            </label>
            <div className="relative">
              <select
                required
                value={pmntMthd}
                onChange={(e) => setpmntMthd(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-3 outline-none focus:border-gray-900 font-semibold text-sm transition-all appearance-none"
              >
                <option value="" disabled hidden>
                  Select payment method
                </option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="BKash">BKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/*  Warning Box  */}
          <div className="p-3.5 bg-orange-100/70 border border-orange-300/60 rounded-xl">
            <p className="text-sm font-bold text-orange-400 leading-relaxed cursor-default text-center">
              ⚠ Ammount less than the amount due, will be recorded as Partial
            </p>
          </div>

          {/* Record Payment Button */}
          <button
            type="submit"
            className="px-5 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-base rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            Record Payment
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordPayment;
