import { useToast } from "@/hooks/use-toast";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear all toasts after each test
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
  });

  it("should initialize with empty toasts", () => {
    // Act
    const { result } = renderHook(() => useToast());

    // Assert
    expect(result.current.toasts).toEqual([]);
  });

  it("should add a toast", () => {
    // Arrange
    const { result } = renderHook(() => useToast());
    const toastData = {
      title: "Test Title",
      description: "Test Description",
    };

    // Act
    act(() => {
      result.current.toast(toastData);
    });

    // Assert
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: "Test Title",
      description: "Test Description",
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it("should replace toast when limit is reached (TOAST_LIMIT = 1)", () => {
    // Arrange
    const { result } = renderHook(() => useToast());

    // Act - Add first toast
    act(() => {
      result.current.toast({ title: "Toast 1" });
    });

    // Act - Add second toast (should replace first due to limit)
    act(() => {
      result.current.toast({ title: "Toast 2" });
    });

    // Assert - Should only have the latest toast
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe("Toast 2");
  });

  it("should dismiss a toast by id", () => {
    // Arrange
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Toast 1" });
    });

    const toastId = result.current.toasts[0].id;

    // Act
    act(() => {
      result.current.dismiss(toastId);
    });

    // Assert - Toast should be marked as closed but still in array initially
    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should dismiss all toasts when no id provided", () => {
    // Arrange
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Toast 1" });
    });

    // Act
    act(() => {
      result.current.dismiss();
    });

    // Assert - Toast should be marked as closed
    expect(result.current.toasts[0].open).toBe(false);
  });

  it("should handle toast with different variants", () => {
    // Arrange
    const { result } = renderHook(() => useToast());

    // Act - Add toast with default variant
    act(() => {
      result.current.toast({
        title: "Success Toast",
        variant: "default",
      });
    });

    // Assert first toast
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].variant).toBe("default");

    // Act - Add toast with destructive variant (will replace due to limit)
    act(() => {
      result.current.toast({
        title: "Error Toast",
        variant: "destructive",
      });
    });

    // Assert - Should have replaced the first toast
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].variant).toBe("destructive");
    expect(result.current.toasts[0].title).toBe("Error Toast");
  });

  it("should generate unique ids for toasts", () => {
    // Arrange
    const { result } = renderHook(() => useToast());

    // Act - Add first toast
    act(() => {
      result.current.toast({ title: "Toast 1" });
    });
    const firstId = result.current.toasts[0].id;

    // Act - Add second toast (will replace first)
    act(() => {
      result.current.toast({ title: "Toast 2" });
    });
    const secondId = result.current.toasts[0].id;

    // Assert - IDs should be different
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
  });
});
