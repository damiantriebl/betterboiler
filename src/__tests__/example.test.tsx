import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Componente simple para probar
function ExampleComponent({ message }: { message: string }) {
  return <div>{message}</div>;
}

describe("Example test suite", () => {
  it("renders a message", () => {
    const message = "Hello, Vitest!";
    render(<ExampleComponent message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("DOM testing example", () => {
    document.body.innerHTML = `
      <div>
        <span id="username">John</span>
        <span id="age">25</span>
      </div>
    `;

    expect(document.getElementById("username")?.textContent).toBe("John");
    expect(document.getElementById("age")?.textContent).toBe("25");
  });
});
