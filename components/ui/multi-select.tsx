import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyMessage = "No items found.",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const safeSelected = selected || []

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleOption = (value: string) => {
    const newSelected = safeSelected.includes(value)
      ? safeSelected.filter(item => item !== value)
      : [...safeSelected, value]
    onChange(newSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-start h-auto min-h-[40px] font-normal", className)}
        >
          {safeSelected.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {safeSelected.map(value => {
                const option = options.find(opt => opt.value === value)
                return (
                  <Badge
                    variant="secondary"
                    key={value}
                    className="mr-1 mb-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOption(value)
                    }}
                  >
                    {option?.label || value}
                    <span className="ml-1 rounded-full hover:bg-secondary-foreground/20">&times;</span>
                  </Badge>
                )
              })}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2" align="start">
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <div className="max-h-64 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    safeSelected.includes(option.value) && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => toggleOption(option.value)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      safeSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
