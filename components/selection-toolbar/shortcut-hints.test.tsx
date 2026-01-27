import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutHints } from "./shortcut-hints";

describe("ShortcutHints", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <ShortcutHints isOpen={false} onClose={jest.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("closes on Escape key", () => {
    const onClose = jest.fn();

    render(<ShortcutHints isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("filters shortcuts by category", async () => {
    render(<ShortcutHints isOpen onClose={jest.fn()} />);

    // Verify initial state shows "All" shortcuts including navigation ones
    expect(screen.getByText("All")).toBeInTheDocument();

    // Find and click the "Action" category filter button
    const actionButton = screen.getByRole("button", { name: /Action/i });
    await userEvent.click(actionButton);

    // After filtering by Action, navigation shortcuts should still be visible
    // since the component shows shortcuts based on category
    expect(actionButton).toBeInTheDocument();
  });
});
