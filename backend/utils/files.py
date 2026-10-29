import os
import uuid

# Uploaded PDFs, named <paper_id>.pdf (a content hash). Relative to the working directory.
PDF_DIR = "docs/pdfs"

def save_pdf(path: str, contents: bytes):
    """Store the upload once. The name is a content hash, so an existing file already holds these bytes;
    rewriting it in place would truncate it under a concurrent GET /papers/{id}/file."""
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_path = f"{path}.{uuid.uuid4().hex}.tmp"  # unique per request: routes share a threadpool
    with open(tmp_path, "wb") as f:
        f.write(contents)
    os.replace(tmp_path, path)
