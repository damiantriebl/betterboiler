import type { Day } from "@/zod/banking-promotion-schemas";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DaySelector } from "./DaySelector";

describe("DaySelector", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders with empty selection (all days)", () => {
    render(<DaySelector value={[]} onChange={mockOnChange} />);

    // Check that the "All days" badge is shown
    expect(screen.getByText("Todos los días")).toBeInTheDocument();

    // Check that all days are rendered
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getAllByText("M")).toHaveLength(2); // Martes y Miércoles
    expect(screen.getByText("J")).toBeInTheDocument();
    expect(screen.getByText("V")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders with selection of specific days", () => {
    const selectedDays: Day[] = ["viernes", "sábado", "domingo"];
    render(<DaySelector value={selectedDays} onChange={mockOnChange} />);

    // Check that the "Selección personalizada" badge is shown
    expect(screen.getByText("Selección personalizada")).toBeInTheDocument();

    // No need to check individual day rendering as that's handled by the component logic
  });

  it("toggles a day when clicked", () => {
    render(<DaySelector value={[]} onChange={mockOnChange} />);

    // Click on Friday (Viernes - V)
    fireEvent.click(screen.getByText("V"));

    // onChange should be called with ['viernes']
    expect(mockOnChange).toHaveBeenCalledWith(["viernes"]);
  });

  it("removes a day when clicked if already selected", () => {
    const selectedDays: Day[] = ["viernes", "sábado"];
    render(<DaySelector value={selectedDays} onChange={mockOnChange} />);

    // Click on Friday (Viernes - V) which is already selected
    fireEvent.click(screen.getByText("V"));

    // onChange should be called with just ['sábado']
    expect(mockOnChange).toHaveBeenCalledWith(["sábado"]);
  });

  it("toggles all days when the badge is clicked", () => {
    const selectedDays: Day[] = ["viernes", "sábado"];
    render(<DaySelector value={selectedDays} onChange={mockOnChange} />);

    // Click on the "Selección personalizada" badge
    fireEvent.click(screen.getByText("Selección personalizada"));

    // onChange should be called with []
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});
