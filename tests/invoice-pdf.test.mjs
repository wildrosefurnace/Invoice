import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { createServer } from "vite";

test("generates a complete branded Wildrose invoice PDF", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false } });
  try {
    const { pdfBlob } = await server.ssrLoadModule("/src/Prototype.tsx");
    const logoBytes = await readFile(resolve("public/brand-mark-pdf.png"));
    const logo = `data:image/png;base64,${logoBytes.toString("base64")}`;
    const invoice = {
      id: "pdf-qa",
      number: "WR-20260726-001",
      createdAt: "2026-07-26",
      serviceDate: "2026-07-26",
      customer: {
        name: "Alex Johnson",
        email: "alex@example.com",
        phone: "(780) 555-0123",
        address: "123 Test Avenue",
        city: "Edmonton",
        province: "AB",
        postalCode: "T5J 0N3",
      },
      items: [
        {
          id: "service-1",
          name: "Furnace & Duct Cleaning Package",
          description: "Furnace, supply and return duct cleaning.",
          quantity: 1,
          unitPrice: 119,
        },
        {
          id: "service-2",
          name: "Dryer vent cleaning",
          description: "Dryer vent line cleared of lint and buildup.",
          quantity: 1,
          unitPrice: 39,
        },
      ],
      taxRate: 5,
      notes: "Thank you for choosing Wildrose Furnace & Duct Cleaning.",
      status: "Paid",
      signature: "Alex Johnson",
      signedAt: "2026-07-26",
    };
    const settings = {
      businessName: "Wildrose Furnace & Duct Cleaning",
      email: "",
      phone: "(780) 807-0143 · (587) 566-9095",
      address: "Edmonton & nearby areas, Alberta",
      website: "wildrosefurnace.com",
      hours: "Open 9 AM – 9 PM · 7 days a week",
      taxRate: 5,
    };

    const blob = await pdfBlob(invoice, settings, logo);
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(blob.type, "application/pdf");
    assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(bytes.length > 10_000, "expected a non-empty branded PDF");

    if (process.env.WRITE_INVOICE_PDF === "1") {
      const outputDirectory = resolve("tmp/pdfs");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(resolve(outputDirectory, "wildrose-invoice-qa.pdf"), bytes);
    }
  } finally {
    await server.close();
  }
});
