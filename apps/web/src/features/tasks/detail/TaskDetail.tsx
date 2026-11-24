import type { TaskDto } from '@aionos/shared';
import { LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectMembers } from '@/api/members';
import { useTaskFieldMutations } from '@/api/tasks';
import { InlineEditText } from '@/components/common/InlineEditText';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { Button } from '@/components/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { taskPath } from '../task-paths';
import { ActivityTimeline } from './ActivityTimeline';
import { ChecklistSection } from './ChecklistSection';
import { LabelPicker } from './LabelPicker';
import { CommentsSection } from './CommentsSection';
import { TaskDescription } from './TaskDescription';
import { TaskProperties } from './TaskProperties';
import { TimeLogsSection } from './TimeLogsSection';

const validateTitle = (v: string) =>
  v.length < 3
    ? 'Title must be at least 3 characters'
    : v.length > 255
      ? 'Title is too long'
      : null;

interface TaskDetailProps {
  task: TaskDto;
  canEdit: boolean;
  canManageLabels: boolean;
}

export function TaskDetail({ task, canEdit, canManageLabels }: TaskDetailProps) {
  const members = useProjectMembers(task.project.id);
  const mutations = useTaskFieldMutations(task);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${taskPath(task)}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  return (
    <>
      <SheetHeader className="gap-2 border-b p-4 pr-12">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TaskTypeIcon type={task.type} />
          <span className="shrink-0 font-mono whitespace-nowrap">{task.key}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{task.project.name}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label="Copy link to task"
            onClick={() => void copyLink()}
          >
            <LinkIcon />
          </Button>
        </div>
        <SheetTitle className="text-lg leading-snug">
          <InlineEditText
            value={task.title}
            label="Title"
            disabled={!canEdit}
            validate={validateTitle}
            onSave={(title) => mutations.update.mutateAsync({ title })}
          />
        </SheetTitle>
        <SheetDescription className="sr-only">
          Task {task.key} in {task.project.name}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-4">
        <TaskProperties
          task={task}
          members={members.data}
          canEdit={canEdit}
          mutations={mutations}
          labelsSlot={<LabelPicker task={task} canEdit={canEdit} canManage={canManageLabels} />}
        />

        <section aria-labelledby="task-description-heading" className="space-y-2">
          <h3 id="task-description-heading" className="text-sm font-semibold">
            Description
          </h3>
          <TaskDescription
            value={task.description}
            canEdit={canEdit}
            onSave={(description) => mutations.update.mutateAsync({ description })}
          />
        </section>

        <ChecklistSection taskId={task.id} canEdit={canEdit} />

        <Tabs defaultValue="comments">
          <TabsList>
            <TabsTrigger value="comments">Comments ({task.commentCount})</TabsTrigger>
            <TabsTrigger value="time">Time ({task.loggedHours} h)</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="pt-3">
            <CommentsSection
              taskId={task.id}
              canComment={canEdit}
              people={(members.data ?? []).map((m) => m.user)}
            />
          </TabsContent>
          <TabsContent value="time" className="pt-3">
            <TimeLogsSection task={task} canLog={canEdit} />
          </TabsContent>
          <TabsContent value="activity" className="pt-3">
            <ActivityTimeline taskId={task.id} members={members.data ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
