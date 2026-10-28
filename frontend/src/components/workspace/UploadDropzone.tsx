import { useRef, useState } from "react";
import { Upload } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setRejected(`"${file.name}" isn't a PDF.`);
      return;
    }
    setRejected(null);
    onFileSelected(file);
  };

  const browse = () => inputRef.current?.click();

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF"
        onClick={browse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            browse();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors duration-fast max-sm:py-12 ${
          isDragOver ? "border-accent-ink bg-accent-soft" : "border-hairline-strong bg-surface-1 hover:border-ink-faint"
        }`}
      >
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-lg bg-accent text-on-accent shadow-[inset_0_0_0_1px_theme(colors.hairline.strong)]"
        >
          <Upload size={24} />
        </span>
        <div>
          <p className="font-display text-h3 text-ink">Drop a PDF here, or click to browse</p>
          <p className="mt-1 text-body-sm text-ink-subtle">
            Up to 25 MB and 100 pages. Text-based PDFs only; scanned papers can't be read yet.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ""; // picking the same file again still fires onChange
          }}
        />
      </div>
      {rejected && (
        <p role="alert" className="mt-3 text-body-sm text-red">
          {rejected}
        </p>
      )}
    </div>
  );
}
