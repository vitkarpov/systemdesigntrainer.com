import { Database, Layers, Activity, Server, Box, Users, HardDrive } from 'lucide-react';

const COMPONENT_TYPES = [
  { type: 'database', label: 'Database', icon: Database, color: 'text-blue-600 dark:text-blue-400' },
  { type: 'cache', label: 'Cache', icon: Layers, color: 'text-purple-600 dark:text-purple-400' },
  { type: 'loadBalancer', label: 'Load Balancer', icon: Activity, color: 'text-green-600 dark:text-green-400' },
  { type: 'apiServer', label: 'API Server', icon: Server, color: 'text-orange-600 dark:text-orange-400' },
  { type: 'queue', label: 'Queue', icon: Box, color: 'text-yellow-600 dark:text-yellow-500' },
  { type: 'client', label: 'Client', icon: Users, color: 'text-pink-600 dark:text-pink-400' },
  { type: 'storage', label: 'Storage', icon: HardDrive, color: 'text-indigo-600 dark:text-indigo-400' },
];

export function ComponentPalette() {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string
  ) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Components</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Drag onto canvas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {COMPONENT_TYPES.map((comp) => {
          const Icon = comp.icon;
          return (
            <div
              key={comp.type}
              draggable
              onDragStart={(e) => onDragStart(e, comp.type, comp.label)}
              className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted cursor-move transition-colors border border-transparent hover:border-border"
            >
              <Icon className={`w-5 h-5 ${comp.color}`} />
              <span className="text-sm font-medium">{comp.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
