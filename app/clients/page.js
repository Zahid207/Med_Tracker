"use client";
import React, { useState, useEffect } from "react";
import AddClient from "@/components/modals/AddClient";
import Invoice from "@/components/modals/Invoice";
import SigninFirst from "@/components/states/SigninFirst";
import { ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";

export default function ClientList() {
  // For add client pop up
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  // For action button pop up
  const [isOpenAct, setIsOpenAct] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  // For new invoice pop up
  const [IsOpenInv, setIsOpenInv] = useState(false);

  // ------------------- State for fulter button and search bar toggle -------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [typingQuery, setTypingQuery] = useState("");
  const triggerSearch = () => {
    setSearchQuery(typingQuery);
  };

  // ---------- collecting all the data from the database ----------
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [clients, setclients] = useState([]);
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
      });
    fetch(`/api/client?userId=${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setclients(data);
      })
      .catch((err) => {
        console.error("The actual error is:", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  const filteredClients = clients
    .map((client) => {
      const clientInvoices = items.filter(
        (clnt) =>
          clnt.client_email?.toLowerCase() ===
          client.client_email?.toLowerCase(),
      );

      const invoiceCount = clientInvoices.length;

      const TotalPaid = clientInvoices.reduce(
        (sum, clnt) => sum + (Number(clnt.invoice_paymented_ammount) || 0),
        0,
      );

      const totalDue = clientInvoices.reduce((totalSum, invoice) => {
        const invoiceItemsSum = (invoice.invoice_items || []).reduce(
          (itemSum, item) =>
            itemSum + (Number(item.units) || 0) * (Number(item.price) || 0),
          0,
        );
        return totalSum + invoiceItemsSum;
      }, 0);

      const totalOutstanding = Math.max(0, totalDue - TotalPaid);

      return {
        ...client,
        invoiceCount,
        TotalPaid,
        totalOutstanding,
        clientInvoices,
      };
    })
    .filter((client) => {
      // const filterKey = isPreviewFilterd.toLowerCase();
      // const itemStatus = item.dueAmount <= 0 ? "paid" : "partial";
      // const matchesStatus = filterKey === "all" || itemStatus === filterKey;

      const searchKey = searchQuery.toLowerCase().trim();

      const clientName = (client.client_name || "").toLowerCase();
      const invoiceId = (client.client_email || "").toLowerCase();

      const matchesSearch =
        searchKey === "" ||
        clientName.includes(searchKey) ||
        invoiceId.includes(searchKey);

      // return matchesStatus && matchesSearch;
      return matchesSearch;
    });

  // ---------- Number formatter ----------
  const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
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
      <div className="flex flex-col h-full min-h-0 bg-[#f8fafc] cursor-default">
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
        {/*   Controls — (Search bar and Add client button)   */}
        <div className="flex items-center justify-between w-full pb-6 max-[780px]:pt-4">
          {/* Search Bar */}
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight cursor-default max-[780px]:ml-16 max-[780px]:mb-3">
            Clients
          </h1>

          {/* + Add Client Button */}
          <button
            onClick={() => setIsOpenAdd(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white hover:bg-blue-600 rounded-2xl font-bold text-base shadow-md  active:scale-[0.98] transition-all"
          >
            <span>
              <img src="/add.png" alt="" />
            </span>
            Add Client
          </button>
        </div>

        {/*   Client list — table  */}
        <div className="flex-1 w-full bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex flex-col min-h-0 max-[782px]:mb-2 ">
          {/* tbale hedding */}
          <div className="flex items-center justify-between mb-6 pt-6 px-7">
            <h3 className="text-gray-900 font-black text-2xl flex items-center">
              All Client Records
            </h3>
            <div className="relative w-80 flex gap-2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={typingQuery}
                onChange={(e) => setTypingQuery(e.target.value)}
                className="w-full px-5 py-3 bg-white border truncate border-gray-200 rounded-2xl shadow-sm outline-none focus:border-gray-400 text-base font-medium transition-all text-gray-700"
              />
              <button
                onClick={triggerSearch}
                className="bg-white w-16 flex shrink-0 items-center justify-center border border-gray-200 rounded-xl shadow-sm outline-none cursor-pointer active:scale-95"
              >
                <img src="/search.png" alt="search icon" />
              </button>
            </div>
          </div>
          {/* table container */}
          <div className="flex-1 w-full min-h-0 flex flex-col overflow-auto thin-scrollbar mb-5">
            <table className="w-full text-left table-fixed min-w-240.5 ">
              {/* Table Head  */}
              <thead>
                <tr className="text-gray-500 bg-gray-200/70 text-sm font-bold uppercase tracking-wider border-b border-gray-100">
                  <th className="p-2 pl-6 w-[28%]">Name</th>
                  <th className="p-2  w-[25%]">Email</th>
                  <th className="p-2 pl-3 w-[15%]">Phone</th>
                  <th className="p-2 pl-1 text-center w-[12%] ">
                    Total Invoices
                  </th>
                  <th className="p-2 pl-0 text-center w-[12%]">Total Paid</th>
                  <th className="p-2 w-[10%] text-center">Status</th>
                  <th className="p-2 w-[10%] text-center">Actions</th>
                </tr>
              </thead>
            </table>
            {/* Table Body */}
            <div className="flex-1 overflow-auto thin-scrollbar pr-2 min-h-0 min-w-240.5 ">
              <table className="w-full table-fixed">
                <tbody className="divide-y divide-gray-100 text-gray-700 text-base font-medium">
                  {isLoading ? (
                    /* Renders skeleton loaders matching the exact column widths to prevent layout shift */
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#2a55ca] rounded-full animate-spin"></div>
                          <div className="flex flex-col gap-1">
                            <p className="text-lg font-bold text-slate-700 tracking-wide animate-pulse">
                              Retrieving Clients...
                            </p>
                            <p className="text-sm text-slate-400">
                              Please wait while we secure your client datas.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : !clients || clients.length === 0 ? (
                    /* Renders a clean placeholder view when no database records exist */
                    <tr>
                      <td
                        colSpan={7}
                        className="p-12 text-center text-gray-400 font-semibold text-base"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-xl font-bold text-gray-700">
                            No Clients Available
                          </p>
                          <p className="text-sm text-gray-400 max-w-sm">
                            There are currently no clients recorded in the
                            system. New clints will appear here once generated.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClients && filteredClients.length > 0 ? (
                    [...filteredClients]
                      .sort((a, b) => {
                        const dateA = new Date(
                          a.createdAt || a.issueDate,
                        ).getTime();
                        const dateB = new Date(
                          b.createdAt || b.issueDate,
                        ).getTime();

                        return dateB - dateA;
                      })
                      .map((client) => {
                        const isActive =
                          client.client_status?.toLowerCase() === "active";

                        const invoiceCount = items.filter(
                          (clnt) =>
                            clnt.client_email?.toLowerCase() ===
                            client.client_email?.toLowerCase(),
                        ).length;

                        const TotalPaid = items
                          .filter(
                            (clnt) =>
                              clnt.client_email?.toLowerCase() ===
                              client.client_email?.toLowerCase(),
                          )
                          .reduce(
                            (sum, clnt) =>
                              sum +
                              (Number(clnt.invoice_paymented_ammount) || 0),
                            0,
                          );

                        return (
                          <tr
                            key={client._id}
                            className="hover:bg-gray-50/80 transition-colors border-b border-gray-50"
                          >
                            {/* Client Name & Profile Avatar Column */}
                            <td className="p-4 pl-6 w-[28%]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden shrink-0">
                                  <img
                                    src={
                                      typeof client.client_photo === "string" &&
                                      client.client_photo.trim() !== ""
                                        ? client.client_photo
                                        : "/anonymous-client.png"
                                    }
                                    alt={`${client.client_name || "Client"}'s avatar`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback resource handler for broken URLs or network errors
                                      e.target.src = "/anonymous-client.png";
                                    }}
                                  />
                                </div>
                                <span
                                  className="font-bold text-gray-900 text-base truncate max-w-45"
                                  title={client.client_name}
                                >
                                  {client.client_name || "Unknown Client"}
                                </span>
                              </div>
                            </td>

                            {/* Account Email Column */}
                            <td
                              className="p-4 text-gray-500 font-semibold w-[25%] truncate"
                              title={client.client_email}
                            >
                              {client.client_email || "N/A"}
                            </td>

                            {/* Contact Phone Column */}
                            <td className="p-4 text-gray-500 font-semibold w-[15%]">
                              {client.client_phone?.trim()
                                ? client.client_phone
                                : "—"}
                            </td>

                            {/* Compiled Invoice Metric Column */}
                            <td className="p-4 text-center text-gray-900 font-bold w-[12%]">
                              {client.invoiceCount}
                            </td>

                            {/* Total Paid Column */}
                            <td className="p-4 text-center font-black text-gray-900 w-[12%]">
                              ${compactFormatter.format(client.TotalPaid || 0)}
                            </td>

                            {/* Account Lifecycle Status Badge Column */}
                            <td className="p-4 pl-7 text-center w-[10%]">
                              <span
                                className={`px-3 py-1 rounded-lg text-xs block w-20 font-bold uppercase ${
                                  isActive
                                    ? "bg-green-100 text-green-600"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {client.client_status || "Inactive"}
                              </span>
                            </td>

                            {/* Table Item Context Actions Trigger */}
                            <td
                              onClick={() => {
                                setIsOpenAct(true);
                                setSelectedClient(client);
                              }}
                              className="p-4 text-center text-gray-400 font-black hover:text-gray-900 text-xl cursor-pointer w-[10%]"
                            >
                              ⋮
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-gray-500 font-medium bg-white rounded-b-2xl"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <img src="/no search.png" alt="no search icon" />
                          <p className="text-base text-gray-600">
                            No clients found matching your search.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3 dot action pop up */}
        {isOpenAct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in flex flex-col w-full h-screen px-70 py-50 max-[1151px]:px-40 max-[1152px]:py-20 max-[771px]:px-20 max-[771px]:py-10 max-[577px]:px-2 max-[577px]:py-2 items-center justify-center cursor-default text-gray-700 ">
            {/* Uper part */}
            <div className="grid grid-cols-1 min-[1273px]:grid-cols-3 gap-y-6 min-[1273px]:gap-x-6 w-full mb-6 max-w-362.5 relative">
              {/* close button */}
              <button
                onClick={() => setIsOpenAct(false)}
                className="absolute top-[-30] right-[-20] max-[577px]:top-[16] max-[577px]:right-[20] hover:scale-105 active:scale-95 transition-all duration-200 ease-in-out text-2xl font-extrabold cursor-pointer min-[577px]:text-white"
              >
                ✕
              </button>
              {/*  Client Info  */}
              <div className="w-full bg-white border border-gray-100 rounded-4xl shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-purple-100 overflow-hidden shrink-0">
                      <img
                        src={
                          selectedClient.client_photo || "/anonymous-client.png"
                        }
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/anonymous-client.png";
                        }}
                      />
                    </div>
                    {/* Name & Title */}
                    <div>
                      <h2 className="text-xl font-black text-gray-900 leading-tight">
                        {selectedClient.client_name || "Unknown Client"}
                      </h2>

                      <p
                        className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                          selectedClient.client_status?.toLowerCase() ===
                          "active"
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {selectedClient.client_status || "Inactive"} Client
                      </p>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="flex flex-col gap-2 mt-4 border-t border-gray-50 pt-4">
                    <div className="text-base">
                      <span className="text-gray-400 font-bold">Email : </span>
                      <span className="font-semibold text-gray-900">
                        {selectedClient.client_email || "N/A"}
                      </span>
                    </div>
                    <div className="text-base">
                      <span className="text-gray-400 font-bold">Phone : </span>
                      <span className="font-semibold text-gray-900">
                        {selectedClient.client_phone || "—"}
                      </span>
                    </div>
                    <div className="text-base leading-relaxed">
                      <span className="text-gray-400 font-bold">Address :</span>
                      <span className="font-semibold text-gray-900">
                        {selectedClient.client_address || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit and delete Button */}
                <div className="gap-3 flex">
                  <button className="w-[50%] mt-6 py-3 bg-gray-300 text-black hover:bg-[#3d78fc] font-bold text-base rounded-xl active:scale-[0.99] transition-all border border-gray-200/60 cursor-pointer ">
                    Edit Profile
                  </button>
                  <button className="w-[50%] mt-6 py-3 bg-gray-300 text-black hover:bg-red-400 font-bold text-base rounded-xl active:scale-[0.99] transition-all border border-gray-200/60 cursor-pointer">Delete Profile</button>
                </div>
              </div>

              {/*  Summary Cards  */}
              <div className="grid grid-cols-3 col-span-2 gap-6 max-[487px]:gap-2">
                {/* Total Invoices */}
                <div className="bg-white border border-gray-100 rounded-4xl shadow-sm max-[450px]:p-2 p-6 flex flex-col justify-between ">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-400 max-[487px]:scale-90">
                    Total Invoices
                  </span>
                  <div className="mt-4 min-w-0 max-[487px]:scale-90  flex flex-col justify-end min-h-16">
                    <span className=" text-3xl block font-black text-gray-900 truncate">
                      {selectedClient.invoiceCount}
                    </span>
                  </div>
                </div>

                {/* Total Paid */}
                <div className="bg-white border border-gray-100 rounded-4xl shadow-sm max-[450px]:p-2 p-6 flex flex-col justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-400 max-[487px]:scale-90">
                    Total Paid
                  </span>
                  <div className="mt-4 max-[487px]:scale-90 flex flex-col justify-end min-h-16">
                    <span className=" text-3xl block font-black text-gray-900 truncate">
                      ${compactFormatter.format(selectedClient.TotalPaid)}
                    </span>
                  </div>
                </div>

                {/* Total Outstanding */}
                <div className="bg-white border border-gray-100 rounded-4xl shadow-sm max-[450px]:p-2 p-6 flex flex-col justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-400 max-[487px]:scale-90">
                    Total Outstanding
                  </span>
                  <div className="mt-4 min-w-0 max-[487px]:scale-90  flex flex-col justify-end min-h-16">
                    <span className=" text-3xl block font-black text-red-500 truncate">
                      $
                      {compactFormatter.format(selectedClient.totalOutstanding)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* lower part */}
            <div className="flex-1 w-full bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-6 flex flex-col min-h-75 max-w-362.5 max-h-175">
              {/* Tbale header and action section */}
              <div className="flex items-center justify-between mb-4 pb-2">
                <h3 className="text-gray-900 font-black text-xl">
                  Invoices for this client
                </h3>

                {/* + New Invoice Button */}
                <button
                  onClick={() => {
                    setIsOpenInv(true);
                    setIsOpenAct(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>
                    <img className="h-5 w-5" src="/add.png" alt="add icon" />
                  </span>
                  New Invoice
                </button>
              </div>

              {/* main table container*/}
              <div className="flex-1 w-full flex flex-col min-h-0 overflow-auto thin-scrollbar">
                {/* table heasder */}
                <table className="w-full text-left table-fixed min-w-175">
                  <thead>
                    <tr className="bg-gray-200 text-gray-500 text-sm font-bold uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 w-[25%]">Invoice ID</th>
                      <th className="p-4 w-[25%] text-center">Payment Date</th>
                      <th className="p-4 w-[25%] text-center">Outstanding</th>
                      <th className="p-4 w-[25%] text-center">Status</th>
                    </tr>
                  </thead>
                </table>

                {/* table body */}
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden min-h-0 pr-1 thin-scrollbar min-w-175">
                  <table className="w-full text-left table-fixed min-w-175">
                    <tbody className="divide-y divide-gray-50 text-gray-700 text-base font-medium">
                      {selectedClient.clientInvoices.map((inv) => {
                        const invAmount = (inv.invoice_items || []).reduce(
                          (sum, item) =>
                            sum +
                            (Number(item.units) || 0) *
                              (Number(item.price) || 0),
                          0,
                        );
                        const isPaid =
                          (inv.status || "").toLowerCase() === "paid";

                        return (
                          <tr
                            key={inv._id}
                            className="hover:bg-gray-200/65 transition-colors"
                          >
                            <td className="p-4 pl-6 font-bold text-gray-900 w-[25%]">
                              #INV-{inv.invoice_number || "000"}
                            </td>

                            <td className="p-4 text-gray-500 font-semibold w-[25%]">
                              <span className=" w-full flex justify-center">
                                {inv.invoice_payment_date || "-"}
                              </span>
                            </td>

                            <td className="p-4 font-black text-gray-900 w-[25%]">
                              <span className=" w-full flex justify-center">
                                ${compactFormatter.format(invAmount || 0)}
                              </span>
                            </td>

                            <td className="p-4 w-[25%]">
                              <span className="w-full flex justify-center">
                                <span
                                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${isPaid ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}
                                >
                                  {inv.status || "Unpaid"}
                                </span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Add client pop up */}
        <AddClient isOpen={isOpenAdd} onClose={() => setIsOpenAdd(false)} />
        {/*  New invoice pop up */}
        <Invoice
          isOpen={IsOpenInv}
          onClose={() => {
            setIsOpenInv(false);
            setIsOpenAct(false);
          }}
        />
      </div>
    );
  }
}
