import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { createPdfPreviewUrl, exportPdf, type PdfOptions } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Pratinjau dokumen PDF (kertas F4) sebelum dicetak atau diunduh. */
export function PdfPreviewDialog({
  options,
  onClose,
}: {
  options: PdfOptions | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!options) {
      setUrl(null);
      return;
    }
    const objectUrl = createPdfPreviewUrl(options);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [options]);

  function handlePrint() {
    const win = frameRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else if (url) {
      window.open(url, "_blank");
    }
  }

  return (
    <Dialog open={!!options} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="text-base">Pratinjau Cetak — {options?.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Ukuran kertas F4 / Folio (21,5 × 33 cm), orientasi landscape. Periksa isi dokumen sebelum mencetak.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/40">
          {url && <iframe ref={frameRef} src={url} title="Pratinjau PDF" className="h-full w-full" />}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button variant="outline" onClick={() => options && exportPdf(options)} disabled={!options}>
            <Download className="mr-1.5 size-4" /> Unduh PDF
          </Button>
          <Button onClick={handlePrint} disabled={!url}>
            <Printer className="mr-1.5 size-4" /> Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
