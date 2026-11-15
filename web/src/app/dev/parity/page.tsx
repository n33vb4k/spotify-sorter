import { notFound } from "next/navigation";
import Parity from "./Parity";

/** Development-only: runs demo tracks through the in-browser pipeline and compares with the Python tags. */
export default function Page() {
  // Hidden in production unless explicitly enabled for a verification build (ENABLE_DEV_PAGES=1).
  if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DEV_PAGES !== "1") notFound();
  return <Parity />;
}
