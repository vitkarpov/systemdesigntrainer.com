import type { FeedbackItemDto } from "@/api/hooks.gen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackItemsCardProps {
  items: FeedbackItemDto[];
  type: "strength" | "weakness" | "suggestion";
}

const config = {
  strength: {
    title: "Strengths",
    icon: "✓",
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  weakness: {
    title: "Areas for Improvement",
    icon: "!",
    iconColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
  },
  suggestion: {
    title: "Suggestions",
    icon: "💡",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
};

export function FeedbackItemsCard({ items, type }: FeedbackItemsCardProps) {
  const filteredItems = items.filter((item) => item.type === type);

  if (filteredItems.length === 0) {
    return null;
  }

  const { title, icon, iconColor, bgColor } = config[type];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-bold">
          <span className={iconColor}>{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredItems.map((item, idx) => (
          <div
            key={idx}
            className={`${bgColor} p-4 rounded-lg border border-border/30`}
          >
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
