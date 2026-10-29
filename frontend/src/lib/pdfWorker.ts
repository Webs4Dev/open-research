import { pdfjs } from "react-pdf";

// react-pdf needs pdf.js's worker script. Vite bundles the copy in node_modules, so it always
// matches the pdf.js version react-pdf uses and no third-party CDN is involved.
// pdfjs-dist comes in through react-pdf (not listed in package.json); keep the two versions in step.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
