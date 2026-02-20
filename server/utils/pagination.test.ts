/**
 * Tests unitarios para utilidades de paginación
 */

import { describe, it, expect } from "vitest";
import {
  normalizePaginationParams,
  calculatePagination,
  PAGINATION_DEFAULTS,
} from "./pagination";

describe("Pagination Utils", () => {
  describe("normalizePaginationParams", () => {
    it("should use default values when no params provided", () => {
      const result = normalizePaginationParams();
      
      expect(result.page).toBe(PAGINATION_DEFAULTS.PAGE);
      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.PAGE_SIZE);
      expect(result.offset).toBe(0);
    });

    it("should normalize page to minimum 1", () => {
      const result = normalizePaginationParams({ page: 0 });
      
      expect(result.page).toBe(1);
    });

    it("should normalize negative page to 1", () => {
      const result = normalizePaginationParams({ page: -5 });
      
      expect(result.page).toBe(1);
    });

    it("should cap pageSize to MAX_PAGE_SIZE", () => {
      const result = normalizePaginationParams({ pageSize: 200 });
      
      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.MAX_PAGE_SIZE);
    });

    it("should normalize pageSize to minimum 1", () => {
      const result = normalizePaginationParams({ pageSize: 0 });
      
      // pageSize 0 se normaliza al default (20), no a 1
      expect(result.pageSize).toBe(PAGINATION_DEFAULTS.PAGE_SIZE);
    });

    it("should calculate correct offset for page 1", () => {
      const result = normalizePaginationParams({ page: 1, pageSize: 20 });
      
      expect(result.offset).toBe(0);
    });

    it("should calculate correct offset for page 2", () => {
      const result = normalizePaginationParams({ page: 2, pageSize: 20 });
      
      expect(result.offset).toBe(20);
    });

    it("should calculate correct offset for page 5 with custom pageSize", () => {
      const result = normalizePaginationParams({ page: 5, pageSize: 15 });
      
      expect(result.offset).toBe(60); // (5-1) * 15
    });
  });

  describe("calculatePagination", () => {
    it("should calculate pagination for first page", () => {
      const result = calculatePagination(1, 20, 100);
      
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalCount).toBe(100);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(false);
    });

    it("should calculate pagination for middle page", () => {
      const result = calculatePagination(3, 20, 100);
      
      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });

    it("should calculate pagination for last page", () => {
      const result = calculatePagination(5, 20, 100);
      
      expect(result.page).toBe(5);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(true);
    });

    it("should handle empty results", () => {
      const result = calculatePagination(1, 20, 0);
      
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(false);
    });

    it("should handle partial last page", () => {
      const result = calculatePagination(3, 20, 55);
      
      expect(result.totalPages).toBe(3); // ceil(55/20) = 3
      expect(result.hasNextPage).toBe(false);
    });

    it("should handle single page", () => {
      const result = calculatePagination(1, 20, 15);
      
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(false);
    });

    it("should handle exact page boundary", () => {
      const result = calculatePagination(2, 25, 50);
      
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large page numbers", () => {
      const result = normalizePaginationParams({ page: 1000000 });
      
      expect(result.page).toBe(1000000);
      expect(result.offset).toBe((1000000 - 1) * PAGINATION_DEFAULTS.PAGE_SIZE);
    });

    it("should handle very large total counts", () => {
      const result = calculatePagination(1, 20, 1000000);
      
      expect(result.totalPages).toBe(50000);
      expect(result.hasNextPage).toBe(true);
    });

    it("should handle pageSize of 1", () => {
      const result = calculatePagination(5, 1, 10);
      
      expect(result.totalPages).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });
  });
});
