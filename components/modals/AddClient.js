"use client";
import React, { useState, useEffect } from "react";
import { useUploadThing } from "@/utils/uploadthing";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

const AddClient = ({ isOpen, onClose }) => {
  const { startUpload } = useUploadThing("imageUploader");

  // ---------------- states for all those inputs value -------------------
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [ClientNm, setClientNm] = useState("");
  const [ClientEml, setClientEml] = useState("");
  const [ClientAdrs, setClientAdrs] = useState("");
  const [ClientPhn, setClientPhn] = useState("");
  const [ClientStatus, setClientStatus] = useState("");
  const [ClientImg, setClientImg] = useState(null);
  const [clients, setclients] = useState([]);

  // ------------------- fetching all the clients from the database -------------------
  useEffect(() => {
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
      });
  }, [userId]);

  // ------------------- function to reset inputs -------------------
  const handleResetAll = () => {
    setClientNm("");
    setClientEml("");
    setClientPhn("");
    setClientAdrs("");
    setClientStatus("");
    setClientImg(null);
  };

  // ------------------- function to add client in database -------------------
  const addNewClient = async (Img) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      user_id: userId,
      client_name: ClientNm,
      client_email: ClientEml,
      client_phone: ClientPhn,
      client_address: ClientAdrs,
      client_status: ClientStatus,
      client_photo: Img || "",
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const savePaymentPromise = new Promise(async (resolve, reject) => {
      try {
        const r = await fetch("/api/client", requestOptions);
        const result = await r.json();

        if (result.success) {
          resolve(result);
        } else {
          reject(result);
        }
      } catch (err) {
        reject(err);
      }
    });

    return toast.promise(savePaymentPromise, {
      pending: "Saving client information...",
      success: "Client added successfully",
      error: {
        render({ data }) {
          return data?.message || "Failed to add client !";
        },
      },
    });
  };

  // ------------------- If the state is false, do not render anything on screen -------------------
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-4xl w-full max-w-200 p-8 shadow-2xl relative">
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 text-2xl font-bold cursor-pointer"
        >
          ✕
        </button>

        <h3 className="text-gray-900 font-black text-3xl mb-6">
          Add New Client
        </h3>

        {/* form inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (ClientNm !== "") {
              const isExisting = clients.some(
                (c) =>
                  c.client_email?.toLowerCase() ===
                  ClientEml.trim().toLowerCase(),
              );

              if (isExisting) {
                const existingClient = clients.find(
                  (c) =>
                    c.client_email?.toLowerCase() ===
                    ClientEml.trim().toLowerCase(),
                );
                toast.error(
                  `There is an existing client with the same Email named: ${existingClient?.client_name || "Unknown"}.`,
                );
                return;
              }
            }

            onClose();

            (async () => {
              try {
                let uploadedImgUrl =
                  typeof ClientImg === "string" ? ClientImg : "";

                if (ClientImg && typeof ClientImg === "object") {
                  toast.info("Uploading client photo to the cloud... ");
                  const uploadRes = await startUpload([ClientImg]);

                  if (uploadRes && uploadRes[0]) {
                    uploadedImgUrl = uploadRes[0].ufsUrl || uploadRes[0].url;
                    setClientImg(uploadedImgUrl);
                  } else {
                    toast.error(
                      "Photo upload failed! But trying to save client information.",
                    );
                  }
                }

                await addNewClient(uploadedImgUrl);
                handleResetAll();
              } catch (error) {
                console.error(error);
              }
            })();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Name
            </label>
            <input
              type="text"
              required
              value={ClientNm}
              onChange={(e) => setClientNm(e.target.value)}
              placeholder="Client full name"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all"
            />
          </div>

          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={ClientEml}
              onChange={(e) => setClientEml(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all"
            />
          </div>

          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={ClientPhn}
              onChange={(e) => setClientPhn(e.target.value)}
              placeholder="Phone number"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all"
            />
          </div>

          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Address
            </label>
            <textarea
              rows="2"
              value={ClientAdrs}
              onChange={(e) => setClientAdrs(e.target.value)}
              placeholder="Client billing address"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all resize-none"
            ></textarea>
          </div>

          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Photo (No upload &gt; 4MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setClientImg(file);
              }}
              className="w-full p-2 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all file:mr-4 file:cursor-pointer file:py-1 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-base font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Status
            </label>
            <div className="relative">
              <select
                required
                value={ClientStatus}
                onChange={(e) => setClientStatus(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none focus:border-gray-300 text-base font-medium transition-all cursor-pointer text-gray-900 appearance-none pr-10"
              >
                <option value="" disabled hidden>
                  Select Status
                </option>
                <option value="Active" className="bg-white py-2">
                  Active
                </option>
                <option value="Inactive" className="bg-white py-2">
                  Inactive
                </option>
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

          {/* submit buttons */}
          <button
            type="submit"
            className="w-full mt-2 py-4 bg-gray-900 text-white rounded-xl font-bold text-base shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            Submit Client
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddClient;
