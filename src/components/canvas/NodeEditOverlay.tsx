import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export type CommitAction = "none" | "sibling" | "child" | "outdent";

export interface EditRect {
  left: number;
  top: number;
  width: number;
  height: number;
  maxWidth: number;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  letterSpacing?: string;
  lineHeight?: string;
  color?: string;
  textAlign?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface Props {
  rect: EditRect;
  initial: string;
  caretAtEnd: boolean;
  onCommit: (text: string, action: CommitAction) => void;
  onCancel: () => void;
}

export function NodeEditOverlay({
  rect,
  initial,
  caretAtEnd,
  onCommit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const composing = useRef(false);
  const committed = useRef(false);
  const [value, setValue] = useState(initial);
  // Seed with rect from the node so first paint sits exactly on top of it;
  // useLayoutEffect adjusts to mirror-measured size before the browser paints.
  const [size, setSize] = useState({ width: rect.width, height: rect.height });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (caretAtEnd) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    } else {
      el.select();
    }
  }, [caretAtEnd]);

  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    if (!mirror) return;
    const r = mirror.getBoundingClientRect();
    setSize({ width: r.width, height: r.height });
  }, [value, rect]);

  const commit = (action: CommitAction) => {
    if (committed.current) return;
    committed.current = true;
    onCommit(value, action);
  };

  const cancel = () => {
    if (committed.current) return;
    committed.current = true;
    onCancel();
  };

  // Shared between textarea and mirror so they wrap identically.
  const sharedStyle: CSSProperties = {
    fontFamily: rect.fontFamily,
    fontSize: rect.fontSize,
    fontWeight: rect.fontWeight,
    fontStyle: rect.fontStyle,
    letterSpacing: rect.letterSpacing,
    lineHeight: rect.lineHeight,
    paddingLeft: rect.paddingLeft,
    paddingRight: rect.paddingRight,
    paddingTop: rect.paddingTop,
    paddingBottom: rect.paddingBottom,
    boxSizing: "border-box",
  };

  // Trailing newline / empty string would collapse to 0 width; pad with a
  // single space so the mirror always has a measurable line.
  const mirrorText =
    value === "" || value.endsWith("\n") ? value + " " : value;

  return createPortal(
    <>
      <textarea
        ref={ref}
        className="node-edit"
        value={value}
        rows={1}
        spellCheck={false}
        style={{
          ...sharedStyle,
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: Math.max(size.width, 28),
          height: Math.max(size.height, rect.height),
          color: rect.color,
          textAlign: rect.textAlign as CSSProperties["textAlign"],
        }}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(e) => {
          if (composing.current) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit("none");
          } else if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            commit("child");
          } else if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault();
            commit("outdent");
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          // Shift+Enter falls through → textarea inserts newline natively
        }}
        onBlur={() => commit("none")}
      />
      <div
        ref={mirrorRef}
        aria-hidden="true"
        style={{
          ...sharedStyle,
          position: "fixed",
          top: -9999,
          left: -9999,
          visibility: "hidden",
          pointerEvents: "none",
          display: "inline-block",
          maxWidth: rect.maxWidth,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {mirrorText}
      </div>
    </>,
    document.body,
  );
}
