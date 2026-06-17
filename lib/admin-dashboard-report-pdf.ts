type AdminDashboardReportData = {
  generatedAt: Date;
  filters: {
    query: string;
    role: string;
    userStatus: string;
    applicationStatus: string;
    orderStatus: string;
    refundStatus: string;
    dateFrom: Date | null;
    dateTo: Date | null;
  };
  metrics: {
    totalUsers: number;
    totalRestaurants: number;
    totalTransactions: number;
    foodSavedItems: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: Date;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    ownerEmail: string;
    city: string;
    status: string;
    createdAt: Date;
  }>;
  orders: Array<{
    orderCode: string;
    customerEmail: string;
    restaurantName: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
  }>;
  applications: Array<{
    id: string;
    businessName: string;
    applicantName: string;
    email: string;
    city: string;
    status: string;
    submittedAt: Date;
  }>;
  refunds: Array<{
    id: string;
    orderCode: string;
    customerEmail: string;
    restaurantName: string;
    status: string;
    amount: number;
    reason: string;
    createdAt: Date;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    actorEmail: string;
    createdAt: Date;
  }>;
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

class PdfAdminReportBuilder {
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

  move(amount: number) {
    this.y -= amount;
  }

  line(yOffset = 0) {
    const y = this.y + yOffset;

    this.commands.push(
      `0.82 0.86 0.90 RG ${marginX} ${y} m ${pageWidth - marginX} ${y} l S`,
    );
  }

  sectionTitle(title: string) {
    this.ensureSpace(42);
    this.move(18);
    this.text(title, marginX, 13, true);
    this.move(14);
    this.line();
    this.move(12);
  }

  labelValue(label: string, value: string, options?: { boldValue?: boolean }) {
    this.ensureSpace(18);
    this.text(label, marginX, 9);
    this.text(value, 330, 9, options?.boldValue ?? false);
    this.move(16);
  }

  bullet(title: string, description: string) {
    const titleLines = wrapText(title, 74);
    const descriptionLines = wrapText(description, 84);

    this.ensureSpace(18 + titleLines.length * 12 + descriptionLines.length * 11);
    titleLines.forEach((line, index) => {
      this.text(index === 0 ? `- ${line}` : `  ${line}`, marginX, 9, true);
      this.move(12);
    });
    descriptionLines.forEach((line) => {
      this.text(`  ${line}`, marginX, 8);
      this.move(11);
    });
    this.move(3);
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
    objects.push(
      `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
    );
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

function renderEmpty(builder: PdfAdminReportBuilder, label: string) {
  builder.bullet(label, "Tidak ada data pada filter saat ini.");
}

export function buildAdminDashboardReportPdf(report: AdminDashboardReportData) {
  const builder = new PdfAdminReportBuilder();

  builder.text("ResQFood", marginX, 24, true);
  builder.move(24);
  builder.text("Admin Dashboard Export", marginX, 12);
  builder.text(formatDate(report.generatedAt), 360, 10, true);
  builder.move(18);
  builder.line();

  builder.sectionTitle("Ringkasan");
  builder.labelValue("Total Pengguna", report.metrics.totalUsers.toLocaleString("id-ID"));
  builder.labelValue(
    "Total Restoran",
    report.metrics.totalRestaurants.toLocaleString("id-ID"),
  );
  builder.labelValue(
    "Total Transaksi",
    report.metrics.totalTransactions.toLocaleString("id-ID"),
  );
  builder.labelValue(
    "Item Saved",
    report.metrics.foodSavedItems.toLocaleString("id-ID"),
  );

  builder.sectionTitle("Filter");
  builder.labelValue("Query", report.filters.query || "Semua");
  builder.labelValue("Role", report.filters.role || "Semua");
  builder.labelValue("Status User", report.filters.userStatus || "Semua");
  builder.labelValue("Status Ajuan", report.filters.applicationStatus || "Semua");
  builder.labelValue("Status Order", report.filters.orderStatus || "Semua");
  builder.labelValue("Status Refund", report.filters.refundStatus || "Needs review");
  builder.labelValue("Tanggal Dari", formatDate(report.filters.dateFrom));
  builder.labelValue("Tanggal Sampai", formatDate(report.filters.dateTo));

  builder.sectionTitle("Pengguna");
  if (report.users.length === 0) {
    renderEmpty(builder, "Pengguna");
  } else {
    report.users.slice(0, 20).forEach((user) => {
      builder.bullet(
        `${user.name} (${user.role})`,
        `${user.email} - ${user.status} - bergabung ${formatDate(user.createdAt)}.`,
      );
    });
  }

  builder.sectionTitle("Restoran");
  if (report.restaurants.length === 0) {
    renderEmpty(builder, "Restoran");
  } else {
    report.restaurants.slice(0, 20).forEach((restaurant) => {
      builder.bullet(
        restaurant.name,
        `${restaurant.city} - owner ${restaurant.ownerEmail} - ${restaurant.status} - dibuat ${formatDate(
          restaurant.createdAt,
        )}.`,
      );
    });
  }

  builder.sectionTitle("Transaksi");
  if (report.orders.length === 0) {
    renderEmpty(builder, "Transaksi");
  } else {
    report.orders.slice(0, 25).forEach((order) => {
      builder.bullet(
        `${order.orderCode} - ${formatRp(order.total)}`,
        `${order.customerEmail} di ${order.restaurantName} - ${order.status}/${order.paymentStatus} - ${formatDate(
          order.createdAt,
        )}.`,
      );
    });
  }

  builder.sectionTitle("Ajuan Mitra");
  if (report.applications.length === 0) {
    renderEmpty(builder, "Ajuan mitra");
  } else {
    report.applications.slice(0, 20).forEach((application) => {
      builder.bullet(
        application.businessName,
        `${application.applicantName} - ${application.email} - ${application.city} - ${application.status} - ${formatDate(
          application.submittedAt,
        )}.`,
      );
    });
  }

  builder.sectionTitle("Refund");
  if (report.refunds.length === 0) {
    renderEmpty(builder, "Refund");
  } else {
    report.refunds.slice(0, 20).forEach((refund) => {
      builder.bullet(
        `${refund.orderCode} - ${formatRp(refund.amount)}`,
        `${refund.customerEmail} - ${refund.restaurantName} - ${refund.status} - ${refund.reason} - ${formatDate(
          refund.createdAt,
        )}.`,
      );
    });
  }

  builder.sectionTitle("Audit Log");
  if (report.auditLogs.length === 0) {
    renderEmpty(builder, "Audit log");
  } else {
    report.auditLogs.slice(0, 30).forEach((log) => {
      builder.bullet(
        `${log.action} - ${log.targetType}`,
        `${log.actorEmail} - target ${log.targetId || "-"} - ${formatDate(
          log.createdAt,
        )}.`,
      );
    });
  }

  builder.move(12);
  builder.text(
    "Generated by ResQFood. Report follows the active admin dashboard filters.",
    marginX,
    8,
  );

  return buildPdfDocument(builder.finish());
}
