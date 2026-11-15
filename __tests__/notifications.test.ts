import {
  bookingIdFromNotification,
  registerForPush,
  type PermissionState,
  type RegistrationDeps,
} from "@/lib/notifications/registration";

function deps(
  overrides: Partial<RegistrationDeps> & { permission?: PermissionState } = {},
) {
  const { permission = "granted", ...rest } = overrides;
  const base: RegistrationDeps = {
    isPhysicalDevice: true,
    projectId: "proj-1",
    getPermission: jest.fn(async () => permission),
    requestPermission: jest.fn(async () => "granted" as const),
    getToken: jest.fn(async () => "ExponentPushToken[abc]"),
    registerWithServer: jest.fn(async () => undefined),
    rememberToken: jest.fn(async () => undefined),
  };
  return { ...base, ...rest };
}

describe("registerForPush", () => {
  test("with permission already granted it fetches a token, tells the server and remembers it", async () => {
    const d = deps();
    expect(await registerForPush(d)).toEqual({
      status: "registered",
      token: "ExponentPushToken[abc]",
    });
    expect(d.getToken).toHaveBeenCalledWith("proj-1");
    expect(d.registerWithServer).toHaveBeenCalledWith("ExponentPushToken[abc]");
    expect(d.rememberToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
    expect(d.requestPermission).not.toHaveBeenCalled();
  });

  test("asks for permission only when it has never been decided", async () => {
    const d = deps({ permission: "undetermined" });
    expect((await registerForPush(d)).status).toBe("registered");
    expect(d.requestPermission).toHaveBeenCalledTimes(1);
  });

  test("if they decline when asked, nothing is registered", async () => {
    const d = deps({
      permission: "undetermined",
      requestPermission: jest.fn(async () => "denied" as const),
    });
    expect(await registerForPush(d)).toEqual({ status: "denied" });
    expect(d.getToken).not.toHaveBeenCalled();
    expect(d.registerWithServer).not.toHaveBeenCalled();
  });

  test("if they declined before, it does not ask again (iOS would not show the prompt)", async () => {
    const d = deps({ permission: "denied" });
    expect(await registerForPush(d)).toEqual({ status: "denied" });
    expect(d.requestPermission).not.toHaveBeenCalled();
  });

  test("a simulator and a missing project id are reported, not attempted", async () => {
    const sim = deps({ isPhysicalDevice: false });
    expect(await registerForPush(sim)).toEqual({
      status: "unsupported",
      reason: "simulator",
    });
    expect(sim.getPermission).not.toHaveBeenCalled();
    const noProject = deps({ projectId: null });
    expect(await registerForPush(noProject)).toEqual({
      status: "unsupported",
      reason: "no-project",
    });
  });

  test("a failure anywhere is reported and never thrown, so it cannot block the app", async () => {
    const tokenFails = deps({
      getToken: jest.fn(async () => {
        throw new Error("no network");
      }),
    });
    expect(await registerForPush(tokenFails)).toEqual({
      status: "failed",
      message: "no network",
    });
    const serverFails = deps({
      registerWithServer: jest.fn(async () => {
        throw new Error("401");
      }),
    });
    const result = await registerForPush(serverFails);
    expect(result.status).toBe("failed");
    expect(serverFails.rememberToken).not.toHaveBeenCalled();
    expect(
      (
        await registerForPush(
          deps({
            getToken: jest.fn(async () => {
              throw "weird";
            }),
          }),
        )
      ).status,
    ).toBe("failed");
  });
});

describe("bookingIdFromNotification", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  test("reads the appointment id the server put in the notification", () => {
    expect(bookingIdFromNotification({ bookingId: id, kind: "new" })).toBe(id);
  });
  test.each([
    null,
    undefined,
    "x",
    3,
    {},
    { bookingId: 5 },
    { bookingId: "../../admin" },
    { bookingId: "short" },
  ])("ignores %j", (data) =>
    expect(bookingIdFromNotification(data)).toBeNull(),
  );
});
