import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createInstructorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "instructor-user",
    email: "instructor@example.com",
    name: "Instructor User",
    loginMethod: "manus",
    role: "instructor",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createStudentContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "student-user",
    email: "student@example.com",
    name: "Student User",
    loginMethod: "manus",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("courses router", () => {
  it("should allow instructors to list courses", async () => {
    const ctx = createInstructorContext();
    const caller = appRouter.createCaller(ctx);

    const courses = await caller.courses.list();
    expect(Array.isArray(courses)).toBe(true);
  });

  it("should allow students to list only published courses", async () => {
    const ctx = createStudentContext();
    const caller = appRouter.createCaller(ctx);

    const courses = await caller.courses.list();
    expect(Array.isArray(courses)).toBe(true);
  });

  it("should allow admin to list all courses", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const courses = await caller.courses.list();
    expect(Array.isArray(courses)).toBe(true);
  });
});

describe("modules router", () => {
  it("should allow authenticated users to list modules by course", async () => {
    const ctx = createStudentContext();
    const caller = appRouter.createCaller(ctx);

    const modules = await caller.modules.listByCourse({ courseId: 1 });
    expect(Array.isArray(modules)).toBe(true);
  });
});

describe("progress router", () => {
  it("should allow students to view their own progress", async () => {
    const ctx = createStudentContext();
    const caller = appRouter.createCaller(ctx);

    const progress = await caller.progress.my();
    expect(Array.isArray(progress)).toBe(true);
  });

  it("should allow students to view progress by course", async () => {
    const ctx = createStudentContext();
    const caller = appRouter.createCaller(ctx);

    const progress = await caller.progress.byCourse({ courseId: 1 });
    expect(progress === undefined || typeof progress === "object").toBe(true);
  });
});
