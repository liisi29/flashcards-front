import { useEffect, useState } from "react";
import { getCardBgIds } from "./cardBackgrounds";

/** Current global side-1 / side-2 background ids, kept in sync with
    localStorage and the `card-bg-change` event. */
export function useCardBgs() {
  const [ids, setIds] = useState(getCardBgIds);

  useEffect(() => {
    const sync = () => setIds(getCardBgIds());
    window.addEventListener("card-bg-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("card-bg-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ids;
}
