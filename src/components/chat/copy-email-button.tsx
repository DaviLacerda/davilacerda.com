"use client";

import { CopyButton, type CopyButtonProps } from "@/components/ui/copy-button";

type CopyEmailButtonProps = Omit<CopyButtonProps, "value" | "iconOnly"> & {
  email: string;
};

/** Copies the email address (see `CopyButton`): "Copy email", then "Copied". */
export function CopyEmailButton({ email, ...props }: CopyEmailButtonProps) {
  return <CopyButton value={email} {...props} />;
}
