import type { TicketMessage } from "../../types";

type ReplyThreadProps = {
  messages?: TicketMessage[];
};

export function ReplyThread({ messages = [] }: ReplyThreadProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const senderType = message.senderType ?? (message.direction === "OUTBOUND" ? "AGENT" : "CUSTOMER");
        const isAgentMessage = senderType === "AGENT";

        return (
          <article
            className={`flex ${isAgentMessage ? "justify-end" : "justify-start"}`}
            key={message.id}
          >
            <div
              className={`max-w-[min(680px,85%)] rounded-2xl px-4 py-3 shadow-sm ${
                isAgentMessage
                  ? "rounded-br-md bg-slate-950 text-white"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs ${
                  isAgentMessage ? "text-slate-200" : "text-slate-500"
                }`}
              >
                <span className={`font-bold ${isAgentMessage ? "text-white" : "text-slate-950"}`}>
                  {formatSenderType(senderType)}
                </span>
                <span>{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p
                className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                  isAgentMessage ? "text-white" : "text-slate-700"
                }`}
              >
                {message.bodyText}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatSenderType(senderType: string) {
  return senderType.charAt(0).toUpperCase() + senderType.slice(1).toLowerCase();
}
