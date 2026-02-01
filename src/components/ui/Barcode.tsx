import React, { useRef } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeComponentProps {
  value: string;
  displayValue?: boolean;
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
  showPrintButton?: boolean;
  label?: string;
}

export function BarcodeComponent({
  value,
  displayValue = true,
  width = 1,
  height = 50,
  fontSize = 12,
  className,
  showPrintButton = true,
  label,
}: BarcodeComponentProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!barcodeRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeHtml = barcodeRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${value}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .barcode-container {
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode-label {
              font-weight: bold;
              margin-bottom: 10px;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${label ? `<div class="barcode-label">${label}</div>` : ''}
            ${barcodeHtml}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for the content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div ref={barcodeRef} className="flex flex-col items-center">
        <Barcode
          value={value}
          width={width}
          height={height}
          fontSize={fontSize}
          displayValue={displayValue}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>
      {showPrintButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-8 w-8 p-0 shrink-0 -mt-3"
          title="Print barcode"
        >
          <Printer className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
} 