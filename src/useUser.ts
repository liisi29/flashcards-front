import { useEffect, useState } from "react";
import { getUser } from "./user";

/** Current user, kept in sync with localStorage and the fc-user-change event. */
export function useUser() {
  const [user, setUserState] = useState(getUser);

  useEffect(() => {
    const sync = () => setUserState(getUser());
    window.addEventListener("fc-user-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fc-user-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}
