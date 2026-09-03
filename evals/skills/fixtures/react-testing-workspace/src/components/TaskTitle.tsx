import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const TITLE_STYLE: CSSProperties = {
  display: "block",
  maxWidth: "12rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

type TaskTitleProps = {
  readonly title: string;
};

export const TaskTitle = ({ title }: TaskTitleProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null) {
      setClipped(element.scrollWidth > element.clientWidth);
    }
  }, [title]);

  return (
    <span
      ref={ref}
      className="task-row__title"
      data-testid="task-title"
      style={TITLE_STYLE}
      title={clipped ? title : undefined}
    >
      {title}
    </span>
  );
};
