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
}

export interface ISubject {
  _id: string;
  label: string;
  parentId: string | null;
}

export interface IGroup {
  _id: string;
  /** auto-assigned sequence within the tag: Group 1, Group 2, … */
  number: number;
  subjectId: string;
  topicId: string;
  tagId: string;
  cardIds: string[];
}

/** per-user blob from /userstate/:user */
export interface IUserState {
  _id: string;
  learntGroups?: Record<string, boolean>;
  /** runtime-group resume position, keyed "<tagId>|<size>" -> group number */
  learnPos?: Record<string, number>;
}

export interface ISession {
  subjectId: string;
  topicId: string;
  topicIds: string[];
}
