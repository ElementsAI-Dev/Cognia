import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClipboardPanel } from "./clipboard-panel";

const mockFns = {
	startMonitoring: jest.fn(),
	stopMonitoring: jest.fn(),
	clearHistory: jest.fn(),
	copyToClipboard: jest.fn(),
	checkClipboard: jest.fn(),
};

type ClipboardContent = {
	text: string;
	timestamp: number;
	type: string;
	analysis: {
		category: string;
		isCode: boolean;
		isUrl: boolean;
		isEmail: boolean;
		language?: string;
		wordCount: number;
		charCount: number;
		suggestedActions: string[];
	};
	preview: string;
};

type ClipboardMonitorMockState = typeof mockFns & {
	isMonitoring: boolean;
	currentContent: ClipboardContent | null;
	history: ClipboardContent[];
	error: string | null;
};

const createMockState = (): ClipboardMonitorMockState => ({
	...mockFns,
	isMonitoring: true,
	currentContent: null,
	history: [],
	error: null,
});

let mockState: ClipboardMonitorMockState = createMockState();

jest.mock("@/hooks/ui/use-clipboard-monitor", () => ({
	useClipboardMonitor: jest.fn(() => mockState),
}));

describe("ClipboardPanel", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		Object.values(mockFns).forEach((fn) => fn.mockClear());
		mockState = createMockState();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it("renders nothing when closed", () => {
		const { container } = render(
			<ClipboardPanel isOpen={false} onClose={jest.fn()} />
		);

		expect(container.firstChild).toBeNull();
	});

	it("renders current content and triggers action callbacks", async () => {
		const onAction = jest.fn();
		const content: ClipboardContent = {
			text: "Hello clipboard",
			timestamp: Date.now(),
			type: "text",
			analysis: {
				category: "text",
				isCode: false,
				isUrl: false,
				isEmail: false,
				language: undefined,
				wordCount: 2,
				charCount: 15,
				suggestedActions: ["translate", "summarize"],
			},
			preview: "Hello clipboard",
		};

		mockState = {
			...mockState,
			currentContent: content,
			history: [content],
		};

		render(
			<ClipboardPanel isOpen onClose={jest.fn()} onAction={onAction} />
		);

		expect(screen.getByText("Clipboard History")).toBeInTheDocument();

		await userEvent.click(screen.getByText("translate"));

		expect(onAction).toHaveBeenCalledWith("translate", content);
	});

	it("invokes refresh and clear handlers", async () => {
		mockState = {
			...mockState,
			history: [],
			currentContent: null,
		};

		render(<ClipboardPanel isOpen onClose={jest.fn()} />);

		await userEvent.click(screen.getByText("Refresh"));
		await userEvent.click(screen.getByText("Clear All"));

		expect(mockFns.checkClipboard).toHaveBeenCalled();
		expect(mockFns.clearHistory).toHaveBeenCalled();
	});
});
