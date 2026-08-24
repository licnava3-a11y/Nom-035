import { describe, it, expect, beforeAll } from "vitest";
import {
  getInvoicesSummary,
  getPurchaseOrdersSummary,
  getExpenseRequestsSummary,
  getAllInvoices,
  getAllPurchaseOrders,
  getAllExpenseRequests,
} from "./db";

describe("Financial Queries", () => {
  describe("Invoices", () => {
    it("should get invoices summary with correct structure", async () => {
      const summary = await getInvoicesSummary();

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("pendientes");
      expect(summary).toHaveProperty("vencidas");
      expect(summary).toHaveProperty("montoTotal");

      expect(typeof summary.total).toBe("number");
      expect(typeof summary.pendientes).toBe("number");
      expect(typeof summary.vencidas).toBe("number");
      expect(typeof summary.montoTotal).toBe("number");
    });

    it("should get all invoices", async () => {
      const invoices = await getAllInvoices();

      expect(Array.isArray(invoices)).toBe(true);

      if (invoices.length > 0) {
        const invoice = invoices[0];
        expect(invoice).toHaveProperty("id");
        expect(invoice).toHaveProperty("folio");
        expect(invoice).toHaveProperty("clienteNombre");
        expect(invoice).toHaveProperty("monto");
        expect(invoice).toHaveProperty("estado");
      }
    });

    it("should calculate correct totals from invoices", async () => {
      const summary = await getInvoicesSummary();
      const allInvoices = await getAllInvoices();

      expect(summary.total).toBe(allInvoices.length);

      const pendientes = allInvoices.filter(
        inv => inv.estado === "pendiente"
      ).length;
      expect(summary.pendientes).toBe(pendientes);

      const vencidas = allInvoices.filter(
        inv => inv.estado === "vencida"
      ).length;
      expect(summary.vencidas).toBe(vencidas);
    });
  });

  describe("Purchase Orders", () => {
    it("should get purchase orders summary with correct structure", async () => {
      const summary = await getPurchaseOrdersSummary();

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("montoTotal");

      expect(typeof summary.total).toBe("number");
      expect(typeof summary.montoTotal).toBe("number");
    });

    it("should get all purchase orders", async () => {
      const orders = await getAllPurchaseOrders();

      expect(Array.isArray(orders)).toBe(true);

      if (orders.length > 0) {
        const order = orders[0];
        expect(order).toHaveProperty("id");
        expect(order).toHaveProperty("folio");
        expect(order).toHaveProperty("proveedor");
        expect(order).toHaveProperty("monto");
        expect(order).toHaveProperty("estado");
      }
    });

    it("should calculate correct totals from purchase orders", async () => {
      const summary = await getPurchaseOrdersSummary();
      const allOrders = await getAllPurchaseOrders();

      expect(summary.total).toBe(allOrders.length);
    });
  });

  describe("Expense Requests", () => {
    it("should get expense requests summary with correct structure", async () => {
      const summary = await getExpenseRequestsSummary();

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("pendientes");
      expect(summary).toHaveProperty("montoTotal");

      expect(typeof summary.total).toBe("number");
      expect(typeof summary.pendientes).toBe("number");
      expect(typeof summary.montoTotal).toBe("number");
    });

    it("should get all expense requests", async () => {
      const requests = await getAllExpenseRequests();

      expect(Array.isArray(requests)).toBe(true);

      if (requests.length > 0) {
        const request = requests[0];
        expect(request).toHaveProperty("id");
        expect(request).toHaveProperty("folio");
        expect(request).toHaveProperty("solicitanteId");
        expect(request).toHaveProperty("monto");
        expect(request).toHaveProperty("estado");
        expect(request).toHaveProperty("categoria");
      }
    });

    it("should calculate correct totals from expense requests", async () => {
      const summary = await getExpenseRequestsSummary();
      const allRequests = await getAllExpenseRequests();

      expect(summary.total).toBe(allRequests.length);

      const pendientes = allRequests.filter(
        req => req.estado === "pendiente"
      ).length;
      expect(summary.pendientes).toBe(pendientes);
    });
  });

  describe("Financial Data Integrity", () => {
    it("should have test data inserted", async () => {
      const invoices = await getAllInvoices();
      const orders = await getAllPurchaseOrders();
      const requests = await getAllExpenseRequests();

      // Verify we have the 15 test records (5 + 5 + 5)
      expect(invoices.length).toBeGreaterThanOrEqual(5);
      expect(orders.length).toBeGreaterThanOrEqual(5);
      expect(requests.length).toBeGreaterThanOrEqual(5);
    });

    it("should have valid monetary amounts", async () => {
      const invoices = await getAllInvoices();
      const orders = await getAllPurchaseOrders();
      const requests = await getAllExpenseRequests();

      // Verify all amounts are positive numbers
      invoices.forEach(inv => {
        const amount = parseFloat(inv.monto.toString());
        expect(amount).toBeGreaterThan(0);
      });

      orders.forEach(order => {
        const amount = parseFloat(order.monto.toString());
        expect(amount).toBeGreaterThan(0);
      });

      requests.forEach(req => {
        const amount = parseFloat(req.monto.toString());
        expect(amount).toBeGreaterThan(0);
      });
    });

    it("should have valid estados (status)", async () => {
      const invoices = await getAllInvoices();
      const orders = await getAllPurchaseOrders();
      const requests = await getAllExpenseRequests();

      const validInvoiceStates = [
        "pendiente",
        "pagada",
        "vencida",
        "cancelada",
      ];
      const validOrderStates = ["borrador", "enviada", "recibida", "cancelada"];
      const validRequestStates = [
        "pendiente",
        "aprobada",
        "rechazada",
        "pagada",
      ];

      invoices.forEach(inv => {
        expect(validInvoiceStates).toContain(inv.estado);
      });

      orders.forEach(order => {
        expect(validOrderStates).toContain(order.estado);
      });

      requests.forEach(req => {
        expect(validRequestStates).toContain(req.estado);
      });
    });
  });
});
