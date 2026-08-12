// Build a WhatsApp click-to-chat link from a phone number. Israeli numbers are
// usually written like "050-123-4567"; wa.me needs digits in international form
// with no plus. We convert a leading 0 to Israel's country code (972).
export function whatsappLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return `https://wa.me/${digits}`;
}
