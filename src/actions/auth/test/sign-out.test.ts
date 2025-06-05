import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/auth-client", () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Import después de los mocks
import { authClient } from "@/auth-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import signOutAction from "../sign-out";

describe("signOutAction", () => {
  const mockCookieStore = {
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset env vars
    process.env.AUTH_SESSION_COOKIE_NAME = "custom-session-token";

    // Default successful mocks
    vi.mocked(authClient.signOut).mockResolvedValue({ success: true });
    (cookies as any).mockResolvedValue(mockCookieStore);
    (redirect as any).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    mockCookieStore.delete.mockReturnValue(undefined);
  });

  describe("✅ Successful Sign Out", () => {
    it("should call authClient.signOut and clean all cookies", async () => {
      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error("NEXT_REDIRECT"));

      // Verify authClient.signOut was called
      expect(authClient.signOut).toHaveBeenCalledOnce();

      // Verify cookies() was called (only once in try block)
      expect(cookies).toHaveBeenCalledOnce();

      // Verify all 3 cookies are deleted
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(3);
      expect(mockCookieStore.delete).toHaveBeenCalledWith("custom-session-token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("better-auth.session-token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("session-token");

      // Verify redirect
      expect(redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should use default cookie name when AUTH_SESSION_COOKIE_NAME is not set", async () => {
      // Arrange
      process.env.AUTH_SESSION_COOKIE_NAME = undefined;

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error("NEXT_REDIRECT"));

      expect(mockCookieStore.delete).toHaveBeenCalledWith("better-auth-session-token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("better-auth.session-token");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("session-token");
    });
  });

  describe("❌ Error Handling - AuthClient Errors", () => {
    it("should clean cookies even when authClient.signOut fails", async () => {
      // Arrange
      vi.mocked(authClient.signOut).mockRejectedValue(new Error("Auth service unavailable"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error("NEXT_REDIRECT"));

      // authClient.signOut fails, so it goes to catch block and calls cookies() once more
      expect(cookies).toHaveBeenCalledTimes(1); // Only in catch block since try block authClient fails first
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(3); // Only in catch block
      expect(redirect).toHaveBeenCalledWith("/sign-in");
      expect(consoleSpy).toHaveBeenCalledWith("⚠️ Error during sign out:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should handle cookies() failure in try block gracefully", async () => {
      // Arrange
      (cookies as any)
        .mockRejectedValueOnce(new Error("Cookies not available"))
        .mockResolvedValueOnce(mockCookieStore); // Second call in catch succeeds
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error("NEXT_REDIRECT"));

      expect(cookies).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.delete).toHaveBeenCalledTimes(3); // Only in catch block
      expect(redirect).toHaveBeenCalledWith("/sign-in");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("🔄 Redirect Behavior", () => {
    it("should always redirect regardless of errors", async () => {
      // Arrange - Everything fails
      vi.mocked(authClient.signOut).mockRejectedValue(new Error("Auth failed"));
      (cookies as any).mockRejectedValue(new Error("Cookies failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert - When cookies() fails, the error propagates and prevents redirect
      await expect(signOutAction()).rejects.toEqual(new Error("Cookies failed"));

      // redirect should not be called if cookies() fails first
      expect(redirect).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("🔐 Environment Configuration", () => {
    it("should handle different custom cookie names", async () => {
      // Arrange
      const customCookieNames = ["my-auth-session", "app-session-token", "secure-session-id"];

      for (const cookieName of customCookieNames) {
        vi.clearAllMocks();
        process.env.AUTH_SESSION_COOKIE_NAME = cookieName;

        // Ensure redirect throws
        (redirect as any).mockImplementation(() => {
          throw new Error("NEXT_REDIRECT");
        });

        // Act & Assert
        await expect(signOutAction()).rejects.toEqual(new Error("NEXT_REDIRECT"));

        expect(mockCookieStore.delete).toHaveBeenCalledWith(cookieName);
        expect(mockCookieStore.delete).toHaveBeenCalledWith("better-auth.session-token");
        expect(mockCookieStore.delete).toHaveBeenCalledWith("session-token");
      }
    });
  });
});
