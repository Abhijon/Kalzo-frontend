import { useState, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMPTY = "__kalzo_empty__";

export type VintageOption = { value: string; label: string };

type ChangeLike = { target: { value: string } };

export function VintageFilterSelect({
  value,
  options,
  onChange,
  className,
  style,
  variant = "ghost",
  "aria-label": ariaLabel,
}: {
  value: string;
  options: VintageOption[];
  onChange?: (ev: ChangeLike) => void;
  className?: string;
  style?: CSSProperties;
  /** ghost = home filter cell; field = bordered form/admin control */
  variant?: "ghost" | "field";
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value === "" || value == null ? EMPTY : String(value);
  const items = options.map((o) => ({
    value: o.value === "" ? EMPTY : String(o.value),
    label: o.label,
  }));
  const currentLabel = items.find((item) => item.value === selected)?.label ?? items[0]?.label ?? "";
  const triggerClass =
    variant === "field"
      ? `kv-select-trigger kv-field-select-trigger${className ? ` ${className}` : ""}`
      : `kv-filter-select-trigger${className ? ` ${className}` : ""}`;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={triggerClass}
          style={style}
        >
          <span>{currentLabel}</span>
          {variant === "field" ? <ChevronDown size={16} aria-hidden="true" /> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="kv-dropdown-content ka-filter-menu kv-home-filter-menu"
        collisionPadding={12}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="ka-filter-flourish" aria-hidden="true">
          ❦
        </div>
        {items.map((item) => {
          const checked = item.value === selected;
          return (
            <DropdownMenuItem
              key={item.value}
              className={`ka-filter-option kv-home-filter-option${checked ? " is-checked" : ""}`}
              onSelect={() => {
                onChange?.({ target: { value: item.value === EMPTY ? "" : item.value } });
                setOpen(false);
              }}
            >
              <span className="kv-home-filter-label">{item.label}</span>
              {checked ? (
                <span className="kv-select-check" aria-hidden="true">
                  <Check className="kv-select-check-icon h-3.5 w-3.5" strokeWidth={2.75} />
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
        <div className="ka-filter-flourish" aria-hidden="true">
          ❦
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
