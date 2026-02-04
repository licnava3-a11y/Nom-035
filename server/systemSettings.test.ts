import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("System Settings Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // Create a caller with mock context (admin user)
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-admin",
        name: "Test Admin",
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });
  });

  it("should create or update a system setting", async () => {
    const result = await caller.systemSettings.updateSetting({
      key: "test_setting",
      value: "test_value",
      description: "Test setting for unit tests",
    });

    expect(result).toEqual({ success: true });
  });

  it("should retrieve a system setting by key", async () => {
    // First create a setting
    await caller.systemSettings.updateSetting({
      key: "test_retrieve",
      value: "retrieve_value",
      description: "Test retrieve",
    });

    // Then retrieve it
    const setting = await caller.systemSettings.getSetting({
      key: "test_retrieve",
    });

    expect(setting).toBeDefined();
    expect(setting?.settingKey).toBe("test_retrieve");
    expect(setting?.settingValue).toBe("retrieve_value");
  });

  it("should return null for non-existent setting", async () => {
    const setting = await caller.systemSettings.getSetting({
      key: "non_existent_key_12345",
    });

    expect(setting).toBeNull();
  });

  it("should update existing setting value", async () => {
    // Create initial setting
    await caller.systemSettings.updateSetting({
      key: "test_update",
      value: "initial_value",
    });

    // Update it
    await caller.systemSettings.updateSetting({
      key: "test_update",
      value: "updated_value",
    });

    // Verify update
    const setting = await caller.systemSettings.getSetting({
      key: "test_update",
    });

    expect(setting?.settingValue).toBe("updated_value");
  });

  it("should delete a system setting", async () => {
    // Create a setting to delete
    await caller.systemSettings.updateSetting({
      key: "test_delete",
      value: "to_be_deleted",
    });

    // Delete it
    const result = await caller.systemSettings.deleteSetting({
      key: "test_delete",
    });

    expect(result).toEqual({ success: true });

    // Verify deletion
    const setting = await caller.systemSettings.getSetting({
      key: "test_delete",
    });

    expect(setting).toBeNull();
  });
});
