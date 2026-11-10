export const DATA_DELETION_TOPIC = "Data deletion request — keep my account";
export const DATA_DELETION_EMAIL = "direct.letter@gmail.com";

export function buildDataDeletionRequest(details: string): string {
  const trimmed = details.trim();
  if (trimmed.length < 10 || trimmed.length > 3000) throw new Error("Describe the data in 10 to 3,000 characters.");
  return [
    "I am requesting deletion of the selected FacingFace data described below, while keeping my account active.",
    "This is a request for support review, not an automatic deletion or subscription cancellation.",
    "",
    "Data to remove and identifying links/dates:",
    trimmed,
    "",
    "Please verify account ownership and confirm scope before acting. Please reply with the expected completion date, any retained records and their applicable retention periods, and completion confirmation.",
  ].join("\n");
}

export function dataDeletionEmailHref(details: string): string {
  const body = [
    "FacingFace data-deletion request — keep my account active",
    "My FacingFace profile or account email: [please fill in]",
    "",
    "Data I want removed, with relevant links or dates:",
    details.trim().slice(0, 3000) || "[please describe the selected data]",
    "",
    "Please verify my account ownership, confirm the requested scope, expected completion date and any exceptions or retention periods. Keep my account and subscription active.",
    "Do not attach passwords, security codes, payment details or identity documents to this initial request.",
  ].join("\n");
  return `mailto:${DATA_DELETION_EMAIL}?subject=${encodeURIComponent(DATA_DELETION_TOPIC)}&body=${encodeURIComponent(body)}`;
}
