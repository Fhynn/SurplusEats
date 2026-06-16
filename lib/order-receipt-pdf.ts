type ReceiptItem = {
  menuNameSnapshot: string;
  quantity: number;
  priceSnapshot: number;
  originalPriceSnapshot: number;
};

export type ReceiptOrderPdfData = {
  orderCode: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  serviceFee: number;
  taxFee: number;
  total: number;
  pickupCode: string | null;
  pickupTime: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    name: string;
    address: string;
    city: string;
  };
  items: ReceiptItem[];
};

const pageWidth = 595;
const pageHeight = 842;
const marginX = 48;
const bottomMargin = 52;

function formatRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value: string, maxLength: number) {
  const words = sanitizePdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ["-"];
}

class PdfReceiptBuilder {
  private pages: string[] = [];
  private commands: string[] = [];
  private y = pageHeight - 48;

  private addPage() {
    this.pages.push(this.commands.join("\n"));
    this.commands = [];
    this.y = pageHeight - 48;
  }

  private ensureSpace(height: number) {
    if (this.y - height < bottomMargin) {
      this.addPage();
    }
  }

  text(text: string, x: number, size = 10, bold = false) {
    this.commands.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${this.y} Td (${escapePdfText(
        text,
      )}) Tj ET`,
    );
  }

  line(yOffset = 0) {
    const y = this.y + yOffset;

    this.commands.push(
      `0.82 0.86 0.90 RG ${marginX} ${y} m ${pageWidth - marginX} ${y} l S`,
    );
  }

  move(amount: number) {
    this.y -= amount;
  }

  sectionTitle(title: string) {
    this.ensureSpace(38);
    this.move(18);
    this.text(title, marginX, 12, true);
    this.move(14);
    this.line();
    this.move(12);
  }

  labelValue(label: string, value: string, options?: { boldValue?: boolean }) {
    this.ensureSpace(18);
    this.text(label, marginX, 9);
    this.text(value, 335, 9, options?.boldValue ?? false);
    this.move(16);
  }

  wrappedText(label: string, value: string) {
    this.ensureSpace(32);
    this.text(label, marginX, 9);
    const lines = wrapText(value, 42);

    for (const line of lines) {
      this.text(line, 180, 9);
      this.move(13);
    }
  }

  item(name: string, quantity: number, price: number) {
    const lines = wrapText(name, 45);

    this.ensureSpace(20 + lines.length * 12);
    this.text(`${quantity}x`, marginX, 9, true);
    lines.forEach((line, index) => {
      this.text(line, 85, 9, index === 0);
      if (index < lines.length - 1) {
        this.move(12);
      }
    });
    this.text(formatRp(price * quantity), 410, 9, true);
    this.move(18);
  }

  finish() {
    this.pages.push(this.commands.join("\n"));
    return this.pages;
  }
}

function buildPdfDocument(pageContents: string[]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const pageObjectNumbers: number[] = [];

  for (const content of pageContents) {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;

    pageObjectNumbers.push(pageObjectNumber);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((pageObjectNumber) => `${pageObjectNumber} 0 R`)
    .join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}

export function buildOrderReceiptPdf(order: ReceiptOrderPdfData) {
  const builder = new PdfReceiptBuilder();

  builder.text("ResQFood", marginX, 24, true);
  builder.move(24);
  builder.text("Official Order Receipt", marginX, 12);
  builder.text(order.orderCode, 390, 14, true);
  builder.move(18);
  builder.line();

  builder.sectionTitle("Order");
  builder.labelValue("Order ID", order.orderCode, { boldValue: true });
  builder.labelValue("Status", order.status);
  builder.labelValue("Payment", order.paymentStatus);
  builder.labelValue("Created", formatDate(order.createdAt));
  builder.labelValue("Paid", formatDate(order.paidAt));
  builder.labelValue("Pickup", formatDate(order.pickupTime));
  builder.labelValue("Pickup Code", order.pickupCode || "-");

  builder.sectionTitle("Customer");
  builder.labelValue("Name", order.customer.name);
  builder.labelValue("Email", order.customer.email);
  builder.labelValue("Phone", order.customer.phone || "-");

  builder.sectionTitle("Restaurant");
  builder.labelValue("Name", order.restaurant.name);
  builder.wrappedText(
    "Address",
    `${order.restaurant.address}, ${order.restaurant.city}`,
  );

  builder.sectionTitle("Items");
  for (const item of order.items) {
    builder.item(item.menuNameSnapshot, item.quantity, item.priceSnapshot);
  }

  builder.sectionTitle("Payment Summary");
  builder.labelValue("Subtotal", formatRp(order.subtotal));
  builder.labelValue("Voucher/Discount", `-${formatRp(order.discount)}`);
  builder.labelValue("Service Fee", formatRp(order.serviceFee));
  builder.labelValue("Tax", formatRp(order.taxFee));
  builder.move(4);
  builder.line();
  builder.move(16);
  builder.labelValue("Total Paid", formatRp(order.total), { boldValue: true });

  builder.move(18);
  builder.text("Generated by ResQFood. This receipt is based on verified order data.", marginX, 8);

  return buildPdfDocument(builder.finish());
}
