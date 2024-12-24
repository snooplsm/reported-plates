export const getFileHash = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        crypto.subtle
          .digest('SHA-256', reader.result as ArrayBuffer)
          .then((hashBuffer) =>
            resolve(
              Array.from(new Uint8Array(hashBuffer))
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('')
            )
          )
          .catch(reject);
      reader.readAsArrayBuffer(file);
    });
