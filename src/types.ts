export type Color = "red" | "yellow" | "green" | null;

export interface ICardSide {
  text: string;
  text2: string;
  photo: string;
}

export interface ITag {
  _id: string;
  name: string;
  color: string;
  subjectId: string;
  topicId: string;
}

export interface ICard {
  _id: string;
  subjectId: string;
  topicId: string;
  progress: Record<string, Color>;
  s1: ICardSide;
  s2: ICardSide;
  tagIds?: string[];
  notes?: string;
}

export interface ISubject {
  _id: string;
  label: string;
  parentId: string | null;
}

/** per-user preferences, synced across devices via /userstate/:user */
export interface IUserSettings {
  /** card background id, side 1 */
  cardBgS1?: string;
  /** card background id, side 2 */
  cardBgS2?: string;
  /** which face cards open on: 1 = front, 2 = back */
  startSide?: 1 | 2;
}

/** per-user blob from /userstate/:user */
export interface IUserState {
  _id: string;
  settings?: IUserSettings;
  /** ISO timestamp of this user's last app visit, stamped by PATCH .../touch */
  lastActive?: string | null;
}

export interface ISession {
  subjectId: string;
  topicId: string;
  topicIds: string[];
}
