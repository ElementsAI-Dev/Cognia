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

    expect(screen.getByText("Trigger selection toolbar")).toBeInTheDocument();

    await userEvent.click(screen.getByText("ai"));

    expect(screen.queryByText("Trigger selection toolbar")).not.toBeInTheDocument();
    expect(screen.getByText("Quick translate")).toBeInTheDocument();
  });
});
