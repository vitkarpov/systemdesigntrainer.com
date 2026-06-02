import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BaseNode } from "../BaseNode";
import type { NodeProps } from "@xyflow/react";
import type { BaseNodeType } from "../BaseNode";
import { Database } from "lucide-react";

// Mock @xyflow/react
vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    Handle: ({ type, className }: { type: string; className: string }) => (
      <div data-testid={`handle-${type}`} className={className} />
    ),
    Position: {
      Top: "top",
      Bottom: "bottom",
      Left: "left",
      Right: "right",
    },
  };
});

describe("BaseNode", () => {
  const createNodeProps = (
    overrides?: Partial<NodeProps<BaseNodeType>>,
  ): NodeProps<BaseNodeType> =>
    ({
      id: "test-node",
      data: {
        label: "Test Node",
        icon: Database,
      },
      type: "base",
      selected: false,
      isConnectable: true,
      dragging: false,
      zIndex: 0,
      ...overrides,
    }) as NodeProps<BaseNodeType>;

  it("should render node with label", () => {
    const props = createNodeProps();
    render(<BaseNode {...props} />);

    expect(screen.getByText("Test Node")).toBeInTheDocument();
  });

  it("should render node with icon", () => {
    const props = createNodeProps();
    const { container } = render(<BaseNode {...props} />);

    // lucide-react icons render as svg elements
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  describe("Visual Regression Prevention - Handle Styling", () => {
    it("should render target handle with background color class", () => {
      const props = createNodeProps();
      render(<BaseNode {...props} />);

      const targetHandle = screen.getByTestId("handle-target");
      const classes = targetHandle.className;

      // Verify the handle has the critical styling classes
      expect(classes).toContain("w-3");
      expect(classes).toContain("h-3");
      expect(classes).toContain("border-2");
      expect(classes).toContain("border-background");

      // CRITICAL: Verify !bg-primary class is present (prevents handles from being invisible)
      expect(classes).toContain("!bg-primary");
    });

    it("should render source handle with background color class", () => {
      const props = createNodeProps();
      render(<BaseNode {...props} />);

      const sourceHandle = screen.getByTestId("handle-source");
      const classes = sourceHandle.className;

      // Verify the handle has the critical styling classes
      expect(classes).toContain("w-3");
      expect(classes).toContain("h-3");
      expect(classes).toContain("border-2");
      expect(classes).toContain("border-background");

      // CRITICAL: Verify !bg-primary class is present (prevents handles from being invisible)
      expect(classes).toContain("!bg-primary");
    });

    it("should render both handles (target and source)", () => {
      const props = createNodeProps();
      render(<BaseNode {...props} />);

      expect(screen.getByTestId("handle-target")).toBeInTheDocument();
      expect(screen.getByTestId("handle-source")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("should apply selected styling when selected", () => {
      const props = createNodeProps({ selected: true });
      const { container } = render(<BaseNode {...props} />);

      const nodeContainer = container.firstChild as HTMLElement;
      expect(nodeContainer.className).toContain("border-2");
      expect(nodeContainer.className).toContain("border-border");
      expect(nodeContainer.className).toContain("border-primary");
      expect(nodeContainer.className).toContain("shadow-lg");
      expect(nodeContainer.className).toContain("scale-150");
      expect(
        screen.getByRole("button", { name: /edit component name/i }),
      ).toBeInTheDocument();
    });

    it("should apply default styling when not selected", () => {
      const props = createNodeProps({ selected: false });
      const { container } = render(<BaseNode {...props} />);

      const nodeContainer = container.firstChild as HTMLElement;
      expect(nodeContainer.className).toContain("border-2");
      expect(nodeContainer.className).toContain("border-border");
      expect(nodeContainer.className).toContain("hover:border-primary/50");
      expect(nodeContainer.className).toContain("hover:shadow-md");
      expect(
        screen.queryByRole("button", { name: /edit component name/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Connectable State", () => {
    it("should pass isConnectable prop to handles", () => {
      const props = createNodeProps({ isConnectable: true });
      render(<BaseNode {...props} />);

      // Handles should be present and connectable
      expect(screen.getByTestId("handle-target")).toBeInTheDocument();
      expect(screen.getByTestId("handle-source")).toBeInTheDocument();
    });

    it("should handle non-connectable state", () => {
      const props = createNodeProps({ isConnectable: false });
      render(<BaseNode {...props} />);

      // Handles should still be present (ReactFlow controls actual connectivity)
      expect(screen.getByTestId("handle-target")).toBeInTheDocument();
      expect(screen.getByTestId("handle-source")).toBeInTheDocument();
    });
  });

  describe("Node without icon", () => {
    it("should render node without icon when icon is not provided", () => {
      const props = createNodeProps({
        data: {
          label: "No Icon Node",
        },
      });
      const { container } = render(<BaseNode {...props} />);

      expect(screen.getByText("No Icon Node")).toBeInTheDocument();
      expect(container.querySelector("svg")).not.toBeInTheDocument();
    });
  });
});
