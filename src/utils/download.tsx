export const download = (
  url: string,
  logger: [text:string,React.Dispatch<React.SetStateAction<{ text: string; progress: number }>>] | null = null
): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    if (logger) {
      const [text, setProgress] = logger
      request.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setProgress({
            text: `Downloading... ${text}`,
            progress: parseFloat(progress.toFixed(2)), // Ensure progress is a number
          });
        }
      };
    }

    request.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(request.response);
      } else {
        reject({
          status: this.status,
          statusText: this.statusText,
        });
      }
    };

    request.onerror = function () {
      reject({
        status: this.status,
        statusText: this.statusText,
      });
    };

    request.send();
  });
};