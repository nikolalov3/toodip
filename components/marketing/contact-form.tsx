"use client";

import { Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Contact without a mail server: the form composes the message and hands it to
 * the visitor's own mail app addressed to the studio inbox. No backend, no
 * spam surface, and the sender address is always real because it is theirs.
 */

export const CONTACT_EMAIL = "kontakt@notaslop.com";

export interface ContactFormLabels {
  formName: string;
  formMessage: string;
  submit: string;
  direct: string;
}

const DEFAULT_LABELS: ContactFormLabels = {
  formName: "Your name or venue",
  formMessage: "What can we help with?",
  submit: "Open in your mail app",
  direct: "Or write directly:",
};

export function ContactForm({
  labels = DEFAULT_LABELS,
}: {
  labels?: ContactFormLabels;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const subject = encodeURIComponent(
          name ? `toodip — ${name}` : "toodip — contact",
        );
        const body = encodeURIComponent(message);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      }}
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={labels.formName}
        aria-label={labels.formName}
      />
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={labels.formMessage}
        aria-label={labels.formMessage}
        rows={4}
        required
      />
      <Button type="submit" size="sm" className="self-start">
        <Mail className="size-3.5" />
        {labels.submit}
      </Button>
      <p className="text-xs text-muted-foreground">
        {labels.direct}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}
