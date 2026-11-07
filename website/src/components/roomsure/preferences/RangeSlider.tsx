import * as SliderPrimitive from "@radix-ui/react-slider";

interface Props {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  labels: [string, string];
}

/** Two-thumb slider; each thumb has its own accessible name. */
export function RangeSlider({ min, max, step, value, onChange, labels }: Props) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      minStepsBetweenThumbs={1}
      onValueChange={(v) => onChange([v[0]!, v[1]!])}
      className="relative flex h-6 w-full touch-none select-none items-center"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/15">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {labels.map((l) => (
        <SliderPrimitive.Thumb
          key={l}
          aria-label={l}
          className="block size-5 rounded-full border-2 border-primary bg-surface shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
