import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

// file uploading rules
export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for url:", file.ufsUrl);
      return { uploadedBy: "User", url: file.ufsUrl };
    }),
};
