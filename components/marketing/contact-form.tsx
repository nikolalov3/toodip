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

export function ContactForm() {
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
        placeholder="Your name or venue"
        aria-label="Your name or venue"
      />
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="What can we help with?"
        aria-label="Message"
        rows={4}
        required
      />
      <Button type="submit" size="sm" className="self-start">
        <Mail className="size-3.5" />
        Open in your mail app
      </Button>
      <p className="text-xs text-muted-foreground">
        Or write directly:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}
