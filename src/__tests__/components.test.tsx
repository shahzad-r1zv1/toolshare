import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { seed, uid, now } from "@/lib/helpers";
import type { State, Request, Loan } from "@/lib/types";

import {
  Button,
  Avatar,
  Modal,
  EmptyState,
  Toast,
  ConfirmDialog,
  ItemPhoto,
  FormField,
} from "@/components/ui";
import { MyCircle } from "@/components/MyCircle";
import { MyItems } from "@/components/MyItems";
import { Requests } from "@/components/Requests";
import { LoanHistory } from "@/components/LoanHistory";
import { DetailsModal } from "@/components/DetailsModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string N days from today (always in the future). */
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

/** Builds a seeded state and injects a pending request from alice on the user's item. */
function seedWithIncomingRequest(): { state: State; reqId: string } {
  const base = seed();
  const myItem = base.items.find((i) => i.ownerId === "you")!;
  const req: Request = {
    id: uid(),
    itemId: myItem.id,
    borrowerId: "alice",
    startDate: futureDate(1),
    endDate: futureDate(5),
    status: "PENDING",
    createdAt: now(),
  };
  return { state: { ...base, requests: [req] }, reqId: req.id };
}

/** Builds a seeded state with an outgoing pending request from user on alice's item. */
function seedWithOutgoingRequest(): State {
  const base = seed();
  const aliceItem = base.items.find((i) => i.ownerId === "alice")!;
  const req: Request = {
    id: uid(),
    itemId: aliceItem.id,
    borrowerId: "you",
    startDate: futureDate(1),
    endDate: futureDate(5),
    status: "PENDING",
    createdAt: now(),
  };
  return { ...base, requests: [req] };
}

/** Builds a seeded state that has an active loan of user's item to alice. */
function seedWithActiveLoan(): State {
  const base = seed();
  const myItem = base.items.find((i) => i.ownerId === "you")!;
  const loan: Loan = {
    id: uid(),
    itemId: myItem.id,
    borrowerId: "alice",
    startDate: futureDate(1),
    endDate: futureDate(5),
    status: "ACTIVE",
    returnPhotos: [],
  };
  return { ...base, loans: [loan] };
}

/** Builds a seeded state with a returned loan. */
function seedWithReturnedLoan(): State {
  const base = seed();
  const myItem = base.items.find((i) => i.ownerId === "you")!;
  const loan: Loan = {
    id: uid(),
    itemId: myItem.id,
    borrowerId: "alice",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    status: "RETURNED",
    returnPhotos: [],
    returnNotes: "All good",
  };
  return { ...base, loans: [loan] };
}

// ---------------------------------------------------------------------------
// Wrapper components for stateful tests
// ---------------------------------------------------------------------------

function MyItemsWrapper({ initialState }: { initialState: State }) {
  const [state, setState] = useState(initialState);
  return (
    <MyItems
      state={state}
      setState={setState}
      activeCircleId={initialState.circles[0].id}
    />
  );
}

function RequestsWrapper({ initialState }: { initialState: State }) {
  const [state, setState] = useState(initialState);
  return (
    <Requests state={state} setState={setState} search="" filter="" />
  );
}

// ---------------------------------------------------------------------------
// UI Primitives
// ---------------------------------------------------------------------------

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>
    );
    fireEvent.click(screen.getByText("Nope"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders button element with correct type", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("applies disabled attribute when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Avatar", () => {
  it("shows the first letter of the name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("is case-insensitive - always uppercases first letter", () => {
    render(<Avatar name="bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

describe("Modal", () => {
  it("renders title and children", () => {
    render(
      <Modal title="Test Modal" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal title="Close Me" onClose={onClose}>
        content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Backdrop" onClose={onClose}>
        inner
      </Modal>
    );
    const backdrop = container.querySelector('[role="dialog"]')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has correct aria attributes", () => {
    render(
      <Modal title="Accessible" onClose={vi.fn()}>
        content
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Accessible");
  });
});

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Empty" description="Add something to start." />);
    expect(screen.getByText("Add something to start.")).toBeInTheDocument();
  });

  it("renders action node when provided", () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("does not render description when omitted", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast message="Saved!" type="success" onDismiss={vi.fn()} />);
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Alert" type="error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("has role=alert for accessibility", () => {
    render(<Toast message="Info" type="info" onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("renders title and message", () => {
    render(
      <ConfirmDialog
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Confirm"
        message="Sure?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Confirm"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("ItemPhoto", () => {
  it("renders placeholder text when no src", () => {
    render(<ItemPhoto alt="Drill" />);
    expect(screen.getByText("No Photo")).toBeInTheDocument();
  });

  it("renders img with src and alt when src provided", () => {
    render(<ItemPhoto src="data:image/png;base64,abc" alt="Drill" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Drill");
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
  });
});

describe("FormField", () => {
  it("renders the label", () => {
    render(
      <FormField label="Title">
        <input />
      </FormField>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(
      <FormField label="Title" error="Required">
        <input />
      </FormField>
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("does not render error element when no error", () => {
    render(
      <FormField label="Title">
        <input />
      </FormField>
    );
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MyCircle
// ---------------------------------------------------------------------------

describe("MyCircle", () => {
  let state: State;

  beforeEach(() => {
    state = seed();
  });

  it("shows all circle member names", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows tool titles for each member", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("Spray Painter")).toBeInTheDocument();
    expect(screen.getByText("18V Drill + Bits")).toBeInTheDocument();
  });

  it("shows a Details button for each tool", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    const detailsButtons = screen.getAllByText("Details");
    expect(detailsButtons.length).toBe(2);
  });

  it("calls onOpenDetails when Details is clicked", () => {
    const onOpenDetails = vi.fn();
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter=""
        onOpenDetails={onOpenDetails}
      />
    );
    fireEvent.click(screen.getAllByText("Details")[0]);
    expect(onOpenDetails).toHaveBeenCalledOnce();
  });

  it("filters items by search term", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search="drill"
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("18V Drill + Bits")).toBeInTheDocument();
    expect(screen.queryByText("Spray Painter")).not.toBeInTheDocument();
  });

  it("filters items by category", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter="Painting"
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("Spray Painter")).toBeInTheDocument();
    expect(screen.queryByText("18V Drill + Bits")).not.toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search="zzznonexistent"
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("No matching tools")).toBeInTheDocument();
  });

  it("shows empty state when no members in circle", () => {
    const emptyState: State = {
      ...state,
      circles: [{ ...state.circles[0], members: [] }],
    };
    render(
      <MyCircle
        state={emptyState}
        activeCircleId={emptyState.circles[0].id}
        search=""
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    expect(screen.getByText("No circle members")).toBeInTheDocument();
  });

  it("shows correct tool count per member", () => {
    render(
      <MyCircle
        state={state}
        activeCircleId={state.circles[0].id}
        search=""
        filter=""
        onOpenDetails={vi.fn()}
      />
    );
    // Two members (You, Alice) each have 1 tool; Bob has 0
    const toolCounts = screen.getAllByText("1 tool");
    expect(toolCounts.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// MyItems
// ---------------------------------------------------------------------------

describe("MyItems", () => {
  let state: State;

  beforeEach(() => {
    state = seed();
  });

  it("shows 'Your Items' heading", () => {
    render(<MyItemsWrapper initialState={state} />);
    expect(screen.getByText("Your Items")).toBeInTheDocument();
  });

  it("shows the user's items", () => {
    render(<MyItemsWrapper initialState={state} />);
    expect(screen.getByText("Spray Painter")).toBeInTheDocument();
  });

  it("does not show items belonging to other users", () => {
    render(<MyItemsWrapper initialState={state} />);
    expect(screen.queryByText("18V Drill + Bits")).not.toBeInTheDocument();
  });

  it("shows correct tool count", () => {
    render(<MyItemsWrapper initialState={state} />);
    expect(screen.getByText("1 tool shared")).toBeInTheDocument();
  });

  it("opens Add Item modal when Add Item button is clicked", () => {
    render(<MyItemsWrapper initialState={state} />);
    const addButtons = screen.getAllByText("+ Add Item");
    fireEvent.click(addButtons[0]);
    expect(screen.getByRole("dialog", { name: "Add Item" })).toBeInTheDocument();
  });

  it("opens Edit modal with pre-filled title when Edit is clicked", () => {
    render(<MyItemsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Edit"));
    const dialog = screen.getByRole("dialog", { name: "Edit Item" });
    expect(dialog).toBeInTheDocument();
    const titleInput = within(dialog).getByPlaceholderText("e.g., Cordless Drill");
    expect((titleInput as HTMLInputElement).value).toBe("Spray Painter");
  });

  it("shows validation error when submitting empty title", () => {
    render(<MyItemsWrapper initialState={state} />);
    const addButtons = screen.getAllByText("+ Add Item");
    fireEvent.click(addButtons[0]);
    // Clear the title and attempt to save
    const titleInput = screen.getByPlaceholderText("e.g., Cordless Drill");
    fireEvent.change(titleInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("shows validation error for negative replacement value", () => {
    render(<MyItemsWrapper initialState={state} />);
    const addButtons = screen.getAllByText("+ Add Item");
    fireEvent.click(addButtons[0]);
    fireEvent.change(screen.getByPlaceholderText("e.g., Cordless Drill"), {
      target: { value: "My Tool" },
    });
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "-10" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Must be a positive number")).toBeInTheDocument();
  });

  it("adds a new item when form is submitted with valid data", () => {
    render(<MyItemsWrapper initialState={state} />);
    const addButtons = screen.getAllByText("+ Add Item");
    fireEvent.click(addButtons[0]);
    fireEvent.change(screen.getByPlaceholderText("e.g., Cordless Drill"), {
      target: { value: "Circular Saw" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Circular Saw")).toBeInTheDocument();
  });

  it("closes the modal when cancelled", () => {
    render(<MyItemsWrapper initialState={state} />);
    const addButtons = screen.getAllByText("+ Add Item");
    fireEvent.click(addButtons[0]);
    expect(screen.getByRole("dialog", { name: "Add Item" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows Delete button in Edit mode", () => {
    render(<MyItemsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("removes item after confirming delete", () => {
    render(<MyItemsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Delete"));
    // Confirm dialog appears
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    // Click the confirm button in the dialog
    const confirmBtn = within(screen.getByRole("alertdialog")).getByText("Delete");
    fireEvent.click(confirmBtn);
    expect(screen.queryByText("Spray Painter")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

describe("Requests", () => {
  it("shows empty state when there are no requests or loans", () => {
    const state = seed();
    render(<RequestsWrapper initialState={state} />);
    expect(
      screen.getByText("No requests or active loans")
    ).toBeInTheDocument();
  });

  it("shows incoming request section for pending requests on user's items", () => {
    const { state } = seedWithIncomingRequest();
    render(<RequestsWrapper initialState={state} />);
    expect(screen.getByText("Incoming Requests")).toBeInTheDocument();
  });

  it("shows borrower name and item name in incoming request", () => {
    const { state } = seedWithIncomingRequest();
    render(<RequestsWrapper initialState={state} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Spray Painter/)).toBeInTheDocument();
  });

  it("shows Approve and Decline buttons on incoming requests", () => {
    const { state } = seedWithIncomingRequest();
    render(<RequestsWrapper initialState={state} />);
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("moves request to Active Loans after approval", () => {
    const { state } = seedWithIncomingRequest();
    render(<RequestsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(screen.queryByText("Incoming Requests")).not.toBeInTheDocument();
    expect(screen.getByText("Active Loans")).toBeInTheDocument();
  });

  it("removes request after declining", () => {
    const { state } = seedWithIncomingRequest();
    render(<RequestsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Decline"));
    expect(screen.queryByText("Incoming Requests")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Loans")).not.toBeInTheDocument();
  });

  it("shows outgoing pending request for user", () => {
    const state = seedWithOutgoingRequest();
    render(<RequestsWrapper initialState={state} />);
    expect(screen.getByText("Outgoing Requests")).toBeInTheDocument();
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it("shows active loan with Mark Returned button for owner", () => {
    const state = seedWithActiveLoan();
    render(<RequestsWrapper initialState={state} />);
    expect(screen.getByText("Active Loans")).toBeInTheDocument();
    expect(screen.getByText("Mark Returned")).toBeInTheDocument();
  });

  it("opens return modal when Mark Returned is clicked", () => {
    const state = seedWithActiveLoan();
    render(<RequestsWrapper initialState={state} />);
    fireEvent.click(screen.getByText("Mark Returned"));
    expect(screen.getByRole("dialog", { name: "Complete Return" })).toBeInTheDocument();
  });

  it("shows empty state with filter active", () => {
    const state = seed();
    render(
      <Requests
        state={state}
        setState={vi.fn()}
        search="nonexistent"
        filter=""
      />
    );
    expect(screen.getByText("No matching requests")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// LoanHistory
// ---------------------------------------------------------------------------

describe("LoanHistory", () => {
  it("shows empty state when there is no history", () => {
    const state = seed();
    render(<LoanHistory state={state} search="" filter="" />);
    expect(screen.getByText("No loan history yet")).toBeInTheDocument();
  });

  it("shows returned loan with item name and borrower", () => {
    const state = seedWithReturnedLoan();
    render(<LoanHistory state={state} search="" filter="" />);
    expect(screen.getByText(/Spray Painter/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("shows return notes when present", () => {
    const state = seedWithReturnedLoan();
    render(<LoanHistory state={state} search="" filter="" />);
    expect(screen.getByText(/All good/)).toBeInTheDocument();
  });

  it("shows loan count in heading", () => {
    const state = seedWithReturnedLoan();
    render(<LoanHistory state={state} search="" filter="" />);
    expect(screen.getByText(/1 record/)).toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", () => {
    const state = seedWithReturnedLoan();
    render(<LoanHistory state={state} search="zzznonexistent" filter="" />);
    expect(screen.getByText("No matching history")).toBeInTheDocument();
  });

  it("filters by search term", () => {
    const state = seedWithReturnedLoan();
    render(<LoanHistory state={state} search="Spray" filter="" />);
    expect(screen.getByText(/Spray Painter/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DetailsModal
// ---------------------------------------------------------------------------

describe("DetailsModal", () => {
  const baseItem = seed().items.find((i) => i.ownerId === "alice")!; // 18V Drill + Bits

  it("renders the item title as modal title", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("18V Drill + Bits")).toBeInTheDocument();
  });

  it("shows category when present", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("Power Tools")).toBeInTheDocument();
  });

  it("shows note when present", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("Battery ~40 min.")).toBeInTheDocument();
  });

  it("shows replacement value when present", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("$120")).toBeInTheDocument();
  });

  it("shows availability when present", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("Evenings")).toBeInTheDocument();
  });

  it("shows 'This is your own item' when isOwnItem=true", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={true}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("This is your own item")).toBeInTheDocument();
  });

  it("does not show request form when isOwnItem=true", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={true}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.queryByText("Request Tool")).not.toBeInTheDocument();
  });

  it("shows request form when isOwnItem=false", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    expect(screen.getByText("Request Tool")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  it("shows validation errors when Request Tool clicked without dates", () => {
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Request Tool"));
    expect(screen.getByText("Start date is required")).toBeInTheDocument();
    expect(screen.getByText("End date is required")).toBeInTheDocument();
  });

  it("shows validation error when end date is before start date", () => {
    const { container } = render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={vi.fn()}
      />
    );
    const [startInput, endInput] = container.querySelectorAll('input[type="date"]');
    fireEvent.change(startInput, { target: { value: futureDate(5) } });
    fireEvent.change(endInput, { target: { value: futureDate(3) } });
    fireEvent.click(screen.getByText("Request Tool"));
    expect(
      screen.getByText("End date must be on or after start date")
    ).toBeInTheDocument();
  });

  it("calls onRequest with correct dates when form is valid", () => {
    const onRequest = vi.fn();
    const { container } = render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={vi.fn()}
        onRequest={onRequest}
      />
    );
    const start = futureDate(2);
    const end = futureDate(7);
    const [startInput, endInput] = container.querySelectorAll('input[type="date"]');
    fireEvent.change(startInput, { target: { value: start } });
    fireEvent.change(endInput, { target: { value: end } });
    fireEvent.click(screen.getByText("Request Tool"));
    expect(onRequest).toHaveBeenCalledOnce();
    expect(onRequest).toHaveBeenCalledWith(start, end);
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <DetailsModal
        item={baseItem}
        isOwnItem={false}
        onClose={onClose}
        onRequest={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
