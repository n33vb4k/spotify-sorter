import { notFound } from "next/navigation";
import Parity from "./Parity";

/** Development-only: runs demo tracks through the in-browser pipeline and compares with the Python tags. */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Parity />;
}
