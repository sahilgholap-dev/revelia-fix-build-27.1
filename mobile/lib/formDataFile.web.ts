// Web fork of lib/formDataFile.ts.
//
// The capture pipeline hands us a blob: URI (expo-image-manipulator writes one
// on web), so the bytes are already in the page — they just have to be
// materialised into a real Blob before FormData will carry them. `fetch` on a
// blob:/data: URI is the standard way to do that and involves no network.
//
// The third argument to append() is what sets the multipart `filename`, which
// the server's multer layer requires in order to see the part as a FILE rather
// than a text field. Omitting it is the same 400 in a different disguise.
export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  filename: string,
  type: string
): Promise<void> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read the captured image (${response.status})`);
  }
  const raw = await response.blob();

  // expo-image-manipulator can hand back a blob typed image/png (or an empty
  // type) even when JPEG was requested. The server keys on the declared MIME
  // type, so restate it rather than trusting the blob's own.
  const blob = raw.type === type ? raw : new Blob([raw], { type });

  formData.append(fieldName, blob, filename);
}
