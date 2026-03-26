const MAX_PX = 1200;
const MAX_BYTES = 100 * 1024; // 100 KB

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) {
          height = Math.round((height * MAX_PX) / width);
          width = MAX_PX;
        } else {
          width = Math.round((width * MAX_PX) / height);
          height = MAX_PX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      // Try qualities from 0.9 down to 0.1 until under MAX_BYTES
      const qualities = [0.9, 0.7, 0.5, 0.3, 0.1];
      let idx = 0;

      function tryNext() {
        const q = qualities[idx];
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas toBlob failed"));
            if (blob.size <= MAX_BYTES || idx === qualities.length - 1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              idx++;
              tryNext();
            }
          },
          "image/jpeg",
          q
        );
      }

      tryNext();
    };
    img.onerror = reject;
    img.src = url;
  });
}
