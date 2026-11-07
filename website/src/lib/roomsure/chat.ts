// STAND-IN: canned demo conversation. Claude Code's real version replaces it.
export interface ChatMessage {
  from: "host" | "seeker";
  text: string;
}

export interface ChatStep {
  /** Quick reply Maya taps to move on. */
  reply: string;
  /** Host messages that follow it. */
  host: string[];
}

export function openingMessages(hostName: string, title: string): string[] {
  return [
    `Hi Maya, I'm ${hostName}! Thanks for your interest in ${title}.`,
    "Your dates look like a great fit. Happy to answer anything.",
  ];
}

export function chatSteps(pricePerMonth: number): ChatStep[] {
  return [
    {
      reply: "Is June 1 move-in OK?",
      host: ["June 1 works perfectly. I'll leave the keys in a lockbox and send you the code the day before."],
    },
    {
      reply: "Can I reserve the first month?",
      host: [
        `Of course. The first month is $${pricePerMonth.toLocaleString("en-US")}, and you can reserve it right here.`,
        "Once it's through, the room is held for you.",
      ],
    },
  ];
}
