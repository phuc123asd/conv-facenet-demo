type TimelineItemProps = {
  detail: string;
  title: string;
};

export function TimelineItem({ title, detail }: TimelineItemProps) {
  return (
    <div>
      <i />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
