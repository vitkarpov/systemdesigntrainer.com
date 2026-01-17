import type { Meta, StoryObj } from "@storybook/react";
import { Image } from "./image";
import { MOCK_BASE64_IMAGE } from "./__stories__/mock-data";

const meta: Meta<typeof Image> = {
  title: "AI Components/Presentation/Image",
  component: Image,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays AI-generated images from base64-encoded data. Automatically handles media types and provides responsive sizing with rounded corners.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    base64: {
      control: "text",
      description: "Base64-encoded image data (without the data: prefix)",
    },
    mediaType: {
      control: "select",
      options: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
      description: "MIME type of the image",
    },
    alt: {
      control: "text",
      description: "Alternative text for accessibility",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Image>;

// Extract base64 data from the data URL
const extractBase64 = (dataUrl: string) => {
  return dataUrl.split(",")[1];
};

export const Default: Story = {
  args: {
    base64: extractBase64(MOCK_BASE64_IMAGE),
    mediaType: "image/svg+xml",
    alt: "AI generated image",
  },
};

export const WithCustomAlt: Story = {
  args: {
    base64: extractBase64(MOCK_BASE64_IMAGE),
    mediaType: "image/svg+xml",
    alt: "A colorful system architecture diagram showing microservices",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Image with descriptive alternative text for better accessibility.",
      },
    },
  },
};

export const WithCustomSize: Story = {
  args: {
    base64: extractBase64(MOCK_BASE64_IMAGE),
    mediaType: "image/svg+xml",
    alt: "Generated image",
    className: "w-64",
  },
  parameters: {
    docs: {
      description: {
        story: "Image with custom width applied via className.",
      },
    },
  },
};

export const FullWidth: Story = {
  args: {
    base64: extractBase64(MOCK_BASE64_IMAGE),
    mediaType: "image/svg+xml",
    alt: "Generated image",
    className: "w-full",
  },
  parameters: {
    docs: {
      description: {
        story: "Image stretched to full container width.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: (args) => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary space-y-3">
      <div className="text-sm">
        <p className="mb-2">
          Here's a visualization of the architecture we discussed:
        </p>
      </div>
      <Image {...args} />
      <div className="text-xs text-muted-foreground">
        Generated image showing system architecture
      </div>
    </div>
  ),
  args: {
    base64: extractBase64(MOCK_BASE64_IMAGE),
    mediaType: "image/svg+xml",
    alt: "System architecture diagram",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Image displayed within a message context, showing typical usage in an AI conversation.",
      },
    },
  },
};
