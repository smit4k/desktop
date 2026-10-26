import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  /** persistent highlight for the currently selected option */
  active?: boolean;
  checked?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: { x: number; y: number } | null;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

function useFixedStyle(
  menuRef: RefObject<HTMLDivElement | null>,
  isFixed: boolean,
  position: { x: number; y: number } | null | undefined,
  open: boolean,
  side: "top" | "bottom" = "bottom",
  align: "start" | "end" = "start",
): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>(() =>
    position ? { left: position.x, top: position.y } : {},
  );

  useLayoutEffect(() => {
    if (!isFixed || !position || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let left = align === "end" ? position.x - rect.width : position.x;
    let top = side === "top" ? position.y - rect.height : position.y;

    if (left + rect.width > window.innerWidth) {
      left = window.innerWidth - rect.width - 8;
    }
    if (left < 8) left = 8;

    if (side !== "top" && top + rect.height > window.innerHeight) {
      top = position.y - rect.height - 8;
    }
    if (top < 8) top = 8;

    setStyle({ left, top });
  }, [isFixed, position, open, menuRef, side, align]);

  return style;
}

export default function DropdownMenu({
  trigger,
  items,
  open: controlledOpen,
  onOpenChange,
  position,
  side = "bottom",
  align = "start",
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const keyboardOpenRef = useRef(false);
  const [menuTheme, setMenuTheme] = useState<string>();

  const [computedPos, setComputedPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (open && containerRef.current) {
      setMenuTheme(
        containerRef.current
          .closest("[data-theme]")
          ?.getAttribute("data-theme") ?? undefined,
      );
    }
    if (!position && open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = align === "end" ? rect.right : rect.left;
      const y = side === "top" ? rect.top - 4 : rect.bottom + 4;
      setComputedPos({ x, y });
    }
  }, [open, position, side, align]);

  const targetPos = position || computedPos;
  const isFixed = Boolean(targetPos);
  useLayoutEffect(() => {
    if (open && keyboardOpenRef.current) {
      const selected = menuRef.current?.querySelector<HTMLButtonElement>(
        "button[aria-current='true']:not(:disabled)",
      );
      const first = menuRef.current?.querySelector<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      (selected ?? first)?.focus();
    }
  }, [open, isFixed]);
  const fixedStyle = useFixedStyle(
    menuRef,
    isFixed,
    targetPos,
    open,
    side,
    align,
  );

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        containerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        keyboardOpenRef.current = false;
        containerRef.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const menuContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dropdown-menu"
          ref={menuRef}
          data-dropdown-menu="true"
          data-theme={menuTheme}
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: side === "top" ? 2 : -2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: side === "top" ? 2 : -2 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className={`overflow-hidden rounded-[11px] p-[4px] min-w-[160px] border-0 bg-black/[0.05] dark:bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 ${
            isFixed
              ? "fixed z-[99999]"
              : side === "top"
                ? "absolute right-0 bottom-full mb-1 z-50"
                : "absolute right-0 top-full mt-1 z-50"
          }`}
          style={{
            ...(isFixed ? fixedStyle : {}),
            backgroundColor:
              menuTheme === "dark" ? "rgb(18 20 24 / 88%)" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            event.stopPropagation();
            const buttons = Array.from(
              menuRef.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ) ?? [],
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : (index +
                      (event.key === "ArrowUp" ? -1 : 1) +
                      buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
          }}
        >
          <div className="flex flex-col gap-[1px]">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role={
                  item.checked !== undefined
                    ? "menuitemcheckbox"
                    : item.active === undefined
                      ? "menuitem"
                      : "menuitemradio"
                }
                aria-checked={item.checked ?? item.active}
                disabled={item.disabled}
                onClick={async (e) => {
                  e.stopPropagation();
                  setOpen(false);
                  containerRef.current
                    ?.querySelector<HTMLButtonElement>("button")
                    ?.focus();
                  await item.onClick();
                }}
                className={`group flex w-full h-[30px] items-center gap-[8px] rounded-[8px] px-[9px] text-[13px] font-normal transition-colors border-none bg-transparent text-left cursor-pointer select-none outline-none ${
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    : "text-text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.08] focus-visible:bg-black/[0.08] dark:focus-visible:bg-white/[0.14]"
                } ${
                  item.active ? "bg-black/[0.05] dark:bg-white/[0.08]" : ""
                } disabled:pointer-events-none disabled:opacity-40`}
                aria-current={item.active ? "true" : undefined}
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                }}
              >
                {item.icon && (
                  <span
                    className={`shrink-0 flex items-center justify-center text-[15px] ${
                      item.danger
                        ? "text-red-400"
                        : "text-text-secondary group-hover:text-text-primary"
                    } transition-colors`}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="truncate flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        keyboardOpenRef.current = true;
        setOpen(true);
      }}
      onClick={(e) => {
        if (!position) {
          e.stopPropagation();
          keyboardOpenRef.current = e.detail === 0;
          setOpen(!open);
        }
      }}
    >
      {trigger}
      {isFixed && typeof document !== "undefined"
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}
