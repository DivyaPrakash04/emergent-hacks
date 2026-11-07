export function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3 shadow-soft" aria-label="Host is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}
