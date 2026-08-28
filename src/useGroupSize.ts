import { useEffect, useState } from "react";
import { getGroupSize, type GroupSize } from "./runtimeGroups";

/** Current runtime-group size, kept in sync with localStorage and the
    `learn-group-size-change` event so any view reflects a change made in
    the settings modal. */
export function useGroupSize(): GroupSize {
  const [size, setSize] = useState<GroupSize>(getGroupSize);

  useEffect(() => {
    const sync = () => setSize(getGroupSize());
    window.addEventListener("learn-group-size-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("learn-group-size-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return size;
}
