import { Button } from "@ez-jira-log/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ez-jira-log/ui/components/dialog";
import { Input } from "@ez-jira-log/ui/components/input";
import { Label } from "@ez-jira-log/ui/components/label";
import { Switch } from "@ez-jira-log/ui/components/switch";
import { useState } from "react";

interface TemplateFormData {
  name: string;
  issueKey: string;
  comment: string;
  defaultHours: number;
  isActive: boolean;
}

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TemplateFormData) => void;
  initialValues?: Partial<TemplateFormData>;
  title: string;
  isLoading?: boolean;
}

export default function TemplateForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  title,
  isLoading,
}: TemplateFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [issueKey, setIssueKey] = useState(initialValues?.issueKey ?? "");
  const [comment, setComment] = useState(initialValues?.comment ?? "");
  const [defaultHours, setDefaultHours] = useState(initialValues?.defaultHours ?? 1);
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, issueKey, comment, defaultHours, isActive });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Stand-up"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueKey">Jira Issue Key (optional)</Label>
            <Input
              id="issueKey"
              value={issueKey}
              onChange={(e) => setIssueKey(e.target.value)}
              placeholder="e.g., PROJ-123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Default Comment</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Daily stand-up meeting"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Default Hours</Label>
            <Input
              id="hours"
              type="number"
              value={defaultHours}
              onChange={(e) => setDefaultHours(parseFloat(e.target.value) || 0)}
              min={0.25}
              max={24}
              step={0.25}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
