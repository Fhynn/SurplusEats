type OwnerAnalyticsReportData = {
  restaurantName: string;
  periodDays: number;
  generatedAt: Date;
  analytics: {
    kpis: {
      netRevenue: number;
      completedOrders: number;
      foodSavedKg: number;
      conversionRate: number;
      refundRate: number;
      repeatCustomerRate: number;
      repeatCustomers: number;
      uniqueCustomers: number;
      totalOperationalOrders: number;
      refundedOrders: number;
    };
    impact: {
      savedKg: string;
      co2e: string;
      portions: string;
    };
    bestSellers: Array<{
      name: string;
      category: string;
      sold: number;
      revenue: number;
      orderCount: number;
      avgPrice: number;
      refundCount: number;
      contributionRate: number;
    }>;
    pickupWindows: Array<{
      time: string;
      orders: number;
      revenue: number;
      share: number;
    }>;
    insights: Array<{
      title: string;
      value: string;
      description: string;
    }>;
    recommendation: string;
  };
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
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

class PdfReportBuilder {
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
    this.ensureSpace(40);
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

  wrappedText(label: string, value: string) {
    const lines = wrapText(value, 58);

    this.ensureSpace(18 + lines.length * 13);
    this.text(label, marginX, 9, true);
    this.move(14);

    for (const line of lines) {
      this.text(line, marginX, 9);
      this.move(13);
    }
  }

  bullet(title: string, description: string) {
    const titleLines = wrapText(title, 72);
    const descriptionLines = wrapText(description, 82);

    this.ensureSpace(18 + titleLines.length * 12 + descriptionLines.length * 12);
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

export function buildOwnerAnalyticsReportPdf(report: OwnerAnalyticsReportData) {
  const builder = new PdfReportBuilder();

  builder.text("ResQFood", marginX, 24, true);
  builder.move(24);
  builder.text("Owner Analytics Report", marginX, 12);
  builder.text(`${report.periodDays} hari`, 420, 12, true);
  builder.move(18);
  builder.line();

  builder.sectionTitle("Ringkasan");
  builder.labelValue("Restoran", report.restaurantName, { boldValue: true });
  builder.labelValue("Dibuat", formatDate(report.generatedAt));
  builder.labelValue("Pendapatan Bersih", formatRp(report.analytics.kpis.netRevenue));
  builder.labelValue(
    "Order Selesai",
    report.analytics.kpis.completedOrders.toLocaleString("id-ID"),
  );
  builder.labelValue("Food Saved", report.analytics.impact.savedKg);
  builder.labelValue("CO2e", report.analytics.impact.co2e);
  builder.labelValue("Porsi", report.analytics.impact.portions);

  builder.sectionTitle("Operasional");
  builder.labelValue(
    "Conversion Rate",
    formatPercent(report.analytics.kpis.conversionRate),
  );
  builder.labelValue("Refund Rate", formatPercent(report.analytics.kpis.refundRate));
  builder.labelValue(
    "Repeat Customer",
    formatPercent(report.analytics.kpis.repeatCustomerRate),
  );
  builder.labelValue(
    "Customer Repeat",
    `${report.analytics.kpis.repeatCustomers}/${report.analytics.kpis.uniqueCustomers}`,
  );
  builder.labelValue(
    "Order Operasional",
    report.analytics.kpis.totalOperationalOrders.toLocaleString("id-ID"),
  );
  builder.labelValue(
    "Order Refund",
    report.analytics.kpis.refundedOrders.toLocaleString("id-ID"),
  );

  builder.sectionTitle("Menu Terlaris");
  if (report.analytics.bestSellers.length === 0) {
    builder.wrappedText("Data", "Belum ada menu terjual pada periode ini.");
  } else {
    report.analytics.bestSellers.forEach((seller, index) => {
      builder.bullet(
        `${index + 1}. ${seller.name} (${seller.category})`,
        `${seller.sold} terjual, ${seller.orderCount} order, revenue ${formatRp(
          seller.revenue,
        )}, avg ${formatRp(seller.avgPrice)}, refund ${
          seller.refundCount
        }, kontribusi ${formatPercent(seller.contributionRate)}.`,
      );
    });
  }

  builder.sectionTitle("Jam Pickup Ramai");
  report.analytics.pickupWindows.forEach((window) => {
    builder.bullet(
      window.time,
      `${window.orders} order, share ${formatPercent(window.share)}, revenue ${formatRp(
        window.revenue,
      )}.`,
    );
  });

  builder.sectionTitle("Insight");
  builder.wrappedText("Rekomendasi", report.analytics.recommendation);
  report.analytics.insights.forEach((insight) => {
    builder.bullet(`${insight.title}: ${insight.value}`, insight.description);
  });

  builder.move(12);
  builder.text(
    "Generated by ResQFood. Report is based on verified owner analytics data.",
    marginX,
    8,
  );

  return buildPdfDocument(builder.finish());
}
