// Appending an image file to a FormData, which is done DIFFERENTLY on the two
// platforms and cannot be written once.
//
// React Native's FormData accepts a `{ uri, name, type }` descriptor and its
// native networking layer opens the file and streams the bytes. A browser's
// FormData has no such affordance: given a plain object it stores the
// STRINGIFIED object, so the request still succeeds, still carries a valid
// multipart boundary, and simply contains no file.
//
// 🔴 MEASURED, because the failure is quiet: on web the upload POSTed a
// 151-BYTE body and the server answered 400 "No image file provided". Nothing
// threw on the client, the Content-Type was correct, and the only visible
// symptom was a 400 that reads like a server problem.
//
// Native side below is the original expression, unchanged.
export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  filename: string,
  type: string
): Promise<void> {
  formData.append(fieldName, {
    uri,
    name: filename,
    type,
  } as any);
}
