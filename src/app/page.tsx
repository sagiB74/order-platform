// Root URL. For now there's no public landing page yet, so we send visitors to
// the login screen. Later this will become the platform's marketing/home page
// (the customer storefronts live at /[slug], not here).
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
