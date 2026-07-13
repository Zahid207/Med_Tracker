"use client";
import React, { useState, useEffect, useRef } from "react";
import { useUploadThing } from "@/utils/uploadthing";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export default function Invoice({ isOpen, onClose, mode = "create", invoice }) {
  const { startUpload, isUploading } = useUploadThing("imageUploader");

  const isResettingRef = useRef(false);

  // ------------------------- function to add/update invoice in database ---------------------------
  const saveInvoiceToDB = async (
    CloudLogo,
    CloudSignature,
    CloudClientPhoto,
  ) => {
    // uploadaing the newly created client into the database before pushing the invoice
    if (selectedClientId === "none") {
      try {
        const clientHeaders = new Headers();
        clientHeaders.append("Content-Type", "application/json");

        const clientRaw = JSON.stringify({
          user_id: userId,
          client_name: ClientNm,
          client_email: ClientEml,
          client_phone: ClientPhn,
          client_address: ClientAdrs,
          client_status: ClientStatus,
          client_photo: CloudClientPhoto,
        });

        const clientRes = await fetch("/api/client", {
          method: "POST",
          headers: clientHeaders,
          body: clientRaw,
        });

        if (clientRes.ok) {
          toast.success("New client added successfully!");
        } else {
          toast.error("Failed to add new client to database.");
        }
      } catch (clientErr) {
        console.error("Failed to sync new client:", clientErr.message);
      }
    }

    const isEditMode = mode === "edit";
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      ...(isEditMode && { _id: currentInvoice?._id }),
      user_id: userId,
      user_name: YrNm,
      user_address: YrAdrs,
      user_email: YrEml,
      user_phone: YrPhn,
      user_logo: CloudLogo || YrLogo,
      client_name: ClientNm,
      client_email: ClientEml,
      client_phone: ClientPhn,
      client_address: ClientAdrs,
      client_photo: CloudClientPhoto || ClientPhoto,
      client_status: ClientStatus,
      invoice_number: InvNmbr,
      invoice_issue_date: InvIssuDate,
      invoice_due_date: InvDeuDate,
      invoice_payment_date: currentInvoice?.invoice_payment_date || "",
      invoice_paymented_ammount: currentInvoice?.invoice_paymented_ammount || 0,
      invoice_payment_methode: currentInvoice?.invoice_payment_methode || "",
      status: currentInvoice?.status || "unpaid",
      invoice_project_name: InvPrjtNm,
      invoice_items: Invitems,
      payment: pmntDtls,
      user_note: note,
      user_signature: CloudSignature || "",
    });

    const requestOptions = {
      method: isEditMode ? "PUT" : "POST", // Use PUT for edit, POST for create
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const saveInvoicePromise = new Promise(async (resolve, reject) => {
      try {
        const r = await fetch("/api/invoice", requestOptions);
        const result = await r.json();

        if (result.success) {
          resolve(result);

          isResettingRef.current = true;

          handleResetAll();
          fetchDatas();
          onClose();
        } else {
          reject(result);
        }
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(saveInvoicePromise, {
      pending: isEditMode ? "Updating invoice..." : "Saving invoice...",
      success: isEditMode
        ? "Invoice updated successfully "
        : "Invoice saved successfully ",
      error: {
        render({ data }) {
          return (
            data?.message ||
            (isEditMode
              ? "Failed to update invoice !"
              : "Failed to save invoice !")
          );
        },
      },
    });
  };

  // ----------------------------- Accordion active section state -----------------------------
  const [activeSection, setActiveSection] = useState("myDetails");
  const toggleSection = (sectionName) => {
    setActiveSection(activeSection === sectionName ? "" : sectionName);
  };

  // -------------------------- Interactive dynamic modes and userId --------------------------
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [clientMode, setClientMode] = useState("dropdown");
  const [selectedClientId, setSelectedClientId] = useState("none");
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // ------------------------ Handle ultimate form submission handler ------------------------
  const handleSubmitInvoiceForm = async (e) => {
    e.preventDefault();
    if (!YrNm || !YrNm.trim()) {
      toast.warn("Your Name is required! Please fill it in !");
      return;
    }
    if (!YrEml || !YrEml.trim()) {
      toast.warn("Your Email can be left blank. Please enter your email !");
      return;
    }
    // new client validation
    if (selectedClientId === "none") {
      const isExisting = clients.some(
        (c) => c.client_email?.toLowerCase() === ClientEml.trim().toLowerCase(),
      );

      if (isExisting) {
        const existingClient = clients.find(
          (c) =>
            c.client_email?.toLowerCase() === ClientEml.trim().toLowerCase(),
        );
        toast.error(
          `There is an existing client with the same Email named: ${existingClient?.client_name || "Unknown"}.\nChose him from the dropdown list.`,
          {
            unstyled: true,
            className: "whitespace-pre-line ",
          },
        );
        return;
      }
    }
    if (!ClientNm || !ClientNm.trim()) {
      toast.warn(
        "Client Name cannot be left blank! Please enter the customer name !",
      );
      return;
    }
    if (!ClientEml || !ClientEml.trim()) {
      toast.warn(
        "Client Email cannot be left blank! Please enter the customer name !",
      );
      return;
    }
    if (!ClientStatus || !ClientStatus.trim()) {
      toast.warn(
        "Client Status cannot be left blank! Please enter the customer name !",
      );
      return;
    }
    if (!InvDeuDate) {
      toast.warn("Selecting Invoice Due Date is mandatory !");
      return;
    }
    if (!InvPrjtNm || !InvPrjtNm.trim()) {
      toast.warn("It is mandatory to provide a Project Name !");
      return;
    }
    const isAnyDescriptionEmpty = Invitems.some(
      (item) => !item.description || !item.description.trim(),
    );
    if (isAnyDescriptionEmpty) {
      toast.warn(
        "The description of any item within the items list cannot be left blank !",
      );
      return;
    }
    const isAnyBankFieldFilled =
      (pmntDtls.bankName && pmntDtls.bankName.trim()) ||
      (pmntDtls.accountName && pmntDtls.accountName.trim()) ||
      (pmntDtls.accountNumber && pmntDtls.accountNumber.trim()) ||
      (pmntDtls.routingNumber && pmntDtls.routingNumber.trim());
    if (isAnyBankFieldFilled) {
      if (!pmntDtls.bankName || !pmntDtls.bankName.trim()) {
        toast.warn("Forgot to provide bank name !");
        return;
      }
      if (!pmntDtls.accountName || !pmntDtls.accountName.trim()) {
        toast.warn("Forgot to provide account name !");
        return;
      }
      if (!pmntDtls.accountNumber || !pmntDtls.accountNumber.trim()) {
        toast.warn("Forgot to provide account number !");
        return;
      }
      if (!pmntDtls.routingNumber || !pmntDtls.routingNumber.trim()) {
        toast.warn("Forgot to provide routing number / SWIFT code !");
        return;
      }
    }

    handleClose(); // Close modal on successful submit

    const uploadFileIfNeeded = async (file, pendingMessage, errorMessage) => {
      if (typeof file === "string") return file;
      if (file && typeof file === "object") {
        toast.info(pendingMessage);
        const res = await startUpload([file]);

        if (res && res[0]) {
          return res[0].ufsUrl || res[0].url;
        }

        toast.error(errorMessage);
      }
      return file;
    };

    let currentLogo = await uploadFileIfNeeded(
      YrLogo,
      "Uploading logo to the cloud... ",
      "Logo upload failed! But trying to save the invoice.",
    );
    setYrLogo(currentLogo);

    let currentSignature = await uploadFileIfNeeded(
      Signature,
      "Uploading signature to the cloud... ",
      "Signature upload failed! But trying to save the invoice.",
    );
    setSignature(currentSignature);

    let currentClientPhoto = await uploadFileIfNeeded(
      ClientPhoto,
      "Uploading client logo to the cloud... ",
      "Client logo upload failed! But trying to save the invoice.",
    );
    setClientPhoto(currentClientPhoto);

    await saveInvoiceToDB(currentLogo, currentSignature, currentClientPhoto);
  };

  // ------------------------------- State for Invoices & Clients -------------------------------
  const [items, setItems] = useState([]);
  const [clients, setclients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDatas = async () => {
    if (!userId) return;
    setIsLoading(true);

    Promise.all([
      fetch(`/api/invoice?userId=${userId}`).then((res) => {
        if (!res.ok) throw new Error(`Invoice server error: ${res.status}`);
        return res.json();
      }),
      fetch(`/api/client?userId=${userId}`).then((res) => {
        if (!res.ok) throw new Error(`Client server error: ${res.status}`);
        return res.json();
      }),
    ])
      .then(([invoiceData, clientData]) => {
        setItems(invoiceData);
        setclients(clientData);
      })
      .catch((err) => {
        console.error("The actual error is:", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDatas();
  }, [userId]);

  // invoice number for the latest invoice
  const CurrentInvoiceNumber = String(items.length + 1).padStart(3, "0");

  // ----------------- Find current invoice data based on the 'invoice' prop -----------------
  const targetInvoiceId = typeof invoice === "string" ? invoice : invoice?._id;
  const currentInvoice = items.find((inv) => inv._id === targetInvoiceId);

  // -------------------------------------- convert date --------------------------------------
  const formatDateText = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // -------------------------- states for all those inputs value -----------------------------
  const [YrNm, setYrNm] = useState("");
  const [YrEml, setYrEml] = useState("");
  const [YrAdrs, setYrAdrs] = useState("");
  const [YrPhn, setYrPhn] = useState("");
  const [YrLogo, setYrLogo] = useState("");
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setYrLogo(file);
  };
  const [ClientNm, setClientNm] = useState("");
  const [ClientAdrs, setClientAdrs] = useState("");
  const [ClientEml, setClientEml] = useState("");
  const [ClientPhn, setClientPhn] = useState("");
  const [ClientPhoto, setClientPhoto] = useState("");
  const handleClientPhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setClientPhoto(file);
  };
  const [ClientStatus, setClientStatus] = useState("");
  const [InvNmbr, setInvNmbr] = useState("000");

  // Auto set invoice number ONLY in create mode
  useEffect(() => {
    if (mode === "create") {
      setInvNmbr(CurrentInvoiceNumber);
    }
  }, [items, mode]);

  const [InvIssuDate, setInvIssuDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [InvDeuDate, setInvDeuDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [InvPrjtNm, setInvPrjtNm] = useState("");
  const [Invitems, setInvItems] = useState([
    { description: "", units: 1, price: 0 },
  ]);

  const handleAddItemRow = () =>
    setInvItems([...Invitems, { description: "", units: 1, price: 0 }]);
  const handleRemoveItemRow = (indexToRemove) => {
    if (Invitems.length <= 1) return;
    setInvItems(Invitems.filter((_, index) => index !== indexToRemove));
  };
  const handleItemChange = (index, field, value) => {
    setInvItems(
      Invitems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const [pmntDtls, setPmntDtls] = useState({
    bkashNumber: "",
    nagadNumber: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",
  });
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPmntDtls((prev) => ({ ...prev, [name]: value }));
  };

  const [note, setnote] = useState("");

  const [Signature, setSignature] = useState(null);
  const handleSignatureFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSignature(file);
  };

  // ----------------------- Effect to populate data in 'edit' or 'show' mode -----------------------
  useEffect(() => {
    if (!isOpen) return;

    if ((mode === "edit" || mode === "show") && currentInvoice) {
      setYrNm(currentInvoice.user_name || "");
      setYrEml(currentInvoice.user_email || "");
      setYrAdrs(currentInvoice.user_address || "");
      setYrPhn(currentInvoice.user_phone || "");
      setYrLogo(currentInvoice.user_logo || "");
      setClientNm(currentInvoice.client_name || "");
      setClientEml(currentInvoice.client_email || "");
      setClientPhn(currentInvoice.client_phone || "");
      setClientAdrs(currentInvoice.client_address || "");
      setClientPhoto(currentInvoice.client_photo || "");
      setClientStatus(currentInvoice.client_status || "");
      setInvNmbr(currentInvoice.invoice_number || "");
      setInvIssuDate(
        currentInvoice.invoice_issue_date
          ? new Date(currentInvoice.invoice_issue_date)
              .toISOString()
              .split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setInvDeuDate(
        currentInvoice.invoice_due_date
          ? new Date(currentInvoice.invoice_due_date)
              .toISOString()
              .split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setInvPrjtNm(currentInvoice.invoice_project_name || "");
      setInvItems(
        currentInvoice.invoice_items?.length
          ? currentInvoice.invoice_items
          : [{ description: "", units: 1, price: 0 }],
      );
      setPmntDtls(
        currentInvoice.payment || {
          bkashNumber: "",
          nagadNumber: "",
          bankName: "",
          accountName: "",
          accountNumber: "",
          routingNumber: "",
        },
      );
      setnote(currentInvoice.user_note || "");
      setSignature(currentInvoice.user_signature || null);
    }
  }, [mode, currentInvoice, isOpen]);

  useEffect(() => {
    if (isOpen) {
      isResettingRef.current = false;
    }
  }, [isOpen, mode, invoice]);

  // --------------------------------- reset all of them --------------------------------------
  const handleResetAll = () => {
    setActiveSection("myDetails");
    setClientMode("dropdown");
    setPaymentMethod("bkash");
    setSelectedClientId("none");
    setYrNm("");
    setYrEml("");
    setYrAdrs("");
    setYrPhn("");
    setYrLogo("");
    setClientNm("");
    setClientAdrs("");
    setClientEml("");
    setClientPhn("");
    setClientPhoto("");
    setClientStatus("");
    setInvNmbr("000");
    setInvIssuDate(new Date().toISOString().split("T")[0]);
    setInvDeuDate(new Date().toISOString().split("T")[0]);
    setInvPrjtNm("");
    setInvItems([{ description: "", units: 1, price: 0 }]);
    setPmntDtls({
      bkashNumber: "",
      nagadNumber: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      routingNumber: "",
    });
    setnote("");
    setSignature(null);
  };

  // ---------------------------- State to download pdf ----------------------------
  const invoiceRef = useRef(null);

  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const data = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(data, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("invoice.pdf");
  };

  // --------------------------- Handle Close with reset logic ---------------------------
  const handleClose = () => {
    if (mode === "show" || mode === "edit") {
      handleResetAll();
    }
    onClose();
  };

  // --------------------------------- State for Preview Toggle ---------------------------------
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="min-[1000px]:w-[90vw] min-[1000px]:h-[90vh] w-[98vw] h-[98vh] max-w-427.5 max-h-305 flex flex-col">
        {/* ===== TOP BAR SECTION ===== */}
        <div className="bg-white border border-slate-200/60 rounded-2xl max-[660px]:p-2 px-6 py-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 max-[600px]:gap-2 mr-2">
            <button
              onClick={handleClose}
              className="flex items-center shrink-0 justify-center max-[660px]:p-1 p-2.5 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              <img
                src="arrow left.png"
                className="max-[660px]:scale-75"
                alt="back"
              />
            </button>
            <h1 className="max-[660px]:text-2xl text-[1.68rem] font-black text-slate-900 tracking-tight cursor-default">
              {mode === "edit"
                ? "Edit Invoice"
                : mode === "show"
                  ? "View Invoice"
                  : "Create New Invoice"}
            </h1>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`min-[1000px]:hidden max-[485px]:w-full max-[485px]:justify-center px-4 py-2.5 text-base font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                isPreviewMode
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-700"
              } ${mode === "show" ? "hidden" : ""}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isPreviewMode ? "bg-blue-500 animate-pulse" : "bg-slate-400"}`}
              ></span>
              Preview
            </button>

            <button
              onClick={handleDownloadPdf}
              className={`px-8 py-3 max-[660px]:p-3 max-[485px]:flex-1 text-base font-bold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 hover:text-slate-900 active:scale-95 transition-all flex justify-center items-center gap-1.5 cursor-pointer ${mode !== "create" ? "" : "hidden"}`}
            >
              PDF
            </button>
          </div>
        </div>

        {/* ===== MAIN LAYOUT (Left Form, Right Preview) ===== */}
        <div className="flex-1 h-full min-h-0 flex gap-6 justify-center">
          {/* -----------------------------------------------------------------
              LEFT COLUMN — FORM (Hidden in 'show' mode)
              ----------------------------------------------------------------- */}
          <form
            onSubmit={handleSubmitInvoiceForm}
            className={`min-[1000px]:w-[40%] w-full bg-white border border-slate-200/60 rounded-4xl p-6 flex flex-col gap-4 shadow-sm text-xs text-slate-800 font-sans overflow-y-auto thin-scrollbar ${
              mode === "show"
                ? "hidden"
                : `${isPreviewMode ? "max-[1000px]:hidden" : ""}`
            }`}
          >
            <div className="border-b border-slate-300 pb-3 mb-1 cursor-default">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Invoice Generator Form
              </h2>
            </div>

            {/* SECTION 1: My Details */}
            <div className="border border-slate-100 rounded-xl flex flex-col min-h-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("myDetails")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer"
              >
                <div className="flex flex-col items-start text-left cursor-default">
                  <span className="text-xl font-black">My Details</span>
                </div>
                <span className="text-slate-700">
                  {activeSection === "myDetails" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "myDetails" && (
                <div className="p-4 bg-white flex-1 min-h-0 overflow-y-auto thin-scrollbar flex flex-col gap-4 border-t border-slate-50 animate-fade-in text-base">
                  {[
                    {
                      label: "YOUR NAME (Required)",
                      type: "text",
                      placeholder: "Enter your name",
                      value: YrNm,
                      onChange: (e) => setYrNm(e.target.value),
                      required: true,
                    },
                    {
                      label: "Address",
                      type: "text",
                      placeholder: "Enter your location",
                      value: YrAdrs,
                      onChange: (e) => setYrAdrs(e.target.value),
                    },
                    {
                      label: "EMAIL (Required)",
                      type: "email",
                      placeholder: "your.email@example.com",
                      value: YrEml,
                      onChange: (e) => setYrEml(e.target.value),
                      required: true,
                    },
                    {
                      label: "Phone",
                      type: "tel",
                      placeholder: "Contact number",
                      value: YrPhn,
                      onChange: (e) => setYrPhn(e.target.value),
                    },
                    {
                      label:
                        "Logo upload (Try to use 1:1 ratio) (No upload > 4MB)",
                      type: "file",
                      isLogo: true,
                    },
                  ].map((field, index) => (
                    <div
                      key={index}
                      className={`flex flex-col gap-1 ${field.isLogo ? "col-span-1 sm:col-span-2" : ""}`}
                    >
                      {field.isLogo ? (
                        <div className="flex justify-between items-center">
                          <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider cursor-default">
                            {field.label}
                          </label>
                          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold uppercase cursor-default">
                            Optional
                          </span>
                        </div>
                      ) : (
                        <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                          {field.label}
                        </label>
                      )}
                      <input
                        type={field.type}
                        required={field.required || false}
                        {...(field.isLogo
                          ? {
                              accept: "image/*",
                              onChange: handleLogoFileChange,
                              className:
                                "w-full bg-slate-50 rounded-xl px-4 py-2 text-slate-500 border border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer",
                            }
                          : {
                              placeholder: field.placeholder,
                              value: field.value || "",
                              onChange: field.onChange,
                              className:
                                "w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all truncate font-medium",
                            })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Client Details */}
            <div className="border border-slate-100 rounded-xl flex flex-col min-h-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("clientDetails")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-xl font-black">Client Details</span>
                </div>
                <span className="text-slate-700">
                  {activeSection === "clientDetails" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "clientDetails" && (
                <div className="p-4 bg-white flex flex-col gap-4 border-t border-slate-50 animate-fade-in text-base flex-1 thin-scrollbar overflow-auto">
                  <div className="flex gap-4 border-b border-slate-100 pb-3">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600">
                      <input
                        type="radio"
                        checked={clientMode === "dropdown"}
                        onChange={() => setClientMode("dropdown")}
                        className="accent-[#151b2b]"
                      />
                      Existing Client Dropdown
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600">
                      <input
                        type="radio"
                        checked={clientMode === "manual"}
                        onChange={() => setClientMode("manual")}
                        className="accent-[#151b2b]"
                      />
                      New Client (Manually)
                    </label>
                  </div>
                  {clientMode === "dropdown" ? (
                    <div className="relative flex flex-col gap-1 animate-fade-in w-full">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        Select Client
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setIsClientDropdownOpen(!isClientDropdownOpen)
                        }
                        className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-semibold text-slate-600 cursor-pointer flex justify-between items-center gap-2"
                      >
                        <span className="truncate">
                          {selectedClientId !== "none" && selectedClientId
                            ? (() => {
                                const c = clients.find(
                                  (c) => c._id === selectedClientId,
                                );
                                return c
                                  ? `${c.client_name}${c.client_email ? ` (${c.client_email})` : ""}`
                                  : "Select from Existing clients";
                              })()
                            : "Select from Existing clients"}
                        </span>
                        <span
                          className={`transition-transform text-slate-400 ${isClientDropdownOpen ? "rotate-180" : ""}`}
                        >
                          ▼
                        </span>
                      </button>
                      {isClientDropdownOpen && (
                        <div className="top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto thin-scrollbar animate-fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId("none");
                              setClientNm("");
                              setClientAdrs("");
                              setClientEml("");
                              setClientPhn("");
                              setClientPhoto("");
                              setClientStatus("");
                              setIsClientDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-500 text-lg font-medium truncate border-b border-slate-200"
                          >
                            Deselect to create a new client.
                          </button>
                          {isLoading ? (
                            <div className="px-4 py-3 text-slate-500 font-medium">
                              Loading existing clients...
                            </div>
                          ) : clients && clients.length > 0 ? (
                            clients
                              .sort(
                                (a, b) =>
                                  new Date(b.createdAt) - new Date(a.createdAt),
                              )
                              .map((client) => (
                                <button
                                  type="button"
                                  key={client._id}
                                  onClick={() => {
                                    setSelectedClientId(client._id);
                                    setClientNm(client.client_name || "");
                                    setClientEml(client.client_email || "");
                                    setClientPhn(client.client_phone || "");
                                    setClientAdrs(client.client_address || "");
                                    setClientPhoto(client.client_photo || "");
                                    setClientStatus(client.client_status || "");
                                    setIsClientDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-100 text-slate-700 font-semibold truncate cursor-pointer ${selectedClientId === client._id ? "bg-blue-50 text-blue-600" : ""}`}
                                >
                                  {client.client_name}
                                  {client.client_email
                                    ? ` (${client.client_email})`
                                    : ""}
                                </button>
                              ))
                          ) : (
                            <div className="px-4 py-3 text-slate-500 font-medium">
                              No clients found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 animate-fade-in">
                      <div className="flex flex-col gap-3">
                        {[
                          {
                            label: "CLIENT NAME (Required)",
                            type: "text",
                            placeholder: "Client full name",
                            value: ClientNm,
                            onChange: (e) => setClientNm(e.target.value),
                            required: true,
                            checkDisabled: true,
                          },
                          {
                            label: "EMAIL (Required)",
                            type: "email",
                            placeholder: "client.email@example.com",
                            value: ClientEml,
                            onChange: (e) => setClientEml(e.target.value),
                            required: true,
                            checkDisabled: true,
                          },
                          {
                            label: "Phone",
                            type: "tel",
                            placeholder: "Clinet number",
                            value: ClientPhn,
                            onChange: (e) => setClientPhn(e.target.value),
                            checkDisabled: true,
                          },
                          {
                            label: "Address",
                            type: "text",
                            placeholder: "Client billing address",
                            value: ClientAdrs,
                            onChange: (e) => setClientAdrs(e.target.value),
                            checkDisabled: true,
                          },
                          {
                            label: "Client Status (Required)",
                            type: "select",
                            isSelect: true,
                            checkDisabled: true,
                          },
                          {
                            label: "Client Photo (No upload > 4MB)",
                            type: "file",
                            isPhoto: true,
                            checkDisabled: true,
                          },
                        ].map((field, index) => {
                          const isDisabled = field.checkDisabled
                            ? selectedClientId !== "none"
                            : false;
                          return (
                            <div
                              key={index}
                              className={`flex flex-col gap-1 ${field.isSelect ? "animate-fade-in [@media(max-height:736px)]:min-h-86" : ""}`}
                            >
                              {field.isPhoto ? (
                                <div className="flex justify-between items-center">
                                  <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider cursor-default">
                                    {field.label}
                                  </label>
                                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold uppercase cursor-default">
                                    Optional
                                  </span>
                                </div>
                              ) : (
                                <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                                  {field.label}
                                </label>
                              )}
                              {field.isSelect ? (
                                <select
                                  value={ClientStatus}
                                  onChange={(e) =>
                                    setClientStatus(e.target.value)
                                  }
                                  disabled={isDisabled}
                                  className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-semibold text-slate-600 cursor-pointer"
                                >
                                  <option value="" disabled hidden>
                                    Select client status
                                  </option>
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              ) : field.isPhoto ? (
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleClientPhotoFileChange}
                                  disabled={isDisabled}
                                  className="w-full bg-slate-50 rounded-xl px-4 py-2 text-slate-500 border border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer text-base truncate"
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  required={field.required || false}
                                  placeholder={field.placeholder}
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  disabled={isDisabled}
                                  className={`w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 truncate outline-none transition-all font-medium ${field.checkDisabled && selectedClientId !== "none" ? "text-gray-400" : "text-black"}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: Invoice Details */}
            <div className="border border-slate-100 rounded-xl flex flex-col min-h-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("invoiceDetails")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all"
              >
                <span className="text-xl font-black">Invoice Details</span>
                <span className="text-slate-700">
                  {activeSection === "invoiceDetails" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "invoiceDetails" && (
                <div className="p-4 bg-white flex flex-col gap-4 border-t border-slate-50 animate-fade-in text-base flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        Invoice number
                      </label>
                      <input
                        type="text"
                        value={InvNmbr}
                        readOnly
                        className="w-full bg-slate-100 rounded-xl px-4 py-2.5 truncate text-slate-500 font-mono font-bold outline-none border border-transparent"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        Issue date
                      </label>
                      <input
                        type="date"
                        value={InvIssuDate}
                        readOnly
                        className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-slate-500 font-semibold outline-none border truncate border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                      Due date (Required)
                    </label>
                    <input
                      required
                      type="date"
                      value={InvDeuDate}
                      onChange={(e) => setInvDeuDate(e.target.value)}
                      className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-semibold truncate text-slate-700"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[11px] text-slate-400 tracking-wider">
                      PROJECT NAME (Required)
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Web devolopment"
                      value={InvPrjtNm}
                      onChange={(e) => setInvPrjtNm(e.target.value)}
                      className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none truncate transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[11px] text-slate-400 tracking-wider">
                        ITEMS LIST (Required)
                      </label>
                      <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-bold">
                        Total will be automatically calculated
                      </span>
                    </div>
                    {Invitems.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-37 gap-2 items-center mb-1 animate-fade-in"
                      >
                        <input
                          required
                          type="text"
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                          className="col-span-18 bg-slate-50 rounded-lg px-3 py-2 border border-transparent focus:border-slate-200 truncate outline-none font-medium"
                        />
                        <input
                          required
                          type="number"
                          placeholder="Unit"
                          min="1"
                          value={item.units}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "units",
                              Number(e.target.value),
                            )
                          }
                          className="col-span-6 bg-slate-50 rounded-lg truncate px-2 py-2 text-center border border-transparent focus:border-slate-200 outline-none font-semibold"
                        />
                        <input
                          type="number"
                          placeholder="Rate"
                          min="0"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "price",
                              Number(e.target.value),
                            )
                          }
                          className="col-span-12 bg-slate-50 rounded-lg px-3 py-2 text-right border border-transparent focus:border-slate-200 outline-none font-semibold truncate"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="col-span-1 text-slate-400 hover:text-red-500 font-bold text-center text-sm transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="mt-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="text-lg">+</span> Add new item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Payment Details */}
            <div className="border border-slate-100 rounded-xl flex flex-col min-h-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("pmntDtls")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all"
              >
                <span className="text-xl font-black">Payment Details</span>
                <span className="text-slate-700">
                  {activeSection === "pmntDtls" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "pmntDtls" && (
                <div className="p-4 bg-white gap-4 border-t border-slate-50 animate-fade-in flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 text-base">
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold uppercase">
                      Choose One
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bkash")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${paymentMethod === "bkash" ? "bg-[#151b2b] text-white" : "bg-slate-200/90 text-slate-700"}`}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("nagad")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${paymentMethod === "nagad" ? "bg-[#151b2b] text-white" : "bg-slate-200/90 text-slate-700"}`}
                      >
                        Nagad
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bank")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${paymentMethod === "bank" ? "bg-[#151b2b] text-white" : "bg-slate-200/90 text-slate-700"}`}
                      >
                        Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cash")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${paymentMethod === "cash" ? "bg-[#151b2b] text-white" : "bg-slate-200/90 text-slate-700"}`}
                      >
                        Cash
                      </button>
                    </div>
                  </div>

                  {paymentMethod === "bkash" && (
                    <div className="flex flex-col gap-1 animate-fade-in text-base flex-1 overflow-y-auto thin-scrollbar [@media(max-height:736px)]:min-h-76">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        bKash number
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 017XXXXXXXX"
                        name="bkashNumber"
                        value={pmntDtls.bkashNumber}
                        onChange={handlePaymentChange}
                        className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-medium truncate"
                      />
                    </div>
                  )}
                  {paymentMethod === "nagad" && (
                    <div className="flex flex-col gap-1 animate-fade-in text-base flex-1 [@media(max-height:736px)]:min-h-76 overflow-y-auto thin-scrollbar">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        Nagad number
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 017XXXXXXXX"
                        name="nagadNumber"
                        value={pmntDtls.nagadNumber}
                        onChange={handlePaymentChange}
                        className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-medium truncate"
                      />
                    </div>
                  )}
                  {paymentMethod === "bank" && (
                    <div className="flex flex-col gap-3 animate-fade-in flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                      {[
                        {
                          label: "Bank name",
                          name: "bankName",
                          placeholder: "e.g. Dutch-Bangla Bank",
                        },
                        {
                          label: "Account name",
                          name: "accountName",
                          placeholder: "Bank account name",
                        },
                        {
                          label: "Account number",
                          name: "accountNumber",
                          placeholder: "Bank account number",
                        },
                        {
                          label: "Routing number / SWIFT Code",
                          name: "routingNumber",
                          placeholder: "Routing number",
                        },
                      ].map((field) => (
                        <div key={field.name} className="flex flex-col gap-1">
                          <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            name={field.name}
                            value={pmntDtls[field.name] || ""}
                            onChange={handlePaymentChange}
                            className="text-base w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all font-medium truncate"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {paymentMethod === "cash" && (
                    <div className="p-4 bg-slate-50 rounded-xl text-slate-500 font-semibold text-center animate-fade-in text-base [@media(max-height:736px)]:min-h-76">
                      If offline payment, No details needed
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 5: Add Notes */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("addNotes")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all"
              >
                <span className="text-xl font-black">Add Notes</span>
                <span className="text-slate-700">
                  {activeSection === "addNotes" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "addNotes" && (
                <div className="p-4 bg-white flex flex-col gap-4 border-t border-slate-50 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                        Note text
                      </label>
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">
                        Optional
                      </span>
                    </div>
                    <textarea
                      rows="3"
                      placeholder='e.g. "Late payment fee 10%"'
                      value={note}
                      onChange={(e) => setnote(e.target.value)}
                      className="text-base w-full bg-slate-50 rounded-xl px-4 py-2.5 border border-transparent focus:border-slate-200 outline-none transition-all resize-none font-medium"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 6: Add Signature */}
            <div className="border border-slate-100 rounded-xl flex flex-col min-h-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("addSignature")}
                className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-slate-700 hover:bg-slate-100/80 transition-all"
              >
                <span className="text-xl font-black">Add Signature</span>
                <span className="text-slate-700">
                  {activeSection === "addSignature" ? "▲" : "▼"}
                </span>
              </button>
              {activeSection === "addSignature" && (
                <div className="p-4 flex flex-col gap-4 border-t border-slate-50 animate-fade-in overflow-y-auto thin-scrollbar">
                  <div className="flex flex-col gap-1 animate-fade-in">
                    <label className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                      Upload your Signature (No upload &gt; 4MB)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureFileChange}
                      className="w-full bg-slate-50 rounded-xl px-4 py-2 text-slate-500 border border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 text-base file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer truncate"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-end w-full min-h-[inherit]">
              <button
                type="submit"
                className="text-xl mt-3 w-full py-3.5 font-bold bg-[#151b2b] text-white rounded-xl hover:bg-black active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                {mode === "edit" ? "Update Invoice" : "Submit & Save Invoice"}
              </button>
            </div>
          </form>

          {/* -----------------------------------------------------------------
              RIGHT COLUMN — LIVE PREVIEW (Takes full width in 'show' mode)
              ----------------------------------------------------------------- */}
          <div
            className={`min-[1000px]:w-[60%] w-full flex flex-col bg-slate-50 border border-slate-200/60 rounded-4xl p-6 cursor-default overflow-auto no-scrollbar  ${
              mode === "show"
                ? "min-[1000px]:w-full"
                : `${isPreviewMode ? "" : "max-[1000px]:hidden"}`
            }`}
          >
            <div
              ref={invoiceRef}
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
              }}
              className="bg-white border border-slate-100 text-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col w-full h-full min-h-fit max-[490px]:p-3"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-slate-900">
                    Invoice
                  </h1>
                  <span className="text-base font-bold text-slate-400 block mt-1">
                    #{InvNmbr}
                  </span>
                </div>
                <div className="text-right">
                  <img
                    width={55}
                    src={
                      YrLogo
                        ? typeof YrLogo === "object"
                          ? URL.createObjectURL(YrLogo)
                          : YrLogo
                        : "/logo place holder copy.png"
                    }
                    alt="Logo"
                  />
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-300 pb-4 mt-2 text-scale mb-6">
                <div className="w-[33%] truncate">
                  <span className="text-lg font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Project
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {InvPrjtNm || "Your Projects Name"}
                  </span>
                </div>
                <div className="w-[33%]">
                  <span className="text-lg font-extrabold text-slate-400 text-center uppercase tracking-wider block mb-1 whitespace-nowrap">
                    Issued Date
                  </span>
                  <span className="text-center font-bold text-slate-800 tracking-wider block">
                    {formatDateText(InvIssuDate)}
                  </span>
                </div>
                <div className="w-[33%]">
                  <span className="text-lg font-extrabold text-end text-slate-400 uppercase tracking-wider block mb-1">
                    Due Date
                  </span>
                  <span className="text-end font-bold text-slate-800 tracking-wider block">
                    {formatDateText(InvDeuDate)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mt-2 mb-6">
                <div>
                  <span className="font-extrabold text-lg uppercase tracking-wider text-slate-400 block mb-2">
                    From
                  </span>
                  <p className="text-slate-800 leading-relaxed font-bold text-base truncate">
                    {YrNm || (
                      <span className="text-slate-400/50 italic">
                        <>
                          Zahidul Islam
                          <br />
                          zahidulfs2007@example.com
                          <br />
                          Savar, Dhaka, Bangladesh
                          <br />
                          880 1975311279
                        </>
                      </span>
                    )}
                    <br />
                    {YrEml}
                    <br />
                    {YrAdrs}
                    <br />
                    {YrPhn}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-lg uppercase tracking-wider text-slate-400 block mb-2">
                    To
                  </span>
                  <p className="text-slate-800 leading-relaxed font-bold text-base truncate">
                    {ClientNm || (
                      <span className="text-slate-400/50 italic">
                        <>
                          Jane Doe
                          <br />
                          client@example.com
                          <br />
                          Springfield, OR 97477, United States
                        </>
                      </span>
                    )}
                    <br />
                    {ClientEml}
                    <br />
                    {ClientAdrs}
                  </p>
                </div>
              </div>

              <div className="mb-6 mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-lg">
                      <th className="pb-3 font-extrabold">Description</th>
                      <th className="pb-3 text-center font-extrabold">Units</th>
                      <th className="pb-3 text-right font-extrabold">Price</th>
                      <th className="pb-3 text-right font-extrabold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-700">
                    {Invitems.map((item, index) => {
                      const units = Number(item.units) || 0;
                      const price = Number(item.price) || 0;
                      const itemAmount = units * price;
                      return (
                        <tr
                          key={index}
                          className="border-b border-slate-100 text-base"
                        >
                          <td className="py-4 text-slate-900 font-medium truncate capitalize max-w-50">
                            {item.description || (
                              <span className="text-slate-400/90 italic text-base">
                                Untitled Item
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-center text-slate-600">
                            {units}
                          </td>
                          <td className="py-4 text-right text-slate-600">
                            ${price.toFixed(2)}
                          </td>
                          <td className="py-4 text-right text-slate-900 font-bold">
                            ${itemAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-1 justify-end mt-2 mb-3 text-lg font-black text-slate-900">
                Total Amount : $
                {Invitems.reduce((total, item) => {
                  const units = Number(item.units) || 0;
                  const price = Number(item.price) || 0;
                  return total + units * price;
                }, 0).toFixed(2)}
              </div>

              <div className="text-lg font-black text-slate-900 flex justify-between items-end">
                <div className="flex flex-col justify-center mb-4">
                  {(pmntDtls.bkashNumber?.trim() ||
                    pmntDtls.nagadNumber?.trim() ||
                    pmntDtls.bankName?.trim() ||
                    pmntDtls.accountNumber?.trim() ||
                    pmntDtls.accountName?.trim() ||
                    pmntDtls.routingNumber?.trim()) && (
                    <div className="text-lg text-black">
                      <div className="font-black text-black">
                        Payment Method :
                      </div>
                      {pmntDtls.bkashNumber && (
                        <div className="font-bold text-slate-900">
                          | bKash :{" "}
                          <span className="font-semibold">
                            {pmntDtls.bkashNumber}
                          </span>
                        </div>
                      )}
                      {pmntDtls.nagadNumber && (
                        <div className="font-bold text-slate-900">
                          | Nagad :{" "}
                          <span className="font-semibold">
                            {pmntDtls.nagadNumber}
                          </span>
                        </div>
                      )}
                      {(pmntDtls.bankName ||
                        pmntDtls.accountNumber ||
                        pmntDtls.accountName ||
                        pmntDtls.routingNumber) && (
                        <div className="font-bold text-slate-900">
                          | Bank :{" "}
                          <span className="font-semibold uppercase">
                            {pmntDtls.bankName || "N/A"}
                          </span>
                          {pmntDtls.accountName && (
                            <div className="font-semibold text-base pl-3">
                              <span className="font-bold">Account Name : </span>
                              <span className="uppercase">
                                {pmntDtls.accountName}
                              </span>
                            </div>
                          )}
                          {pmntDtls.accountNumber && (
                            <div className="font-semibold text-base pl-3">
                              <span className="font-bold">
                                Account Number :{" "}
                              </span>
                              {pmntDtls.accountNumber}
                            </div>
                          )}
                          {pmntDtls.routingNumber && (
                            <div className="font-semibold text-base pl-3">
                              <span className="font-bold">
                                Routing Number :{" "}
                              </span>
                              {pmntDtls.routingNumber}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <img
                  className="w-50 h-40 object-contain rounded-xl"
                  src={
                    Signature
                      ? typeof Signature === "object"
                        ? URL.createObjectURL(Signature)
                        : Signature
                      : "/signature place holder.png"
                  }
                  alt="Signature"
                />
              </div>

              {note?.trim() && (
                <span className="text-base font-bold px-2 text-center">
                  Note : {note}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
